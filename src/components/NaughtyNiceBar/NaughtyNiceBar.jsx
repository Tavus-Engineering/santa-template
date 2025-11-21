import React, { useState, useEffect } from 'react';
import styles from './NaughtyNiceBar.module.css';

// Component constants
const SEGMENT_COUNT = 10;
const NAUGHTY_NICE_SPLIT = 5; // Segments 0-4 are naughty, 5-9 are nice
const VERY_NAUGHTY_THRESHOLD = -6;
const VERY_NICE_THRESHOLD = 6;

// Wiggle animation constants
const WIGGLE_CONFIG = {
  // Animation speed and wave parameters
  animationSpeed: 35,           // Higher = faster animation
  segmentOffset: 0.3,           // Phase offset between segments for wave effect
  
  // Normal partial segment wiggle (odd scores)
  normalAmplitude: 0.06,        // ±6% wiggle
  
  // Optimistic wiggle for positive even scores (shows "next" segment)
  positiveOptimisticMin: 0.05,   // Minimum width (5%)
  positiveOptimisticRange: 0.15, // Range (15%), so total is 5-20%
  
  // Optimistic wiggle for negative even scores (shows slight retreat)
  negativeOptimisticRange: -0.1, // -10% to 0%
};

// Simple 1D Perlin-like noise function
const noise1D = (x) => {
  // Use multiple octaves of sine waves for smooth noise
  return (
    Math.sin(x * 0.5) * 0.5 +
    Math.sin(x * 1.3) * 0.25 +
    Math.sin(x * 2.7) * 0.125
  );
};

// Helper function to calculate normalized noise (0-1 range)
const getNormalizedNoise = (time, segmentIndex, config) => {
  return noise1D(time * config.animationSpeed + segmentIndex * config.segmentOffset) * 0.5 + 0.5;
};

// Helper function to calculate wiggle value
const calculateWiggle = (isOptimistic, score, time, segmentIndex, fillPercent) => {
  if (isOptimistic) {
    if (score >= 0) {
      // Positive even or score 0: wiggle next segment at low % (towards nice)
      const normalizedNoise = getNormalizedNoise(time, segmentIndex, WIGGLE_CONFIG);
      return normalizedNoise * WIGGLE_CONFIG.positiveOptimisticRange + WIGGLE_CONFIG.positiveOptimisticMin;
    } else {
      // Negative even: wiggle between 90-100%
      const normalizedNoise = getNormalizedNoise(time, segmentIndex, WIGGLE_CONFIG);
      return normalizedNoise * WIGGLE_CONFIG.negativeOptimisticRange;
    }
  } else if (fillPercent !== 1) {
    // Normal wiggle for partial segments
    return noise1D(time * WIGGLE_CONFIG.animationSpeed + segmentIndex * WIGGLE_CONFIG.segmentOffset) * WIGGLE_CONFIG.normalAmplitude;
  }
  return 0;
};

export const NaughtyNiceBar = ({ score = 0 }) => {
  const segmentCount = score / 2;
  const isVeryNaughty = score <= VERY_NAUGHTY_THRESHOLD;
  const isVeryNice = score >= VERY_NICE_THRESHOLD;

  // State for wiggle animation
  const [time, setTime] = useState(0);

  // Animate wiggle over time
  useEffect(() => {
    let animationFrameId;
    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;
      
      setTime(t => t + delta);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const getSegmentState = (i) => {
    const isEvenScore = score % 2 === 0;
    
    // Special case: score 0 - optimistically wiggle towards nice (first nice segment)
    if (score === 0 && i === NAUGHTY_NICE_SPLIT) {
      return { active: true, fillPercent: 0, isOptimistic: true };
    }
    
    // Nice Side (Positive): Indices 5 to 9
    if (score > 0) {
      const startIndex = NAUGHTY_NICE_SPLIT;
      const endIndex = startIndex + segmentCount; // e.g. 5 + 5 = 10
      
      if (i >= startIndex && i < endIndex) {
        if (i === Math.floor(endIndex)) {
          const fillPercent = endIndex % 1 || 1;
          return { active: true, fillPercent, isOptimistic: false };
        }
        return { active: true, fillPercent: 1, isOptimistic: false };
      }
      
      // For even positive scores, show the NEXT segment (right after filled ones) with optimistic wiggle
      // endIndex = 6 for score 2, so next segment is at index 6
      if (isEvenScore && i === Math.floor(endIndex) && score < 10) {
        return { active: true, fillPercent: 0, isOptimistic: true };
      }
    }
    
    // Naughty Side (Negative): Indices 4 down to 0
    else if (score < 0) {
      const startIndex = NAUGHTY_NICE_SPLIT - 1;
      const absCount = Math.abs(segmentCount);
      const endIndex = startIndex - absCount; // e.g. 4 - 5 = -1
      const partialSegmentIndex = Math.ceil(endIndex);
      const lastFilledSegmentIndex = Math.floor(endIndex) + 1; // The segment closest to endIndex that's filled
      
      if (i <= startIndex && i > endIndex) {
        if (i === partialSegmentIndex && endIndex % 1 !== 0) {
          const fillPercent = 1 - Math.abs(endIndex % 1);
          return { active: true, fillPercent, isOptimistic: false };
        }
        
        // For even negative scores, the last filled segment should wiggle optimistically
        if (isEvenScore && i === lastFilledSegmentIndex) {
          return { active: true, fillPercent: 1, isOptimistic: true };
        }
        
        return { active: true, fillPercent: 1, isOptimistic: false };
      }
    }

    return { active: false, fillPercent: 1, isOptimistic: false };
  };

  return (
    <div 
      className={styles.container}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={-SEGMENT_COUNT}
      aria-valuemax={SEGMENT_COUNT}
      aria-label="Naughty or Nice Score"
    >
      <div className={styles.bar}>
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
          const { active, fillPercent, isOptimistic } = getSegmentState(i);
          const isNaughtySide = i < NAUGHTY_NICE_SPLIT;
          const wiggle = calculateWiggle(isOptimistic, score, time, i, fillPercent);
          
          return (
            <div
              key={i}
              className={styles.segment}
              data-active={active}
              data-fill-percent={fillPercent}
              data-naughty={isNaughtySide}
              style={{ 
                '--fill-percent': fillPercent,
                '--wiggle': wiggle
              }}
            />
          );
        })}
      </div>
      
      <div className={styles.labels} aria-hidden="true">
        <div data-very-naughty={isVeryNaughty}>
          <span className={styles.iconWrapper}>
            <img src="/icons/mood-sad.svg" alt="" />
          </span>
          <span>Naughty</span>
        </div>
        
        <div>
          <span className={styles.iconWrapper}>
            <img src="/icons/mood-neutral.svg" alt="" />
          </span>
        </div>
        
        <div data-very-nice={isVeryNice}>
          <span>Nice</span>
          <span className={styles.iconWrapper}>
            <img src="/icons/mood-happy.svg" alt="" />
          </span>
        </div>
      </div>
    </div>
  );
};
