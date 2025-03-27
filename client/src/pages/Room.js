import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SocketContext from '../context/SocketContext';
import RoomContext from '../context/RoomContext';
import Notifications from '../components/layout/Notifications';

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  
  const { socket, username, connected, joinRoom, leaveRoom, placeBet, startRace, updateSettings, selectAlgorithms } = useContext(SocketContext);
  const { 
    currentRoom, 
    isHost, 
    players, 
    algorithms, 
    settings, 
    roomStatus, 
    raceData, 
    userBet, 
    allBets, 
    results, 
    error, 
    clearError, 
    leaveCurrentRoom 
  } = useContext(RoomContext);
  
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    datasetSize: 20,
    allowDuplicates: false,
    valueRange: { min: 1, max: 100 },
    stepSpeed: 500
  });
  
  // State for algorithm selection
  const [algorithmSelection, setAlgorithmSelection] = useState({
    bubble: true,
    quick: true,
    merge: true,
    insertion: false,
    selection: false
  });
  
  // Sync algorithm selection with current algorithms
  useEffect(() => {
    if (algorithms && algorithms.length > 0) {
      const newSelection = {
        bubble: false,
        quick: false,
        merge: false,
        insertion: false,
        selection: false
      };
      
      algorithms.forEach(algo => {
        newSelection[algo] = true;
      });
      
      setAlgorithmSelection(newSelection);
    }
  }, [algorithms]);
  
  // Join room when component mounts
  useEffect(() => {
    if (connected) {
      joinRoom(roomCode);
    }
    
    return () => {
      // Clean up on unmount
      leaveCurrentRoom();
    };
  }, [connected, roomCode]);
  
  // Update settings form when settings change
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);
  
  // Navigate away if room code doesn't match current room
  useEffect(() => {
    if (currentRoom && currentRoom !== roomCode) {
      navigate(`/room/${currentRoom}`);
    }
  }, [currentRoom, roomCode, navigate]);
  
  // Handle betting
  const handlePlaceBet = () => {
    if (!selectedAlgorithm) return;
    placeBet(roomCode, selectedAlgorithm);
  };
  
  // Handle starting race
  const handleStartRace = () => {
    startRace(roomCode);
  };
  
  // Handle leaving room
  const handleLeaveRoom = () => {
    leaveCurrentRoom();
    navigate('/dashboard');
  };
  
  // Handle settings change
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setSettingsForm({
        ...settingsForm,
        [name]: checked
      });
    } else if (name.startsWith('valueRange.')) {
      const key = name.split('.')[1];
      setSettingsForm({
        ...settingsForm,
        valueRange: {
          ...settingsForm.valueRange,
          [key]: parseInt(value, 10)
        }
      });
    } else {
      setSettingsForm({
        ...settingsForm,
        [name]: type === 'number' ? parseInt(value, 10) : value
      });
    }
  };
  
  // Handle settings submit
  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    updateSettings(roomCode, settingsForm);
  };
  
  // Handle algorithm selection change
  const handleAlgorithmChange = (algorithm) => {
    const newSelection = { ...algorithmSelection, [algorithm]: !algorithmSelection[algorithm] };
    
    // Ensure at least 2 algorithms are selected
    const selectedCount = Object.values(newSelection).filter(v => v).length;
    if (selectedCount < 2) return;
    
    setAlgorithmSelection(newSelection);
    
    // Create array of selected algorithm names
    const selectedAlgos = Object.keys(newSelection).filter(key => newSelection[key]);
    
    // Update algorithms on server
    selectAlgorithms(roomCode, selectedAlgos);
  };
  
  // Render algorithm visualization
  const renderAlgorithmVisualization = (algorithmType) => {
    if (!raceData || !raceData.progress || !raceData.progress[algorithmType]) {
      return (
        <div className="algorithm-visualization waiting">
          <h3>{algorithmType.charAt(0).toUpperCase() + algorithmType.slice(1)} Sort</h3>
          <div className="waiting-text">Waiting for race to start...</div>
        </div>
      );
    }
    
    const algorithmData = raceData.progress[algorithmType];
    const { dataset, finished, position, comparisons, swaps } = algorithmData;
    
    return (
      <div className={`algorithm-visualization ${finished ? 'finished' : 'racing'}`}>
        <h3>{algorithmType.charAt(0).toUpperCase() + algorithmType.slice(1)} Sort</h3>
        
        <div className="visualization-stats">
          <div className="stat">
            <span>Steps:</span>
            <span>{algorithmData.currentStep}</span>
          </div>
          <div className="stat">
            <span>Comparisons:</span>
            <span>{comparisons}</span>
          </div>
          <div className="stat">
            <span>Swaps:</span>
            <span>{swaps}</span>
          </div>
          {finished && (
            <div className="position">
              <span>Position:</span>
              <span>{position}</span>
            </div>
          )}
        </div>
        
        <div className="data-blocks">
          {dataset && dataset.map((value, index) => (
            <div 
              key={index} 
              className="data-block"
              style={{ 
                height: `${(value / Math.max(...dataset)) * 100}%`,
                backgroundColor: algorithmData.lastOperation && 
                  algorithmData.lastOperation.indices.includes(index) ? 
                  algorithmData.lastOperation.type === 'comparison' ? 'var(--color-compare)' : 'var(--color-swap)' : 
                  undefined
              }}
            >
              {dataset.length <= 20 && value}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render betting section
  const renderBetting = () => {
    if (roomStatus !== 'waiting') {
      return (
        <div className="betting-section">
          <h3>Betting Closed</h3>
          {userBet && <p>Your bet: <strong>{userBet.charAt(0).toUpperCase() + userBet.slice(1)} Sort</strong></p>}
        </div>
      );
    }
    
    return (
      <div className="betting-section">
        <h3>Place Your Bet</h3>
        <p>Which algorithm do you think will finish first?</p>
        
        <div className="betting-options">
          {algorithms.map(algo => (
            <div key={algo} className="betting-option">
              <input
                type="radio"
                id={`bet-${algo}`}
                name="algorithm"
                value={algo}
                checked={selectedAlgorithm === algo}
                onChange={() => setSelectedAlgorithm(algo)}
                disabled={userBet !== null}
              />
              <label htmlFor={`bet-${algo}`}>
                {algo.charAt(0).toUpperCase() + algo.slice(1)} Sort
              </label>
            </div>
          ))}
        </div>
        
        {userBet ? (
          <div className="betting-confirmation">
            <p>You bet on: <strong>{userBet.charAt(0).toUpperCase() + userBet.slice(1)} Sort</strong></p>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={handlePlaceBet} 
            disabled={!selectedAlgorithm}
          >
            Place Bet
          </button>
        )}
      </div>
    );
  };
  
  // Render race results
  const renderResults = () => {
    if (!results) return null;
    
    return (
      <div className="results-section">
        <h3>Race Results</h3>
        
        <div className="winner-announcement">
          <h4>Winner: {results.winnerAlgorithm.charAt(0).toUpperCase() + results.winnerAlgorithm.slice(1)} Sort</h4>
        </div>
        
        <div className="algorithm-results">
          {Object.entries(results.results).sort((a, b) => a[1].position - b[1].position).map(([algo, data]) => (
            <div key={algo} className={`algorithm-result ${data.isWinner ? 'winner' : ''}`}>
              <h5>{algo.charAt(0).toUpperCase() + algo.slice(1)} Sort</h5>
              <div className="result-stats">
                <div className="stat">
                  <span>Position:</span>
                  <span>{data.position}</span>
                </div>
                <div className="stat">
                  <span>Steps:</span>
                  <span>{data.steps}</span>
                </div>
                <div className="stat">
                  <span>Comparisons:</span>
                  <span>{data.comparisons}</span>
                </div>
                <div className="stat">
                  <span>Swaps:</span>
                  <span>{data.swaps}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {userBet && (
          <div className="user-result">
            <h4>
              {userBet === results.winnerAlgorithm ? 
                'Congratulations! You won!' : 
                'Better luck next time!'}
            </h4>
          </div>
        )}
        
        {isHost && (
          <button className="btn btn-primary" onClick={handleStartRace}>
            Start New Race
          </button>
        )}
      </div>
    );
  };
  
  // Render algorithm selection for host
  const renderAlgorithmSelector = () => {
    if (!isHost || roomStatus !== 'waiting') return null;
    
    return (
      <div className="algorithm-section settings-section">
        <h3>Select Algorithms</h3>
        <p>Choose which algorithms will participate in the race:</p>
        
        <div className="algorithm-options">
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-bubble"
              checked={algorithmSelection.bubble}
              onChange={() => handleAlgorithmChange('bubble')}
            />
            <label htmlFor="algo-bubble">Bubble Sort</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-quick"
              checked={algorithmSelection.quick}
              onChange={() => handleAlgorithmChange('quick')}
            />
            <label htmlFor="algo-quick">Quick Sort</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-merge"
              checked={algorithmSelection.merge}
              onChange={() => handleAlgorithmChange('merge')}
            />
            <label htmlFor="algo-merge">Merge Sort</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-insertion"
              checked={algorithmSelection.insertion}
              onChange={() => handleAlgorithmChange('insertion')}
            />
            <label htmlFor="algo-insertion">Insertion Sort</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-selection"
              checked={algorithmSelection.selection}
              onChange={() => handleAlgorithmChange('selection')}
            />
            <label htmlFor="algo-selection">Selection Sort</label>
          </div>
        </div>
        <div className="settings-notice">
          <small>Algorithm changes will take effect in the next race</small>
        </div>
      </div>
    );
  };
  
  // Render room settings (only for host)
  const renderSettings = () => {
    if (!isHost || roomStatus !== 'waiting') return null;
    
    return (
      <div className="settings-section">
        <h3>Room Settings</h3>
        <p>Adjust settings for the next race:</p>
        
        <form onSubmit={handleSettingsSubmit}>
          <div className="form-group">
            <label htmlFor="datasetSize">Dataset Size</label>
            <input
              type="range"
              id="datasetSize"
              name="datasetSize"
              min="5"
              max="100"
              value={settingsForm.datasetSize}
              onChange={handleSettingsChange}
            />
            <span>{settingsForm.datasetSize}</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="allowDuplicates">Allow Duplicates</label>
            <input
              type="checkbox"
              id="allowDuplicates"
              name="allowDuplicates"
              checked={settingsForm.allowDuplicates}
              onChange={handleSettingsChange}
            />
          </div>
          
          <div className="form-group">
            <label>Value Range</label>
            <div className="range-inputs">
              <div>
                <label htmlFor="valueRange.min">Min</label>
                <input
                  type="number"
                  id="valueRange.min"
                  name="valueRange.min"
                  min="1"
                  max="999"
                  value={settingsForm.valueRange.min}
                  onChange={handleSettingsChange}
                />
              </div>
              <div>
                <label htmlFor="valueRange.max">Max</label>
                <input
                  type="number"
                  id="valueRange.max"
                  name="valueRange.max"
                  min="1"
                  max="999"
                  value={settingsForm.valueRange.max}
                  onChange={handleSettingsChange}
                />
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="stepSpeed">Step Speed (ms)</label>
            <input
              type="range"
              id="stepSpeed"
              name="stepSpeed"
              min="100"
              max="2000"
              step="100"
              value={settingsForm.stepSpeed}
              onChange={handleSettingsChange}
            />
            <span>{settingsForm.stepSpeed}</span>
          </div>
          
          <button type="submit" className="btn btn-primary">
            Update Settings
          </button>
        </form>
      </div>
    );
  };
  
  if (!currentRoom) {
    return <div className="loading">Loading room...</div>;
  }
  
  return (
    <div className="room-page">
      <Notifications />
      <div className="room-header">
        <h1>Room: {roomCode}</h1>
        <div className="room-status">
          Status: <span className={roomStatus}>{roomStatus.charAt(0).toUpperCase() + roomStatus.slice(1)}</span>
        </div>
        <button className="btn btn-danger" onClick={handleLeaveRoom}>
          Leave Room
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger">
          {error}
          <button className="close-btn" onClick={clearError}>×</button>
        </div>
      )}
      
      <div className="room-players">
        <h3>Players ({players.length})</h3>
        <ul>
          {players.map(player => {
            // Check if player has placed a bet
            const hasBet = allBets.some(bet => bet.socketId === player.socketId);
            
            return (
              <li key={player.socketId} className={player.username === username ? 'current-user' : ''}>
                {player.username} {player.username === username ? '(You)' : ''}
                {isHost && player.socketId === socket.id && ' (Host)'}
                {hasBet && <span className="bet-indicator" title={`Has placed a bet`}>🎲</span>}
              </li>
            );
          })}
        </ul>
      </div>
      
      {isHost && roomStatus === 'waiting' && (
        <div className="host-controls">
          <div className="host-notice">
            <p>
              <i className="fas fa-info-circle"></i> As the host, you can modify algorithms and settings below. Changes will apply to the next race.
            </p>
          </div>
          <button 
            className="btn btn-success start-race-btn" 
            onClick={handleStartRace}
            disabled={algorithms.length < 2}
          >
            Start Race
          </button>
        </div>
      )}
      
      <div className="room-main">
        <div className="race-container">
          <h2>Sorting Algorithm Race</h2>
          
          <div className="algorithms-container">
            {algorithms.map(algo => (
              <div key={algo} className="algorithm-card">
                {renderAlgorithmVisualization(algo)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="room-sidebar">
          {renderBetting()}
          {renderAlgorithmSelector()}
          {renderSettings()}
          {roomStatus === 'finished' && renderResults()}
        </div>
      </div>
    </div>
  );
};

export default Room; 