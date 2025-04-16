const { getModel } = require('../config/db');

/**
 * Validates that a room exists given a room code
 * @param {string} roomCode - The room code to validate
 * @param {object} socket - The socket object for error emission
 * @returns {Promise<object|null>} - The room object or null if invalid
 */
const validateRoom = async (roomCode, socket) => {
  // Validate room code
  if (!roomCode || !roomCode.trim()) {
    socket.emit('room_error', { message: 'Room code is required' });
    return null;
  }

  // Normalize room code to uppercase
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  // Find the room
  const Room = getModel('Room');
  const room = await Room.findOne({ code: normalizedRoomCode });
  
  if (!room) {
    socket.emit('room_error', { message: 'Room not found' });
    return null;
  }
  
  return room;
};

/**
 * Validates that the socket is the host of the room
 * @param {object} room - The room object
 * @param {object} socket - The socket object for error emission
 * @param {string} errorMessage - Optional custom error message
 * @returns {boolean} - Whether the socket is the host
 */
const requireHostPermission = (room, socket, errorMessage = 'Only host can perform this action') => {
  // Check if user is the host
  if (room.host !== socket.id) {
    socket.emit('room_error', { message: errorMessage });
    return false;
  }
  
  return true;
};

/**
 * Validates the room status matches the expected status
 * @param {object} room - The room object
 * @param {string} expectedStatus - The expected status ('waiting', 'racing', 'finished')
 * @param {object} socket - The socket object for error emission
 * @param {string} errorMessage - Optional custom error message
 * @returns {boolean} - Whether the room status matches expected
 */
const validateRoomStatus = (room, expectedStatus, socket, errorMessage) => {
  if (room.status !== expectedStatus) {
    const defaultMessage = `Room must be in ${expectedStatus} state to perform this action`;
    socket.emit('room_error', { message: errorMessage || defaultMessage });
    return false;
  }
  
  return true;
};

module.exports = {
  validateRoom,
  requireHostPermission,
  validateRoomStatus
}; 