import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'intelli-call-jwt-secret';

/**
 * Authentication middleware - verifies JWT token
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];
    
    if (!authHeader && !userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Try JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const User = mongoose.model('User');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      req.user = user;
      return next();
    }
    
    // Fallback to user ID from headers (for backward compatibility)
    if (userId) {
      const User = mongoose.model('User');
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      req.user = user;
      return next();
    }
    
    return res.status(401).json({ error: 'Invalid authentication' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Google Auth verification middleware
 * Ensures user is authenticated with Google
 */
export const requireGoogleAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];
    
    if (!authHeader && !userId) {
      return res.status(403).json({ error: 'Google authentication required' });
    }

    // Try JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const User = mongoose.model('User');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }
      
      // Verify it's a Google auth user
      if (!user.isGoogleAuth && !user.googleId) {
        return res.status(403).json({ error: 'Google authentication required' });
      }
      
      req.user = user;
      return next();
    }
    
    // Fallback to user ID
    if (userId) {
      const User = mongoose.model('User');
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }
      
      if (!user.isGoogleAuth && !user.googleId) {
        return res.status(403).json({ error: 'Google authentication required' });
      }
      
      req.user = user;
      return next();
    }
    
    return res.status(403).json({ error: 'Invalid authentication' });
  } catch (error) {
    console.error('Google auth middleware error:', error);
    return res.status(403).json({ error: 'Authentication failed' });
  }
};
