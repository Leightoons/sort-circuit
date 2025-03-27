# Sort Circuit - Server

This is the backend server for the Sort Circuit application. It handles room creation, joining, and the execution of sorting algorithm races.

## Important Changes

### Model Access
- All database models must be accessed through the `getModel()` function imported from `./config/db.js`
- Example: `const Room = getModel('Room')` instead of directly requiring models

### Mock Database
- The application includes an in-memory mock database that activates when MongoDB is not available
- To use the mock database, comment out the MONGO_URI in your .env file

### Room Functionality
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
   # Comment this line to use in-memory database
   # MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   ```

3. Start the server:
   ```
   node index.js
   ```

## Troubleshooting

If you encounter issues with creating or joining rooms:
1. Check that you're using `getModel()` for any database model access
2. Ensure the mock database is properly initialized when MongoDB is unavailable 
3. Check socket connection by opening browser console
4. Verify that the server console shows the expected connection and room events 