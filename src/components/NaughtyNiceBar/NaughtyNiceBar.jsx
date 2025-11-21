import React from 'react';
import styles from './NaughtyNiceBar.module.css';

export const NaughtyNiceBar = ({ score = 0 }) => {
  const middleIndex = 5;
  const segmentCount = score / 2;

  const getSegmentState = (i) => {
    // Middle segment is always neutral
    if (i === middleIndex) {
      return { active: false, opacity: 1 };
    }

    // Nice Side (Positive)
    if (score > 0) {
      const startIndex = middleIndex + 1; // 6
      const endIndex = startIndex + segmentCount;
      
      if (i >= startIndex && i < endIndex) {
        if (i === Math.floor(endIndex)) {
          return { active: true, opacity: endIndex % 1 || 1 };
        }
        return { active: true, opacity: 1 };
      }
    }
    
    // Naughty Side (Negative)
    else if (score < 0) {
      const startIndex = middleIndex - 1; // 4
      const absCount = Math.abs(segmentCount);
      const endIndex = startIndex - absCount;
      
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
        {Array.from({ length: 11 }).map((_, i) => {
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
        {/* Naughty Group */}
        <div>
          <img src="/icons/mood-sad.svg" alt="" />
          <span>Naughty</span>
        </div>
        
        {/* Center Group */}
        <div>
          <img src="/icons/mood-neutral.svg" alt="" />
        </div>
        
        {/* Nice Group */}
        <div>
          <span>Nice</span>
          <img src="/icons/mood-happy.svg" alt="" />
        </div>
      </div>
    </div>
  );
};
