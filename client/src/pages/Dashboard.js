import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SocketContext from '../context/SocketContext';
import RoomContext from '../context/RoomContext';
import { AiOutlineSwap } from 'react-icons/ai';
import { FiRefreshCw, FiEye, FiEdit, FiClock } from 'react-icons/fi';

// Define proper display names for each algorithm
const ALGORITHM_NAMES = {
  'bubble': 'Bubble Sort',
  'insertion': 'Insertion Sort',
  'selection': 'Selection Sort',
  'inplacestable': 'In-Place Stable Sort',
  'merge': 'Merge Sort',
  'quick': 'Quick Sort',
  'heap': 'Heap Sort',
  'bogo': 'Bogo Sort',
  'stalin': 'Stalin Sort',
  'timsort': 'TimSort',
  'powersort': 'PowerSort',
  'gnome': 'Gnome Sort',
  'radix': 'Radix Sort'
};

// Helper function to get the display name for an algorithm
const getAlgorithmDisplayName = (algorithmId) => {
  return ALGORITHM_NAMES[algorithmId] || algorithmId.charAt(0).toUpperCase() + algorithmId.slice(1) + ' Sort';
};

const RaceHistoryItem = ({ race }) => {
  // Add array accesses and writes to the displayable stats
  const resultsMetrics = [
    { label: 'Comparisons', icon: <AiOutlineSwap /> },
    { label: 'Swaps', icon: <FiRefreshCw /> },
    { label: 'Accesses', icon: <FiEye /> },
    { label: 'Writes', icon: <FiEdit /> }
  ];

  const renderAlgorithmData = (algorithm) => {
    const { comparisons, swaps, arrayAccesses, arrayWrites, position } = algorithm;
    
    return (
      <div className="algorithm-item">
        <div className="algorithm-name">
          <span className={`position position-${position}`}>#{position}</span>
          <span>{getAlgorithmDisplayName(algorithm.type)}</span>
        </div>
        <div className="algorithm-metrics">
          <div className="metric">
            <FiClock />
            <span>{algorithm.timeElapsed}ms</span>
          </div>
          <div className="metric">
            <AiOutlineSwap />
            <span>{comparisons}</span>
          </div>
          <div className="metric">
            <FiRefreshCw />
            <span>{swaps}</span>
          </div>
          <div className="metric">
            <FiEye />
            <span>{arrayAccesses || 0}</span>
          </div>
          <div className="metric">
            <FiEdit />
            <span>{arrayWrites || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="race-history-item">
      {race.algorithms.map(renderAlgorithmData)}
    </div>
  );
};

const Dashboard = () => {
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  
  const { username, setUsername, createRoom, joinRoom, connected } = useContext(SocketContext);
  const { currentRoom, error } = useContext(RoomContext);
  const navigate = useNavigate();

  // Initialize username from context or create a temporary one
  useEffect(() => {
    if (!username) {
      setUsernameInput('Player');
    } else {
      setUsernameInput(username);
    }
  }, [username]);

  // Update error message when RoomContext error changes
  useEffect(() => {
    if (error) {
      setJoinError(error);
      setIsCreatingRoom(false);
      setIsJoiningRoom(false);
    }
  }, [error]);

  // Check if socket connected before allowing room operations
  const isReady = connected;

  // Create a new room
  const handleCreateRoom = () => {
    if (!isReady) {
      setJoinError('Connection not ready. Please try again.');
      return;
    }
    
    if (!usernameInput.trim()) {
      setJoinError('Please enter a username');
      return;
    }
    
    setJoinError('');
    setIsCreatingRoom(true);
    createRoom(usernameInput);
    
    // Reset creating status after timeout (in case of silent failure)
    setTimeout(() => {
      setIsCreatingRoom(false);
    }, 5000);
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
    
    if (!usernameInput.trim()) {
      setJoinError('Please enter a username');
      return;
    }
    
    setJoinError('');
    setIsJoiningRoom(true);
    joinRoom(roomCode, usernameInput);
    
    // Reset joining status after timeout (in case of silent failure)
    setTimeout(() => {
      setIsJoiningRoom(false);
    }, 5000);
  };

  // Navigate to room page when we have a room
  if (currentRoom) {
    navigate(`/room/${currentRoom}`);
    return null;
  }

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p className="lead">Create or join a room to start racing algorithms!</p>
      
      <div className={`connection-status ${isReady ? 'connected' : 'disconnected'}`}>
        Connection Status: {isReady ? 'Connected' : 'Connecting...'}
      </div>

      <div className="username-section card">
        <h3>Your Username</h3>
        <div className="form-group">
          <label htmlFor="username">Enter a display name to use in rooms:</label>
          <input
            type="text"
            id="username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Enter a username"
          />
        </div>
      </div>

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
              disabled={!isReady || !usernameInput.trim() || isJoiningRoom}
            >
              {isJoiningRoom ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Create a Room</h3>
          
          <p className="info-text">
            Create a room to race sorting algorithms! You'll be able to select which algorithms 
            to include in the race after joining.
          </p>
          
          <button
            onClick={handleCreateRoom}
            className="btn btn-primary btn-block"
            disabled={!isReady || !usernameInput.trim() || isCreatingRoom}
          >
            {isCreatingRoom ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 