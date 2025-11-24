import React, { memo, useEffect, useState, useRef } from 'react';
import { DailyVideo, useDaily, useDevices } from '@daily-co/daily-react';
import { useTranslation } from '../../../../utils/translations';
import { useStartHaircheck } from '../../hooks/use-start-haircheck';
import { useLocalCamera } from '../../hooks/use-local-camera';
import { useLocalMicrophone } from '../../hooks/use-local-microphone';

import styles from './hair-check.module.css';

const JoinBtn = ({ onClick, disabled, className, loading, loadingText, t }) => {
	return (
		<button
			className={`${styles.buttonJoin} ${className || ''}`}
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			style={{ opacity: disabled || loading ? 0.6 : 1, cursor: disabled || loading ? 'not-allowed' : 'pointer' }}
		>
			<div className={styles.buttonJoinInner}>
				<img
					src="/icons/video.svg"
					alt="Video"
					style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
				/>
				<span>{loading ? (loadingText || t('dialingToNorthPole')) : t('joinVideoCall')}</span>
			</div>
		</button>
	);
};

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

	const getDescription = () => {
		if (isPermissionsPrompt) {
			return t('cameraMicReady');
		}
		if (isPermissionsLoading) {
			return t('gettingCameraMicReady');
		}
		if (isPermissionsDenied) {
			return t('cameraMicDenied');
		}
		return t('deviceReady');
	};
	return (
		<div className={styles.haircheckBlock}>
			<div className={styles.haircheckVideoSection}>
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
					<div className={styles.haircheckUserPlaceholder}>
						<img 
							src="/processed-image (81).png" 
							alt="Santa background" 
							className={styles.haircheckBackgroundImage}
						/>
						<div className={styles.haircheckBlurOverlay}></div>
					</div>
				)}

				<div className={styles.haircheckVideoControls}>
					{/* Microphone Control */}
					<div className={styles.controlButtonWrapper} ref={micDropdownRef}>
						<button 
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
									src="/icons/mic.svg" 
									alt="Microphone" 
									className={styles.iconImage}
								/>
							</span>
							<span className={styles.controlText}>{isMicMuted ? t('micOff') : t('micOn')}</span>
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
									src="/icons/video.svg" 
									alt="Video" 
									className={styles.iconImage}
								/>
							</span>
							<span className={styles.controlText}>{isCamMuted ? t('videoOff') : t('videoOn')}</span>
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
			</div>

			<div className={styles.haircheckSidebar}>
				<div className={styles.haircheckSidebarContent}>
					<div className={styles.haircheckContent}>
						<h2 className={styles.sidebarTitle}>{t('meetSanta')}</h2>
						<p className={styles.sidebarDescription}>{t('meetSantaDescription')}</p>
						<div className={styles.statusIndicator}>
							<div className={styles.statusIcon}></div>
							<span>{t('santaHasJoined')}</span>
						</div>
						{isPermissionsDenied ? (
							<button
								type="button"
								onClick={onCancelHairCheck}
								className={`${styles.buttonCancel} ${styles.buttonJoinDesktop}`}
							>
								{t('cancel')}
							</button>
						) : (
							<JoinBtn
								loading={isJoinBtnLoading}
								disabled={false}
								className={styles.buttonJoinDesktop}
								onClick={onJoin}
								t={t}
							/>
						)}
						<p className={styles.legalText}>
							{t('legalText')}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
});

HairCheck.displayName = 'HairCheck';
