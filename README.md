# Sort Circuit
Jared Leighton
CSE 248 Final Project

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

