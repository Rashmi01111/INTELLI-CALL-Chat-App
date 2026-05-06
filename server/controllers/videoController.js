/**
 * Video Controller - Reel/Video management
 */
class VideoController {
  constructor(models) {
    this.models = models;
  }

  // Upload video reel
  async uploadVideo(req, res) {
    try {
      const { caption, mediaUrl, mediaType, userId, userName } = req.body;

      if (!mediaUrl || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const reel = await this.models.Reel.create({
        createdBy: userId,
        createdByName: userName || 'Anonymous',
        caption: caption || '',
        mediaUrl,
        mediaType: mediaType || 'video',
        likes: [],
        comments: [],
        createdAt: new Date()
      });

      res.status(201).json({
        success: true,
        reel: {
          _id: reel._id,
          caption: reel.caption,
          mediaUrl: reel.mediaUrl,
          mediaType: reel.mediaType,
          createdBy: reel.createdBy,
          createdByName: reel.createdByName,
          likes: reel.likes,
          comments: reel.comments,
          createdAt: reel.createdAt
        }
      });
    } catch (error) {
      console.error('Upload video error:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }

  // Get all reels with pagination
  async getReels(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 30;
      const skip = (page - 1) * limit;

      const reels = await this.models.Reel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await this.models.Reel.countDocuments();

      res.json({
        success: true,
        reels: reels.map(r => ({
          _id: r._id,
          caption: r.caption,
          mediaUrl: r.mediaUrl,
          mediaType: r.mediaType,
          createdBy: r.createdBy,
          createdByName: r.createdByName,
          likes: r.likes || [],
          comments: r.comments || [],
          createdAt: r.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + reels.length < total
        }
      });
    } catch (error) {
      console.error('Get reels error:', error);
      res.status(500).json({ error: 'Failed to fetch reels' });
    }
  }

  // Get single reel by ID
  async getReelById(req, res) {
    try {
      const { reelId } = req.params;
      const reel = await this.models.Reel.findById(reelId);

      if (!reel) {
        return res.status(404).json({ error: 'Reel not found' });
      }

      res.json({
        success: true,
        reel: {
          _id: reel._id,
          caption: reel.caption,
          mediaUrl: reel.mediaUrl,
          mediaType: reel.mediaType,
          createdBy: reel.createdBy,
          createdByName: reel.createdByName,
          likes: reel.likes || [],
          comments: reel.comments || [],
          createdAt: reel.createdAt
        }
      });
    } catch (error) {
      console.error('Get reel error:', error);
      res.status(500).json({ error: 'Failed to fetch reel' });
    }
  }

  // Delete reel
  async deleteReel(req, res) {
    try {
      const { reelId } = req.params;
      const { userId } = req.body;

      const reel = await this.models.Reel.findById(reelId);

      if (!reel) {
        return res.status(404).json({ error: 'Reel not found' });
      }

      // Check if user is the creator
      if (reel.createdBy.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this reel' });
      }

      await this.models.Reel.findByIdAndDelete(reelId);

      res.json({
        success: true,
        message: 'Reel deleted successfully'
      });
    } catch (error) {
      console.error('Delete reel error:', error);
      res.status(500).json({ error: 'Failed to delete reel' });
    }
  }

  // Like/unlike reel
  async likeReel(req, res) {
    try {
      const { reelId } = req.params;
      const { userId } = req.body;

      const reel = await this.models.Reel.findById(reelId);

      if (!reel) {
        return res.status(404).json({ error: 'Reel not found' });
      }

      const likes = reel.likes || [];
      const userIndex = likes.indexOf(userId);

      if (userIndex > -1) {
        // Unlike
        likes.splice(userIndex, 1);
      } else {
        // Like
        likes.push(userId);
      }

      reel.likes = likes;
      await reel.save();

      res.json({
        success: true,
        liked: userIndex === -1,
        likesCount: likes.length
      });
    } catch (error) {
      console.error('Like reel error:', error);
      res.status(500).json({ error: 'Failed to like/unlike reel' });
    }
  }

  // Add comment to reel
  async addComment(req, res) {
    try {
      const { reelId } = req.params;
      const { userId, userName, text } = req.body;

      if (!text || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const reel = await this.models.Reel.findById(reelId);

      if (!reel) {
        return res.status(404).json({ error: 'Reel not found' });
      }

      const comment = {
        _id: new this.models.Reel.base.Types.ObjectId(),
        user: userId,
        userName: userName || 'Anonymous',
        text,
        createdAt: new Date()
      };

      reel.comments = reel.comments || [];
      reel.comments.push(comment);
      await reel.save();

      res.status(201).json({
        success: true,
        comment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  // Get user's reels
  async getUserReels(req, res) {
    try {
      const { userId } = req.params;

      const reels = await this.models.Reel.find({ createdBy: userId })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        reels: reels.map(r => ({
          _id: r._id,
          caption: r.caption,
          mediaUrl: r.mediaUrl,
          mediaType: r.mediaType,
          likes: r.likes || [],
          comments: r.comments || [],
          createdAt: r.createdAt
        }))
      });
    } catch (error) {
      console.error('Get user reels error:', error);
      res.status(500).json({ error: 'Failed to fetch user reels' });
    }
  }
}

export default VideoController;
