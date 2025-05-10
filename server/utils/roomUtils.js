/**
 * Reassigns the host role for a room when the current host leaves
 * @param {object} io - Socket.io instance
 * @param {object} room - The room object
 * @param {string} departingSocketId - The socket ID of the departing host
 * @param {Map} socketUsernames - Map of socket IDs to usernames
 * @returns {Promise<boolean>} - Whether a new host was assigned
 */
const reassignRoomHost = async (io, room, departingSocketId, socketUsernames) => {
  try {
    // Get all sockets in the room
    const socketsInRoom = await io.in(room.code).fetchSockets();
    
    if (socketsInRoom.length > 0 || (room.players && room.players.length > 1)) {
      // If sockets are found in the room, assign one as the new host
      if (socketsInRoom.length > 0) {
        // Find a socket that isn't the departing one
        const newHostSocket = socketsInRoom.find(s => s.id !== departingSocketId) || socketsInRoom[0];
        const newHostUsername = socketUsernames.get(newHostSocket.id) || 'New Host';
        
        // Update room host
        room.host = newHostSocket.id;
        room.hostUsername = newHostUsername;
        await room.save();
        
        // Update all players' isHost status
        if (room.players) {
          room.players.forEach(p => {
            p.isHost = (p.socketId === newHostSocket.id);
          });
          await room.save();
        }
        
        // Notify the new host
        io.to(newHostSocket.id).emit('host_assigned', { roomCode: room.code });
        
        // Notify all users in the room about the new host
        io.to(room.code).emit('host_changed', {
          socketId: newHostSocket.id,
          username: newHostUsername
        });

        console.log(`Reassigned host in room ${room.code} to ${newHostUsername}`);
        return true;
      } 
      // If no sockets found but there are still players in the room (other than the departing one)
      else if (room.players && room.players.length > 1) {
        // Find a player who isn't the departing socket
        const newHostPlayer = room.players.find(p => p.socketId !== departingSocketId);
        if (newHostPlayer) {
          room.host = newHostPlayer.socketId;
          room.hostUsername = newHostPlayer.username;
          
          // Update all players' isHost status
          room.players.forEach(p => {
            p.isHost = (p.socketId === newHostPlayer.socketId);
          });
          
          await room.save();
          
          console.log(`Assigned new host ${newHostPlayer.username} from players array in room ${room.code}`);
          
          // Try to notify the new host
          io.to(newHostPlayer.socketId).emit('host_assigned', { roomCode: room.code });
          
          // Notify all users in the room about the new host
          io.to(room.code).emit('host_changed', {
            socketId: newHostPlayer.socketId,
            username: newHostPlayer.username
          });
          
          return true;
        }
      }
    }
    
    // No suitable new host found
    return false;
  } catch (error) {
    console.error(`Error reassigning host for room ${room.code}:`, error);
    return false;
  }
};

/**
 * Handles room cleanup or deletion when it becomes empty
 * @param {object} io - Socket.io instance
 * @param {object} Room - The Room model
 * @param {object} room - The room object
 * @param {function} stopRace - Function to stop any active race
 */
const handleEmptyRoom = async (io, Room, room, stopRace) => {
  // No users left, but don't delete immediately - set a flag for pending deletion
  console.log(`Room ${room.code} has no active users, marking for potential deletion`);
  
  // Set a deletion flag and timestamp
  room.pendingDeletion = true;
  room.deletionTimestamp = Date.now();
  await room.save();
  
  // Schedule a check after 10 seconds to see if anyone rejoined
  setTimeout(async () => {
    try {
      // Check if room still exists
      const checkRoom = await Room.findOne({ code: room.code });
      if (!checkRoom) return; // Room already deleted
      
      // Check if it still has the deletion flag
      if (!checkRoom.pendingDeletion) return; // Flag was removed
      
      // Check if anyone is in the room now
      const currentSockets = await io.in(room.code).fetchSockets();
      if (currentSockets.length > 0) {
        // Someone joined, cancel deletion
        console.log(`Cancelling deletion of room ${room.code} - users are present`);
        checkRoom.pendingDeletion = false;
        await checkRoom.save();
        return;
      }
      
      // If we reached here, the room is still empty after the delay
      console.log(`Deleting empty room ${room.code} after waiting period`);
      await Room.findOneAndDelete({ _id: checkRoom._id });
      
      // Clean up any active races
      await stopRace(room.code);
    } catch (err) {
      console.error(`Error in delayed room deletion check: ${err.message}`);
    }
  }, 10000); // Wait 10 seconds
};

module.exports = {
  reassignRoomHost,
  handleEmptyRoom
}; 