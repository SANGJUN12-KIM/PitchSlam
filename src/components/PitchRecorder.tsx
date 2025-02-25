import React, { useState, useRef, useEffect } from 'react';
import { PitchDetector } from 'pitchy';
import styles from '../styles/PitchRecorder.module.css';
import { getNote } from '../utils/noteHelper';
import { RecordAnimation } from './RecordAnimation';

interface SessionData {
  id: number;
  startTime: number;
  endTime: number;
  duration: string;
  avgPitch: number;
  maxPitch: number;
  note: string;  // Add note field
}

export const PitchRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentPitch, setCurrentPitch] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [highestPitch, setHighestPitch] = useState(0);
  const [ranking, setRanking] = useState<number[]>([]);
  
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const detector = useRef<PitchDetector<Float32Array> | null>(null);
  const pitchValues = useRef<number[]>([]);
  const isRecordingRef = useRef(false);
  const sessionStartTime = useRef<number>(0);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      source.connect(analyser.current);
      
      detector.current = PitchDetector.forFloat32Array(analyser.current.fftSize);
      setIsRecording(true);
      isRecordingRef.current = true;
      sessionStartTime.current = Date.now();
      pitchValues.current = []; // Reset pitch values for new session
      analyzePitch();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const formatDuration = (start: number, end: number): string => {
    const duration = end - start;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const stopRecording = () => {
    if (!isRecording) return;

    const endTime = Date.now();
    const values = pitchValues.current;
    
    if (values.length > 0) {
      const maxPitch = Math.max(...values);
      const avgPitch = values.reduce((a, b) => a + b) / values.length;
      
      // 새로운 기록 확인
      if (maxPitch > highestPitch) {
        setHighestPitch(maxPitch);
        setShowRecord(true);
        setTimeout(() => setShowRecord(false), 3000);
      }

      // 순위 업데이트
      setRanking(prev => {
        const newRanking = [...prev, maxPitch].sort((a, b) => b - a);
        return newRanking.slice(0, 10); // Top 10만 유지
      });

      setSessions(prev => [...prev, {
        id: endTime,
        startTime: sessionStartTime.current,
        endTime: endTime,
        duration: formatDuration(sessionStartTime.current, endTime),
        avgPitch,
        maxPitch,
        note: getNote(avgPitch)
      }]);
    }

    if (audioContext.current) {
      audioContext.current.close();
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    setCurrentPitch(0);
    pitchValues.current = [];
  };

  const analyzePitch = () => {
    if (!isRecordingRef.current || !analyser.current || !detector.current) return;

    const buffer = new Float32Array(analyser.current.fftSize);
    analyser.current.getFloatTimeDomainData(buffer);
    const [pitch] = detector.current.findPitch(buffer, audioContext.current!.sampleRate);
    
    if (pitch && !Number.isNaN(pitch)) {
      pitchValues.current.push(pitch);
      setCurrentPitch(pitch);
    }

    requestAnimationFrame(analyzePitch);
  };

  // 피치 0~1000Hz를 기준으로 게이지 길이를 계산 (필요시 조정)
  const gaugePercentage = Math.min((currentPitch / 1000) * 100, 100);

  const renderMeterMarkers = () => {
    return (
      <div className={styles['meter-markers']}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div 
            key={i} 
            className={`${styles.marker} ${i === 4 ? styles.center : ''}`}
          />
        ))}
      </div>
    );
  };

  const currentNote = getNote(currentPitch);
  const [noteName, octave] = currentNote.split(/(\d+)/);

  const getRankingPosition = (pitch: number): number => {
    return ranking.indexOf(pitch) + 1;
  };

  return (
    <div className={styles['pitch-recorder']}>
      <RecordAnimation show={showRecord} pitch={highestPitch} />
      
      <div className={styles.controls}>
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? 'STOP' : 'START'}
        </button>
      </div>

      <div className={styles['tuner-display']}>
        {isMuted && <div className={styles['mute-indicator']}>MUTE</div>}
        
        <div className={styles['tuner-meter']}>
          {renderMeterMarkers()}
          <div 
            className={styles['gauge-fill']} 
            style={{ width: `${gaugePercentage}%` }} 
          />
        </div>
        
        <div className={styles.spectrum} />
      </div>

      <div className={styles.note}>
        {noteName}<span className={styles.octave}>{octave}</span>
      </div>

      <div className={styles.reference}>440 Hz</div>
      
      <div className={styles['brand-name']}>PITCH SLAM</div>

      <div className={styles.stats}>
        <div className={styles.highScore}>
          Highest: {highestPitch.toFixed(1)} Hz
        </div>
        <div className={styles.rankingGraph}>
          {ranking.map((pitch, index) => (
            <div 
              key={index}
              className={styles.rankBar}
              style={{ 
                height: `${(pitch / highestPitch) * 100}%`,
                opacity: index === 0 ? 1 : 0.7 - (index * 0.05)
              }}
            >
              <span className={styles.rankPosition}>{index + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {sessions.length > 0 && (
        <div className={styles.sessions}>
          <h2>Recording History</h2>
          {sessions.map(session => (
            <div key={session.id} className={styles['session-item']}>
              <div className={styles['session-time']}>
                Duration: {session.duration}
              </div>
              <div>
                {new Date(session.startTime).toLocaleTimeString()}
                {' → '}
                {new Date(session.endTime).toLocaleTimeString()}
              </div>
              <div className={styles['session-stats']}>
                <div>Average: {session.avgPitch.toFixed(1)} Hz ({session.note})</div>
                <div>Max: {session.maxPitch.toFixed(1)} Hz ({getNote(session.maxPitch)})</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
