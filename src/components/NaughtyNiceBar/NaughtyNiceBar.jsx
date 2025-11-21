import React, { useState, useEffect } from 'react';
import styles from './NaughtyNiceBar.module.css';

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
    // Nice Side (Positive): Indices 5 to 9
    if (score > 0) {
      const startIndex = 5;
      const endIndex = startIndex + segmentCount; // e.g. 5 + 5 = 10
      
      if (i >= startIndex && i < endIndex) {
        if (i === Math.floor(endIndex)) {
          const fillPercent = endIndex % 1 || 1;
          return { active: true, fillPercent };
        }
        return { active: true, fillPercent: 1 };
      }
    }
    
    // Naughty Side (Negative): Indices 4 down to 0
    else if (score < 0) {
      const startIndex = 4;
      const absCount = Math.abs(segmentCount);
      const endIndex = startIndex - absCount; // e.g. 4 - 5 = -1
      
      if (i <= startIndex && i > endIndex) {
        if (i === Math.ceil(endIndex) && endIndex % 1 !== 0) {
          const fillPercent = 1 - Math.abs(endIndex % 1);
          return { active: true, fillPercent };
        }
        return { active: true, fillPercent: 1 };
      }
    }

    return { active: false, fillPercent: 1 };
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
          const { active, fillPercent } = getSegmentState(i);
          const isNaughtySide = i < 5;
          
          // Calculate wiggle for this segment using Perlin noise
          // Each segment gets offset in time slightly for wave effect
          // Only apply wiggle to partial segments, not fully-filled ones
          const wiggle = (active && fillPercent !== 1) ? noise1D(time * 10 + i * 0.3) * 0.10 : 0; // ±5% wiggle
          
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
