import { useCallback } from 'react';
import { useDaily } from '@daily-co/daily-react';

export const useCVICall = () => {
	const daily = useDaily();

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

	return { joinCall, leaveCall };
};
