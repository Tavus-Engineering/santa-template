import React, { memo, useEffect, useState, useRef } from 'react';
import { DailyVideo, useDaily, useDevices } from '@daily-co/daily-react';
import { useTranslation } from '../../../../utils/translations';
import { useStartHaircheck } from '../../hooks/use-start-haircheck';
import { useLocalCamera } from '../../hooks/use-local-camera';
import { useLocalMicrophone } from '../../hooks/use-local-microphone';

import styles from './hair-check.module.css';

export const HairCheck = memo(({ isJoinBtnLoading = false, onJoin, onCancel, conversationUrl, conversationId, selectedLanguage = 'en' }) => {
	const t = useTranslation(selectedLanguage)
	const daily = useDaily();
	const { localSessionId, isCamMuted, onToggleCamera, isCamReady } = useLocalCamera();
	const { isMicMuted, onToggleMicrophone } = useLocalMicrophone();
	const { microphones, cameras, currentMic, currentCam, setMicrophone, setCamera } = useDevices();
	const [showMicDropdown, setShowMicDropdown] = useState(false);
	const [showVideoDropdown, setShowVideoDropdown] = useState(false);
	const [cameraStarted, setCameraStarted] = useState(false);
	const micDropdownRef = useRef(null);
	const videoDropdownRef = useRef(null);

	const {
		isPermissionsPrompt,
		isPermissionsLoading,
		isPermissionsGranted,
		isPermissionsDenied,
		requestPermissions,
	} = useStartHaircheck();

	useEffect(() => {
		requestPermissions();
	}, []);

	// Note: We don't join the call here anymore - we wait until the user clicks "JOIN VIDEO CALL"
	// This ensures the greeting fires when the user actually enters the call, not during preload

	// Track when camera actually starts (for iOS Safari)
	useEffect(() => {
		if (daily && isCamReady && !isCamMuted) {
			// Camera is ready and not muted
			setCameraStarted(true);
		} else if (isCamMuted) {
			setCameraStarted(false);
		}
	}, [daily, isCamReady, isCamMuted]);

	// Button is enabled when camera permissions are granted
	// Note: We don't check for Santa here since we join the call after the user clicks the button
	const cameraReady = isPermissionsGranted || (isCamReady && cameraStarted);
	const canProceed = cameraReady;

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (micDropdownRef.current && !micDropdownRef.current.contains(event.target)) {
				setShowMicDropdown(false);
			}
			if (videoDropdownRef.current && !videoDropdownRef.current.contains(event.target)) {
				setShowVideoDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const onCancelHairCheck = () => {
		if (daily) {
			daily.leave();
		}
		onCancel?.();
	};

	return (
		<div className={styles.container}>
			<div className={styles.videoSection}>
				{(canProceed && !isCamMuted && localSessionId) ? (
					<DailyVideo 
						type="video" 
						sessionId={localSessionId} 
						mirror 
						className={styles.dailyVideo}
						playsInline
						autoPlay
					/>
				) : (
					<div className={styles.placeholder}>
						<img 
							src="/processed-image (81).png" 
							alt="Santa background" 
						/>
						{/* Overlay handled by ::after pseudo-element in CSS */}
					</div>
				)}

				<div className={styles.controls}>
					{/* Microphone Control */}
					<div ref={micDropdownRef}>
						<button 
							onClick={(e) => {
								// Only toggle if not clicking the arrow
								if (!e.target.classList.contains(styles.arrow)) {
									onToggleMicrophone();
								}
							}}
						>
							<img 
								src="/icons/mic.svg" 
								alt="Microphone" 
							/>
							<span>{isMicMuted ? t('micOff') : t('micOn')}</span>
							<span 
								className={styles.arrow}
								onClick={(e) => {
									e.stopPropagation();
									setShowMicDropdown(!showMicDropdown);
									setShowVideoDropdown(false);
								}}
							>{showMicDropdown ? '▼' : '▲'}</span>
						</button>
						{showMicDropdown && microphones && microphones.length > 0 && (
							<div className={styles.dropdown}>
								{microphones.map(({ device }) => (
									<button
										key={device.deviceId}
										type="button"
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
					<div ref={videoDropdownRef}>
						<button 
							onClick={(e) => {
								// Only toggle if not clicking the arrow
								if (!e.target.classList.contains(styles.arrow)) {
									onToggleCamera();
								}
							}}
						>
							<img 
								src="/icons/video.svg" 
								alt="Video" 
							/>
							<span>{isCamMuted ? t('videoOff') : t('videoOn')}</span>
							<span 
								className={styles.arrow}
								onClick={(e) => {
									e.stopPropagation();
									setShowVideoDropdown(!showVideoDropdown);
									setShowMicDropdown(false);
								}}
							>{showVideoDropdown ? '▼' : '▲'}</span>
						</button>
						{showVideoDropdown && cameras && cameras.length > 0 && (
							<div className={styles.dropdown}>
								{cameras.map(({ device }) => (
									<button
										key={device.deviceId}
										type="button"
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
			</div>

			<aside className={styles.sidebar}>
				<h2>{t('meetSanta')}</h2>
				<p>{t('meetSantaDescription')}</p>
				{isPermissionsDenied ? (
					<button
						type="button"
						onClick={onCancelHairCheck}
						data-variant="cancel"
					>
						{t('cancel')}
					</button>
				) : (
					<button
						type="button"
						onClick={onJoin}
						disabled={false || isJoinBtnLoading}
						data-variant="primary"
					>
						<img
							src="/icons/video.svg"
							alt="Video"
							style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
						/>
						<span>{isJoinBtnLoading ? t('dialingToNorthPole') : t('joinVideoCall')}</span>
					</button>
				)}
				<footer>
					<p className={styles.legalText}>
						{t('legalText')}
					</p>
				</footer>
			</aside>
		</div>
	);
});

HairCheck.displayName = 'HairCheck';
