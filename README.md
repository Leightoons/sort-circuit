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
- Insertion Sort
- Selection Sort
- Heap Sort
- In-Place Stable Sort
- Merge Sort
- TimSort
- PowerSort
- Quick Sort
- Radix Sort (Decimal)
- Radix Sort (Binary)
- Bogo Sort
- Stalin Sort
- Gnome Sort

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
- `insertion` - Builds the final sorted array one item at a time by iteratively inserting each element into its correct position in the already sorted portion
- `selection` - Repeatedly finds the minimum element from the unsorted part and puts it at the beginning
- `heap` - Builds a binary heap from the array and repeatedly extracts the maximum element to build the sorted array from back to front
- `inplacestable` - A stable sorting algorithm that operates in-place with O(n log n) time complexity (based on a Java implementation by Thomas Baudel: <https://thomas.baudel.name/Visualisation/VisuTri/inplacestablesort.html>)
- `merge` - Divides the array into two halves, sorts them, and then merges the sorted halves
- `timsort` - A hybrid sorting algorithm derived from merge sort and insertion sort, designed to perform well on many kinds of real-world data
- `powersort` - An optimization of merge sort that uses a binary search tree to guide the merging process
- `quick` - Selects a 'pivot' element and partitions the array around it, then recursively sorts the sub-arrays
- `radix` - Processes individual digits, distributing elements into buckets according to their decimal digits
- `radixbit` - Similar to radix sort but operates on bits instead of decimal digits
- `bogo` - A highly inefficient algorithm that randomly shuffles the array until it happens to be sorted
- `stalin` - Removes elements that are not in order (not a traditional sorting algorithm as it doesn't preserve all elements)
- `gnome` - Similar to insertion sort but moves elements to their proper position by series of swaps, like a garden gnome sorting flower pots

