import React, { useState } from 'react';
import './App.css';
import RoomJoin from './components/RoomJoin';
import ConferenceRoom from './components/ConferenceRoom';

function App() {
  const [roomId, setRoomId] = useState(null);
  const [displayName, setDisplayName] = useState('');

  const handleJoin = (room, name) => {
    setRoomId(room);
    setDisplayName(name);
  };

  const handleLeave = () => {
    setRoomId(null);
    setDisplayName('');
  };

  return (
    <div className="App">
      {!roomId ? (
        <RoomJoin onJoin={handleJoin} />
      ) : (
        <ConferenceRoom
          roomId={roomId}
          displayName={displayName}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}

export default App;
