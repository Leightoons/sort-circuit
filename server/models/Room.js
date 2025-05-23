/**
 * Room Model (Documentation)
 * 
 * This is just a reference model - the actual implementation
 * is in the in-memory database in config/db.js
 * 
 * A Room has the following structure:
 * {
 *   _id: String,             // Unique identifier
 *   code: String,            // 6-character room code
 *   host: String,            // Socket ID of room host
 *   hostUsername: String,    // Username of room host
 *   players: Array,          // Array of player objects with {socketId, username}
 *   status: String,          // 'waiting', 'racing', or 'finished'
 *   algorithms: Array,       // Array of algorithm types to race
 *   datasetSize: Number,     // Size of dataset to sort
 *   allowDuplicates: Boolean,// Whether duplicates are allowed in dataset
 *   valueRange: Object,      // {min: Number, max: Number}
 *   stepSpeed: Number,       // Time between steps in ms
 *   createdAt: Date          // When the room was created
 * }
 */
