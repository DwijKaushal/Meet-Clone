import React, { useState, useEffect } from 'react';
import './Controls.css';

const Controls = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  onToggleChat,
  showChat
}) => {
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  return (
    <div className="controls">
      <div className="controls-left">
        <button
          className={`control-btn ${isAudioEnabled ? 'active' : 'inactive'}`}
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          className={`control-btn ${isVideoEnabled ? 'active' : 'inactive'}`}
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? '📹' : '📹'}
        </button>
        <button
          className={`control-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? '📺' : '🖥️'}
        </button>
        <div className="device-menu-container">
          <button
            className="control-btn"
            onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            title="Device settings"
          >
            ⚙️
          </button>
          {showDeviceMenu && (
            <DeviceMenu onClose={() => setShowDeviceMenu(false)} />
          )}
        </div>
      </div>

      <div className="controls-right">
        <button
          className={`control-btn ${showChat ? 'active' : ''}`}
          onClick={onToggleChat}
          title={showChat ? 'Hide chat' : 'Show chat'}
        >
          💬
        </button>
        <button
          className="control-btn leave-btn"
          onClick={onLeave}
          title="Leave room"
        >
          🚪 Leave
        </button>
      </div>
    </div>
  );
};

const DeviceMenu = ({ onClose }) => {
  const [devices, setDevices] = useState({ audio: [], video: [] });
  const [selectedAudio, setSelectedAudio] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = deviceList.filter(d => d.kind === 'audioinput');
        const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
        
        setDevices({ audio: audioDevices, video: videoDevices });
        if (audioDevices.length > 0) setSelectedAudio(audioDevices[0].deviceId);
        if (videoDevices.length > 0) setSelectedVideo(videoDevices[0].deviceId);
      } catch (error) {
        console.error('Error loading devices:', error);
      }
    };
    
    loadDevices();
  }, []);

  return (
    <div className="device-menu" onClick={(e) => e.stopPropagation()}>
      <div className="device-menu-header">
        <h3>Device Settings</h3>
        <button onClick={onClose}>×</button>
      </div>
      <div className="device-menu-content">
        <div className="device-group">
          <label>Microphone</label>
          <select
            value={selectedAudio}
            onChange={(e) => setSelectedAudio(e.target.value)}
          >
            {devices.audio.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
        <div className="device-group">
          <label>Camera</label>
          <select
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
          >
            {devices.video.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Controls;
