import React, { useEffect, useContext, useState, useCallback } from 'react';
import SocketContext from '../context/SocketContext';
import RoomContext from '../context/RoomContext';
import { FaTrophy, FaMedal, FaSync } from 'react-icons/fa';

const Leaderboard = ({ roomCode }) => {
  const { getLeaderboard, socket } = useContext(SocketContext);
  const { leaderboard, currentUsername, roomStatus } = useContext(RoomContext);
  const [hasRequestedLeaderboard, setHasRequestedLeaderboard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create a refreshLeaderboard function that can be called directly
  const refreshLeaderboard = useCallback(() => {
    if (roomCode) {
      console.log('🔄 Manually refreshing leaderboard for room:', roomCode);
      setIsRefreshing(true);
      getLeaderboard(roomCode);
      
      // Reset the refreshing state after a short delay
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [roomCode, getLeaderboard]);

  // Log leaderboard on render for debugging
  console.log('👑 Rendering Leaderboard component:', { 
    leaderboard,
    leaderboardLength: leaderboard?.length || 0,
    roomCode,
    roomStatus
  });

  // Request leaderboard data on mount and after status changes
  useEffect(() => {
    if (roomCode) {
      console.log('📊 Requesting leaderboard data for room:', roomCode);
      getLeaderboard(roomCode);
      setHasRequestedLeaderboard(true);
      
      // Dump current leaderboard state to console
      console.log('Current leaderboard state before request:', leaderboard);
      
      // Set a timer to fetch again
      const retryTimer = setTimeout(() => {
        console.log('🔄 Retrying leaderboard request...');
        getLeaderboard(roomCode);
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, roomStatus]);

  // Force update after display or visibility changes
  useEffect(() => {
    // Refresh data when component becomes visible
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && roomCode) {
        console.log('🔍 Document became visible, refreshing leaderboard');
        getLeaderboard(roomCode);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up a periodic refresh (every 10 seconds)
    const periodicRefresh = setInterval(() => {
      if (roomCode) {
        console.log('⏱️ Periodic leaderboard refresh');
        getLeaderboard(roomCode);
      }
    }, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(periodicRefresh);
    };
  }, [roomCode, getLeaderboard]);

  // Force update after roomStatus changes with delays to catch race conditions
  useEffect(() => {
    if (roomStatus === 'finished') {
      // When race finishes, request leaderboard after a short delay
      const updateTimers = [];
      
      // Request immediately
      console.log('🏁 Race finished, requesting leaderboard');
      getLeaderboard(roomCode);
      
      // Then try again after 1 second
      const timer1 = setTimeout(() => {
        console.log('⏱️ Requesting leaderboard again (1s after race finish)');
        getLeaderboard(roomCode);

        // Check if we still have no data, then add some placeholder data
        if (!leaderboard || leaderboard.length === 0) {
          console.log('🚨 No leaderboard data after 1s, using fallback');
          // This is a last resort - it directly accesses players array to create a basic leaderboard
          try {
            socket.emit('get_leaderboard', { roomCode });
          } catch (e) {
            console.error('Error requesting leaderboard:', e);
          }
        }
      }, 1000);
      updateTimers.push(timer1);
      
      // And again after 3 seconds
      const timer2 = setTimeout(() => {
        console.log('⏱️ Requesting leaderboard again (3s after race finish)');
        getLeaderboard(roomCode);
      }, 3000);
      updateTimers.push(timer2);
      
      return () => {
        updateTimers.forEach(clearTimeout);
      };
    }
  }, [roomStatus, roomCode, getLeaderboard, leaderboard, socket]);

  // Create mock data for testing if no leaderboard
  const mockLeaderboard = [
    { socketId: '1', username: 'Player 1', points: 3 },
    { socketId: '2', username: 'Player 2', points: 2 },
    { socketId: '3', username: 'Player 3', points: 1 }
  ];

  // Always render leaderboard for debugging, but mark if it's mock data
  const isMockData = !leaderboard || leaderboard.length === 0;

  // Choose which data to display
  const displayLeaderboard = !isMockData ? leaderboard : mockLeaderboard;

  // Get medal for top 3 players
  const getMedal = (position) => {
    switch (position) {
      case 0:
        return <FaTrophy className="gold-medal" title="1st Place" />;
      case 1:
        return <FaMedal className="silver-medal" title="2nd Place" />;
      case 2:
        return <FaMedal className="bronze-medal" title="3rd Place" />;
      default:
        return null;
    }
  };

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <h3>Leaderboard {isMockData && "(No Data Yet)"}</h3>
        <button 
          className="refresh-button" 
          onClick={refreshLeaderboard} 
          disabled={isRefreshing}
          title="Refresh leaderboard"
        >
          <FaSync className={isRefreshing ? 'spinning' : ''} />
        </button>
      </div>
      {isMockData && (
        <p className="no-data">
          {hasRequestedLeaderboard 
            ? "Waiting for leaderboard data..." 
            : "Complete a race to see player rankings"}
        </p>
      )}
      <div className="leaderboard-list">
        {displayLeaderboard.map((player, index) => (
          <div 
            key={player.socketId || index} 
            className={`leaderboard-item ${isMockData ? 'mock-data' : ''} ${player.username === currentUsername ? 'current-user' : ''}`}
          >
            <div className="player-rank">
              {getMedal(index) || <span className="rank-number">#{index + 1}</span>}
            </div>
            <div className="player-name">
              {player.username}
              {player.username === currentUsername && <span className="current-user-label">(You)</span>}
            </div>
            <div className="player-points">{player.points} pts</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard; 