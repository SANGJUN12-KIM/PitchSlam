import React, { useEffect } from 'react';
import styles from '../styles/RecordAnimation.module.css';

interface Props {
  show: boolean;
  pitch: number;
}

export const RecordAnimation: React.FC<Props> = ({ show, pitch }) => {
  if (!show) return null;

  return (
    <div className={styles.recordOverlay}>
      <div className={styles.content}>
        <div className={styles.newRecord}>NEW RECORD!</div>
        <div className={styles.pitch}>{pitch.toFixed(1)} Hz</div>
        <div className={styles.sparkles}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.sparkle} style={{
              '--delay': `${i * 0.1}s`,
              '--angle': `${i * 30}deg`
            } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
};
