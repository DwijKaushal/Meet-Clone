import React, { useState, useEffect, useRef } from 'react';
import './ChatPanel.css';

const ChatPanel = ({ roomId, displayName, messages = [], onSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && onSendMessage) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.isOwn ? 'own' : ''}`}>
            <div className="message-header">
              <span className="message-sender">{msg.displayName}</span>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button onClick={handleSendMessage} className="chat-send-btn">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
