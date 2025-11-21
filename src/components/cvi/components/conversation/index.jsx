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
	const echo30sSentRef = useRef(false);
	const echo5sSentRef = useRef(false);
	const echo30sIndexRef = useRef(0);
	const echo5sIndexRef = useRef(0);


	// Track countdown timer (2 minutes)
	useEffect(() => {
		if (meetingState === 'joined-meeting') {
			setCountdown(120); // Reset to 2 minutes when joined
			// Reset echo message flags when joining
			echo30sSentRef.current = false;
			echo5sSentRef.current = false;
			echo30sIndexRef.current = 0;
			echo5sIndexRef.current = 0;
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

	// Echo interactions at 30s and 5s
	useEffect(() => {
		if (!sendAppMessage || !conversationId || meetingState !== 'joined-meeting') {
			return;
		}

		const messages30s = [
			"Almost time for me to head out, quick, what's your Christmas wish?",
			"My sleigh leaves soon! Tell me something festive you're excited about this year.",
			"I have to leave shortly, has this year treated you well?",
			"I'll be on my way soon, don't forget to spread a little Christmas cheer!"
		];

		const messages5s = [
			"I have to dash off now, take care!",
			"Ho ho ho! I must be on my way, until next time!"
		];

		// Send echo at 30 seconds
		if (countdown === 30 && !echo30sSentRef.current) {
			const message = messages30s[echo30sIndexRef.current];
			sendAppMessage({
				message_type: "conversation",
				event_type: "conversation.echo",
				conversation_id: conversationId,
				properties: {
					modality: "text",
					text: message,
					done: "true"
				}
			});
			echo30sSentRef.current = true;
			// Rotate to next message for next conversation
			echo30sIndexRef.current = (echo30sIndexRef.current + 1) % messages30s.length;
		}

		// Send echo at 5 seconds
		if (countdown === 5 && !echo5sSentRef.current) {
			const message = messages5s[echo5sIndexRef.current];
			sendAppMessage({
				message_type: "conversation",
				event_type: "conversation.echo",
				conversation_id: conversationId,
				properties: {
					modality: "text",
					text: message,
					done: "true"
				}
			});
			echo5sSentRef.current = true;
			// Rotate to next message for next conversation
			echo5sIndexRef.current = (echo5sIndexRef.current + 1) % messages5s.length;
		}
	}, [countdown, sendAppMessage, conversationId, meetingState]);

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
			return;
		}

		const unsubscribe = onAppMessage((event) => {
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
				} else {
					console.error('[Conversation] sendAppMessage is not available!');
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

			// Only process replica (AI) utterances, not user messages
			// Check both role and event type to catch all possible utterance events
			if (
				(role === 'replica' || isUtteranceEvent) &&
				utteranceText &&
				typeof utteranceText === 'string' &&
				utteranceText.length > 0
			) {
				// Process message - this extracts tags, updates score, and returns clean text
				processMessage(utteranceText);
			}
		});

		return () => {
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
		if (meetingState === 'error') {
			console.error('[Conversation] Meeting state is error, calling onLeave');
			onLeave();
		}
		// Detect when call ends
		if (meetingState === 'left-meeting' || meetingState === 'ended') {
			onLeave();
		}
	}, [meetingState, onLeave]);

	// Initialize call when conversation is available
	useEffect(() => {
		if (conversationUrl) {
			joinCall({ url: conversationUrl });
		}
	}, [conversationUrl, joinCall]);

	const handleLeave = useCallback(() => {
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
							{Array.from({ length: 11 }).map((_, i) => {
								// 11 segments total: 5 naughty (left), 1 neutral (middle), 5 nice (right)
								// Middle segment (index 5) is always neutral gray
								const middleIndex = 5;
								const isNeutral = i === middleIndex;
								
								// Calculate segments based on score (-10 to +10)
								// Every 2 points = 1 segment, so score 10 = 5 segments (full nice side)
								const segmentCount = currentScore / 2;

								const getSegmentState = (i) => {
									// Middle segment is always neutral
									if (isNeutral) {
										return { isNice: false, isNaughty: false, isNeutral: true, opacity: 1 };
									}
									
									if (currentScore > 0) {
										// For positive scores, light up segments from the middle+1 (index 6) to the right
										const startIndex = middleIndex + 1; // Start from index 6
										const endIndex = startIndex + segmentCount;
										
										// Check if this segment is in the range [startIndex, endIndex)
										if (i < startIndex || i >= Math.ceil(endIndex)) {
											return { isNice: false, isNaughty: false, isNeutral: false, opacity: 1 };
										}
										
										// Check if this is the last segment and it's partial
										if (endIndex % 1 !== 0 && i === Math.floor(endIndex)) {
											const partialAmount = endIndex % 1;
											return { isNice: true, isNaughty: false, isNeutral: false, opacity: partialAmount };
										}
										
										return { isNice: true, isNaughty: false, isNeutral: false, opacity: 1 };
									} else if (currentScore < 0) {
										// For negative scores, light up segments from the middle-1 (index 4) to the left
										const startIndex = middleIndex - 1; // Start from index 4
										const absSegmentCount = Math.abs(segmentCount);
										const endIndex = startIndex - absSegmentCount;
										
										if (i <= Math.floor(endIndex) || i > startIndex) {
											return { isNice: false, isNaughty: false, isNeutral: false, opacity: 1 };
										}
										
										if (endIndex % 1 !== 0 && i === Math.ceil(endIndex)) {
											const partialAmount = 1 - (endIndex % 1);
											return { isNice: false, isNaughty: true, isNeutral: false, opacity: partialAmount };
										}
										
										return { isNice: false, isNaughty: true, isNeutral: false, opacity: 1 };
									}
									
									// Score 0 - neutral (except middle segment which is always neutral)
									return { isNice: false, isNaughty: false, isNeutral: false, opacity: 1 };
								};

								const segmentState = getSegmentState(i);
								
								// Calculate color based on position for gradient effect
								const getSegmentColor = () => {
									if (segmentState.isNeutral) {
										return '#D3D3D3'; // Gray for neutral
									}
									
									if (segmentState.isNaughty) {
										// Orange/yellow to red gradient (5 segments: indices 0-4)
										// Index 0 = orange/yellow, index 4 = red
										const naughtyIndex = i; // 0-4
										const ratio = naughtyIndex / 4; // 0 to 1
										// Orange/yellow (255, 165, 0) to red (220, 20, 20)
										const red = Math.round(255 - (ratio * 35)); // 255 to 220
										const green = Math.round(165 - (ratio * 145)); // 165 to 20
										const blue = 0; // Always 0 for orange/yellow to red
										return `rgb(${red}, ${green}, ${blue})`;
									}
									
									if (segmentState.isNice) {
										// Yellow to green gradient (5 segments: indices 6-10)
										// Index 6 = yellow, index 10 = green
										const niceIndex = i - 6; // 0-4
										const ratio = niceIndex / 4; // 0 to 1
										// Yellow (255, 255, 0) to green (34, 139, 34)
										const red = Math.round(255 - (ratio * 221)); // 255 to 34
										const green = Math.round(255 - (ratio * 116)); // 255 to 139
										const blue = Math.round(0 + (ratio * 34)); // 0 to 34
										return `rgb(${red}, ${green}, ${blue})`;
									}
									
									return '#D3D3D3'; // Default gray
								};
								
								return (
									<div
										key={i}
										className={styles.segment}
										style={{
											backgroundColor: getSegmentColor(),
											opacity: segmentState.isNice || segmentState.isNaughty ? segmentState.opacity : 1,
										}}
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
