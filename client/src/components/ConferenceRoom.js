import React, { useState } from 'react';
import './ConferenceRoom.css';
import VideoTile from './VideoTile';
import Controls from './Controls';
import ChatPanel from './ChatPanel';
import { useWebRTC } from '../hooks/useWebRTC';

const ConferenceRoom = ({ roomId, displayName, onLeave }) => {
  const [showChat, setShowChat] = useState(false);
  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionQuality,
    chatMessages,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
    leaveRoom
  } = useWebRTC(roomId, displayName, onLeave);

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  return (
    <div className="conference-room">
      <div className="room-header">
        <div className="room-info">
          <h2>Room: {roomId}</h2>
          <span className="participant-count">
            {remoteStreams.length + 1} participant{remoteStreams.length !== 0 ? 's' : ''}
          </span>
        </div>
        <div className="connection-status">
          <span className={`status-indicator ${connectionQuality}`}></span>
          <span>Connection: {connectionQuality}</span>
        </div>
      </div>

      <div className={`room-content ${showChat ? 'with-chat' : ''}`}>
        <div className="video-grid">
          <VideoTile
            stream={localStream}
            displayName={displayName || 'You'}
            isLocal={true}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
          />
          {remoteStreams.map((remote) => (
            <VideoTile
              key={remote.participantId}
              stream={remote.stream}
              displayName={remote.displayName || 'Participant'}
              isLocal={false}
              isAudioEnabled={remote.isAudioEnabled}
              isVideoEnabled={remote.isVideoEnabled}
            />
          ))}
        </div>

        {showChat && (
          <ChatPanel 
            roomId={roomId} 
            displayName={displayName}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
          />
        )}
      </div>

      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeave={handleLeave}
        onToggleChat={() => setShowChat(!showChat)}
        showChat={showChat}
      />
    </div>
  );
};

export default ConferenceRoom;
