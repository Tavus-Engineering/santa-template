import React, { useState, useEffect } from 'react';
import styles from './NaughtyNiceBar.module.css';

// Wiggle animation constants
const WIGGLE_CONFIG = {
  // Animation speed and wave parameters
  animationSpeed: 35,          // Higher = faster animation
  segmentOffset: 0.3,           // Phase offset between segments for wave effect
  
  // Normal partial segment wiggle (odd scores)
  normalAmplitude: 0.06,        // ±6% wiggle
  
  // Optimistic wiggle for positive even scores (shows "next" segment)
  positiveOptimisticMin: 0.05,  // Minimum width (5%)
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

export const NaughtyNiceBar = ({ score = 0 }) => {
  // 10 segments total: 0-4 (Naughty), 5-9 (Nice)
  const segmentCount = score / 2;

  // Thresholds for icon changes
  const isVeryNaughty = score <= -6;
  const isVeryNice = score >= 6;

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
    
    // Nice Side (Positive): Indices 5 to 9
    if (score > 0) {
      const startIndex = 5;
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
      const startIndex = 4;
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
      aria-valuemin={-10}
      aria-valuemax={10}
      aria-label="Naughty or Nice Score"
    >
      <div className={styles.bar}>
        {Array.from({ length: 10 }).map((_, i) => {
          const { active, fillPercent, isOptimistic } = getSegmentState(i);
          const isNaughtySide = i < 5;
          
          // Calculate wiggle for this segment using Perlin noise
          let wiggle = 0;
          
          if (isOptimistic) {
            // Optimistic wiggles
            if (score > 0) {
              // Positive even: wiggle next segment at low %
              const normalizedNoise = noise1D(time * WIGGLE_CONFIG.animationSpeed + i * WIGGLE_CONFIG.segmentOffset) * 0.5 + 0.5; // 0-1
              wiggle = normalizedNoise * WIGGLE_CONFIG.positiveOptimisticRange + WIGGLE_CONFIG.positiveOptimisticMin;
            } else if (score < 0) {
              // Negative even: wiggle between 90-100%
              const normalizedNoise = noise1D(time * WIGGLE_CONFIG.animationSpeed + i * WIGGLE_CONFIG.segmentOffset) * 0.5 + 0.5; // 0-1
              wiggle = normalizedNoise * WIGGLE_CONFIG.negativeOptimisticRange;
            }
          } else if (active && fillPercent !== 1) {
            // Normal wiggle for partial segments
            wiggle = noise1D(time * WIGGLE_CONFIG.animationSpeed + i * WIGGLE_CONFIG.segmentOffset) * WIGGLE_CONFIG.normalAmplitude;
          }
          
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
        <div>
          <img 
            src={isVeryNaughty ? "/icons/solid-mood-sad.svg" : "/icons/mood-sad.svg"} 
            alt=""
          />
          <span>Naughty</span>
        </div>
        
        <div>
          <img src="/icons/mood-neutral.svg" alt="" />
        </div>
        
        <div>
          <span>Nice</span>
          <img 
            src={isVeryNice ? "/icons/solid-mood-happy.svg" : "/icons/mood-happy.svg"} 
            alt=""
          />
        </div>
      </div>
    </div>
  );
};
