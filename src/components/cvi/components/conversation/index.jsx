import React, { useEffect, useCallback, useState, useRef } from 'react';
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
import { AudioWave } from '../audio-wave';

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

export const Conversation = React.memo(({ onLeave, conversationUrl }) => {
	const { joinCall, leaveCall } = useCVICall();
	const meetingState = useMeetingState();
	const { hasMicError, microphones, cameras, currentMic, currentCam, setMicrophone, setCamera } = useDevices();
	const { isCamMuted, onToggleCamera } = useLocalCamera();
	const { isMicMuted, onToggleMicrophone, localSessionId } = useLocalMicrophone();
	const [countdown, setCountdown] = useState(120); // 2 minutes = 120 seconds
	const [naughtyNiceRatio, setNaughtyNiceRatio] = useState(20); // 20% naughty (4 segments), 80% nice (16 segments)
	const [showMicDropdown, setShowMicDropdown] = useState(false);
	const [showVideoDropdown, setShowVideoDropdown] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);
	const micDropdownRef = useRef(null);
	const videoDropdownRef = useRef(null);

	console.log('[Conversation] Component rendered, conversationUrl:', conversationUrl);
	console.log('[Conversation] Meeting state:', meetingState);
	console.log('[Conversation] Has mic error:', hasMicError);

	// Track countdown timer (2 minutes)
	useEffect(() => {
		if (meetingState === 'joined-meeting') {
			setCountdown(120); // Reset to 2 minutes when joined
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
			setCountdown(120);
		}
	}, [meetingState]);

	// Naughty/Nice bar - starts at 50/50, can be updated later based on conversation
	// For now, it stays at 50/50

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

	useEffect(() => {
		console.log('[Conversation] Meeting state changed:', meetingState);
		if (meetingState === 'error') {
			console.error('[Conversation] Meeting state is error, calling onLeave');
			onLeave();
		}
		// Detect when call ends
		if (meetingState === 'left-meeting' || meetingState === 'ended') {
			console.log('[Conversation] Call ended, meeting state:', meetingState);
			onLeave();
		}
	}, [meetingState, onLeave]);

	// Initialize call when conversation is available
	useEffect(() => {
		console.log('[Conversation] useEffect triggered, conversationUrl:', conversationUrl);
		if (conversationUrl) {
			console.log('[Conversation] Calling joinCall with URL:', conversationUrl);
			joinCall({ url: conversationUrl });
		} else {
			console.warn('[Conversation] No conversationUrl provided, cannot join call');
		}
	}, [conversationUrl, joinCall]);

	const handleLeave = useCallback(() => {
		console.log('[Conversation] Handle leave called');
		leaveCall();
		onLeave();
	}, [leaveCall, onLeave]);

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
					{/* Volume Control */}
					<div className={styles.volumeControl}>
						<img 
							src="/icons/volume.svg" 
							alt="Volume" 
							className={styles.volumeIcon}
						/>
						<div className={styles.volumeSlider}>
							<div className={styles.volumeFill} style={{ width: '70%' }}></div>
						</div>
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
					<div className={styles.naughtyNiceBar}>
						<div className={styles.naughtyNiceContainer}>
							{Array.from({ length: 9 }).map((_, i) => {
								// First 4 segments are gray, 5th and 6th are green, last 3 are gray
								const isNice = i >= 4 && i < 6;
								return (
									<div
										key={i}
										className={`${styles.segment} ${isNice ? styles.segmentNice : styles.segmentNaughty}`}
									/>
								);
							})}
						</div>
						<div className={styles.naughtyNiceLabels}>
							<div className={styles.naughtySide}>
								<span className={styles.naughtyEmoji}>
									<img src="/icons/mood-sad.svg" alt="Sad" className={styles.moodIcon} />
								</span>
								<span className={styles.naughtyLabel}>NAUGHTY ←</span>
							</div>
							<span className={styles.centerEmoji}>
								<img src="/icons/mood-neutral.svg" alt="Neutral" className={styles.moodIcon} />
							</span>
							<div className={styles.niceSide}>
								<span className={styles.niceLabel}>→ NICE</span>
								<span className={styles.niceEmoji}>
									<img src="/icons/mood-happy.svg" alt="Happy" className={styles.moodIcon} />
								</span>
							</div>
						</div>
					</div>

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
});
