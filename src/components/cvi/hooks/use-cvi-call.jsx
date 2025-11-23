import { useCallback, useEffect, useRef } from 'react';
import { useDaily } from '@daily-co/daily-react';

export const useCVICall = () => {
	const daily = useDaily();
	const appMessageHandlersRef = useRef(new Set());

	const joinCall = useCallback(
		({ url }) => {
			if (!daily) {
				console.error('[useCVICall] Daily instance is null, cannot join call');
				return;
			}
			if (!url) {
				console.error('[useCVICall] No URL provided to joinCall');
				return;
			}
			
			// Check meeting state first - most reliable way to check if we're in a meeting
			const meetingState = daily.meetingState();
			const isInMeeting = meetingState === 'joined-meeting' || meetingState === 'joining-meeting';
			
			// Also check room URL to see if we're in a different meeting
			const currentRoom = daily.room();
			const currentRoomUrl = currentRoom?.config?.url || currentRoom?.url || (currentRoom?.name ? `https://tavus.daily.co/${currentRoom.name}` : null);
			const isInDifferentMeeting = isInMeeting && currentRoomUrl && currentRoomUrl !== url;
			
			if (isInDifferentMeeting || (isInMeeting && currentRoomUrl === url)) {
				// If we're already in this exact meeting, don't try to join again
				if (currentRoomUrl === url) {
					console.log('[useCVICall] Already in this meeting, skipping join');
					return;
				}
				
				// If we're in a different meeting, leave first
				console.log('[useCVICall] Already in different meeting, leaving before joining new call');
				
				let hasJoined = false;
				let cleanupDone = false;
				
				const cleanup = () => {
					if (cleanupDone) return;
					cleanupDone = true;
					daily.off('left-meeting', handleLeft);
					daily.off('error', handleError);
					if (timeoutId) clearTimeout(timeoutId);
				};
				
				// Set up one-time listener for left-meeting event
				const handleLeft = () => {
					if (hasJoined) return;
					hasJoined = true;
					cleanup();
					
					// Now safe to join after a brief delay to ensure cleanup
					setTimeout(() => {
						try {
							daily.join({
								url: url,
								inputSettings: {
									audio: {
										processor: {
											type: "noise-cancellation",
										},
									},
								},
							});
						} catch (error) {
							console.error('[useCVICall] Error calling daily.join:', error);
						}
					}, 300);
				};
				
				const handleError = (error) => {
					if (hasJoined) return;
					hasJoined = true;
					cleanup();
					console.error('[useCVICall] Error while leaving meeting:', error);
					// Try to join anyway after error
					setTimeout(() => {
						try {
							daily.join({
								url: url,
								inputSettings: {
									audio: {
										processor: {
											type: "noise-cancellation",
										},
									},
								},
							});
						} catch (joinError) {
							console.error('[useCVICall] Error calling daily.join after error:', joinError);
						}
					}, 300);
				};
				
				// Timeout fallback in case event doesn't fire
				const timeoutId = setTimeout(() => {
					if (hasJoined) return;
					hasJoined = true;
					cleanup();
					console.warn('[useCVICall] Timeout waiting for left-meeting event, attempting to join anyway');
					// Try to join after timeout
					setTimeout(() => {
						try {
							daily.join({
								url: url,
								inputSettings: {
									audio: {
										processor: {
											type: "noise-cancellation",
										},
									},
								},
							});
						} catch (error) {
							console.error('[useCVICall] Error calling daily.join after timeout:', error);
						}
					}, 300);
				}, 2000); // 2 second timeout
				
				daily.on('left-meeting', handleLeft);
				daily.on('error', handleError);
				
				// Leave the current meeting
				daily.leave();
				return;
			}
			
			// Not in a meeting, join directly
			try {
				daily.join({
					url: url,
					inputSettings: {
						audio: {
							processor: {
								type: "noise-cancellation",
							},
						},
					},
				});
			} catch (error) {
				// If error is about already being in meeting, leave and retry
				if (error.message && error.message.includes('already joined')) {
					console.log('[useCVICall] Caught "already joined" error, leaving and retrying');
					daily.leave();
					
					// Retry after leaving
					setTimeout(() => {
						try {
							daily.join({
								url: url,
								inputSettings: {
									audio: {
										processor: {
											type: "noise-cancellation",
										},
									},
								},
							});
						} catch (retryError) {
							console.error('[useCVICall] Error calling daily.join after retry:', retryError);
						}
					}, 500);
				} else {
					console.error('[useCVICall] Error calling daily.join:', error);
				}
			}
		},
		[daily]
	);

	const leaveCall = useCallback(() => {
		daily?.leave();
	}, [daily]);

	const endCall = useCallback(() => {
		// Leave the call (client-side participants can only leave, not end for all)
		daily?.leave();
	}, [daily]);

	// Set up app message listener
	useEffect(() => {
		if (!daily) return;

		const handleAppMessage = (event) => {
			// Call all registered handlers
			appMessageHandlersRef.current.forEach((handler) => {
				try {
					handler(event);
				} catch (error) {
					console.error('[useCVICall] Error in app message handler:', error);
				}
			});
		};

		daily.on('app-message', handleAppMessage);

		return () => {
			daily.off('app-message', handleAppMessage);
		};
	}, [daily]);

	const onAppMessage = useCallback((handler) => {
		appMessageHandlersRef.current.add(handler);
		return () => {
			appMessageHandlersRef.current.delete(handler);
		};
	}, []);

	const sendAppMessage = useCallback(
		(message) => {
			if (!daily) {
				console.error('[useCVICall] Cannot send app message: Daily instance not available');
				return;
			}
			try {
				daily.sendAppMessage(message, '*');
			} catch (error) {
				console.error('[useCVICall] Error sending app message:', error);
			}
		},
		[daily]
	);

	return { joinCall, leaveCall, endCall, onAppMessage, sendAppMessage };
};
