import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SocketContext from '../context/SocketContext';
import RoomContext from '../context/RoomContext';
import Notifications from '../components/layout/Notifications';

// Define the preferred algorithm display order
const ALGORITHM_ORDER = {
  'bubble': 1,
  'insertion': 2,
  'selection': 3,
  'heap': 4,
  'inplacestable': 5,
  'merge': 6,
  'quick': 7,
  'bogo': 8
};

// Define proper display names for each algorithm
const ALGORITHM_NAMES = {
  'bubble': 'Bubble Sort',
  'insertion': 'Insertion Sort',
  'selection': 'Selection Sort',
  'inplacestable': 'In-Place Stable Sort',
  'merge': 'Merge Sort',
  'quick': 'Quick Sort',
  'heap': 'Heap Sort',
  'bogo': 'Bogo Sort'
};

// Helper function to get the display name for an algorithm
const getAlgorithmDisplayName = (algorithmId) => {
  return ALGORITHM_NAMES[algorithmId] || algorithmId.charAt(0).toUpperCase() + algorithmId.slice(1) + ' Sort';
};

const Room = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  
  const { socket, username, connected, joinRoom, leaveRoom, placeBet, startRace, updateSettings, selectAlgorithms, resetRoomState, endRaceEarly } = useContext(SocketContext);
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
    inplacestable: true,
    merge: false,
    insertion: false,
    selection: false,
    heap: false,
    bogo: false
  });
  
  // Add a new state for live speed control
  const [liveSpeed, setLiveSpeed] = useState(settingsForm.stepSpeed || 100);
  
  // Add a state to track if any algorithm has finished
  const [hasFinishedAlgorithm, setHasFinishedAlgorithm] = useState(false);
  
  // Cleanup visualization state when race status changes
  useEffect(() => {
    // When going from finished to waiting state, ensure visualization is reset
    if (roomStatus === 'waiting' && raceData && raceData.endedEarly) {
      console.log('Cleaning up race data after early end');
      // This ensures we don't keep stale data that could cause jitter
    }
  }, [roomStatus, raceData]);
  
  // Sync algorithm selection with current algorithms
  useEffect(() => {
    if (algorithms && algorithms.length > 0) {
      const newSelection = {
        bubble: false,
        quick: false,
        inplacestable: false,
        merge: false,
        insertion: false,
        selection: false,
        heap: false,
        bogo: false
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
  
  // Reset selectedAlgorithm when userBet is reset
  useEffect(() => {
    if (userBet === null) {
      setSelectedAlgorithm('');
    }
  }, [userBet]);
  
  // Navigate away if room code doesn't match current room
  useEffect(() => {
    if (currentRoom && currentRoom !== roomCode) {
      navigate(`/room/${currentRoom}`);
    }
  }, [currentRoom, roomCode, navigate]);
  
  // Update liveSpeed whenever settings change
  useEffect(() => {
    if (settingsForm && settingsForm.stepSpeed) {
      setLiveSpeed(settingsForm.stepSpeed);
    }
  }, [settingsForm]);
  
  // Check if at least one algorithm has finished whenever raceData updates
  useEffect(() => {
    if (raceData && raceData.progress) {
      // Check if any algorithm has finished
      const hasAnyFinished = Object.values(raceData.progress).some(algo => algo.finished);
      setHasFinishedAlgorithm(hasAnyFinished);
    } else {
      setHasFinishedAlgorithm(false);
    }
  }, [raceData]);
  
  // Add handler for changing race speed during the race
  const handleLiveSpeedChange = (e) => {
    const newSpeed = parseInt(e.target.value, 10);
    setLiveSpeed(newSpeed);
    
    if (socket) {
      socket.emit('update_race_speed', {
        roomCode,
        stepSpeed: newSpeed
      });
    }
  };
  
  // Add event listener for race speed updates
  useEffect(() => {
    if (!socket) return;
    
    const handleRaceSpeedUpdated = (data) => {
      if (data.roomCode === roomCode) {
        setLiveSpeed(data.stepSpeed);
        console.log(`Race speed updated to ${data.stepSpeed}ms`);
      }
    };
    
    socket.on('race_speed_updated', handleRaceSpeedUpdated);
    
    return () => {
      socket.off('race_speed_updated', handleRaceSpeedUpdated);
    };
  }, [socket, roomCode]);
  
  // Handle betting
  const handlePlaceBet = () => {
    if (!selectedAlgorithm) return;
    placeBet(roomCode, selectedAlgorithm);
  };
  
  // Handle starting race
  const handleStartRace = () => {
    startRace(roomCode);
  };
  
  // Handle resetting room to waiting state
  const handleResetRoom = () => {
    resetRoomState(roomCode);
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
        <div className="algorithm-visualization waiting" data-algorithm={algorithmType}>
          <h3>{getAlgorithmDisplayName(algorithmType)}</h3>
          <div className="waiting-text">Waiting for race to start...</div>
        </div>
      );
    }
    
    const algorithmData = raceData.progress[algorithmType];
    const { dataset, finished, position, comparisons, swaps, stoppedEarly } = algorithmData;
    
    // Ensure we have a valid dataset - if not, use the race dataset
    const visualizationDataset = dataset || (raceData && raceData.dataset ? [...raceData.dataset] : []);
    
    // Generate a unique key for this visualization based on the algorithm and 
    // either the cleaned/cleanStart flag or a timestamp to force fresh rendering
    const visualKey = `${algorithmType}-${raceData.cleanStart || raceData.cleaned ? 'new' : 'current'}-${roomStatus}`;
    
    return (
      <div 
        key={visualKey}
        className={`algorithm-visualization ${finished ? 'finished' : 'racing'} ${algorithmData.lastOperation ? 'last-updated' : ''} ${stoppedEarly ? 'stopped-early' : ''}`}
        data-algorithm={algorithmType}
      >
        <h3>{getAlgorithmDisplayName(algorithmType)}</h3>
        
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
          {stoppedEarly && (
            <div className="stopped-early-badge">
              <span>⚠️ Stopped</span>
            </div>
          )}
        </div>
        
        <div className="data-blocks">
          {visualizationDataset && visualizationDataset.map((value, index) => {
            // Determine if this block should be highlighted
            // Only highlight if the algorithm is still running
            const isHighlighted = !finished && algorithmData.lastOperation && 
              (algorithmData.lastOperation.indices.includes(index) || 
               algorithmData.lastOperation.type === 'shuffle'); // Highlight all blocks during shuffle
            
            // Choose color based on operation type and alternating flag
            let backgroundColor = undefined;
            
            // If algorithm is finished, use a uniform success color
            if (finished) {
              backgroundColor = 'var(--color-success-bars)';
            } else if (isHighlighted) {
              const { type, alternate } = algorithmData.lastOperation;
              if (type === 'comparison') {
                backgroundColor = alternate ? 'var(--color-compare-alt)' : 'var(--color-compare)';
              } else if (type === 'swap') {
                backgroundColor = alternate ? 'var(--color-swap-alt)' : 'var(--color-swap)';
              } else if (type === 'shuffle') {
                backgroundColor = 'var(--color-swap)'; // Use swap color for shuffle
              }
            }
            
            return (
              <div 
                key={`${visualKey}-block-${index}`}
                className="data-block"
                style={{ 
                  height: `${(value / Math.max(...visualizationDataset)) * 100}%`,
                  backgroundColor
                }}
              >
                {visualizationDataset.length <= 20 && value}
              </div>
            );
          })}
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
          {userBet && <p>Your bet: <strong>{getAlgorithmDisplayName(userBet)}</strong></p>}
        </div>
      );
    }
    
    return (
      <div className="betting-section">
        <h3>Place Your Bet</h3>
        <p>Which algorithm do you think will finish first?</p>
        
        <div className="betting-options">
          {algorithms
            .slice() // Create a copy to avoid mutating the original array
            .sort((a, b) => {
              // Sort by the defined order
              return (ALGORITHM_ORDER[a] || 99) - (ALGORITHM_ORDER[b] || 99);
            })
            .map(algo => (
              <div key={algo} className="betting-option">
                <input
                  type="radio"
                  id={`bet-${algo}`}
                  name="algorithm"
                  value={algo}
                  checked={selectedAlgorithm === algo}
                  onChange={() => setSelectedAlgorithm(algo)}
                />
                <label htmlFor={`bet-${algo}`}>
                  {getAlgorithmDisplayName(algo)}
                </label>
              </div>
            ))}
        </div>
        
        {userBet ? (
          <div className="betting-confirmation">
            <p>Your current bet: <strong>{getAlgorithmDisplayName(userBet)}</strong></p>
            <button 
              className="btn btn-primary" 
              onClick={handlePlaceBet} 
              disabled={!selectedAlgorithm || selectedAlgorithm === userBet}
            >
              Change Bet
            </button>
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
          <h4>Winner: {getAlgorithmDisplayName(results.winnerAlgorithm)}</h4>
        </div>
        
        <div className="algorithm-results">
          {Object.entries(results.results)
            .sort((a, b) => {
              // Primary sort by position
              if (a[1].position !== b[1].position) {
                return a[1].position - b[1].position;
              }
              
              // Secondary sort by algorithm name for consistent ordering
              return (ALGORITHM_ORDER[a[0]] || 99) - (ALGORITHM_ORDER[b[0]] || 99);
            })
            .map(([algo, data]) => (
              <div key={algo} className={`algorithm-result ${data.isWinner ? 'winner' : ''} ${data.stoppedEarly ? 'stopped-early' : ''}`}>
                <h5>{getAlgorithmDisplayName(algo)}</h5>
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
                  {data.stoppedEarly && (
                    <div className="stopped-early-indicator">
                      ⚠️ Stopped Early
                    </div>
                  )}
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
          <button className="btn btn-primary" onClick={handleResetRoom}>
            Start New Race
          </button>
        )}
      </div>
    );
  };
  
  // Render algorithm selection for host
  const renderAlgorithmSelector = () => {
    const isUserHost = isHost || (socket && players.some(p => p.socketId === socket.id && p.isHost));
    if (!isUserHost || roomStatus !== 'waiting') return null;
    
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
            <label htmlFor="algo-bubble">{getAlgorithmDisplayName('bubble')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-quick"
              checked={algorithmSelection.quick}
              onChange={() => handleAlgorithmChange('quick')}
            />
            <label htmlFor="algo-quick">{getAlgorithmDisplayName('quick')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-inplacestable"
              checked={algorithmSelection.inplacestable}
              onChange={() => handleAlgorithmChange('inplacestable')}
            />
            <label htmlFor="algo-inplacestable">{getAlgorithmDisplayName('inplacestable')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-merge"
              checked={algorithmSelection.merge}
              onChange={() => handleAlgorithmChange('merge')}
            />
            <label htmlFor="algo-merge">{getAlgorithmDisplayName('merge')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-insertion"
              checked={algorithmSelection.insertion}
              onChange={() => handleAlgorithmChange('insertion')}
            />
            <label htmlFor="algo-insertion">{getAlgorithmDisplayName('insertion')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-selection"
              checked={algorithmSelection.selection}
              onChange={() => handleAlgorithmChange('selection')}
            />
            <label htmlFor="algo-selection">{getAlgorithmDisplayName('selection')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-heap"
              checked={algorithmSelection.heap}
              onChange={() => handleAlgorithmChange('heap')}
            />
            <label htmlFor="algo-heap">{getAlgorithmDisplayName('heap')}</label>
          </div>
          <div className="algorithm-option">
            <input
              type="checkbox"
              id="algo-bogo"
              checked={algorithmSelection.bogo}
              onChange={() => handleAlgorithmChange('bogo')}
            />
            <label htmlFor="algo-bogo">{getAlgorithmDisplayName('bogo')}</label>
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
    const isUserHost = isHost || (socket && players.some(p => p.socketId === socket.id && p.isHost));
    if (!isUserHost || roomStatus !== 'waiting') return null;
    
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
              min="0"
              max="500"
              step="50"
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
  
  // Add live speed control UI component
  const renderLiveSpeedControl = () => {
    const isUserHost = isHost || (socket && players.some(p => p.socketId === socket.id && p.isHost));
    if (!isUserHost || roomStatus !== 'racing') return null;
    
    return (
      <div className="live-speed-control">
        <h3>Host Controls</h3>
        <div className="form-group">
          <label htmlFor="liveSpeed">Algorithm Speed (ms)</label>
          <input
            type="range"
            id="liveSpeed"
            name="liveSpeed"
            min="0"
            max="500"
            step="50"
            value={liveSpeed}
            onChange={handleLiveSpeedChange}
          />
          <span>{liveSpeed}ms</span>
        </div>
        <p className="speed-info">
          <i className="fas fa-info-circle"></i> Changes apply immediately to all algorithms
        </p>
        
        {hasFinishedAlgorithm && (
          <div className="end-race-early">
            <button 
              className="btn btn-warning end-race-btn" 
              onClick={handleEndRaceEarly}
            >
              End Race Early
            </button>
            <p className="end-race-info">
              <i className="fas fa-exclamation-triangle"></i> This will stop all remaining algorithms and declare a winner
            </p>
          </div>
        )}
      </div>
    );
  };
  
  // Handle ending race early
  const handleEndRaceEarly = () => {
    endRaceEarly(roomCode);
  };
  
  // Add event listener for race ended early notifications
  useEffect(() => {
    if (!socket) return;
    
    const handleRaceEndedEarly = (data) => {
      if (data.roomCode === roomCode) {
        console.log(`Race ended early by ${data.stoppedBy}`);
      }
    };
    
    socket.on('race_ended_early', handleRaceEndedEarly);
    
    return () => {
      socket.off('race_ended_early', handleRaceEndedEarly);
    };
  }, [socket, roomCode]);
  
  if (!currentRoom) {
    return <div className="loading">Loading room...</div>;
  }
  
  // Debug log host status
  console.log(`Room ${roomCode} - isHost: ${isHost}, roomStatus: ${roomStatus}`);
  console.log(`Players:`, players);
  console.log(`Current socket ID:`, socket?.id);
  
  return (
    <div className="room-page">
      <Notifications />
      <div className="room-header">
        <h1>Room: {roomCode}</h1>
        <div className="room-status">
          Status: <span className={roomStatus}>{roomStatus.charAt(0).toUpperCase() + roomStatus.slice(1)}</span>
          {socket && <span className="host-status"> | Host: <span className={isHost ? "host-status-yes" : "host-status-no"}>{isHost ? 'Yes' : 'No'}</span></span>}
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
                {player.isHost && <span className="host-badge">(Host)</span>}
                {hasBet && <span className="bet-indicator" title={`Has placed a bet`}>🎲</span>}
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* Modify the host controls section to show speed control during race */}
      {(isHost || (socket && players.some(p => p.socketId === socket.id && p.isHost))) && (
        <div className="host-controls">
          <div className="host-notice">
            <p>
              <i className="fas fa-info-circle"></i> As the host, you can modify algorithms and settings below. 
              {roomStatus === 'waiting' ? ' Changes will apply to the next race.' : ' Waiting for current race to finish.'}
            </p>
          </div>
          {roomStatus === 'waiting' && (
            <button 
              className="btn btn-success start-race-btn" 
              onClick={handleStartRace}
              disabled={algorithms.length < 2}
            >
              Start Race
            </button>
          )}
          {roomStatus === 'racing' && renderLiveSpeedControl()}
        </div>
      )}
      
      <div className="room-main">
        <div className="race-container">
          <h2>Sorting Algorithm Race</h2>
          
          <div className="algorithms-container">
            {/* Sort algorithms in a consistent order before rendering */}
            {algorithms
              .slice() // Create a copy to avoid mutating the original array
              .sort((a, b) => {
                // Sort by the defined order
                return (ALGORITHM_ORDER[a] || 99) - (ALGORITHM_ORDER[b] || 99);
              })
              .map(algo => (
                <div key={algo} className="algorithm-card">
                  {renderAlgorithmVisualization(algo)}
                </div>
              ))
            }
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