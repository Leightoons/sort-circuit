import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import SocketContext from '../context/SocketContext';

const Home = () => {
  const { connected, createRoom } = useContext(SocketContext);
  
  const handleTestCreateRoom = () => {
    if (connected) {
      createRoom(['bubble', 'quick', 'inplacestable'], 'TestUser');
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
            <h3>In-Place Stable Sort</h3>
            <p>A stable sorting algorithm that works in-place without auxiliary storage, using binary search and rotations to efficiently merge sorted sections.</p>
          </div>
          <div className="card">
            <h3>Merge Sort</h3>
            <p>A classic divide-and-conquer algorithm that divides the array into two halves, sorts them, and then merges the sorted halves using auxiliary storage.</p>
          </div>
          <div className="card">
            <h3>Insertion Sort</h3>
            <p>A simple sorting algorithm that builds the final sorted array one item at a time.</p>
          </div>
          <div className="card">
            <h3>Selection Sort</h3>
            <p>A simple sorting algorithm that repeatedly selects the smallest element from the unsorted portion and puts it at the beginning.</p>
          </div>
          <div className="card">
            <h3>Heap Sort</h3>
            <p>An efficient comparison-based sorting algorithm that uses a binary heap data structure. It achieves O(n log n) time complexity in all cases.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 