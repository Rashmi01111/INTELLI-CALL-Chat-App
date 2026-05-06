import express from 'express';

/**
 * Chat Routes - Express routes for chat-related API endpoints
 */

const createChatRoutes = (chatController) => {
  const router = express.Router();

  // Read receipts
  router.post('/:chatId/mark-read', chatController.markMessagesAsRead);
  router.post('/:chatId/mark-delivered', chatController.markMessagesAsDelivered);
  
  // Get messages with read status
  router.get('/:chatId/messages', chatController.getMessagesWithReadStatus);
  router.get('/:chatId/read-receipts', chatController.getReadReceipts);

  // User routes
  router.get('/user/:userId/unread-counts', chatController.getUnreadCounts);
  router.get('/user/:userId/online-status', chatController.getUserOnlineStatus);
  router.post('/user/:userId/typing-status', chatController.updateTypingStatus);

  return router;
};

export default createChatRoutes;
