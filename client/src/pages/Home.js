import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import SocketContext from '../context/SocketContext';

const Home = () => {
  const { connected, createRoom } = useContext(SocketContext);
  
  const handleTestCreateRoom = () => {
    if (connected) {
      createRoom(['bubble', 'quick', 'merge'], 'TestUser');
      console.log('Test room creation initiated');
    } else {
      console.log('Not connected to server');
    }
  };
  
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Sort Circuit</h1>
        <p className="lead">
          A multiplayer game where players bet on races between sorting algorithms
        </p>
        <div className="buttons">
          <Link to="/dashboard" className="btn btn-primary">
            Join a Game
          </Link>
          <button 
            onClick={handleTestCreateRoom} 
            className="btn btn-secondary"
            style={{ marginLeft: '10px' }}
            disabled={!connected}
          >
            Test Room Creation
          </button>
        </div>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}
             style={{ marginTop: '1rem', display: 'inline-block' }}>
          Server Status: {connected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      <div className="about-section">
        <h2>How It Works</h2>
        <div className="grid-3">
          <div className="card">
            <i className="fas fa-users"></i>
            <h3>Join a Race</h3>
            <p>Create a room or join an existing one with a room code</p>
          </div>
          <div className="card">
            <i className="fas fa-dice"></i>
            <h3>Place Your Bets</h3>
            <p>Predict which sorting algorithm will finish first</p>
          </div>
          <div className="card">
            <i className="fas fa-trophy"></i>
            <h3>Win Points</h3>
            <p>Earn points for correct predictions during the race</p>
          </div>
        </div>
      </div>

      <div className="algorithms-section">
        <h2>Featured Algorithms</h2>
        <div className="grid-5">
          <div className="card">
            <h3>Bubble Sort</h3>
            <p>A simple sorting algorithm that repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.</p>
          </div>
          <div className="card">
            <h3>Quick Sort</h3>
            <p>A divide-and-conquer algorithm that selects a 'pivot' element and partitions the array around it.</p>
          </div>
          <div className="card">
            <h3>Merge Sort</h3>
            <p>A divide-and-conquer algorithm that divides the input array into two halves, sorts them, and then merges the sorted halves.</p>
          </div>
          <div className="card">
            <h3>Insertion Sort</h3>
            <p>A simple sorting algorithm that builds the final sorted array one item at a time.</p>
          </div>
          <div className="card">
            <h3>Selection Sort</h3>
            <p>A simple sorting algorithm that repeatedly finds the minimum element from the unsorted part and puts it at the beginning.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 