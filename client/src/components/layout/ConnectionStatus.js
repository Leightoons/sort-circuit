import React, { useContext, useState, useEffect } from 'react';
import SocketContext from '../../context/SocketContext';

const ConnectionStatus = () => {
  const { socket, connected } = useContext(SocketContext);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [showFullStatus, setShowFullStatus] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  
  // Update heartbeat time when we receive a new one
  useEffect(() => {
    if (!socket) return;
    
    const handleHeartbeat = () => {
      setLastHeartbeat(Date.now());
      setReconnecting(false);
    };
    
    socket.on('connect', handleHeartbeat);
    socket.on('heartbeat_ack', handleHeartbeat);
    
    socket.on('disconnect', () => {
      setReconnecting(true);
    });
    
    socket.on('reconnecting', () => {
      setReconnecting(true);
    });
    
    socket.on('reconnect', handleHeartbeat);
    
    return () => {
      socket.off('heartbeat_ack', handleHeartbeat);
      socket.off('connect', handleHeartbeat);
      socket.off('disconnect');
      socket.off('reconnecting');
      socket.off('reconnect');
    };
  }, [socket]);
  
  // Check heartbeat status every second
  useEffect(() => {
    const checkHeartbeat = setInterval(() => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      // If it's been more than 30 seconds since the last heartbeat, something might be wrong
      if (timeSinceLastHeartbeat > 30000 && connected) {
        setReconnecting(true);
      }
    }, 1000);
    
    return () => clearInterval(checkHeartbeat);
  }, [lastHeartbeat, connected]);
  
  const getStatusClass = () => {
    if (!connected) return 'disconnected';
    if (reconnecting) return 'reconnecting';
    return 'connected';
  };
  
  const getStatusText = () => {
    if (!connected) return 'Disconnected';
    if (reconnecting) return 'Reconnecting...';
    return 'Connected';
  };
  
  const toggleFullStatus = () => {
    setShowFullStatus(!showFullStatus);
  };
  
  const getTimeAgo = () => {
    const seconds = Math.floor((Date.now() - lastHeartbeat) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  };
  
  return (
    <div 
      className={`connection-status ${getStatusClass()}`}
      onClick={toggleFullStatus}
      title="Click for more details"
    >
      <div className="status-indicator">
        <span className="status-dot"></span>
        <span className="status-text">{getStatusText()}</span>
      </div>
      
      {showFullStatus && (
        <div className="connection-details">
          <p>Last heartbeat: {getTimeAgo()}</p>
          <p>Socket ID: {socket?.id || 'Not connected'}</p>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus; 