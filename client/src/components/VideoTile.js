import React, { useRef, useEffect, useState } from 'react';
import './VideoTile.css';

const VideoTile = ({
  stream,
  displayName,
  isLocal,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing
}) => {
  const videoRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      // Audio level detection for active speaker
      if (!isLocal && stream.getAudioTracks().length > 0) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          microphone.connect(analyser);
          
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          
          const checkSpeaking = () => {
            if (!analyserRef.current) return;
            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setIsSpeaking(average > 30);
            
            requestAnimationFrame(checkSpeaking);
          };
          
          checkSpeaking();
        } catch (error) {
          console.error('Error setting up audio analysis:', error);
        }
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isLocal]);

  const getVideoClassName = () => {
    let className = 'video-element';
    if (!isVideoEnabled) className += ' video-disabled';
    if (isSpeaking && !isLocal) className += ' speaking';
    return className;
  };

  return (
    <div className={`video-tile ${isLocal ? 'local' : 'remote'} ${isSpeaking ? 'active-speaker' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={getVideoClassName()}
      />
      {!isVideoEnabled && (
        <div className="video-placeholder">
          <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
        </div>
      )}
      <div className="video-overlay">
        <div className="participant-name">
          {displayName} {isLocal && '(You)'}
          {isScreenSharing && isLocal && <span className="screen-share-badge">📺</span>}
        </div>
        <div className="media-status">
          {!isAudioEnabled && <span className="muted-icon">🔇</span>}
          {!isVideoEnabled && <span className="video-off-icon">📹</span>}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
