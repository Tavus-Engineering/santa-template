import React, { memo, useEffect, useState, useRef } from 'react';
import { DailyVideo, useDaily, useDevices, useMeetingState } from '@daily-co/daily-react';
import { useStartHaircheck } from '../../hooks/use-start-haircheck';
import { useLocalCamera } from '../../hooks/use-local-camera';
import { useLocalMicrophone } from '../../hooks/use-local-microphone';
import { useCVICall } from '../../hooks/use-cvi-call';
import { useReplicaIDs } from '../../hooks/use-replica-ids';

import styles from './hair-check.module.css';

const JoinBtn = ({ onClick, disabled, className, loading, loadingText }) => {
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
					src="/icons/video.png"
					alt="Video"
					style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
				/>
				<span>{loading ? (loadingText || 'Dialing in to the North Pole...') : 'JOIN VIDEO CALL'}</span>
			</div>
		</button>
	);
};

export const HairCheck = memo(({ isJoinBtnLoading = false, onJoin, onCancel, conversationUrl, conversationId }) => {
	const daily = useDaily();
	const { localSessionId, isCamMuted, onToggleCamera, isCamReady } = useLocalCamera();
	const { isMicMuted, onToggleMicrophone } = useLocalMicrophone();
	const { microphones, cameras, currentMic, currentCam, setMicrophone, setCamera } = useDevices();
	const [showMicDropdown, setShowMicDropdown] = useState(false);
	const [showVideoDropdown, setShowVideoDropdown] = useState(false);
	const [cameraStarted, setCameraStarted] = useState(false);
	const micDropdownRef = useRef(null);
	const videoDropdownRef = useRef(null);
	const hasPreloadedRef = useRef(false);

	const {
		isPermissionsPrompt,
		isPermissionsLoading,
		isPermissionsGranted,
		isPermissionsDenied,
		requestPermissions,
	} = useStartHaircheck();

	const { joinCall } = useCVICall();
	const meetingState = useMeetingState();
	const replicaIds = useReplicaIDs();
	const hasReplica = replicaIds.length > 0;

	useEffect(() => {
		requestPermissions();
	}, []);

	// Preload: join the call early so Santa can start spinning up
	useEffect(() => {
		if (conversationUrl && !hasPreloadedRef.current && daily && meetingState !== 'joined-meeting' && meetingState !== 'joining-meeting') {
			console.log('[HairCheck] Preloading: joining call to spin up Santa. URL:', conversationUrl);
			joinCall({ url: conversationUrl });
			hasPreloadedRef.current = true;
		}
	}, [conversationUrl, daily, meetingState, joinCall]);

	// Log when Santa joins
	useEffect(() => {
		if (hasReplica) {
			console.log('[HairCheck] Santa has joined! Replica IDs:', replicaIds);
		}
	}, [hasReplica, replicaIds]);

	// Track when camera actually starts (for iOS Safari)
	useEffect(() => {
		if (daily && isCamReady && !isCamMuted) {
			// Camera is ready and not muted
			setCameraStarted(true);
		} else if (isCamMuted) {
			setCameraStarted(false);
		}
	}, [daily, isCamReady, isCamMuted]);

	// Button is enabled when:
	// 1. Camera permissions are granted
	// 2. Santa (replica) has joined the call
	const cameraReady = isPermissionsGranted || (isCamReady && cameraStarted);
	const santaReady = hasReplica;
	const canProceed = cameraReady && santaReady;

	// Show loading state while Santa is spinning up
	const isWaitingForSanta = cameraReady && !santaReady && conversationUrl;

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
			return 'Make sure your camera and mic are ready!';
		}
		if (isPermissionsLoading) {
			return 'Getting your camera and mic ready...';
		}
		if (isPermissionsDenied) {
			return 'Camera and mic access denied. Allow permissions to continue.';
		}
		return "You're all set! Your device is ready.";
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
			</div>

			<div className={styles.haircheckSidebar}>
				<div className={styles.haircheckSidebarContent}>
					<div className={styles.haircheckContent}>
						<h2 className={styles.sidebarTitle}>Meet Santa</h2>
						<p className={styles.sidebarDescription}>He can see you, he can understand you, and he's excited to talk to you</p>
						<div className={styles.statusIndicator}>
							<div className={styles.statusIcon}></div>
							<span>SANTA HAS JOINED THE SESSION</span>
						</div>
						{isPermissionsDenied ? (
							<button
								type="button"
								onClick={onCancelHairCheck}
								className={`${styles.buttonCancel} ${styles.buttonJoinDesktop}`}
							>
								Cancel
							</button>
						) : (
							<JoinBtn
								loading={isJoinBtnLoading || isWaitingForSanta}
								loadingText={isWaitingForSanta ? "Santa's on his way..." : undefined}
								disabled={!canProceed}
								className={styles.buttonJoinDesktop}
								onClick={onJoin}
							/>
						)}
						<p className={styles.legalText}>
							By starting a conversation, I accept the Tavus Terms of Use and acknowledge the Privacy Policy.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
});

HairCheck.displayName = 'HairCheck';
