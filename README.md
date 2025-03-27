# Sort Circuit

A multiplayer web app where players bet on races between sorting algorithms visualized as robots.

## Features

- Create or join rooms to compete with friends
- Watch real-time visualizations of sorting algorithms racing against each other
- Place bets on which algorithm will finish first
- Customize race settings (dataset size, value range, etc.)
- Choose which algorithms participate in each race
- Simple in-memory data storage with no database required

## Supported Algorithms

- Bubble Sort
- Quick Sort
- Merge Sort
- Insertion Sort
- Selection Sort

## Getting Started

### Prerequisites

- Node.js (>= 14.x)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/sort-circuit.git
   cd sort-circuit
   ```

2. Install dependencies for both server and client
   ```bash
   npm run install-all
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

This will start both the backend server on port 5000 and the React client on port 3000.

### Testing the Socket Connection

To verify that the WebSocket connection is working correctly:

```bash
npm run test-socket
```

This will run a simple test script that creates a room and joins it.

## Usage Guide

1. Open your browser and navigate to `http://localhost:3000`
2. Enter a username on the Dashboard page
3. Create a new room or join an existing one with a room code
4. When creating a room, select which algorithms you want to include in the race
5. As a host, you can customize race settings and start the race when ready
6. Players place bets on which algorithm they think will win
7. Watch the algorithms race in real-time!

## Project Structure

- `client/` - React frontend application
- `server/` - Node.js/Express backend
- `server/config/db.js` - In-memory database implementation
- `server/controllers/` - Business logic
- `server/socketHandlers.js` - WebSocket event handlers
- `server/utils/` - Utility functions including algorithm implementations

## Architecture

Sort Circuit uses:
- Socket.IO for real-time communication
- In-memory data storage for rooms, bets, and race data
- React for the frontend UI
- Express for serving the API and static assets

Note: Since data is stored in memory, all rooms and bets are lost when the server restarts.

## Algorithm Implementations

Each sorting algorithm is implemented with visual steps to show the sorting process:

- `bubble` - Repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order
- `quick` - Selects a 'pivot' element and partitions the array around it
- `merge` - Divides the array into two halves, sorts them, and then merges the sorted halves
- `insertion` - Builds the final sorted array one item at a time
- `selection` - Repeatedly finds the minimum element from the unsorted part and puts it at the beginning

## License

This project is licensed under the ISC License
