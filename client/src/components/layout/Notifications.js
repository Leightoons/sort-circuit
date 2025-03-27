import React, { useState, useEffect, useContext, useRef } from 'react';
import RoomContext from '../../context/RoomContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const { socket, allBets } = useContext(RoomContext);
  const timersRef = useRef([]);
  
  // Clean up all timers when component unmounts
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timerId => clearTimeout(timerId));
    };
  }, []);
  
  // Add notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 5 seconds
    const timerId = setTimeout(() => {
      removeNotification(id);
    }, 5000);
    
    // Store timer id for cleanup
    timersRef.current.push(timerId);
  };
  
  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  // Track previous bets length to only show notification for the newest bet
  const prevBetsLengthRef = useRef(0);
  
  // Listen for new bets
  useEffect(() => {
    if (allBets.length > 0 && allBets.length > prevBetsLengthRef.current) {
      const latestBet = allBets[allBets.length - 1];
      // Only show for other users' bets, not the current user's
      if (latestBet.socketId !== socket?.id) {
        addNotification(`${latestBet.username} bet on ${latestBet.algorithm.charAt(0).toUpperCase() + latestBet.algorithm.slice(1)} Sort!`, 'bet');
      }
      prevBetsLengthRef.current = allBets.length;
    }
  }, [allBets, socket?.id]);
  
  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification notification-${notification.type}`}
        >
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close" 
            onClick={() => removeNotification(notification.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notifications; 