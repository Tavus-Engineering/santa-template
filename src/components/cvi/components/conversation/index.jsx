import React, { useEffect, useCallback, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
	DailyAudioTrack,
	DailyVideo,
	useDaily,
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
// import { getCurrentScoreContext } from '../../../../utils/scoreUtils';
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

export const Conversation = React.memo(forwardRef(({ onLeave, conversationUrl, conversationId, selectedLanguage = 'en', shouldJoin = false, countdown = 180, setCountdown, onReplicaReady }, ref) => {
	const { joinCall, leaveCall, endCall, onAppMessage, sendAppMessage } = useCVICall();
	const daily = useDaily();
	const meetingState = useMeetingState();
	const { hasMicError, microphones, cameras, currentMic, currentCam, setMicrophone, setCamera } = useDevices();
	const { isCamMuted, onToggleCamera } = useLocalCamera();
	const { isMicMuted, onToggleMicrophone, localSessionId } = useLocalMicrophone();
	const { currentScore, processMessage } = useScoreTracking();
	const replicaIds = useReplicaIDs();
	const replicaId = replicaIds[0];
	const videoState = useVideoTrack(replicaId);
	const [showMicDropdown, setShowMicDropdown] = useState(false);
	const [showVideoDropdown, setShowVideoDropdown] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);
	const [isReplicaPresent, setIsReplicaPresent] = useState(false);
	const replicaReadyNotifiedRef = useRef(false);
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
	const muteTimeoutRef = useRef(null);
	const hasUnmutedAfterJoinRef = useRef(false);
	const replicaPresentProcessedRef = useRef(false);
	const waitingForReplicaRef = useRef(false);
	const replicaCheckIntervalRef = useRef(null);
	const joinCallRef = useRef(null);
	const isJoiningRef = useRef(false);

	// Store joinCall in ref to avoid dependency issues
	useEffect(() => {
		joinCallRef.current = joinCall;
	}, [joinCall]);

	const recordUsageIfNeeded = useCallback(() => {
		if (callStartTimeRef.current && !usageRecordedRef.current) {
			const callDuration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
			const actualDuration = Math.min(callDuration, 180); // Cap at 3 minutes
			
			console.log('[Conversation] Recording usage - Duration:', actualDuration, 'seconds, Call start:', new Date(callStartTimeRef.current).toISOString());
			
			// Record usage to backend
			fetch('/api/record-usage', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					durationSeconds: actualDuration
				})
			})
				.then(res => {
					if (!res.ok) {
						return res.json().then(err => Promise.reject(new Error(err.message || `HTTP ${res.status}`)));
					}
					return res.json();
				})
				.then(data => {
					console.log('[Conversation] Usage recorded successfully:', data);
					usageRecordedRef.current = true;
					callStartTimeRef.current = null;
				})
				.catch(error => {
					console.error('[Conversation] Failed to record usage:', error);
					usageRecordedRef.current = true;
					callStartTimeRef.current = null;
				});
		}
	}, []);

	const handleLeave = useCallback(() => {
		recordUsageIfNeeded();
		leaveCall();
		onLeave();
	}, [leaveCall, onLeave, recordUsageIfNeeded]);

	const handleEnd = useCallback(() => {
		recordUsageIfNeeded();
		// End the call (not just leave) - this ends it for all participants
		endCall();
		onLeave();
	}, [endCall, onLeave, recordUsageIfNeeded]);

	// Expose leave and end functions to parent via ref
	useImperativeHandle(ref, () => ({
		leave: handleLeave,
		end: handleEnd
	}), [handleLeave, handleEnd]);

	// Record call start time when meeting is joined (before replica is present)
	useEffect(() => {
		if (meetingState === 'joined-meeting' && !callStartTimeRef.current) {
			callStartTimeRef.current = Date.now();
			usageRecordedRef.current = false;
			console.log('[Conversation] Call started at:', new Date(callStartTimeRef.current).toISOString());
		}
	}, [meetingState]);

	// Reset flags when replica appears (timer is already initialized during haircheck)
	useEffect(() => {
		if (meetingState === 'joined-meeting' && isReplicaPresent) {
			// Reset echo message flags when joining
			echo5sSentRef.current = false;
			timeCheck60sSentRef.current = false;
			timeCheck60sPendingRef.current = false;
			echo5sIndexRef.current = 0;
			// Reset context flags when joining
			scoreContextSentRef.current = false;
			// Reset replica speaking state
			isReplicaSpeakingRef.current = false;
		}
	}, [meetingState, isReplicaPresent]);

	// Notify parent when replica is fully rendered and ready (has ID, is present, and video is not off)
	useEffect(() => {
		if (onReplicaReady && meetingState === 'joined-meeting' && replicaId && isReplicaPresent && videoState && !videoState.isOff && !replicaReadyNotifiedRef.current) {
			console.log('[Conversation] Replica is fully rendered and ready - notifying parent to start timer');
			replicaReadyNotifiedRef.current = true;
			onReplicaReady();
		}
	}, [meetingState, replicaId, isReplicaPresent, videoState, onReplicaReady]);

	// Automatically end call when countdown reaches 0
	useEffect(() => {
		if (countdown === 0 && meetingState === 'joined-meeting' && isReplicaPresent) {
			console.log('[Conversation] Countdown reached 0, ending call');
			handleEnd();
		}
	}, [countdown, meetingState, isReplicaPresent, handleEnd]);

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
	// The processMessage function extracts score tags (<scoring:+> and <scoring:->) from text
	// and updates the score accordingly. It also returns the text with tags removed.
	//
	// ⚠️ CRITICAL: The LLM must be configured with a system prompt that instructs it to include
	// <scoring:+> and <scoring:-> tags in its responses. This is typically configured in:
	// - Tavus dashboard/persona settings
	// - Backend conversation creation
	// - Coda database if using that for persona config
	//
	// The system prompt should include instructions like:
	// "Add <scoring:+> for positive behavior, <scoring:-> for negative behavior. Tags are invisible to users."
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
				// Only process this event once - it may fire multiple times
				if (!replicaPresentProcessedRef.current) {
					console.log('[Conversation] Replica is present - participant can now be considered fully joined');
					setIsReplicaPresent(true);
					replicaPresentProcessedRef.current = true;
					
					// if (!scoreContextSentRef.current && conversationId) {
					// 	try {
					// 		const scoreContext = getCurrentScoreContext('user', 'santa-call', currentScore);

					// 		if (sendAppMessage) {
					// 			sendAppMessage({
					// 				message_type: "conversation",
					// 				event_type: "conversation.respond",
					// 				conversation_id: conversationId,
					// 				properties: {
					// 					text: scoreContext,
					// 				},
					// 			});
					// 			scoreContextSentRef.current = true;
					// 		} else {
					// 			console.error('[Conversation] sendAppMessage is not available!');
					// 		}
					// 	} catch (error) {
					// 		console.error('[Conversation] Error sending score context:', error);
					// 	}
					// }
				}
				// Silently ignore duplicate events - no need to log them
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
			
			console.log('[Conversation] Recording usage - Duration:', actualDuration, 'seconds, Call start:', new Date(callStartTimeRef.current).toISOString());
			
			// Record usage to backend
			fetch('/api/record-usage', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					durationSeconds: actualDuration
				})
			})
				.then(res => {
					if (!res.ok) {
						return res.json().then(err => Promise.reject(new Error(err.message || `HTTP ${res.status}`)));
					}
					return res.json();
				})
				.then(data => {
					console.log('[Conversation] Usage recorded successfully:', data);
					usageRecordedRef.current = true;
					// Reset call start time for next call
					callStartTimeRef.current = null;
				})
				.catch(error => {
					console.error('[Conversation] Failed to record usage:', error);
					// Still mark as recorded to prevent duplicate attempts
					usageRecordedRef.current = true;
					// Reset call start time for next call
					callStartTimeRef.current = null;
				});
		} else if ((meetingState === 'left-meeting' || meetingState === 'ended' || meetingState === 'error') && !callStartTimeRef.current) {
			// Call ended but no start time was recorded (shouldn't happen, but log it)
			console.warn('[Conversation] Call ended but no start time was recorded');
		}
	}, [meetingState]);

	useEffect(() => {
		if (meetingState === 'error') {
			console.error('[Conversation] Meeting state is error, calling onLeave');
			recordUsageIfNeeded();
			setIsReplicaPresent(false);
			hasJoinedRef.current = false;
			hasUnmutedAfterJoinRef.current = false;
			replicaReadyNotifiedRef.current = false;
			if (muteTimeoutRef.current) {
				clearTimeout(muteTimeoutRef.current);
				muteTimeoutRef.current = null;
			}
			onLeave();
		}
		// Detect when call ends
		if (meetingState === 'left-meeting' || meetingState === 'ended') {
			recordUsageIfNeeded();
			setIsReplicaPresent(false);
			hasJoinedRef.current = false;
			hasUnmutedAfterJoinRef.current = false;
			replicaReadyNotifiedRef.current = false;
			if (muteTimeoutRef.current) {
				clearTimeout(muteTimeoutRef.current);
				muteTimeoutRef.current = null;
			}
			onLeave();
		}
	}, [meetingState, onLeave, recordUsageIfNeeded]);

	// Participant only joins when "JOIN VIDEO CALL" is pressed AND replica is confirmed to be ready
	// According to Tavus docs, replica automatically joins the Daily.co room when conversation is created
	// Flow: 
	// 1. Conversation is created when "answer his call" is pressed → replica should join automatically (Tavus handles this)
	// 2. User goes through hair check (gives replica time to join)
	// 3. User clicks "JOIN VIDEO CALL" → shouldJoin becomes true
	// 4. We check conversation status via Tavus API to verify replica is ready
	// 5. Once replica is confirmed ready, participant joins the Daily room
	// 6. Greeting fires when participant joins (controlled by Tavus)
	// 7. We wait for system.replica_present event to confirm replica is in the call
	// 8. Only after replica is present do we consider participant "fully joined"
	useEffect(() => {
		if (conversationUrl && conversationId && shouldJoin && !hasJoinedRef.current && !isJoiningRef.current) {
			console.log('[Conversation] User clicked JOIN VIDEO CALL - checking if replica is ready before joining...');
			waitingForReplicaRef.current = true;
			isJoiningRef.current = true;
			
			// Check conversation status via Tavus API to verify replica is ready
			const checkForReplica = async () => {
				// Guard: prevent multiple join attempts
				if (hasJoinedRef.current || !isJoiningRef.current) {
					return;
				}
				
				try {
					const response = await fetch(`/api/check-conversation-status?conversationId=${encodeURIComponent(conversationId)}`, {
						credentials: 'include'
					});
					
					if (response.ok) {
						const data = await response.json();
						if (data.hasReplica) {
							// Guard: prevent multiple join attempts
							if (hasJoinedRef.current || !isJoiningRef.current) {
								return;
							}
							
							console.log('[Conversation] Replica confirmed ready - joining call now');
							// Clear polling interval
							if (replicaCheckIntervalRef.current) {
								clearInterval(replicaCheckIntervalRef.current);
								replicaCheckIntervalRef.current = null;
							}
							waitingForReplicaRef.current = false;
							isJoiningRef.current = false;
							// Now join the call using ref to avoid dependency issues
							if (joinCallRef.current) {
								joinCallRef.current({ url: conversationUrl });
							}
							hasJoinedRef.current = true;
							hasUnmutedAfterJoinRef.current = false;
							replicaPresentProcessedRef.current = false;
							setIsReplicaPresent(false);
						} else {
							console.log('[Conversation] Replica not yet ready (status:', data.status, '), will check again...');
						}
					} else {
						console.error('[Conversation] Failed to check conversation status:', response.status);
						// Fallback: if we can't check status, assume replica is ready and join
						// (replica should join automatically when conversation is created)
						if (!replicaCheckIntervalRef.current && !hasJoinedRef.current && isJoiningRef.current) {
							console.warn('[Conversation] Status check failed - assuming replica is ready and joining');
							waitingForReplicaRef.current = false;
							isJoiningRef.current = false;
							if (joinCallRef.current) {
								joinCallRef.current({ url: conversationUrl });
							}
							hasJoinedRef.current = true;
							hasUnmutedAfterJoinRef.current = false;
							replicaPresentProcessedRef.current = false;
							setIsReplicaPresent(false);
						}
					}
				} catch (error) {
					console.error('[Conversation] Error checking conversation status:', error);
					// Fallback: if error, assume replica is ready and join
					if (!replicaCheckIntervalRef.current && !hasJoinedRef.current && isJoiningRef.current) {
						console.warn('[Conversation] Status check error - assuming replica is ready and joining');
						waitingForReplicaRef.current = false;
						isJoiningRef.current = false;
						if (joinCallRef.current) {
							joinCallRef.current({ url: conversationUrl });
						}
						hasJoinedRef.current = true;
						hasUnmutedAfterJoinRef.current = false;
						replicaPresentProcessedRef.current = false;
						setIsReplicaPresent(false);
					}
				}
			};
			
			// Check immediately
			checkForReplica();
			
			// Poll every 500ms until replica is ready (max 10 seconds = 20 attempts)
			let attempts = 0;
			const maxAttempts = 20;
			replicaCheckIntervalRef.current = setInterval(() => {
				// Guard: stop polling if already joined
				if (hasJoinedRef.current || !isJoiningRef.current) {
					clearInterval(replicaCheckIntervalRef.current);
					replicaCheckIntervalRef.current = null;
					return;
				}
				
				attempts++;
				if (attempts >= maxAttempts) {
					// Guard: prevent multiple join attempts
					if (hasJoinedRef.current || !isJoiningRef.current) {
						clearInterval(replicaCheckIntervalRef.current);
						replicaCheckIntervalRef.current = null;
						return;
					}
					
					console.warn('[Conversation] Timeout waiting for replica - joining anyway (replica should join automatically)');
					clearInterval(replicaCheckIntervalRef.current);
					replicaCheckIntervalRef.current = null;
					waitingForReplicaRef.current = false;
					isJoiningRef.current = false;
					if (joinCallRef.current) {
						joinCallRef.current({ url: conversationUrl });
					}
					hasJoinedRef.current = true;
					hasUnmutedAfterJoinRef.current = false;
					replicaPresentProcessedRef.current = false;
					setIsReplicaPresent(false);
					return;
				}
				checkForReplica();
			}, 500);
			
		} else if (!shouldJoin || !conversationUrl || !conversationId) {
			// Reset join flag if shouldJoin becomes false (e.g., call ended/cancelled) or conversationUrl changes
			if (replicaCheckIntervalRef.current) {
				clearInterval(replicaCheckIntervalRef.current);
				replicaCheckIntervalRef.current = null;
			}
			hasJoinedRef.current = false;
			isJoiningRef.current = false;
			hasUnmutedAfterJoinRef.current = false;
			replicaPresentProcessedRef.current = false;
			waitingForReplicaRef.current = false;
			// Clear mute timeout if call is cancelled
			if (muteTimeoutRef.current) {
				clearTimeout(muteTimeoutRef.current);
				muteTimeoutRef.current = null;
			}
		}
		
		// Cleanup on unmount
		return () => {
			if (replicaCheckIntervalRef.current) {
				clearInterval(replicaCheckIntervalRef.current);
				replicaCheckIntervalRef.current = null;
			}
		};
	}, [conversationUrl, conversationId, shouldJoin]);

	// Mute participant for first 6 seconds after joining
	useEffect(() => {
		if (!daily || meetingState !== 'joined-meeting' || !hasJoinedRef.current || hasUnmutedAfterJoinRef.current) {
			return;
		}

		// Mute audio immediately when participant joins
		console.log('[Conversation] Participant joined - muting audio for first 6 seconds');
		daily.setLocalAudio(false);

		// Unmute after 6 seconds
		muteTimeoutRef.current = setTimeout(() => {
			console.log('[Conversation] 6 seconds elapsed - unmuting participant audio');
			daily.setLocalAudio(true);
			hasUnmutedAfterJoinRef.current = true;
			muteTimeoutRef.current = null;
		}, 6000);

		// Cleanup timeout on unmount or if call ends
		return () => {
			if (muteTimeoutRef.current) {
				clearTimeout(muteTimeoutRef.current);
				muteTimeoutRef.current = null;
			}
		};
	}, [meetingState, daily]);

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
					<NaughtyNiceBar score={currentScore} selectedLanguage={selectedLanguage} />

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
