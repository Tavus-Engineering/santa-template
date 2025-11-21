import { useCallback, useEffect, useRef } from 'react';
import { useDaily } from '@daily-co/daily-react';

export const useCVICall = () => {
	const daily = useDaily();
	const appMessageHandlersRef = useRef(new Set());

	console.log('[useCVICall] Daily instance:', daily ? 'exists' : 'null');

	const joinCall = useCallback(
		({ url }) => {
			console.log('[useCVICall] joinCall called with URL:', url);
			if (!daily) {
				console.error('[useCVICall] Daily instance is null, cannot join call');
				return;
			}
			if (!url) {
				console.error('[useCVICall] No URL provided to joinCall');
				return;
			}
			console.log('[useCVICall] Calling daily.join with URL:', url);
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
				console.log('[useCVICall] daily.join called successfully');
			} catch (error) {
				console.error('[useCVICall] Error calling daily.join:', error);
			}
		},
		[daily]
	);

	const leaveCall = useCallback(() => {
		console.log('[useCVICall] leaveCall called');
		daily?.leave();
	}, [daily]);

	// Set up app message listener
	useEffect(() => {
		if (!daily) return;

		const handleAppMessage = (event) => {
			console.log('[useCVICall] App message received:', event);
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
		console.log('[useCVICall] Registering app message handler');
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
			console.log('[useCVICall] Sending app message:', message);
			try {
				daily.sendAppMessage(message, '*');
			} catch (error) {
				console.error('[useCVICall] Error sending app message:', error);
			}
		},
		[daily]
	);

	return { joinCall, leaveCall, onAppMessage, sendAppMessage };
};
