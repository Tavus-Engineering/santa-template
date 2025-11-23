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
			
			// Check if already in a meeting by checking if room exists
			const currentRoom = daily.room();
			if (currentRoom) {
				console.log('[useCVICall] Already in meeting, leaving before joining new call');
				
				let hasJoined = false;
				
				// Set up one-time listener for left-meeting event
				const handleLeft = () => {
					if (hasJoined) return;
					hasJoined = true;
					daily.off('left-meeting', handleLeft);
					daily.off('error', handleError);
					clearTimeout(timeoutId);
					
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
					}, 200);
				};
				
				const handleError = (error) => {
					if (hasJoined) return;
					hasJoined = true;
					daily.off('left-meeting', handleLeft);
					daily.off('error', handleError);
					clearTimeout(timeoutId);
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
					}, 200);
				};
				
				// Timeout fallback in case event doesn't fire
				const timeoutId = setTimeout(() => {
					if (hasJoined) return;
					hasJoined = true;
					daily.off('left-meeting', handleLeft);
					daily.off('error', handleError);
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
					}, 200);
				}, 3000); // 3 second timeout
				
				daily.on('left-meeting', handleLeft);
				daily.on('error', handleError);
				
				// Leave the current meeting
				daily.leave();
				return;
			}
			
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
