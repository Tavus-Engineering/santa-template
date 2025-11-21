import React from 'react';
import styles from './NaughtyNiceBar.module.css';

export const NaughtyNiceBar = ({ score = 0 }) => {
  // 10 segments total: 0-4 (Naughty), 5-9 (Nice)
  const segmentCount = score / 2;

  // Thresholds for icon changes
  const isVeryNaughty = score <= -6;
  const isVeryNice = score >= 6;

  const getSegmentState = (i) => {
    // Nice Side (Positive): Indices 5 to 9
    if (score > 0) {
      const startIndex = 5;
      const endIndex = startIndex + segmentCount; // e.g. 5 + 5 = 10
      
      if (i >= startIndex && i < endIndex) {
        if (i === Math.floor(endIndex)) {
          return { active: true, opacity: endIndex % 1 || 1 };
        }
        return { active: true, opacity: 1 };
      }
    }
    
    // Naughty Side (Negative): Indices 4 down to 0
    else if (score < 0) {
      const startIndex = 4;
      const absCount = Math.abs(segmentCount);
      const endIndex = startIndex - absCount; // e.g. 4 - 5 = -1
      
      if (i <= startIndex && i > endIndex) {
        if (i === Math.ceil(endIndex) && endIndex % 1 !== 0) {
          return { active: true, opacity: 1 - (endIndex % 1) };
        }
        return { active: true, opacity: 1 };
      }
    }

    return { active: false, opacity: 1 };
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
          const { active, opacity } = getSegmentState(i);
          return (
            <div
              key={i}
              className={styles.segment}
              data-active={active}
              style={{ '--opacity': opacity }}
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
