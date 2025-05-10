import { createContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isHostingRoom, setIsHostingRoom] = useState(false);
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Heartbeat configuration - should match server
  const HEARTBEAT_INTERVAL = 15000; // 15 seconds
  const HOST_HEARTBEAT_INTERVAL = 5000; // 5 seconds - more frequent for hosts

  // Create and connect socket when component mounts
  useEffect(() => {
    // Create socket instance with username for authentication
    const newSocket = io({
      auth: {
        username: localStorage.getItem('username') || ''
      },
      reconnectionAttempts: 10, // Increased from 5
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000 // Increased from 20000
    });

    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Send initial heartbeat with a short delay to avoid ACK conflicts
      setTimeout(() => {
        if (newSocket.connected) {
          newSocket.emit('heartbeat');
          console.log('Sent initial heartbeat');
        }
      }, 500);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      setConnected(false);
      
      // If the server closed the connection, try to reconnect manually
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        // The disconnection was initiated by the server, reconnect manually
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          newSocket.connect();
        }, 1000); // Try to reconnect faster
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });
    
    // Listen for host assigned event to know when we become a host
    newSocket.on('host_assigned', () => {
      console.log('This client is now a host');
      setIsHostingRoom(true);
    });
    
    // Listen for room creation confirmation
    newSocket.on('room_created', ({ isHost }) => {
      if (isHost) {
        console.log('Room created, this client is the host');
        setIsHostingRoom(true);
      }
    });

    // Set socket in state
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      console.log('SocketContext unmounting - cleaning up socket connections');
      
      // Remove all event listeners
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('host_assigned');
      newSocket.off('room_created');
      newSocket.off('heartbeat_ack');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Ensure socket is fully closed
      if (newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Setup heartbeat to keep connection alive
  useEffect(() => {
    // Clear any existing heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (!socket || !connected) return;

    // Setup heartbeat acknowledgment listener
    socket.on('heartbeat_ack', () => {
      // Just receive the acknowledgment, no need to do anything with it
      console.log('Received heartbeat acknowledgment');
    });

    // Choose interval based on whether the user is hosting a room
    const interval = isHostingRoom ? HOST_HEARTBEAT_INTERVAL : HEARTBEAT_INTERVAL;
    console.log(`Setting up heartbeat with interval ${interval}ms (isHost: ${isHostingRoom})`);
    
    // Send heartbeat at the appropriate interval
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        // Send heartbeat without an acknowledgment callback
        socket.emit('heartbeat');
        console.log(`Sending heartbeat (isHost: ${isHostingRoom})`);
      } else {
        console.log('Socket not connected, skipping heartbeat');
        // Try to reconnect if socket is not connected
        socket.connect();
      }
    }, interval);

    // Clear interval on cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Remove heartbeat acknowledgment listener
      socket.off('heartbeat_ack');
    };
  }, [socket, connected, isHostingRoom]);

  // Update socket auth when username changes
  useEffect(() => {
    if (socket) {
      socket.auth = { username };
      // If already connected, no need to reconnect
      if (!connected) {
        socket.connect();
      }
    }
  }, [username, socket, connected]);
  
  // Leave a room and update hosting status
  const leaveCurrentRoom = () => {
    if (isHostingRoom) {
      setIsHostingRoom(false);
    }
  };

  // Set username in storage
  const setUsernameFn = (name) => {
    setUsername(name);
    localStorage.setItem('username', name);
  };

  // Join a room
  const joinRoom = (roomCode, playerName) => {
    if (socket && connected) {
      const name = playerName || username;
      if (name) {
        setUsernameFn(name);
        socket.emit('join_room', { roomCode, username: name });
      }
    }
  };

  // Create a new room
  const createRoom = (username) => {
    if (!connected) {
      console.error('Cannot create room: not connected to server');
      return;
    }
    
    if (!socket) {
      console.error('Socket not available');
      return;
    }
    
    // Emit create room event
    socket.emit('create_room', {
      username
    });
  };

  // Place a bet
  const placeBet = (roomCode, algorithm) => {
    if (socket && connected) {
      socket.emit('place_bet', { roomCode, algorithm });
    }
  };

  // Start a race
  const startRace = (roomCode) => {
    if (socket && connected) {
      socket.emit('start_race', { roomCode });
    }
  };

  // Update room settings
  const updateSettings = (roomCode, settings) => {
    if (socket && connected) {
      socket.emit('update_settings', { roomCode, settings });
    }
  };

  // Select algorithms
  const selectAlgorithms = (roomCode, algorithms) => {
    if (socket && connected) {
      socket.emit('select_algorithm', { roomCode, algorithms });
    }
  };
  
  // Reset room state to waiting
  const resetRoomState = (roomCode) => {
    if (socket && connected) {
      socket.emit('reset_room_state', { roomCode });
    }
  };

  // End a race early
  const endRaceEarly = (roomCode) => {
    if (socket && connected) {
      socket.emit('end_race_early', { roomCode });
    }
  };

  // Leave a room
  const leaveRoom = (roomCode) => {
    if (socket && connected) {
      socket.emit('leave_room', { roomCode });
      
      // Reset hosting status when leaving a room
      if (isHostingRoom) {
        setIsHostingRoom(false);
      }
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        username,
        isHostingRoom,
        setUsername: setUsernameFn,
        joinRoom,
        createRoom,
        placeBet,
        startRace,
        updateSettings,
        selectAlgorithms,
        resetRoomState,
        endRaceEarly,
        leaveRoom,
        leaveCurrentRoom
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 