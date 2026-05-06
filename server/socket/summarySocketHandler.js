const { invalidateSummaryCache, invalidateChatSummaries } = require('../controllers/summaryController');

/**
 * Handle socket events for AI summary feature
 * @param {Socket} socket - Socket.io socket instance
 * @param {IO} io - Socket.io server instance
 */
function handleSummarySockets(socket, io) {
  
  // Listen for message read events
  socket.on('mark_messages_read', async (data) => {
    const { chatId, userId } = data;
    
    if (chatId && userId) {
      // Invalidate user's summary cache when they read messages
      await invalidateSummaryCache(chatId, userId);
      
      // Notify user their summary cache is cleared
      socket.emit('summary_cache_cleared', { chatId });
    }
  });

  // Listen for new message events (broadcast to all users in chat except sender)
  socket.on('new_message', async (data) => {
    const { chatId, senderId } = data;
    
    if (chatId) {
      // Invalidate all summaries for this chat
      // New messages means existing summaries are outdated
      await invalidateChatSummaries(chatId);
      
      // Notify all users in the chat that summaries are invalidated
      io.to(chatId).emit('summary_invalidated', { 
        chatId,
        message: 'New messages available. Refresh for updated summary.'
      });
    }
  });

  // Handle explicit summary refresh request
  socket.on('request_summary_update', async (data) => {
    const { chatId } = data;
    const userId = socket.user?._id; // Assuming user is attached to socket
    
    if (chatId && userId) {
      // Invalidate cache to force fresh summary
      await invalidateSummaryCache(chatId, userId);
      
      socket.emit('summary_cache_cleared', { chatId });
    }
  });
}

module.exports = { handleSummarySockets };
