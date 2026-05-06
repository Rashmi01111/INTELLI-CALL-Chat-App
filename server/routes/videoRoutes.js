import { Router } from 'express';
import VideoController from '../controllers/videoController.js';
import { uploadSingleVideo, handleMulterError, validateVideoMetadata } from '../middleware/upload.js';

/**
 * Video Routes for Reel Management
 * Production-ready with proper middleware chain
 */

const createVideoRoutes = (models) => {
  const router = Router();
  const controller = new VideoController(models);

  // Upload video reel
  // POST /api/videos/upload
  router.post(
    '/upload',
    uploadSingleVideo,
    handleMulterError,
    validateVideoMetadata,
    (req, res) => controller.uploadVideo(req, res)
  );

  // Get all reels with pagination
  // GET /api/videos/reels?page=1&limit=30&sort=latest
  router.get('/reels', (req, res) => controller.getReels(req, res));

  // Get single reel by ID
  // GET /api/videos/reels/:reelId
  router.get('/reels/:reelId', (req, res) => controller.getReelById(req, res));

  // Delete reel
  // DELETE /api/videos/reels/:reelId
  router.delete('/reels/:reelId', (req, res) => controller.deleteReel(req, res));

  // Like/unlike reel
  // POST /api/videos/reels/:reelId/like
  router.post('/reels/:reelId/like', (req, res) => controller.likeReel(req, res));

  // Add comment to reel
  // POST /api/videos/reels/:reelId/comment
  router.post('/reels/:reelId/comment', (req, res) => controller.addComment(req, res));

  // Get user's reels
  // GET /api/videos/user/:userId/reels
  router.get('/user/:userId/reels', (req, res) => controller.getUserReels(req, res));

  return router;
};

export default createVideoRoutes;
