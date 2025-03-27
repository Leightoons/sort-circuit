# Sort Circuit - Server

This is the backend server for the Sort Circuit application. It handles room creation, joining, and the execution of sorting algorithm races.

## In-Memory Database

The Sort Circuit server uses a simple in-memory database solution instead of MongoDB:

- No database installation or configuration required
- All room data is stored in memory during server runtime
- Clean and simple implementation with similar API to MongoDB models
- Reduced dependencies and faster startup time

### Data Storage

The following data is stored in-memory:

- **Rooms**: Information about game rooms, their settings, and participants
- **Active Races**: Currently running algorithm races
- **Bets**: Player bets on algorithms

Note that all data is lost when the server restarts.

## Model Access

- All database models are accessed through the `getModel()` function imported from `./config/db.js`
- Example: `const Room = getModel('Room')`

## Room Functionality

- Rooms can be created and joined with a username
- Socket connections maintain a list of usernames
- Room hosts can configure algorithms and settings
- All room operations validate permissions and state

## Running the Server

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with:
   ```
   PORT=5000
   NODE_ENV=development
   ```

3. Start the server:
   ```
   node index.js
   ```

## Troubleshooting

If you encounter issues with creating or joining rooms:
1. Check that you're using `getModel()` for any database model access
2. Check socket connection by opening browser console
3. Verify that the server console shows the expected connection and room events 