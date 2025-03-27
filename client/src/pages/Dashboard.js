import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import SocketContext from '../context/SocketContext';
import RoomContext from '../context/RoomContext';

const Dashboard = () => {
  const [roomCode, setRoomCode] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(['bubble', 'quick', 'merge']);
  const [joinError, setJoinError] = useState('');
  
  const { user } = useContext(AuthContext);
  const { createRoom, joinRoom, connected } = useContext(SocketContext);
  const { currentRoom } = useContext(RoomContext);
  const navigate = useNavigate();

  // Check if socket connected before allowing room operations
  const isReady = connected;

  // Handle algorithm selection
  const handleAlgorithmChange = (algorithm) => {
    if (selectedAlgorithms.includes(algorithm)) {
      // Remove if already selected
      if (selectedAlgorithms.length > 1) {
        setSelectedAlgorithms(selectedAlgorithms.filter(algo => algo !== algorithm));
      }
    } else {
      // Add if not selected
      setSelectedAlgorithms([...selectedAlgorithms, algorithm]);
    }
  };

  // Create a new room
  const handleCreateRoom = () => {
    if (!isReady) {
      setJoinError('Connection not ready. Please try again.');
      return;
    }
    
    createRoom(selectedAlgorithms);
  };

  // Join an existing room
  const handleJoinRoom = (e) => {
    e.preventDefault();
    
    if (!isReady) {
      setJoinError('Connection not ready. Please try again.');
      return;
    }
    
    if (!roomCode || roomCode.trim() === '') {
      setJoinError('Please enter a room code');
      return;
    }
    
    joinRoom(roomCode);
  };

  // Navigate to room page when we have a room
  if (currentRoom) {
    navigate(`/room/${currentRoom}`);
    return null;
  }

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p className="lead">Welcome, {user?.username}</p>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Join a Room</h3>
          <form onSubmit={handleJoinRoom}>
            {joinError && <div className="alert alert-danger">{joinError}</div>}
            <div className="form-group">
              <label htmlFor="roomCode">Room Code</label>
              <input
                type="text"
                name="roomCode"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit room code"
                maxLength="6"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={!isReady}
            >
              Join Room
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Create a Room</h3>
          
          <div className="algorithm-selector">
            <p>Select algorithms for the race (min 2):</p>
            <div className="algorithm-options">
              <div className="algorithm-option">
                <input
                  type="checkbox"
                  id="bubble"
                  name="bubble"
                  checked={selectedAlgorithms.includes('bubble')}
                  onChange={() => handleAlgorithmChange('bubble')}
                />
                <label htmlFor="bubble">Bubble Sort</label>
              </div>
              <div className="algorithm-option">
                <input
                  type="checkbox"
                  id="quick"
                  name="quick"
                  checked={selectedAlgorithms.includes('quick')}
                  onChange={() => handleAlgorithmChange('quick')}
                />
                <label htmlFor="quick">Quick Sort</label>
              </div>
              <div className="algorithm-option">
                <input
                  type="checkbox"
                  id="merge"
                  name="merge"
                  checked={selectedAlgorithms.includes('merge')}
                  onChange={() => handleAlgorithmChange('merge')}
                />
                <label htmlFor="merge">Merge Sort</label>
              </div>
              <div className="algorithm-option">
                <input
                  type="checkbox"
                  id="insertion"
                  name="insertion"
                  checked={selectedAlgorithms.includes('insertion')}
                  onChange={() => handleAlgorithmChange('insertion')}
                />
                <label htmlFor="insertion">Insertion Sort</label>
              </div>
              <div className="algorithm-option">
                <input
                  type="checkbox"
                  id="selection"
                  name="selection"
                  checked={selectedAlgorithms.includes('selection')}
                  onChange={() => handleAlgorithmChange('selection')}
                />
                <label htmlFor="selection">Selection Sort</label>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleCreateRoom}
            className="btn btn-primary btn-block"
            disabled={!isReady || selectedAlgorithms.length < 2}
          >
            Create Room
          </button>
        </div>

        <div className="card">
          <h3>Your Stats</h3>
          <div className="stats">
            <div className="stat">
              <h4>Points</h4>
              <p>{user?.points || 0}</p>
            </div>
            <div className="stat">
              <h4>Games Played</h4>
              <p>{user?.gamesPlayed || 0}</p>
            </div>
            <div className="stat">
              <h4>Win Rate</h4>
              <p>
                {user?.gamesPlayed > 0
                  ? `${Math.round((user?.gamesWon / user?.gamesPlayed) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 