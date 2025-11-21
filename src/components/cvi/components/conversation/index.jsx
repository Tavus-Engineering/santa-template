import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
	DailyAudioTrack,
	DailyVideo,
	useDevices,
	useLocalSessionId,
	useMeetingState,
	useScreenVideoTrack,
	useVideoTrack,
} from '@daily-co/daily-react';
import { useLocalScreenshare } from '../../hooks/use-local-screenshare';
import { useReplicaIDs } from '../../hooks/use-replica-ids';
import { useCVICall } from '../../hooks/use-cvi-call';
import { useLocalCamera } from '../../hooks/use-local-camera';
import { useLocalMicrophone } from '../../hooks/use-local-microphone';
import { useScoreTracking } from '../../../../hooks/useScoreTracking';
import { getCurrentScoreContext } from '../../../../utils/scoreUtils';
import { AudioWave } from '../audio-wave';

import styles from './conversation.module.css';

const VideoPreview = React.memo(({ id }) => {
	const videoState = useVideoTrack(id);
	const widthVideo = videoState.track?.getSettings()?.width;
	const heightVideo = videoState.track?.getSettings()?.height;
	const isVertical = widthVideo && heightVideo ? widthVideo < heightVideo : false;

	return (
		<div
			className={`${styles.previewVideoContainer} ${isVertical ? styles.previewVideoContainerVertical : ''} ${videoState.isOff ? styles.previewVideoContainerHidden : ''}`}
		>
			<DailyVideo
				automirror
				sessionId={id}
				type="video"
				className={`${styles.previewVideo} ${isVertical ? styles.previewVideoVertical : ''} ${videoState.isOff ? styles.previewVideoHidden : ''}`}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'contain'
				}}
			/>

			<div className={styles.audioWaveContainer}>
				<AudioWave id={id} />
			</div>
		</div>
	);
});

const PreviewVideos = React.memo(() => {
	const localId = useLocalSessionId();
	const { isScreenSharing } = useLocalScreenshare();
	const replicaIds = useReplicaIDs();
	const replicaId = replicaIds[0];

	return (
		<>
			{isScreenSharing && <VideoPreview id={replicaId} />}
			<VideoPreview id={localId} />
		</>
	);
});

const MainVideo = React.memo(() => {
	const replicaIds = useReplicaIDs();
	const localId = useLocalSessionId();
	const videoState = useVideoTrack(replicaIds[0]);
	const screenVideoState = useScreenVideoTrack(localId);
	const isScreenSharing = !screenVideoState.isOff;
	// This is one-to-one call, so we can use the first replica id
	const replicaId = replicaIds[0];

	console.log('[MainVideo] Replica IDs:', replicaIds);
	console.log('[MainVideo] Local ID:', localId);
	console.log('[MainVideo] Replica ID (first):', replicaId);
	console.log('[MainVideo] Video state:', videoState);

	if (!replicaId) {
		console.log('[MainVideo] No replica ID, showing waiting message');
		return (
			<div className={styles.waitingContainer}>
				<video
					autoPlay
					loop
					muted
					playsInline
					className={styles.waitingVideo}
				>
					<source src="/north pole.mp4" type="video/mp4" />
				</video>
				<p className={styles.waitingText}>Connecting to the North Pole...</p>
			</div>
		);
	}

	// Switching between replica video and screen sharing video
	return (
		<div
			className={`${styles.mainVideoContainer} ${isScreenSharing ? styles.mainVideoContainerScreenSharing : ''}`}
		>
			<DailyVideo
				automirror
				sessionId={isScreenSharing ? localId : replicaId}
				type={isScreenSharing ? 'screenVideo' : 'video'}
				className={`${styles.mainVideo}
				${isScreenSharing ? styles.mainVideoScreenSharing : ''}
				${videoState.isOff ? styles.mainVideoHidden : ''}`}
			/>

			<DailyAudioTrack sessionId={replicaId} />
		</div>
	);
});

export const Conversation = React.memo(({ onLeave, conversationUrl, conversationId }) => {
	const { joinCall, leaveCall, onAppMessage, sendAppMessage } = useCVICall();
	const meetingState = useMeetingState();
	const { hasMicError, microphones, cameras, currentMic, currentCam, setMicrophone, setCamera } = useDevices();
	const { isCamMuted, onToggleCamera } = useLocalCamera();
	const { isMicMuted, onToggleMicrophone, localSessionId } = useLocalMicrophone();
	const { currentScore, nicePercentage, processMessage } = useScoreTracking();
	const [countdown, setCountdown] = useState(120); // 2 minutes = 120 seconds
	const [showMicDropdown, setShowMicDropdown] = useState(false);
	const [showVideoDropdown, setShowVideoDropdown] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);
	const micDropdownRef = useRef(null);
	const videoDropdownRef = useRef(null);
	const scoreContextSentRef = useRef(false);

	console.log('[Conversation] Component rendered, conversationUrl:', conversationUrl);
	console.log('[Conversation] Meeting state:', meetingState);
	console.log('[Conversation] Has mic error:', hasMicError);
	console.log('[Conversation] Score state:', {
		currentScore,
		nicePercentage,
		expectedNiceSegments: Math.max(0, Math.min(10, currentScore)),
		totalSegments: 10,
	});

	// Verify score context format on mount
	useEffect(() => {
		const scoreContext = getCurrentScoreContext('user', 'santa-call');
		console.log('[Conversation] 🔍 Score context verification:', {
			scoreContext,
			expectedFormat: '<current_score>+0</current_score>',
			hasOpeningTag: scoreContext.includes('<current_score>'),
			hasClosingTag: scoreContext.includes('</current_score>'),
			formatValid: scoreContext.includes('<current_score>') && scoreContext.includes('</current_score>'),
			currentScore,
		});
	}, [currentScore]);

	// Track countdown timer (2 minutes)
	useEffect(() => {
		if (meetingState === 'joined-meeting') {
			setCountdown(120); // Reset to 2 minutes when joined
			const interval = setInterval(() => {
				setCountdown(prev => {
					if (prev <= 1) {
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
			return () => clearInterval(interval);
		} else {
			setCountdown(120);
		}
	}, [meetingState]);

	// Listen for Tavus CVI events to process AI responses
	// The processMessage function extracts score tags (<+> and <->) from text
	// and updates the score accordingly. It also returns the text with tags removed.
	//
	// ⚠️ CRITICAL: The LLM must be configured with a system prompt that instructs it to include
	// <+> and <-> tags in its responses. This is typically configured in:
	// - Tavus dashboard/persona settings
	// - Backend conversation creation
	// - Coda database if using that for persona config
	//
	// The system prompt should include instructions like:
	// "Add <+> for positive behavior, <-> for negative behavior. Tags are invisible to users."
	useEffect(() => {
		if (!onAppMessage) {
			console.log('[Conversation] onAppMessage not available, skipping Tavus CVI event listeners');
			return;
		}

		console.log('[Conversation] Setting up Tavus CVI event listeners for score tracking');

		const unsubscribe = onAppMessage((event) => {
			// Log full event structure for debugging
			console.log('[Conversation] 🔍 FULL EVENT:', {
				eventType: event?.data?.event_type || 'NO_EVENT_TYPE',
				message_type: event?.data?.message_type || 'NO_MESSAGE_TYPE',
				role: event?.data?.properties?.role || event?.data?.role || 'NO_ROLE',
				hasText: !!(event?.data?.text || event?.data?.utterance || event?.data?.transcript || event?.data?.content || event?.data?.properties?.text || event?.data?.properties?.speech || event?.data?.properties?.utterance),
				text: event?.data?.text || event?.data?.utterance || event?.data?.transcript || 'NO TEXT',
				properties: event?.data?.properties,
				fullData: event?.data,
			});

			// Log raw event structure
			console.log('[Conversation] 📦 RAW EVENT:', JSON.stringify(event, null, 2));

			const { data } = event;
			const eventType = data?.event_type || '';

			// Check for more specific event types that might contain utterances
			const isUtteranceEvent =
				eventType.includes('utterance') ||
				eventType.includes('transcript') ||
				eventType === 'conversation.replica.utterance' ||
				eventType === 'replica.utterance' ||
				eventType === 'conversation.utterance';

			// Send score context when replica is present (once per conversation)
			if (eventType === 'system.replica_present' && !scoreContextSentRef.current && conversationId) {
				const scoreContext = getCurrentScoreContext('user', 'santa-call');

				// Verify score context format
				console.log('[Conversation] 📤 Attempting to send score context:', {
					scoreContext,
					conversationId,
					hasSendAppMessage: !!sendAppMessage,
					expectedFormat: '<current_score>+0</current_score>',
					matches: scoreContext.includes('<current_score>') && scoreContext.includes('</current_score>'),
				});

				if (sendAppMessage) {
					sendAppMessage({
						message_type: "conversation",
						event_type: "conversation.respond",
						conversation_id: conversationId,
						properties: {
							text: scoreContext,
						},
					});
					scoreContextSentRef.current = true;
					console.log('[Conversation] ✅ Score context sent successfully:', scoreContext);
				} else {
					console.error('[Conversation] ❌ sendAppMessage is not available!');
				}
			}

			// Try different paths to get the utterance text
			const utteranceText =
				event?.data?.text ||
				event?.data?.utterance ||
				event?.data?.transcript ||
				event?.data?.content ||
				event?.data?.properties?.text ||
				event?.data?.properties?.speech ||
				event?.data?.properties?.utterance ||
				event?.text ||
				event?.utterance ||
				'';

			// Try different paths to get the role
			const role =
				event?.data?.properties?.role ||
				event?.data?.role ||
				event?.properties?.role ||
				event?.role ||
				'';

			console.log('[Conversation] 📝 Extracted:', {
				utteranceText: utteranceText ? utteranceText.substring(0, 200) : 'NO TEXT',
				role,
				hasTags: utteranceText ? (utteranceText.includes('<+>') || utteranceText.includes('<->')) : false,
				isUtteranceEvent,
				eventType,
			});

			// Only process replica (AI) utterances, not user messages
			// Check both role and event type to catch all possible utterance events
			if (
				(role === 'replica' || isUtteranceEvent) &&
				utteranceText &&
				typeof utteranceText === 'string' &&
				utteranceText.length > 0
			) {
				console.log('[Conversation] 📝 Processing replica utterance:', {
					eventType,
					role,
					utteranceLength: utteranceText.length,
					preview: utteranceText.substring(0, 200),
					hasPlus: utteranceText.includes('<+>'),
					hasMinus: utteranceText.includes('<->'),
					fullText: utteranceText, // Log full text to see if tags are present
				});

				// Process message - this extracts tags, updates score, and returns clean text
				const cleanText = processMessage(utteranceText);

				// The score has been updated automatically by processMessage
				// You can use cleanText if you need to display it somewhere
				console.log('[Conversation] ✅ Message processed:', {
					originalLength: utteranceText.length,
					cleanLength: cleanText.length,
					tagsRemoved: utteranceText.length !== cleanText.length,
				});
			} else {
				console.log('[Conversation] ⏭️ Skipping event - not a replica utterance:', {
					role,
					hasText: !!utteranceText,
					isUtteranceEvent,
					eventType,
				});
			}
		});

		console.log('[Conversation] Tavus CVI event listeners registered');

		return () => {
			console.log('[Conversation] Cleaning up Tavus CVI event listeners');
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [onAppMessage, sendAppMessage, conversationId, processMessage]);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (showMicDropdown && micDropdownRef.current && !micDropdownRef.current.contains(event.target)) {
				setShowMicDropdown(false);
			}
			if (showVideoDropdown && videoDropdownRef.current && !videoDropdownRef.current.contains(event.target)) {
				setShowVideoDropdown(false);
			}
		};

		if (showMicDropdown || showVideoDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [showMicDropdown, showVideoDropdown]);

	const formatDuration = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	useEffect(() => {
		console.log('[Conversation] Meeting state changed:', meetingState);
		if (meetingState === 'error') {
			console.error('[Conversation] Meeting state is error, calling onLeave');
			onLeave();
		}
		// Detect when call ends
		if (meetingState === 'left-meeting' || meetingState === 'ended') {
			console.log('[Conversation] Call ended, meeting state:', meetingState);
			onLeave();
		}
	}, [meetingState, onLeave]);

	// Initialize call when conversation is available
	useEffect(() => {
		console.log('[Conversation] useEffect triggered, conversationUrl:', conversationUrl);
		if (conversationUrl) {
			console.log('[Conversation] Calling joinCall with URL:', conversationUrl);
			joinCall({ url: conversationUrl });
		} else {
			console.warn('[Conversation] No conversationUrl provided, cannot join call');
		}
	}, [conversationUrl, joinCall]);

	const handleLeave = useCallback(() => {
		console.log('[Conversation] Handle leave called');
		leaveCall();
		onLeave();
	}, [leaveCall, onLeave]);

	const handleVideoContainerClick = () => {
		setIsToolbarVisible(prev => !prev);
	};

	return (
		<div className={styles.container}>
			<div className={styles.videoContainer} onClick={handleVideoContainerClick}>
				{hasMicError && (
					<div className={styles.errorContainer}>
						<p>Camera or microphone access denied. Please check your settings and try again.</p>
					</div>
				)}

				{/* Main video */}
				<div className={styles.mainVideoContainer}>
					<MainVideo />
				</div>

				{/* Self view */}
				<div className={styles.selfViewContainer}>
					<PreviewVideos />
				</div>
			</div>

			<div 
				className={`${styles.footer} ${!isToolbarVisible ? styles.footerHidden : ''}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Top Row: Call Controls */}
				<div className={styles.footerControlsTop}>
					{/* Volume Control */}
					<div className={styles.volumeControl}>
						<img 
							src="/icons/volume.svg" 
							alt="Volume" 
							className={styles.volumeIcon}
						/>
						<div className={styles.volumeSlider}>
							<div className={styles.volumeFill} style={{ width: '70%' }}></div>
						</div>
					</div>

					{/* Microphone Control */}
					<div className={styles.controlButtonWrapper} ref={micDropdownRef}>
						<button 
							type="button" 
							className={styles.controlButton}
							onClick={(e) => {
								// Only toggle if not clicking the arrow
								if (!e.target.classList.contains(styles.controlArrow)) {
									onToggleMicrophone();
								}
							}}
						>
							<span className={styles.controlIcon}>
								<img 
									src="/icons/mic.png" 
									alt="Microphone" 
									className={styles.iconImage}
								/>
							</span>
							<span className={styles.controlText}>{isMicMuted ? 'MIC OFF' : 'MIC ON'}</span>
							<span 
								className={styles.controlArrow}
								onClick={(e) => {
									e.stopPropagation();
									setShowMicDropdown(!showMicDropdown);
									setShowVideoDropdown(false);
								}}
							>↑</span>
						</button>
						{showMicDropdown && microphones && microphones.length > 0 && (
							<div className={styles.deviceDropdown}>
								{microphones.map(({ device }) => (
									<button
										key={device.deviceId}
										type="button"
										className={styles.deviceOption}
										onClick={() => {
											setMicrophone(device.deviceId);
											setShowMicDropdown(false);
										}}
									>
										{device.label}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Video Control */}
					<div className={styles.controlButtonWrapper} ref={videoDropdownRef}>
						<button 
							type="button" 
							className={styles.controlButton}
							onClick={(e) => {
								// Only toggle if not clicking the arrow
								if (!e.target.classList.contains(styles.controlArrow)) {
									onToggleCamera();
								}
							}}
						>
							<span className={styles.controlIcon}>
								<img 
									src="/icons/video.png" 
									alt="Video" 
									className={styles.iconImage}
								/>
							</span>
							<span className={styles.controlText}>{isCamMuted ? 'VIDEO OFF' : 'VIDEO ON'}</span>
							<span 
								className={styles.controlArrow}
								onClick={(e) => {
									e.stopPropagation();
									setShowVideoDropdown(!showVideoDropdown);
									setShowMicDropdown(false);
								}}
							>↑</span>
						</button>
						{showVideoDropdown && cameras && cameras.length > 0 && (
							<div className={styles.deviceDropdown}>
								{cameras.map(({ device }) => (
									<button
										key={device.deviceId}
										type="button"
										className={styles.deviceOption}
										onClick={() => {
											setCamera(device.deviceId);
											setShowVideoDropdown(false);
										}}
									>
										{device.label}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Bottom Row: Naughty/Nice Slider */}
				<div className={styles.footerControlsBottom}>
					<div className={styles.naughtyNiceBar}>
						<div className={styles.naughtyNiceContainer}>
							{Array.from({ length: 10 }).map((_, i) => {
								// Calculate segments based on score (-10 to +10)
								// Score 0 = 0 nice segments, 0 naughty segments (neutral)
								// Positive scores: nice segments from middle (index 5) to the right
								// Negative scores: naughty segments from middle-1 (index 4) to the left
								const totalSegments = 10;
								const middlePoint = totalSegments / 2; // 5

								const isNiceSegment = (i) => {
									if (currentScore > 0) {
										// For positive scores, light up segments from the middle (index 5) to the right
										return i >= middlePoint && i < (middlePoint + currentScore);
									}
									return false;
								};

								const isNaughtySegment = (i) => {
									if (currentScore < 0) {
										// For negative scores, light up segments from the middle-1 (index 4) to the left
										// Score -1: index 4
										// Score -2: indices 4, 3
										// Score -10: indices 4, 3, 2, 1, 0, -1, -2, -3, -4, -5 (clamped to 0-4)
										return i < middlePoint && i >= (middlePoint + currentScore);
									}
									return false;
								};

								const isNice = isNiceSegment(i);
								const isNaughty = isNaughtySegment(i);
								
								// Log on first render to debug
								if (i === 0) {
									const niceSegments = currentScore > 0 ? Math.min(5, currentScore) : 0;
									const naughtySegments = currentScore < 0 ? Math.min(5, -currentScore) : 0;
									console.log('[Conversation] Rendering naughty/nice bar:', {
										currentScore,
										niceSegments,
										naughtySegments,
										middlePoint,
										segmentStates: Array.from({ length: 10 }).map((_, idx) => ({
											index: idx,
											isNice: isNiceSegment(idx),
											isNaughty: isNaughtySegment(idx),
										})),
									});
								}
								
								return (
									<div
										key={i}
										className={`${styles.segment} ${isNice ? styles.segmentNice : isNaughty ? styles.segmentNaughty : ''}`}
									/>
								);
							})}
						</div>
						<div className={styles.naughtyNiceLabels}>
							<div className={styles.naughtySide}>
								<span className={styles.naughtyEmoji}>
									<img src="/icons/mood-sad.svg" alt="Sad" className={styles.moodIcon} />
								</span>
								<span className={styles.naughtyLabel}>NAUGHTY ←</span>
							</div>
							<span className={styles.centerEmoji}>
								<img src="/icons/mood-neutral.svg" alt="Neutral" className={styles.moodIcon} />
							</span>
							<div className={styles.niceSide}>
								<span className={styles.niceLabel}>→ NICE</span>
								<span className={styles.niceEmoji}>
									<img src="/icons/mood-happy.svg" alt="Happy" className={styles.moodIcon} />
								</span>
							</div>
						</div>
					</div>

					{/* Close Button */}
					<button type="button" className={styles.leaveButton} onClick={handleLeave}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="white"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 6L6 18M6 6L18 18" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
});
