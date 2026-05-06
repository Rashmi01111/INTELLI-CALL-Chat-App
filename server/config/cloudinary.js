import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cloudinary Configuration for Video Upload
 * Production-ready with optimized settings for streaming
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload video to Cloudinary with optimization
 * @param {Buffer} fileBuffer - Video file buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
export const uploadVideo = async (fileBuffer, options = {}) => {
  const {
    folder = 'reels',
    public_id,
    eager = [],
    resource_type = 'video'
  } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id,
        resource_type,
        // Enable automatic format optimization
        fetch_format: 'auto',
        // Quality auto for optimal streaming
        quality: 'auto',
        // Eager transformations for different qualities
        eager: [
          // 480p for mobile
          { width: 480, crop: 'scale', video_codec: 'auto' },
          // 720p for desktop
          { width: 720, crop: 'scale', video_codec: 'auto' },
          // Thumbnail at 1 second
          { width: 400, height: 600, crop: 'fill', start_offset: '1' }
        ],
        // Chunk size for large files
        chunk_size: 6000000, // 6MB chunks
        // Allowed formats
        allowed_formats: ['mp4', 'webm', 'mov', 'mkv'],
        // Auto generate thumbnail
        eager_async: true,
        // Notification URL (optional - for webhooks)
        // notification_url: process.env.CLOUDINARY_WEBHOOK_URL,
        ...eager
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Video uploaded to Cloudinary:', result.public_id);
          resolve(result);
        }
      }
    );

    // Stream the buffer to Cloudinary
    const { Readable } = await import('stream');
    const readableStream = Readable.from([fileBuffer]);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Generate video thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Thumbnail options
 * @returns {string} Thumbnail URL
 */
export const generateThumbnail = (publicId, options = {}) => {
  const { width = 400, height = 600, startOffset = '1' } = options;
  
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      { width, height, crop: 'fill' },
      { start_offset: startOffset }
    ]
  });
};

/**
 * Get optimized streaming URL
 * @param {string} publicId - Cloudinary public ID
 * @param {string} quality - Quality level ('auto', '720p', '480p')
 * @returns {string} Streaming URL
 */
export const getStreamingUrl = (publicId, quality = 'auto') => {
  const transformations = [];
  
  if (quality === '720p') {
    transformations.push({ width: 720, crop: 'scale', video_codec: 'auto' });
  } else if (quality === '480p') {
    transformations.push({ width: 480, crop: 'scale', video_codec: 'auto' });
  }
  
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: transformations,
    fetch_format: 'auto',
    quality: 'auto'
  });
};

/**
 * Delete video from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Delete result
 */
export const deleteVideo = async (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: 'video' },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary delete error:', error);
          reject(error);
        } else {
          console.log('✅ Video deleted from Cloudinary:', publicId);
          resolve(result);
        }
      }
    );
  });
};

export default cloudinary;
