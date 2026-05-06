const rateLimit = require('express-rate-limit');

// Rate limiter for AI summary endpoint
// Limits to prevent abuse and control costs
const summaryRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes per IP
  message: {
    error: 'Too many summary requests. Please try again in 5 minutes.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful cached responses from counting
  skip: (req, res) => {
    // If response is cached, don't count against rate limit
    return res.locals.cached === true;
  }
});

// Stricter limiter for OpenAI calls (only uncached requests)
const openaiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 AI calls per minute per user
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    error: 'AI summary limit reached. Please wait a moment.',
    retryAfter: 60
  }
});

module.exports = {
  summaryRateLimiter,
  openaiRateLimiter
};
