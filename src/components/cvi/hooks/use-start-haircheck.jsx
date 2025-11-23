import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDaily, useDevices, useMeetingState } from '@daily-co/daily-react';

export const useStartHaircheck = () => {
	const daily = useDaily();
	const { micState } = useDevices();
	const meetingState = useMeetingState();

	const [permissionState, setPermissionState] = useState(null);

	useEffect(() => {
		// iOS Safari doesn't support navigator.permissions.query for camera/mic
		// So we'll rely on the camera state from Daily.co instead
		if (navigator.permissions && navigator.permissions.query) {
			navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
				setPermissionState(permissionStatus.state);
				permissionStatus.onchange = () => {
					setPermissionState(permissionStatus.state);
				};
			}).catch(() => {
				// If permissions API fails (iOS Safari), set to null and rely on camera state
				setPermissionState(null);
			});
		} else {
			// iOS Safari - set to null, we'll use camera state instead
			setPermissionState(null);
		}
	}, []);

	const requestPermissions = useCallback(() => {
		if (!daily) return;
		
		// Don't start camera if already in a meeting - use setLocalVideo/setLocalAudio instead
		if (meetingState === 'joined-meeting' || meetingState === 'joining-meeting') {
			console.log('[useStartHaircheck] Already in meeting, skipping startCamera');
			return;
		}
		
		try {
			daily.startCamera({
				startVideoOff: false,
				startAudioOff: false,
				audioSource: 'default',
			});
		} catch (error) {
			// Ignore errors about already being in a meeting
			if (error.message && error.message.includes('not supported after joining')) {
				console.log('[useStartHaircheck] Camera start not supported (already in meeting)');
				return;
			}
			console.error('[useStartHaircheck] Failed to start camera:', error);
		}
	}, [daily, meetingState]);

	const isPermissionsPrompt = useMemo(() => {
		return permissionState === 'prompt';
	}, [permissionState]);

	const isPermissionsLoading = useMemo(() => {
		// If permissionState is null (iOS Safari), check micState instead
		if (permissionState === null) {
			return micState === 'idle' || micState === 'loading';
		}
		return (permissionState === null || permissionState === 'granted') && micState === 'idle';
	}, [permissionState, micState]);

	const isPermissionsGranted = useMemo(() => {
		// If permissionState is null (iOS Safari), check if micState is granted
		if (permissionState === null) {
			return micState === 'granted';
		}
		return permissionState === 'granted';
	}, [permissionState, micState]);

	const isPermissionsDenied = useMemo(() => {
		return permissionState === 'denied';
	}, [permissionState]);

	return {
		isPermissionsPrompt,
		isPermissionsLoading,
		isPermissionsGranted,
		isPermissionsDenied,
		requestPermissions,
	};
};
