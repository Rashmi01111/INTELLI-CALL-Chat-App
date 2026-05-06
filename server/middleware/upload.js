import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Multer Configuration for Video Upload
 * Production-ready with file validation and limits
 */

// File filter for video uploads
const videoFileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-matroska', // .mkv
    'video/avi',
    'video/mpeg'
  ];
  
  // Allowed extensions
  const allowedExts = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.mpeg', '.mpg'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only video files (MP4, WebM, MOV, MKV, AVI) are allowed.`), false);
  }
};

// Storage configuration - memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// Upload limits and configuration
const uploadConfig = {
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 1 // Only 1 file per request
  },
  fileFilter: videoFileFilter
};

// Create multer instance
export const upload = multer(uploadConfig);

// Error handler middleware
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        message: 'Video file size must be less than 100MB. Please compress your video or upload a shorter clip.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field',
        message: 'Please use "video" as the field name for your file upload.'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'Upload error',
      message: err.message
    });
  }
  
  // Other errors
  if (err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file',
      message: err.message
    });
  }
  
  next();
};

// Single video upload middleware
export const uploadSingleVideo = upload.single('video');

// Multiple videos upload (for batch operations)
export const uploadMultipleVideos = upload.array('videos', 5); // Max 5 videos

// Video metadata validation
export const validateVideoMetadata = (req, res, next) => {
  const { caption, userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing userId',
      message: 'User ID is required to upload a video.'
    });
  }
  
  if (caption && caption.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Caption too long',
      message: 'Caption must be less than 500 characters.'
    });
  }
  
  // Check if file exists
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No video file',
      message: 'Please provide a video file to upload.'
    });
  }
  
  // Generate unique filename
  const uniqueName = `${uuidv4()}-${Date.now()}`;
  req.file.uniqueName = uniqueName;
  
  next();
};

export default {
  upload,
  uploadSingleVideo,
  uploadMultipleVideos,
  handleMulterError,
  validateVideoMetadata
};
