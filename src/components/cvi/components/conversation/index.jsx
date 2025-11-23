import React, { useEffect, useCallback, useState, useRef, useImperativeHandle, forwardRef } from 'react';
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
import { get5SecondMessages } from '../../../../utils/santaGreetings';
import { AudioWave } from '../audio-wave';
import { NaughtyNiceBar } from '../../../NaughtyNiceBar/NaughtyNiceBar';

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

export const Conversation = React.memo(forwardRef(({ onLeave, conversationUrl, conversationId, selectedLanguage = 'en', shouldJoin = false }, ref) => {
	const { joinCall, leaveCall, onAppMessage, sendAppMessage } = useCVICall();
	const meetingState = useMeetingState();
	const { hasMicError, microphones, cameras, currentMic, currentCam, setMicrophone, setCamera } = useDevices();
	const { isCamMuted, onToggleCamera } = useLocalCamera();
	const { isMicMuted, onToggleMicrophone, localSessionId } = useLocalMicrophone();
	const { currentScore, processMessage } = useScoreTracking();
	const [countdown, setCountdown] = useState(180); // Will be updated with remaining time
	const [showMicDropdown, setShowMicDropdown] = useState(false);
	const [showVideoDropdown, setShowVideoDropdown] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);
	const [isReplicaPresent, setIsReplicaPresent] = useState(false);
	const micDropdownRef = useRef(null);
	const videoDropdownRef = useRef(null);
	const scoreContextSentRef = useRef(false);
	const echo5sSentRef = useRef(false);
	const timeCheck60sSentRef = useRef(false);
	const echo5sIndexRef = useRef(0);
	const isReplicaSpeakingRef = useRef(false);
	const timeCheck60sPendingRef = useRef(false);
	const callStartTimeRef = useRef(null);
	const usageRecordedRef = useRef(false);
	const hasJoinedRef = useRef(false);

	const handleLeave = useCallback(() => {
		leaveCall();
		onLeave();
	}, [leaveCall, onLeave]);

	// Expose leave function to parent via ref
	useImperativeHandle(ref, () => ({
		leave: handleLeave
	}), [handleLeave]);

	// Fetch remaining time and initialize countdown timer
	// Only start timer when both participant has joined AND replica is present
	useEffect(() => {
		if (meetingState === 'joined-meeting' && isReplicaPresent) {
			// Fetch remaining time from usage API
			fetch('/api/check-usage')
				.then(res => res.json())
				.then(data => {
					const remainingSeconds = Math.max(0, data.remainingSeconds || 180);
					setCountdown(remainingSeconds);
					console.log('[Conversation] Initialized timer with remaining time:', remainingSeconds, 'seconds');
				})
				.catch(error => {
					console.error('[Conversation] Failed to fetch remaining time:', error);
					// Fallback to 180 seconds if API call fails
					setCountdown(180);
				});
			
			// Record call start time
			callStartTimeRef.current = Date.now();
			usageRecordedRef.current = false;
			// Reset echo message flags when joining
			echo5sSentRef.current = false;
			timeCheck60sSentRef.current = false;
			timeCheck60sPendingRef.current = false;
			echo5sIndexRef.current = 0;
			// Reset context flags when joining
			scoreContextSentRef.current = false;
			// Reset replica speaking state
			isReplicaSpeakingRef.current = false;
			
			// Start countdown timer
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
			setCountdown(180);
		}
	}, [meetingState, isReplicaPresent]);

	// Automatically end call when countdown reaches 0
	useEffect(() => {
		if (countdown === 0 && meetingState === 'joined-meeting' && isReplicaPresent) {
			console.log('[Conversation] Countdown reached 0, ending call');
			handleLeave();
		}
	}, [countdown, meetingState, isReplicaPresent, handleLeave]);

	// Send time check utterance event at 60 seconds (or when 60 seconds remain)
	useEffect(() => {
		if (!sendAppMessage || !conversationId || meetingState !== 'joined-meeting' || !isReplicaPresent) {
			return;
		}

		// Send time check utterance event at 60 seconds remaining
		if (countdown === 60 && !timeCheck60sSentRef.current && !timeCheck60sPendingRef.current) {
			// Check if replica is currently speaking
			if (isReplicaSpeakingRef.current) {
				// Replica is speaking, wait until it finishes
				timeCheck60sPendingRef.current = true;
				console.log('[Conversation] Time check at 60 seconds - waiting for replica to finish speaking');
			} else {
				// Replica is not speaking, send immediately
				const timeCheckText = "<time_check> Do not respond to this message. Instead, take this as an indicator that we have 60 seconds left in this conversation and we should execute our end call process. Make a natural transition to end the call accounting for what the user is about to say next <time_check>";
				
				sendAppMessage({
					message_type: "conversation",
					event_type: "conversation.respond",
					conversation_id: conversationId,
					properties: {
						text: timeCheckText
					}
				});
				timeCheck60sSentRef.current = true;
				console.log('[Conversation] Time check utterance sent at 60 seconds');
			}
		}
	}, [countdown, sendAppMessage, conversationId, meetingState, isReplicaPresent]);

	// Echo interactions at 5s
	useEffect(() => {
		if (!sendAppMessage || !conversationId || meetingState !== 'joined-meeting' || !isReplicaPresent) {
			return;
		}

		const messages5s = get5SecondMessages(selectedLanguage);

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
	}, [countdown, sendAppMessage, conversationId, meetingState, selectedLanguage, isReplicaPresent]);

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

			// Monitor replica speaking events
			if (eventType === 'replica.start_speaking' || eventType === 'conversation.replica.start_speaking') {
				isReplicaSpeakingRef.current = true;
				console.log('[Conversation] Replica started speaking');
			}

			if (eventType === 'replica.end_speaking' || eventType === 'conversation.replica.end_speaking') {
				isReplicaSpeakingRef.current = false;
				console.log('[Conversation] Replica finished speaking');
				
				// If we were waiting to send the 60s time check, send it now
				if (timeCheck60sPendingRef.current && !timeCheck60sSentRef.current && sendAppMessage && conversationId) {
					const timeCheckText = "<time_check> Do not respond to this message. Instead, take this as an indicator that we have 60 seconds left in this conversation and we should execute our end call process. Make a natural transition to end the call accounting for what the user is about to say next <time_check>";
					
					sendAppMessage({
						message_type: "conversation",
						event_type: "conversation.respond",
						conversation_id: conversationId,
						properties: {
							text: timeCheckText
						}
					});
					timeCheck60sSentRef.current = true;
					timeCheck60sPendingRef.current = false;
					console.log('[Conversation] Time check utterance sent at 60 seconds (after replica finished speaking)');
				}
			}

			// Check for more specific event types that might contain utterances
			const isUtteranceEvent =
				eventType.includes('utterance') ||
				eventType.includes('transcript') ||
				eventType === 'conversation.replica.utterance' ||
				eventType === 'replica.utterance' ||
				eventType === 'conversation.utterance';


			// Replica is present - mark it and send score context (once per conversation)
			if (eventType === 'system.replica_present') {
				console.log('[Conversation] Replica is present - participant can now be considered fully joined');
				setIsReplicaPresent(true);
				
				if (!scoreContextSentRef.current && conversationId) {
					try {
						const scoreContext = getCurrentScoreContext('user', 'santa-call', currentScore);

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
					} catch (error) {
						console.error('[Conversation] Error sending score context:', error);
					}
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
	}, [onAppMessage, sendAppMessage, conversationId, processMessage, currentScore]);

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

	// Record usage when call ends
	useEffect(() => {
		if ((meetingState === 'left-meeting' || meetingState === 'ended' || meetingState === 'error') && 
		    callStartTimeRef.current && !usageRecordedRef.current) {
			const callDuration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
			const actualDuration = Math.min(callDuration, 180); // Cap at 3 minutes
			
			// Record usage to backend
			fetch('/api/record-usage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					durationSeconds: actualDuration
				})
			}).catch(error => {
				console.error('[Conversation] Failed to record usage:', error);
			});
			
			usageRecordedRef.current = true;
			console.log('[Conversation] Recorded usage:', actualDuration, 'seconds');
		}
	}, [meetingState]);

	useEffect(() => {
		if (meetingState === 'error') {
			console.error('[Conversation] Meeting state is error, calling onLeave');
			setIsReplicaPresent(false);
			hasJoinedRef.current = false;
			onLeave();
		}
		// Detect when call ends
		if (meetingState === 'left-meeting' || meetingState === 'ended') {
			setIsReplicaPresent(false);
			hasJoinedRef.current = false;
			onLeave();
		}
	}, [meetingState, onLeave]);

	// Initialize call when conversation is available AND shouldJoin is true
	// Flow: 
	// 1. Conversation is created (replica joins automatically on Tavus side)
	// 2. User goes through hair check
	// 3. User clicks "JOIN VIDEO CALL" → shouldJoin becomes true
	// 4. Participant joins the call (daily.join)
	// 5. We wait for system.replica_present event to confirm replica is in the call
	// 6. Only after replica is present do we consider participant "fully joined"
	// 7. Greeting fires when participant joins (controlled by Tavus)
	useEffect(() => {
		if (conversationUrl && shouldJoin && !hasJoinedRef.current) {
			console.log('[Conversation] Joining call - user clicked JOIN VIDEO CALL button');
			joinCall({ url: conversationUrl });
			hasJoinedRef.current = true;
			// Reset replica present state when joining new call
			setIsReplicaPresent(false);
		} else if (!shouldJoin || !conversationUrl) {
			// Reset join flag if shouldJoin becomes false (e.g., call ended/cancelled) or conversationUrl changes
			hasJoinedRef.current = false;
		}
	}, [conversationUrl, shouldJoin, joinCall]);

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
					{/* Timer Display */}
					<div className={styles.timerControl}>
						<span className={styles.timerText}>{formatDuration(countdown)}</span>
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
					<NaughtyNiceBar score={currentScore} />

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
}));
