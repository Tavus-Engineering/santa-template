/**
 * useHatOverlay Hook
 * 
 * A React hook that applies a hat overlay to an existing video element.
 * Works with any video element (including DailyVideo components).
 * 
 * Usage:
 *   const canvasRef = useHatOverlay(videoRef, { enabled: true });
 * 
 * @param {React.RefObject} videoRef - Ref to the video element
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether the hat overlay is enabled
 * @returns {React.RefObject} - Ref to the canvas element that should be overlaid
 */

import { useEffect, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import hatImageSrc from '../assets/hat.svg';

// Hat positioning constants - adjust these to tune the hat placement
const HAT_SCALE_FACTOR = 1.8;
const HAT_Y_OFFSET = -0.3;
const HAT_X_OFFSET = 0;

export const useHatOverlay = (videoRef, options = {}) => {
  const { enabled = true } = options;
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const hatImageRef = useRef(null);
  const lastLandmarksRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Draw hat function
  const drawHat = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const landmarks = lastLandmarksRef.current;
    const hatImg = hatImageRef.current;

    if (!canvas || !video || !landmarks || !hatImg) {
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get face bounding box from landmarks
    const foreheadPoint = landmarks[10];
    const leftFacePoint = landmarks[234];
    const rightFacePoint = landmarks[454];

    const faceWidth = Math.abs(rightFacePoint.x - leftFacePoint.x);
    
    const hatX = (foreheadPoint.x - faceWidth * HAT_SCALE_FACTOR / 2 + HAT_X_OFFSET) * canvas.width;
    const hatY = (foreheadPoint.y - faceWidth * HAT_SCALE_FACTOR * 0.6 + HAT_Y_OFFSET) * canvas.height;
    const hatWidth = faceWidth * HAT_SCALE_FACTOR * canvas.width;
    const hatHeight = hatWidth * (hatImg.height / hatImg.width);

    ctx.drawImage(hatImg, hatX, hatY, hatWidth, hatHeight);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const updateCanvasSize = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      // Try to get video dimensions from the video element
      let width = 0;
      let height = 0;
      
      if (video.videoWidth && video.videoHeight) {
        width = video.videoWidth;
        height = video.videoHeight;
      } else if (video.clientWidth && video.clientHeight) {
        width = video.clientWidth;
        height = video.clientHeight;
      } else {
        // Fallback: try to get from parent container
        const parent = video.parentElement;
        if (parent) {
          width = parent.clientWidth;
          height = parent.clientHeight;
        }
      }
      
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    }
  };

  useEffect(() => {
    if (!enabled || !videoRef.current) {
      return;
    }

    let isActive = true;
    const video = videoRef.current;

    // Load hat image
    const hatImg = new Image();
    hatImg.crossOrigin = 'anonymous';
    hatImg.onload = () => {
      if (isActive) {
        hatImageRef.current = hatImg;
      }
    };
    hatImg.onerror = (err) => {
      console.error('Error loading hat image:', err);
    };
    hatImg.src = hatImageSrc;

    // Initialize MediaPipe FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      if (!isActive) return;
      
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        lastLandmarksRef.current = results.multiFaceLandmarks[0];
        drawHat();
      } else {
        lastLandmarksRef.current = null;
        clearCanvas();
      }
    });

    faceMeshRef.current = faceMesh;

    // Update canvas size initially and on resize
    const handleResize = () => {
      if (isActive) {
        updateCanvasSize();
      }
    };

    updateCanvasSize();
    
    // Listen for video metadata/load events
    const handleLoadedMetadata = () => {
      if (isActive) {
        updateCanvasSize();
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    window.addEventListener('resize', handleResize);

    // Start face detection loop
    const detectFaces = async () => {
      if (!isActive || !faceMeshRef.current || !video) {
        return;
      }

      try {
        // Check if video is ready
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          await faceMeshRef.current.send({ image: video });
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(detectFaces);
      }
    };

    // Start detection loop
    animationFrameRef.current = requestAnimationFrame(detectFaces);

    // Cleanup
    return () => {
      isActive = false;
      
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
  }, [enabled, videoRef]);

  return canvasRef;
};

