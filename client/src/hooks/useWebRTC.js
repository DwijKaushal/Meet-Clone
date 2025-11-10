import { useState, useEffect, useRef, useCallback } from 'react';

const SIGNALING_SERVER = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws';
// STUN/TURN servers configuration
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  // Add TURN server if available
  ...(process.env.REACT_APP_TURN_SERVER ? [{
    urls: process.env.REACT_APP_TURN_SERVER,
    username: process.env.REACT_APP_TURN_USERNAME,
    credential: process.env.REACT_APP_TURN_PASSWORD
  }] : [])
];

export const useWebRTC = (roomId, displayName, onLeaveCallback) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [chatMessages, setChatMessages] = useState([]);

  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const participantIdRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000; // Start with 1 second

  // Initialize local media stream
  const initializeLocalStream = useCallback(async (constraints = { audio: true, video: true }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsAudioEnabled(stream.getAudioTracks()[0]?.enabled || false);
      setIsVideoEnabled(stream.getVideoTracks()[0]?.enabled || false);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((participantId, isInitiator) => {
    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => {
        const existing = prev.find(r => r.participantId === participantId);
        if (existing) {
          return prev.map(r => 
            r.participantId === participantId 
              ? { ...r, stream: remoteStream }
              : r
          );
        }
        return [...prev, { participantId, stream: remoteStream, displayName: '', isAudioEnabled: true, isVideoEnabled: true }];
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          targetId: participantId,
          candidate: event.candidate
        }));
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Attempt ICE restart
        if (pc.connectionState === 'failed') {
          pc.restartIce();
        }
      }

      // Update connection quality
      if (pc.connectionState === 'connected') {
        setConnectionQuality('good');
      } else if (pc.connectionState === 'connecting') {
        setConnectionQuality('medium');
      } else {
        setConnectionQuality('poor');
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${participantId}:`, pc.iceConnectionState);
    };

    peersRef.current.set(participantId, pc);
    return pc;
  }, []);

  // Handle signaling messages
  const handleSignalingMessage = useCallback((data) => {
    switch (data.type) {
      case 'joined':
        participantIdRef.current = data.participantId;
        
        // Create peer connections for existing participants
        if (data.participants) {
          data.participants.forEach(participant => {
            const pc = createPeerConnection(participant.participantId, true);
            
            pc.createOffer()
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                wsRef.current?.send(JSON.stringify({
                  type: 'offer',
                  targetId: participant.participantId,
                  offer: pc.localDescription
                }));
              })
              .catch(error => console.error('Error creating offer:', error));
          });
        }
        break;

      case 'user-joined':
        // New user joined, create peer connection and send offer
        const pc = createPeerConnection(data.participantId, true);
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            wsRef.current?.send(JSON.stringify({
              type: 'offer',
              targetId: data.participantId,
              offer: pc.localDescription
            }));
          })
          .catch(error => console.error('Error creating offer for new user:', error));
        break;

      case 'offer':
        // Receive offer from another peer
        const offerPc = peersRef.current.get(data.from);
        if (offerPc) {
          offerPc.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(() => offerPc.createAnswer())
            .then(answer => offerPc.setLocalDescription(answer))
            .then(() => {
              wsRef.current?.send(JSON.stringify({
                type: 'answer',
                targetId: data.from,
                answer: offerPc.localDescription
              }));
            })
            .catch(error => console.error('Error handling offer:', error));
        }
        break;

      case 'answer':
        // Receive answer from another peer
        const answerPc = peersRef.current.get(data.from);
        if (answerPc) {
          answerPc.setRemoteDescription(new RTCSessionDescription(data.answer))
            .catch(error => console.error('Error handling answer:', error));
        }
        break;

      case 'ice-candidate':
        // Receive ICE candidate
        const candidatePc = peersRef.current.get(data.from);
        if (candidatePc) {
          candidatePc.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(error => console.error('Error adding ICE candidate:', error));
        }
        break;

      case 'user-left':
        // Remove peer connection
        const leftPc = peersRef.current.get(data.participantId);
        if (leftPc) {
          leftPc.close();
          peersRef.current.delete(data.participantId);
          setRemoteStreams(prev => prev.filter(r => r.participantId !== data.participantId));
        }
        break;

      case 'audio-toggled':
      case 'video-toggled':
        setRemoteStreams(prev => 
          prev.map(r => 
            r.participantId === data.participantId
              ? { ...r, [data.type === 'audio-toggled' ? 'isAudioEnabled' : 'isVideoEnabled']: data.enabled }
              : r
          )
        );
        break;

      case 'chat':
        setChatMessages(prev => [...prev, {
          ...data,
          isOwn: data.participantId === participantIdRef.current
        }]);
        break;

      case 'presence-update':
        // Update participant info
        setRemoteStreams(prev => {
          const existing = prev.find(r => r.participantId === data.participantId);
          if (existing) {
            return prev.map(r => 
              r.participantId === data.participantId
                ? { ...r, displayName: data.displayName }
                : r
            );
          }
          return prev;
        });
        break;

      default:
        console.warn('Unhandled signaling message type:', data?.type, data);
        break;
    }
  }, [createPeerConnection]);

  // Connect to signaling server
  const connectSignaling = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = SIGNALING_SERVER.includes('/ws') ? SIGNALING_SERVER : `${SIGNALING_SERVER}/ws`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('Connected to signaling server');
          wsRef.current = ws;
          reconnectAttemptsRef.current = 0;

          // Join room
          ws.send(JSON.stringify({
            type: 'join',
            roomId,
            displayName
          }));
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleSignalingMessage(data);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        ws.onerror = (event) => {
          const error = event instanceof Event
            ? new Error('WebSocket connection error')
            : event;

          console.error('WebSocket error event:', event);
          // Ensure we reject with an Error instance so React error overlay shows useful info
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          wsRef.current = null;
          
          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current++;
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectSignaling().catch((error) => {
                console.error('Reconnection attempt failed:', error);
              });
            }, delay);
          } else {
            console.error('Max reconnection attempts reached');
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }, [roomId, displayName, handleSignalingMessage]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeLocalStream();
        await connectSignaling();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

  // Close all peer connections
  // eslint-disable-next-line react-hooks/exhaustive-deps -- we intentionally use the latest ref values during cleanup
  const peers = peersRef.current;
      peers.forEach(pc => pc.close());
      peers.clear();

      // Stop local streams
      const localStream = localStreamRef.current;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      const screenStream = screenStreamRef.current;
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }

      // Close WebSocket
      const ws = wsRef.current;
      if (ws) {
        ws.close();
      }
    };
  }, [connectSignaling, initializeLocalStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        wsRef.current?.send(JSON.stringify({
          type: 'toggle-audio',
          enabled: audioTrack.enabled
        }));
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        wsRef.current?.send(JSON.stringify({
          type: 'toggle-video',
          enabled: videoTrack.enabled
        }));
      }
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }

        // Switch back to camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = Array.from(peersRef.current.values())[0]?.getSenders()
          .find(s => s.track && s.track.kind === 'video');
        
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
          localStreamRef.current?.getVideoTracks()[0]?.stop();
          localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
          localStreamRef.current.addTrack(videoTrack);
        }

        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screenStream;

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Update local stream
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks()[0]?.stop();
          localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
          localStreamRef.current.addTrack(videoTrack);
        }

        setIsScreenSharing(true);

        // Handle screen share end
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [isScreenSharing]);

  // Send chat message
  const sendChatMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && message.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message: message.trim()
      }));
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(() => {
    // Send leave message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
    }

    // Close all peer connections
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();

    // Stop all streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }

    onLeaveCallback?.();
  }, [onLeaveCallback]);

  return {
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
  };
};
