import React, { useState } from 'react';
import './RoomJoin.css';

const RoomJoin = ({ onJoin }) => {
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `Room ${Date.now()}`,
          createdBy: displayName || 'Anonymous'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.roomId) {
        onJoin(data.roomId, displayName || 'Anonymous');
      } else {
        throw new Error('Invalid response: roomId not found');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert(`Failed to create room: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoin(roomId.trim(), displayName || 'Anonymous');
    } else {
      alert('Please enter a room ID');
    }
  };

  return (
    <div className="room-join">
      <div className="room-join-container">
        <h1>WebRTC Conference</h1>
        <div className="join-form">
          <div className="form-group">
            <label htmlFor="displayName">Your Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label htmlFor="roomId">Room ID (leave empty to create new)</label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID or leave empty"
            />
          </div>
          <div className="button-group">
            <button
              onClick={handleJoinRoom}
              disabled={!roomId.trim()}
              className="btn btn-primary"
            >
              Join Room
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="btn btn-secondary"
            >
              {isCreating ? 'Creating...' : 'Create New Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomJoin;
