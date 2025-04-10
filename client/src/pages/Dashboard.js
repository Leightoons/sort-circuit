import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SocketContext from '../context/SocketContext';
import RoomContext from '../context/RoomContext';

const Dashboard = () => {
  const [roomCode, setRoomCode] = useState('');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(['bubble', 'quick', 'inplacestable']);
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
    
    if (!usernameInput.trim()) {
      setJoinError('Please enter a username');
      return;
    }
    
    setJoinError('');
    setIsCreatingRoom(true);
    createRoom(selectedAlgorithms, usernameInput);
    
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
                  id="inplacestable"
                  name="inplacestable"
                  checked={selectedAlgorithms.includes('inplacestable')}
                  onChange={() => handleAlgorithmChange('inplacestable')}
                />
                <label htmlFor="inplacestable">In-Place Stable Sort</label>
              </div>
              <div className="algorithm-option">
                <input
                  type="checkbox"
                  id="mergetraditional"
                  name="mergetraditional"
                  checked={selectedAlgorithms.includes('mergetraditional')}
                  onChange={() => handleAlgorithmChange('mergetraditional')}
                />
                <label htmlFor="mergetraditional">Merge Sort (Traditional)</label>
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
            disabled={!isReady || selectedAlgorithms.length < 2 || !usernameInput.trim() || isCreatingRoom}
          >
            {isCreatingRoom ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 