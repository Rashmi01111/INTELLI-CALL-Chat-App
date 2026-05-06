/**
 * Socket.IO Index - Main socket initialization and setup
 * Combines all socket handlers with the modular architecture
 */

import ReelSocketHandler from './reelSocket.js';
import PresenceManager from '../utils/presenceManager.js';
import StorySocketHandler from './storySocket.js';

/**
 * Initialize Socket.IO with all modular handlers
 */
export const initializeSocketIO = (io, models) => {
  console.log('🔌 Initializing Socket.IO with modular handlers...');

  // Initialize utility managers
  const presenceManager = new PresenceManager(io);
  const reelHandler = new ReelSocketHandler(io, presenceManager);
  const storyHandler = new StorySocketHandler(io);

  // Main connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);

    // Only initialize reel events here.
    // Chat/call events are still handled by the legacy socket code in `server.ts`.
    reelHandler.initialize(socket, models);
    storyHandler.initialize(socket, models);

    // Handle socket errors
    socket.on('error', (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });
  });

  // Expose managers for external access (API routes, etc.)
  io.presenceManager = presenceManager;
  io.typingManager = undefined;
  io.notificationManager = undefined;

  // Let legacy socket handlers know modular reels is active.
  io.modularReelsEnabled = true;

  console.log('✅ Socket.IO initialized with:');
  console.log(`   - Presence Manager`);
  console.log(`   - Reel Handler`);

  return {
    io,
    presenceManager,
    typingManager: undefined,
    notificationManager: undefined
  };
};

export default initializeSocketIO;
