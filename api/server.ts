import 'dotenv/config';
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import jwt from 'jsonwebtoken';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Modular chat features imports
import { initializeSocketIO } from './server/socket/index.js';
import ChatController from './server/controllers/chatController.js';
import createChatRoutes from './server/routes/chatRoutes.js';
import summaryRoutes from './server/routes/summaryRoutes.js';
import createVideoRoutes from './server/routes/videoRoutes.js';
import aiRoutes from './server/routes/aiRoutes.js';
import reelAIService from './server/services/reelAIService.js';
import aiService from './server/services/aiService.js';

/** Primary AI: Google Gemini - set GEMINI_API_KEY in .env (recommended: gemini-2.0-flash or gemini-1.5-flash) */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
/** Backup AI: OpenAI - set OPENAI_API_KEY in .env for fallback when Gemini limits are hit */
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

console.log("🚀 Starting IntelliCall Server...");
console.log("📁 Environment Check:");
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   - MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET (using local default)'}`);
console.log(`   - GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'SET (fallback)' : 'NOT SET'}`);
console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET (backup)' : 'NOT SET'}`);
console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'SET (primary)' : 'NOT SET'}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Group Schema
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pic: { type: String, default: "https://icon-library.com/images/group-icon/group-icon-10.jpg" }
}, { timestamps: true });

const Group = mongoose.model("Group", groupSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user: { type: String, required: true }, // Sender name
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: String }, // Recipient name (for private) or Group ID (for group)
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  text: { type: String },
  // Translation support (sender can store original; receivers can render translated)
  originalText: { type: String },
  translatedText: { type: String },
  translateTargetLang: { type: String },
  image: { type: String },
  video: { type: String },
  audio: { type: String },
  timestamp: { type: String, required: true },
  profilePic: { type: String },
  isGhost: { type: Boolean, default: false },
  isAI: { type: Boolean, default: false },
  isBlind: { type: Boolean, default: false },
  isSystem: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  editedAt: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: String }],
  sentiment: { type: String },
  reactions: { type: mongoose.Schema.Types.Mixed, default: {} },
  deliveryStatus: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  readBy: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel' }, // Reference to shared reel
  reelData: { type: mongoose.Schema.Types.Mixed }, // Reel data for display
  isForwarded: { type: Boolean, default: false }, // Indicates if message is forwarded
  forwardedFrom: { type: String }, // Original sender name
  originalMessageId: { type: String }, // Original message ID for tracking
  
  // Scheduled Message Fields
  isScheduled: { type: Boolean, default: false }, // Whether this is a scheduled message
  scheduledTime: { type: Date, index: true }, // When the message should be sent
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed', 'cancelled'],
    default: 'sent',
    index: true
  }, // Status of scheduled message
  scheduledMessageId: { type: String, index: true }, // Unique ID for scheduled message tracking (to prevent duplicates)

  // Recurring Message Fields
  isRecurring: { type: Boolean, default: false }, // Whether this is a recurring message
  recurringType: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] }, // Type of recurrence
  recurringDays: [{ type: Number }], // Days of week for custom recurrence (0 = Sunday, 1 = Monday, etc.)
  parentMessageId: { type: String, index: true } // ID of the original message for recurring series tracking
}, { timestamps: true });

// Compound indexes for efficient scheduled message queries
messageSchema.index({ status: 1, scheduledTime: 1 });
messageSchema.index({ isScheduled: 1, status: 1 });

// Force use of the correct schema - delete old model if it exists with wrong schema
if (mongoose.models.Message) {
  // Check if existing model has old schema (array of ObjectIds vs array of objects)
  const existingSchema = mongoose.models.Message.schema;
  const readByPath = existingSchema.path('readBy');
  if (readByPath && readByPath.instance === 'ObjectID') {
    console.log('⚠️ Detected old Message schema - replacing with new schema');
    delete mongoose.models.Message;
  }
}
const Message = mongoose.model("Message", messageSchema);

// Reel Schema (Instagram-like short posts) - Enhanced for video streaming + AI Features
const reelSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, required: true },
  caption: { type: String, default: '' },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  // Video-specific fields for streaming
  thumbnailUrl: { type: String, default: '' }, // Video thumbnail/poster
  duration: { type: Number, default: 0 }, // Video duration in seconds
  publicId: { type: String }, // Cloudinary public ID for management
  views: { type: Number, default: 0 }, // View count
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  // AI-Generated Features
  hashtags: [{ type: String, default: [] }], // AI-suggested hashtags
  translatedCaptions: { // Multi-language caption translations
    type: Map,
    of: String,
    default: {}
  },
  summary: { type: String, default: '' }, // AI-generated reel summary
  aiGenerated: { type: Boolean, default: false }, // Flag if caption was AI-generated
  aiFeatures: { // Track which AI features were used
    autoCaption: { type: Boolean, default: false },
    hashtags: { type: Boolean, default: false },
    thumbnail: { type: Boolean, default: false },
    translation: { type: Boolean, default: false },
    summary: { type: Boolean, default: false }
  },
  detectedObjects: [{ type: String, default: [] }], // Objects detected in video/image for better tagging
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' } // Content sentiment
}, { timestamps: true });

// Index for efficient queries
reelSchema.index({ createdAt: -1 });
reelSchema.index({ createdBy: 1, createdAt: -1 });
reelSchema.index({ views: -1 });

const Reel = mongoose.model("Reel", reelSchema);

// Story Schema (Instagram/Snapchat-like ephemeral stories)
const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userPic: { type: String, default: '' },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  caption: { type: String, default: '' },
  audioUrl: { type: String, default: '' },
  duration: { type: Number, default: 5000 }, // Duration in ms
  // Repost info
  isRepost: { type: Boolean, default: false },
  repostedFrom: {
    reelId: { type: String },
    creatorId: { type: String },
    creatorName: { type: String }
  },
  // Engagement
  views: { type: Number, default: 0 },
  viewers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  reactions: [{
    emoji: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  replies: [{
    id: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userPic: { type: String },
    text: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  comments: [{
    id: { type: String },
    user: { type: String },
    userPic: { type: String },
    text: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  // Status flags
  isArchived: { type: Boolean, default: false },
  isCloseFriend: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  isHighlight: { type: Boolean, default: false },
  highlightTitle: { type: String, default: '' },
  storyGroupId: { type: String },
  // Expiration (24 hours from creation)
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true });

// Index for efficient queries
storySchema.index({ createdAt: -1 });
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ isArchived: 1 });

const Story = mongoose.model("Story", storySchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  pic: { 
    type: String, 
    default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" 
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isGoogleAuth: { type: Boolean, default: false },
  googleId: { type: String },
  avatarType: { type: String, enum: ['default', 'google', 'custom'], default: 'default' },
  customAvatar: { type: String }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// Friend Request Schema
const friendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

// In-memory storage for development without MongoDB
let inMemoryMessages: any[] = [];
let inMemoryUsers: any[] = [];
let inMemoryGroups: any[] = [];
let useInMemory = false;

// Track processed call events to prevent duplicate missed calls (key: `${fromUserId}_${toUserId}_${minute}`)
const processedCallEvents = new Set<string>();

const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      console.log("⚠️ MONGODB_URI not set - using in-memory storage for development");
      useInMemory = true;
      return;
    }
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err: any) {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("🔄 Falling back to in-memory storage for development");
    useInMemory = true;
    // Don't exit, continue with in-memory storage
  }
};

// Middleware to check DB connection
const checkDB = (socket: any, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn("⚠️ Operation attempted while MongoDB is disconnected");
  }
  next();
};

async function startServer() {
  await connectDB();
  if (useInMemory) {
    console.log("🧠 Running in IN-MEMORY mode - data will be lost when server restarts");
  }
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
    console.log("ℹ️  No AI keys set — add GEMINI_API_KEY in .env for AI features (OpenAI as backup)");
  } else {
    if (process.env.GEMINI_API_KEY) {
      console.log(`🤖 Gemini: model=${GEMINI_MODEL} (primary)`);
    }
    if (process.env.OPENAI_API_KEY) {
      console.log(`🔄 OpenAI: model=${OPENAI_MODEL} (backup)`);
    }
    if (process.env.GROQ_API_KEY) {
      console.log(`🔄 GROQ: model=${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'} (fallback)`);
    }
  }
  const app = express();
  const httpServer = createServer(app);
  // Get allowed origins from env or use defaults
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ["http://localhost:3000", "http://localhost:3009", "http://localhost:5173"];

  const io: Server = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    // Optimizations for faster real-time messaging
    pingTimeout: 30000,        // Time to wait for ping response (was default 5000)
    pingInterval: 15000,       // How often to ping (was default 25000)
    transports: ['websocket', 'polling'], // Prioritize websocket
    allowUpgrades: true,       // Allow transport upgrades
    perMessageDeflate: false,  // Disable compression for speed
    connectTimeout: 5000,      // Shorter connection timeout
    // Max HTTP buffer size for large messages
    maxHttpBufferSize: 1e6
  });

  // Helper function to calculate next recurring date (available throughout startServer)
  function calculateNextRecurringDate(
    fromDate: Date,
    recurringType: string,
    recurringDays?: number[]
  ): Date | null {
    const next = new Date(fromDate);

    switch (recurringType) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        return next;

      case 'weekly':
        next.setDate(next.getDate() + 7);
        return next;

      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        return next;

      case 'custom':
        if (!recurringDays || recurringDays.length === 0) return null;
        // Find the next day from the selected days
        const currentDay = next.getDay(); // 0 = Sunday
        const sortedDays = [...recurringDays].sort((a, b) => a - b);

        // Look for next day this week
        let nextDay = sortedDays.find(d => d > currentDay);

        if (nextDay === undefined) {
          // If no day found this week, go to first day next week
          nextDay = sortedDays[0];
          const daysUntilNext = (7 - currentDay) + nextDay;
          next.setDate(next.getDate() + daysUntilNext);
        } else {
          const daysUntilNext = nextDay - currentDay;
          next.setDate(next.getDate() + daysUntilNext);
        }
        return next;

      default:
        return null;
    }
  }

  // --- Scheduled Message Queue Setup (BullMQ + Redis) ---
  let scheduledMessageQueue: Queue | undefined;
  let scheduledMessageWorker: Worker | undefined;
  let redisConnection: IORedis | undefined;
  let redisAvailable = false;
  
  try {
    redisConnection = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 2000
    });
    
    // Test Redis connection before initializing BullMQ
    await redisConnection.connect().catch(() => {
      // Connection failed, will handle below
    });
    
    if (redisConnection.status === 'ready') {
      redisAvailable = true;
      console.log('📅 Redis connected - scheduled message queue enabled');
    } else {
      throw new Error('Redis not available');
    }

    scheduledMessageQueue = new Queue('scheduled-messages', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: 100
      }
    });

    // Scheduled Message Worker
    scheduledMessageWorker = new Worker(
      'scheduled-messages',
      async (job: { name: string; data: { messageId: string; messageData: any } }) => {
      if (job.name === 'send-scheduled-message') {
        const { messageId, messageData } = job.data;
        console.log(`🚀 Processing scheduled message: ${messageId}`);
        
        try {
          // Find the scheduled message
          const message = await Message.findOne({ 
            id: messageId,
            isScheduled: true,
            status: 'scheduled'
          } as any);
          
          if (!message) {
            console.log(`⚠️ Scheduled message not found or already processed: ${messageId}`);
            return { success: false, reason: 'message_not_found' };
          }
          
          const senderId = message.senderId;
          
          // Update message status to sent
          message.status = 'sent';
          message.isScheduled = false;
          message.scheduledTime = null;
          
          // Add sender to readBy
          if (senderId && !message.readBy.some(rb => rb.userId?.toString() === senderId.toString())) {
            message.readBy.push({ userId: senderId, readAt: new Date() });
          }
          
          await message.save();
          
          // Prepare message for broadcasting
          const broadcastMessage = {
            id: message.id,
            user: message.user,
            senderId: message.senderId,
            to: message.to,
            groupId: message.groupId,
            text: message.text,
            image: message.image,
            video: message.video,
            audio: message.audio,
            timestamp: new Date().toISOString(),
            profilePic: message.profilePic,
            isGhost: message.isGhost,
            isAI: message.isAI,
            isSystem: message.isSystem,
            isBlind: message.isBlind,
            isScheduled: false,
            deliveryStatus: 'delivered',
            deliveredAt: new Date(),
            readBy: message.readBy,
            reactions: message.reactions || {},
            isForwarded: message.isForwarded,
            forwardedFrom: message.forwardedFrom,
            originalMessageId: message.originalMessageId,
            createdAt: message.createdAt
          };
          
          // Emit via socket.io
          if (message.groupId) {
            io.to(String(message.groupId)).emit('message received', broadcastMessage);
            io.to(String(message.groupId)).emit('receive_message', broadcastMessage);
            console.log(`📢 Scheduled message sent to group: ${message.groupId}`);
          } else if (message.to) {
            try {
              const recipient = await User.findOne({ name: message.to });
              if (recipient) {
                io.to(recipient._id.toString()).emit('message received', broadcastMessage);
                io.to(recipient._id.toString()).emit('receive_message', broadcastMessage);
              }
              
              if (senderId) {
                io.to(senderId.toString()).emit('message received', broadcastMessage);
                io.to(senderId.toString()).emit('receive_message', broadcastMessage);
                io.to(senderId.toString()).emit('scheduled_message_sent', { messageId: message.id });
              }
              console.log(`📢 Scheduled message sent to: ${message.to}`);
            } catch (e) {
              console.error('Error looking up recipient:', e);
            }
          }
          
          console.log(`✅ Scheduled message sent successfully: ${messageId}`);

          // Handle recurring messages - schedule next occurrence
          if (message.isRecurring && message.parentMessageId) {
            try {
              const nextScheduledTime = calculateNextRecurringDate(
                new Date(),
                message.recurringType,
                message.recurringDays
              );

              if (nextScheduledTime) {
                const newMessageId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newMessageData = {
                  id: newMessageId,
                  user: message.user,
                  senderId: message.senderId,
                  to: message.to,
                  groupId: message.groupId,
                  text: message.text,
                  image: message.image,
                  video: message.video,
                  audio: message.audio,
                  timestamp: new Date().toISOString(),
                  profilePic: message.profilePic,
                  isScheduled: true,
                  status: 'scheduled',
                  scheduledTime: nextScheduledTime,
                  scheduledMessageId: newMessageId,
                  isBlind: message.isBlind,
                  isGhost: message.isGhost,
                  isAI: message.isAI,
                  isSystem: message.isSystem,
                  reactions: {},
                  deliveryStatus: 'sent',
                  readBy: message.senderId ? [message.senderId] : [],
                  isRecurring: true,
                  recurringType: message.recurringType,
                  recurringDays: message.recurringDays,
                  parentMessageId: message.parentMessageId
                };

                await Message.create(newMessageData);

                const delay = nextScheduledTime.getTime() - Date.now();
                await scheduledMessageQueue.add(
                  'send-scheduled-message',
                  { messageId: newMessageId, messageData: newMessageData },
                  { delay, jobId: newMessageId, attempts: 3 }
                );

                console.log(`📅 Next recurring message scheduled: ${newMessageId} for ${nextScheduledTime.toISOString()}`);
              }
            } catch (recurringError) {
              console.error('Error scheduling next recurring message:', recurringError);
            }
          }

          return { success: true, messageId: message.id };

        } catch (error) {
          console.error(`❌ Error processing scheduled message ${messageId}:`, error);
          
          try {
            await Message.updateOne(
              { id: messageId },
              { status: 'failed' }
            );
          } catch (updateError) {
            console.error('Error marking message as failed:', updateError);
          }
          
          throw error;
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 10,
      limiter: {
        max: 50,
        duration: 1000
      }
    }
  );

  scheduledMessageWorker.on('completed', (job) => {
    console.log(`✅ Scheduled message job completed: ${job.id}`);
  });

  scheduledMessageWorker.on('failed', (job, err) => {
    console.error(`❌ Scheduled message job failed: ${job?.id}`, err);
  });

  scheduledMessageWorker.on('error', (err: any) => {
    // Suppress connection errors - Redis is optional
    if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
      return;
    }
    console.error('⚠️ Scheduled message worker error:', err);
  });

    console.log('📅 Scheduled message queue and worker initialized');
  } catch (redisError) {
    console.log('⚠️ Redis not available - scheduled messages will be saved to DB only');
    console.log('   To enable scheduled messages, start Redis on port 6379');
    
    // Disconnect Redis if connection was created but not connected
    if (redisConnection) {
      try {
        redisConnection.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      redisConnection = undefined;
    }
  }

  app.use(express.json());
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Session configuration for Google OAuth
  app.use(session({
    secret: process.env.SESSION_SECRET || 'intelli-call-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Strategy - Only initialize if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // Update user info and avatar
        user.name = profile.displayName;
        user.email = profile.emails?.[0]?.value || user.email;
        user.pic = profile.photos?.[0]?.value || user.pic;
        user.avatarType = 'google';
        user.isGoogleAuth = true;
        await user.save();
        return done(null, user);
      } else {
        // Create new user with Google profile
        const newUser = new User({
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          googleId: profile.id,
          pic: profile.photos?.[0]?.value || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
          avatarType: 'google',
          isGoogleAuth: true,
          password: undefined // Google users don't need password
        });
        await newUser.save();
        return done(null, newUser);
      }
    } catch (error) {
      return done(error, null);
    }
  }));
  } else {
    console.log("Google OAuth credentials not found - OAuth features disabled");
  }

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Routes - Only add if credentials are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/auth/google/callback', 
      passport.authenticate('google', { failureRedirect: '/login' }),
      async (req, res) => {
        try {
          const user = req.user as any;
          const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'intelli-call-jwt-secret', { expiresIn: '7d' });
          
          // Return user data with token
          res.redirect(`http://localhost:5173/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            avatarType: user.avatarType,
            isGoogleAuth: user.isGoogleAuth,
            googleId: user.googleId
          }))}`);
        } catch (error) {
          console.error('OAuth callback error:', error);
          res.redirect('/login?error=auth_failed');
        }
      }
    );
  }

  // Avatar update route
  app.put('/api/user/avatar', async (req, res) => {
    try {
      const { userId, avatarUrl, avatarType } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      let user;
      if (useInMemory) {
        user = inMemoryUsers.find(u => u._id === userId);
        if (user) {
          if (avatarType === 'custom') {
            user.customAvatar = avatarUrl;
          }
          user.pic = avatarUrl;
          user.avatarType = avatarType;
        }
      } else {
        user = await User.findById(userId);
        if (user) {
          if (avatarType === 'custom') {
            user.customAvatar = avatarUrl;
          }
          user.pic = avatarUrl;
          user.avatarType = avatarType;
          await user.save();
        }
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Broadcast profile update to all connected clients
      io.emit('user_profile_updated', {
        userId: user._id,
        userName: user.name,
        profilePic: user.pic
      });

      res.json({
        message: 'Avatar updated successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          pic: user.pic,
          avatarType: user.avatarType,
          customAvatar: user.customAvatar
        }
      });
    } catch (error) {
      console.error('Avatar update error:', error);
      res.status(500).json({ message: 'Failed to update avatar' });
    }
  });

  // Login Route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      let user;

      if (useInMemory) {
        // In-memory storage
        console.log("?? Using in-memory storage for login");
        user = inMemoryUsers.find(u => u.email === email);
        
        if (!user) {
          console.log(`❌ User not found: ${email}`);
          return res.status(401).json({ message: "Invalid Email or Password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          console.log(`❌ Invalid password for: ${email}`);
          return res.status(401).json({ message: "Invalid Email or Password" });
        }
      } else {
        // MongoDB storage
        if (mongoose.connection.readyState !== 1) {
          console.log("⚠️ MongoDB not connected");
          return res.status(500).json({ message: "Database connection error. Please try again." });
        }

        user = await User.findOne({ email });
        if (!user) {
          console.log(`❌ User not found: ${email}`);
          return res.status(401).json({ message: "Invalid Email or Password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          console.log(`❌ Invalid password for: ${email}`);
          return res.status(401).json({ message: "Invalid Email or Password" });
        }
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'intelli-call-jwt-secret', { expiresIn: '7d' });
      
      // Emit user_logged_in event
      console.log(`?? User logged in: ${user.name} (${email})`);
      io.emit("user_logged_in", {
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
      });
      
      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          pic: user.pic,
        },
        token,
        status: "success"
      });
    } catch (error: any) {
      console.error("❌ Login error:", error.message);
      res.status(500).json({ message: "Server Error. Please try again." });
    }
  });
  

  // Register Route
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, pic } = req.body;
    try {
      let user;
      let userExists;

      if (useInMemory) {
        // In-memory storage
        console.log("🧠 Using in-memory storage for registration");
        userExists = inMemoryUsers.find(u => u.email === email || u.name === name);
        if (userExists) {
          return res.status(400).json({ message: "User with this email or name already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = {
          _id: Date.now().toString(),
          name,
          email,
          password: hashedPassword,
          pic: pic || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
          friends: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        inMemoryUsers.push(user);
      } else {
        // MongoDB storage
        if (mongoose.connection.readyState !== 1) {
          return res.status(500).json({ message: "Database connection error. Please try again." });
        }

        userExists = await User.findOne({ $or: [{ email }, { name }] });
        if (userExists) {
          return res.status(400).json({ message: "User with this email or name already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
          name,
          email,
          password: hashedPassword,
          pic
        });
      }

      if (user) {
        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'intelli-call-jwt-secret', { expiresIn: '7d' });
        
        // Emit user_logged_in event
        io.emit("user_logged_in", {
          _id: user._id,
          name: user.name,
          email: user.email,
          pic: user.pic,
        });
        res.status(201).json({
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
          },
          token,
          status: "success"
        });
      } else {
        res.status(400).json({ message: "Invalid user data" });
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running.." });
  });

  // --- Modular Chat Routes (WhatsApp-like Features) ---
  const chatController = new ChatController({ Message, Chat: null, User, Group });
  app.use('/api/chat', createChatRoutes(chatController));

  // --- AI Summary Routes ---
  app.use('/api', summaryRoutes);

  // --- AI Translation Routes (Voice/Video Call Subtitles + Message Translation) ---
  app.use('/api/ai', aiRoutes);

  // --- Reels Routes ---
  app.get("/api/reels", async (req, res) => {
    try {
      const reels = await Reel.find().sort({ createdAt: -1 }).limit(30);
      const mapped = reels.map((r: any) => ({
        ...r.toObject(),
        createdBy: r.createdBy?.toString?.() ?? r.createdBy,
        likes: (r.likes || []).map((id: any) => id.toString()),
      }));
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reels" });
    }
  });

  app.post("/api/reels", async (req, res) => {
    try {
      const { userId, caption, mediaUrl, mediaType } = req.body || {};
      if (!userId || !mediaUrl) {
        return res.status(400).json({ message: "userId and mediaUrl are required" });
      }
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const reel = await Reel.create({
        createdBy: user._id,
        createdByName: user.name,
        caption: caption || '',
        mediaUrl,
        mediaType: mediaType === 'video' ? 'video' : 'image',
      });

      // Real-time update to all clients.
      const normalized = {
        ...reel.toObject(),
        createdBy: reel.createdBy?.toString?.() ?? reel.createdBy,
        likes: (reel.likes || []).map((id: any) => id.toString()),
      };
      io.emit("reel_created", normalized);
      res.status(201).json(reel);
    } catch (error) {
      res.status(500).json({ message: "Error creating reel" });
    }
  });

  app.put("/api/reels/:reelId", async (req, res) => {
    try {
      const { reelId } = req.params;
      const { userId, caption, mediaUrl, mediaType } = req.body || {};
      if (!userId) return res.status(400).json({ message: "userId required" });

      const reel = await Reel.findById(reelId);
      if (!reel) return res.status(404).json({ message: "Reel not found" });
      if (reel.createdBy.toString() !== userId) return res.status(403).json({ message: "Not allowed" });

      if (typeof caption === "string") reel.caption = caption;
      if (typeof mediaUrl === "string" && mediaUrl.trim()) reel.mediaUrl = mediaUrl.trim();
      if (mediaType === "image" || mediaType === "video") reel.mediaType = mediaType;

      await reel.save();

      const normalized = {
        ...reel.toObject(),
        createdBy: reel.createdBy?.toString?.() ?? reel.createdBy,
        likes: (reel.likes || []).map((id: any) => id.toString()),
      };
      io.emit("reel_updated", normalized);
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ message: "Error updating reel" });
    }
  });

  app.post("/api/reels/:reelId/comment", async (req, res) => {
    try {
      const { reelId } = req.params;
      const { userId, text } = req.body || {};
      if (!userId || !text) return res.status(400).json({ message: "userId and text required" });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const reel = await Reel.findById(reelId);
      if (!reel) return res.status(404).json({ message: "Reel not found" });

      const comment = {
        user: user._id,
        userName: user.name,
        text,
        createdAt: new Date()
      };

      reel.comments.push(comment as any);
      await reel.save();

      const normalized = {
        ...reel.toObject(),
        createdBy: reel.createdBy?.toString?.() ?? reel.createdBy,
        likes: (reel.likes || []).map((id: any) => id.toString()),
      };
      io.emit("reel_updated", normalized);
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ message: "Error commenting on reel" });
    }
  });

  app.post("/api/reels/:reelId/like", async (req, res) => {
    try {
      const { reelId } = req.params;
      const { userId } = req.body || {};
      if (!userId) return res.status(400).json({ message: "userId required" });

      const reel = await Reel.findById(reelId);
      if (!reel) return res.status(404).json({ message: "Reel not found" });

      const uid = new mongoose.Types.ObjectId(userId);
      const hasLiked = reel.likes.some((id: any) => id.toString() === userId);

      if (hasLiked) {
        reel.likes = reel.likes.filter((id: any) => id.toString() !== userId);
      } else {
        reel.likes.push(uid);
      }

      await reel.save();

      const normalized = {
        ...reel.toObject(),
        createdBy: reel.createdBy?.toString?.() ?? reel.createdBy,
        likes: (reel.likes || []).map((id: any) => id.toString()),
      };
      io.emit("reel_like_updated", { reelId: reel._id.toString(), likes: normalized.likes });
      res.json(normalized);
    } catch (error) {
      res.status(500).json({ message: "Error liking reel" });
    }
  });

  app.delete("/api/reels/:reelId", async (req, res) => {
    try {
      const { reelId } = req.params;
      const { userId } = req.body || {};
      if (!userId) return res.status(400).json({ message: "userId required" });

      const reel = await Reel.findById(reelId);
      if (!reel) return res.status(404).json({ message: "Reel not found" });
      if (reel.createdBy.toString() !== userId) return res.status(403).json({ message: "Not allowed" });

      await Reel.findByIdAndDelete(reelId);
      io.emit("reel_deleted", { reelId: reel._id.toString() });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting reel" });
    }
  });

  // --- Stories Routes ---
  // Get all stories (excluding expired ones)
  app.get("/api/stories", async (req, res) => {
    try {
      const now = new Date();
      const stories = await Story.find({
        $or: [
          { expiresAt: { $gt: now } },
          { isArchived: true },
          { isHighlight: true }
        ]
      }).sort({ createdAt: -1 }).limit(100);

      const mapped = stories.map((s: any) => ({
        ...s.toObject(),
        id: s._id.toString(),
        userId: s.userId?.toString?.() ?? s.userId,
        likes: (s.likes || []).map((id: any) => id.toString()),
        viewers: (s.viewers || []).map((v: any) => ({
          ...v,
          userId: v.userId?.toString?.() ?? v.userId
        }))
      }));
      res.json(mapped);
    } catch (error) {
      console.error('Error fetching stories:', error);
      res.status(500).json({ message: "Error fetching stories" });
    }
  });

  // Create new story (including repost from reel)
  app.post("/api/stories", async (req, res) => {
    try {
      const { userId, image, caption, audioUrl, repostedFrom, isRepost } = req.body || {};
      
      if (!userId || !image) {
        return res.status(400).json({ message: "userId and image are required" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const storyData: any = {
        userId: user._id,
        userName: user.name,
        userPic: user.pic || '',
        mediaUrl: image,
        mediaType: image.startsWith('data:video') || image.includes('.mp4') || image.includes('.webm') ? 'video' : 'image',
        caption: caption || '',
        audioUrl: audioUrl || '',
        isRepost: isRepost || false,
        storyGroupId: `story_${user._id}_${Date.now()}`
      };

      if (isRepost && repostedFrom) {
        storyData.repostedFrom = repostedFrom;
      }

      const story = await Story.create(storyData);

      // Real-time update to all clients
      const normalized = {
        ...story.toObject(),
        id: story._id.toString(),
        userId: story.userId?.toString?.() ?? story.userId,
        likes: [],
        viewers: [],
        reactions: [],
        replies: [],
        comments: []
      };
      
      io.emit("story_created", normalized);
      res.status(201).json(normalized);
    } catch (error) {
      console.error('Error creating story:', error);
      res.status(500).json({ message: "Error creating story" });
    }
  });

  // Delete story
  app.delete("/api/stories/:storyId", async (req, res) => {
    try {
      const { storyId } = req.params;
      const { userId } = req.body || {};
      
      if (!userId) return res.status(400).json({ message: "userId required" });

      const story = await Story.findById(storyId);
      if (!story) return res.status(404).json({ message: "Story not found" });
      if (story.userId.toString() !== userId) return res.status(403).json({ message: "Not allowed" });

      await Story.findByIdAndDelete(storyId);
      io.emit("story_deleted", { storyId });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error deleting story:', error);
      res.status(500).json({ message: "Error deleting story" });
    }
  });

  console.log('📖 Stories routes registered at /api/stories');

  // --- NEW Video Upload Routes (Cloudinary Integration) ---
  app.use('/api/videos', createVideoRoutes({ Reel, User, Message }));
  console.log('📹 Video upload routes registered at /api/videos');

  // --- AI Reel Features Routes ---
  // Generate auto caption for reel
  app.post('/api/reels/ai/caption', async (req, res) => {
    try {
      const { mediaUrl, mediaType, context } = req.body;
      if (!mediaUrl) {
        return res.status(400).json({ error: 'mediaUrl is required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const caption = await aiService.generateAutoCaption(mediaUrl, mediaType, context);
      res.json({ caption, aiGenerated: true });
    } catch (error: any) {
      console.error('AI caption error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate caption' });
    }
  });

  // Generate hashtag suggestions
  app.post('/api/reels/ai/hashtags', async (req, res) => {
    try {
      const { caption, mediaType } = req.body;
      if (!caption) {
        return res.status(400).json({ error: 'caption is required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const hashtags = await aiService.generateHashtags(caption, mediaType);
      res.json({ hashtags });
    } catch (error: any) {
      console.error('AI hashtags error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate hashtags' });
    }
  });

  // Translate caption
  app.post('/api/reels/ai/translate', async (req, res) => {
    try {
      const { caption, targetLanguages } = req.body;
      if (!caption) {
        return res.status(400).json({ error: 'caption is required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const translations = await aiService.translateCaption(caption, targetLanguages || ['es', 'fr', 'hi', 'ar']);
      res.json({ translations });
    } catch (error: any) {
      console.error('AI translation error:', error);
      res.status(500).json({ error: error.message || 'Failed to translate caption' });
    }
  });

  // Generate reel summary
  app.post('/api/reels/ai/summary', async (req, res) => {
    try {
      const { caption, mediaType } = req.body;
      if (!caption) {
        return res.status(400).json({ error: 'caption is required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const summary = await aiService.generateSummary(caption, mediaType);
      res.json({ summary });
    } catch (error: any) {
      console.error('AI summary error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate summary' });
    }
  });

  // Process all AI features for a reel
  app.post('/api/reels/ai/process-all', async (req, res) => {
    try {
      const { reelId, caption, mediaUrl, mediaType } = req.body;
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }

      // Process all AI features
      const aiResults = await aiService.processAllAIFeatures({
        caption: caption || '',
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || 'image'
      });

      // If reelId provided, update the reel with AI data
      if (reelId) {
        const reel = await Reel.findById(reelId);
        if (reel) {
          reel.hashtags = aiResults.hashtags;
          reel.summary = aiResults.summary;
          reel.detectedObjects = aiResults.detectedObjects;
          reel.sentiment = aiResults.sentiment;
          reel.aiFeatures = {
            autoCaption: !!aiResults.autoCaption,
            hashtags: aiResults.hashtags.length > 0,
            thumbnail: false,
            translation: false,
            summary: !!aiResults.summary
          };
          await reel.save();
        }
      }

      res.json({
        success: true,
        aiResults,
        reelUpdated: !!reelId
      });
    } catch (error: any) {
      console.error('AI process-all error:', error);
      res.status(500).json({ error: error.message || 'Failed to process AI features' });
    }
  });

  // Update reel with AI-generated data
  app.put('/api/reels/:reelId/ai', async (req, res) => {
    try {
      const { reelId } = req.params;
      const { userId, hashtags, summary, translatedCaptions, thumbnailUrl } = req.body;

      const reel = await Reel.findById(reelId);
      if (!reel) return res.status(404).json({ error: 'Reel not found' });
      if (reel.createdBy.toString() !== userId) return res.status(403).json({ error: 'Not allowed' });

      if (hashtags) reel.hashtags = hashtags;
      if (summary) reel.summary = summary;
      if (thumbnailUrl) reel.thumbnailUrl = thumbnailUrl;
      if (translatedCaptions) {
        reel.translatedCaptions = new Map(Object.entries(translatedCaptions));
      }

      await reel.save();

      const normalized = {
        ...reel.toObject(),
        createdBy: reel.createdBy?.toString?.() ?? reel.createdBy,
        likes: (reel.likes || []).map((id: any) => id.toString()),
        translatedCaptions: Object.fromEntries(reel.translatedCaptions || new Map())
      };

      io.emit('reel_updated', normalized);
      res.json({ success: true, reel: normalized });
    } catch (error: any) {
      console.error('AI update reel error:', error);
      res.status(500).json({ error: error.message || 'Failed to update reel with AI data' });
    }
  });

  console.log('🤖 AI Reel features routes registered');

  // --- AI Stories Features Routes ---
  // Generate auto caption for story
  app.post('/api/stories/ai/caption', async (req, res) => {
    try {
      const { context } = req.body;
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const caption = await aiService.generateStoryCaption(context);
      res.json({ caption, aiGenerated: true });
    } catch (error: any) {
      console.error('Story AI caption error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate story caption' });
    }
  });

  // Generate hashtag suggestions for story
  app.post('/api/stories/ai/hashtags', async (req, res) => {
    try {
      const { caption } = req.body;
      if (!caption) {
        return res.status(400).json({ error: 'caption is required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const hashtags = await aiService.generateStoryHashtags(caption);
      res.json({ hashtags });
    } catch (error: any) {
      console.error('Story AI hashtags error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate story hashtags' });
    }
  });

  // Translate story content
  app.post('/api/stories/ai/translate', async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'text and targetLanguage are required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const translation = await aiService.translateStory(text, targetLanguage);
      res.json({ translation, targetLanguage });
    } catch (error: any) {
      console.error('Story AI translation error:', error);
      res.status(500).json({ error: error.message || 'Failed to translate story' });
    }
  });

  // Generate story summary
  app.post('/api/stories/ai/summary', async (req, res) => {
    try {
      const { caption } = req.body;
      if (!caption) {
        return res.status(400).json({ error: 'caption is required' });
      }
      if (!aiService.isAIServiceAvailable()) {
        return res.status(503).json({ error: 'AI service not available. Please configure GROQ_API_KEY or OPENAI_API_KEY' });
      }
      const summary = await aiService.generateStorySummary(caption);
      res.json({ summary });
    } catch (error: any) {
      console.error('Story AI summary error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate story summary' });
    }
  });

  console.log('🤖 AI Stories features routes registered');

  /** Wipe all chat data (messages, groups, friend requests) — fresh demo start */
  app.post("/api/admin/reset-database", async (req, res) => {
    try {
      const { confirm } = req.body || {};
      if (confirm !== "RESET_ALL_DATA") {
        return res.status(400).json({ message: "Type RESET_ALL_DATA to confirm" });
      }
      await Message.deleteMany({});
      await FriendRequest.deleteMany({});
      await Group.deleteMany({});
      await Reel.deleteMany({});
      await User.deleteMany({});
      res.json({ ok: true, message: "Database cleared. Register a new account to continue." });
    } catch (e: any) {
      console.error("reset-database:", e);
      res.status(500).json({ message: e.message || "Reset failed" });
    }
  });

  /** Delete own account + related messages & requests */
  app.delete("/api/user/account", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const uid = user._id;
      const name = user.name;
      await Message.deleteMany({
        $or: [{ user: name }, { to: name }]
      });
      await FriendRequest.deleteMany({ $or: [{ from: uid }, { to: uid }] });
      await Reel.deleteMany({ createdBy: uid });
      await User.updateMany({ friends: uid }, { $pull: { friends: uid } });
      await Group.updateMany({ members: uid }, { $pull: { members: uid } });
      await User.findByIdAndDelete(uid);
      res.json({ ok: true, message: "Account deleted" });
    } catch (e: any) {
      console.error("delete account:", e);
      res.status(500).json({ message: e.message || "Delete failed" });
    }
  });

  // Fetch Messages Route
  app.get("/api/messages", async (req, res) => {
    try {
      const { user, to, groupId, userId, isBlind } = req.query;
      let query: any = { isDeleted: { $ne: true } };

      if (userId) {
        query.deletedFor = { $ne: userId };
      }

      if (groupId) {
        query.groupId = groupId;
      } else if (isBlind === 'true') {
        query.isBlind = true;
      } else if (to === 'My Assistant' || user === 'My Assistant') {
        // AI Chat is private to the user
        query.$or = [
          { user: user, to: 'My Assistant' },
          { user: 'My Assistant', to: user }
        ];
      } else if (to && user) {
        // Private Chat
        query.$or = [
          { user: user, to: to },
          { user: to, to: user }
        ];
      } else {
        // Global Chat (fallback or if no recipient specified)
        query.to = { $exists: false };
        query.groupId = { $exists: false };
        query.isBlind = { $ne: true };
      }

      let messages = await Message.find(query).sort({ createdAt: 1 }).lean();
      
      // Filter scheduled messages: only show to sender, hide from receiver until scheduled time
      messages = messages.filter((msg: any) => {
        // If message is not scheduled, show it
        if (!msg.isScheduled || msg.status !== 'scheduled') {
          return true;
        }
        // If message is scheduled, only show to the sender
        // Convert both IDs to strings for comparison
        const msgSenderId = msg.senderId ? msg.senderId.toString() : '';
        const currentUserId = userId ? userId.toString() : '';
        return msgSenderId === currentUserId;
      });
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  // Fetch All Users Route
  app.get("/api/users", async (req, res) => {
    try {
      const users = await User.find(
        { email: { $nin: ["assistant@intelli-call.io"] } },
        { password: 0 }
      );
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Search Users Route
  app.get("/api/users/search", async (req, res) => {
    try {
      const { query } = req.query;
      const users = await User.find({
        email: { $nin: ["assistant@intelli-call.io"] },
        $or: [
          { name: { $regex: query as string, $options: "i" } },
          { email: { $regex: query as string, $options: "i" } },
        ],
      } as any, { password: 0 });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error searching users" });
    }
  });

  // Fetch Groups Route
  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await Group.find().populate('members', '-password').populate('admin', '-password');
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Error fetching groups" });
    }
  });

  // Add Member to Group Route
  app.post("/api/groups/:groupId/members", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      
      if (!group.members.includes(userId)) {
        group.members.push(userId);
        await group.save();
      }
      const updatedGroup = await Group.findById(groupId).populate('members', '-password').populate('admin', '-password');
      res.json(updatedGroup);
    } catch (error) {
      res.status(500).json({ message: "Error adding member to group" });
    }
  });

  // Create Group Route
  app.post("/api/groups", async (req, res) => {
    try {
      const { name, description, members, admin } = req.body;
      const group = await Group.create({
        name,
        description,
        members,
        admin: admin
      });
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ message: "Error creating group" });
    }
  });

  // Delete Group Route
  app.delete("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      await Group.findByIdAndDelete(groupId);
      // Also delete messages for this group
      await Message.deleteMany({ groupId });
      res.json({ message: "Group and its messages deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting group" });
    }
  });

  // Exit Group Route
  app.delete("/api/groups/:groupId/members/:userId", async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });
      
      group.members = group.members.filter(m => m.toString() !== userId);
      
      // If admin leaves, assign new admin or delete group if empty
      if (group.admin && group.admin.toString() === userId) {
        if (group.members.length > 0) {
          group.admin = group.members[0];
        } else {
          await Group.findByIdAndDelete(groupId);
          await Message.deleteMany({ groupId });
          return res.json({ message: "Group deleted as it has no members" });
        }
      }
      
      await group.save();
      const updatedGroup = await Group.findById(groupId).populate('members', '-password').populate('admin', '-password');
      res.json(updatedGroup);
    } catch (error) {
      res.status(500).json({ message: "Error exiting group" });
    }
  });

  // Delete All Messages Route
  app.post("/api/messages/clear", async (req, res) => {
    try {
      const { userId, userName, otherUserName, groupId, isBlind, isGlobal } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      let query: any = {};
      if (groupId) {
        query.groupId = groupId;
      } else if (otherUserName && userName) {
        query.$or = [
          { user: userName, to: otherUserName },
          { user: otherUserName, to: userName }
        ];
      } else if (isBlind) {
        query.isBlind = true;
      } else if (isGlobal) {
        query.to = { $exists: false };
        query.groupId = { $exists: false };
        query.isBlind = { $ne: true };
      } else {
        return res.status(400).json({ message: "Need either groupId, otherUserName, isBlind, or isGlobal" });
      }

      await Message.updateMany(query, { $addToSet: { deletedFor: userId } });
      res.json({ message: "Chat cleared for user" });
    } catch (error) {
      res.status(500).json({ message: "Error clearing chat" });
    }
  });

  app.delete("/api/messages/all", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      await Message.deleteMany({ sender: userId });
      res.json({ message: "User messages deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting messages" });
    }
  });

  // Delete Conversation Messages Route
  app.delete("/api/messages/conversation", async (req, res) => {
    try {
      const { user, to, groupId } = req.query;
      let query: any = {};
      if (groupId) {
        query.groupId = groupId;
      } else if (user && to) {
        query.$or = [
          { user: user, to: to },
          { user: to, to: user }
        ];
      } else {
        return res.status(400).json({ message: "Missing parameters" });
      }
      await Message.deleteMany(query);
      res.json({ message: "Conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting conversation" });
    }
  });

  // --- Scheduled Message Routes ---
  // Schedule a new message
  app.post("/api/message/schedule", async (req, res) => {
    try {
      const {
        id,
        user,
        senderId,
        to,
        groupId,
        text,
        image,
        video,
        audio,
        profilePic,
        scheduledTime,
        isBlind,
        isGhost,
        isRecurring,
        recurringType,
        recurringDays
      } = req.body;

      // Validate required fields
      if (!id || !user || !scheduledTime) {
        return res.status(400).json({ 
          error: 'Missing required fields: id, user, scheduledTime' 
        });
      }

      // Validate scheduled time is in the future
      const scheduleDate = new Date(scheduledTime);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ 
          error: 'Scheduled time must be in the future' 
        });
      }

      // Validate at least one recipient
      if (!to && !groupId) {
        return res.status(400).json({ 
          error: 'Either recipient (to) or groupId is required' 
        });
      }

      // Create unique scheduled message ID
      const scheduledMessageId = `scheduled_${id}_${Date.now()}`;

      // Create the scheduled message
      const parentMessageId = isRecurring ? `recurring_${scheduledMessageId}` : undefined;
      const messageData = {
        id: scheduledMessageId,
        user,
        senderId: senderId ? new mongoose.Types.ObjectId(senderId) : null,
        to,
        groupId: groupId ? new mongoose.Types.ObjectId(groupId) : null,
        text,
        image,
        video,
        audio,
        timestamp: new Date().toISOString(),
        profilePic,
        isScheduled: true,
        status: 'scheduled',
        scheduledTime: scheduleDate,
        scheduledMessageId,
        isBlind: isBlind || false,
        isGhost: isGhost || false,
        isAI: false,
        isSystem: false,
        reactions: {},
        deliveryStatus: 'sent',
        readBy: senderId ? [new mongoose.Types.ObjectId(senderId)] : [],
        isRecurring: isRecurring || false,
        recurringType: isRecurring ? recurringType : undefined,
        recurringDays: isRecurring && recurringType === 'custom' ? recurringDays : undefined,
        parentMessageId: isRecurring ? parentMessageId : undefined
      };

      // Save to database
      const message = await Message.create(messageData);

      // Try to add to BullMQ queue with delay
      let queueAdded = false;
      try {
        if (!scheduledMessageQueue) {
          throw new Error('Redis not available - scheduled message queue not initialized');
        }
        
        const delay = scheduleDate.getTime() - Date.now();
        
        await scheduledMessageQueue.add(
          'send-scheduled-message',
          {
            messageId: scheduledMessageId,
            messageData: {
              id: scheduledMessageId,
              user,
              senderId,
              to,
              groupId,
              text,
              image,
              video,
              audio,
              profilePic
            }
          },
          {
            delay,
            jobId: scheduledMessageId,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            }
          }
        );
        queueAdded = true;
        console.log(`📅 Message scheduled: ${scheduledMessageId} for ${scheduleDate.toISOString()}`);
      } catch (queueError) {
        console.error('⚠️ Failed to add to BullMQ queue (Redis may not be running):', queueError);
        console.log(`💾 Message saved to DB, using setTimeout fallback: ${scheduledMessageId}`);
        
        // Fallback: Use setTimeout to send the message at the scheduled time
        const delay = scheduleDate.getTime() - Date.now();
        if (delay > 0 && delay < 2147483647) { // Max setTimeout delay is ~24.8 days
          setTimeout(async () => {
            try {
              console.log(`⏰ setTimeout fallback: Sending scheduled message ${scheduledMessageId}`);
              
              // Find and update the message
              const msg = await Message.findOne({ 
                id: scheduledMessageId,
                isScheduled: true,
                status: 'scheduled'
              });
              
              if (!msg) {
                console.log(`⚠️ Scheduled message not found: ${scheduledMessageId}`);
                return;
              }
              
              // Update status
              msg.status = 'sent';
              msg.isScheduled = false;
              msg.scheduledTime = null;
              const alreadyRead = msg.readBy.some((r: any) => r.userId?.toString() === msg.senderId?.toString());
              if (!alreadyRead) {
                msg.readBy.push({ userId: msg.senderId, readAt: new Date() });
              }
              await msg.save();
              
              // Broadcast the message
              const broadcastMessage = {
                id: msg.id,
                user: msg.user,
                senderId: msg.senderId,
                to: msg.to,
                groupId: msg.groupId,
                text: msg.text,
                image: msg.image,
                video: msg.video,
                audio: msg.audio,
                timestamp: new Date().toISOString(),
                profilePic: msg.profilePic,
                isGhost: msg.isGhost,
                isAI: msg.isAI,
                isSystem: msg.isSystem,
                isBlind: msg.isBlind,
                isScheduled: false,
                deliveryStatus: 'delivered',
                deliveredAt: new Date(),
                readBy: msg.readBy,
                reactions: msg.reactions || {},
                createdAt: msg.createdAt
              };
              
              if (msg.groupId) {
                io.to(String(msg.groupId)).emit('message received', broadcastMessage);
                io.to(String(msg.groupId)).emit('receive_message', broadcastMessage);
              } else if (msg.to) {
                const recipient = await User.findOne({ name: msg.to });
                if (recipient) {
                  io.to(recipient._id.toString()).emit('message received', broadcastMessage);
                  io.to(recipient._id.toString()).emit('receive_message', broadcastMessage);
                }
                if (msg.senderId) {
                  io.to(msg.senderId.toString()).emit('message received', broadcastMessage);
                  io.to(msg.senderId.toString()).emit('receive_message', broadcastMessage);
                  io.to(msg.senderId.toString()).emit('scheduled_message_sent', { messageId: msg.id });
                }
              }
              
              console.log(`✅ setTimeout fallback: Message ${scheduledMessageId} sent successfully`);
            } catch (err) {
              console.error(`❌ setTimeout fallback error for ${scheduledMessageId}:`, err);
            }
          }, delay);
        } else {
          console.log(`⚠️ Delay ${delay}ms is invalid or too large for setTimeout`);
        }
      }

      res.status(201).json({
        success: true,
        warning: queueAdded ? undefined : 'Message saved but Redis is not running - scheduled delivery may not work',
        message: {
          id: message.id,
          user: message.user,
          senderId: message.senderId?.toString(),
          to: message.to,
          groupId: message.groupId?.toString(),
          text: message.text,
          image: message.image,
          video: message.video,
          audio: message.audio,
          timestamp: message.timestamp,
          profilePic: message.profilePic,
          isScheduled: true,
          status: 'scheduled',
          scheduledTime: message.scheduledTime,
          isRecurring: message.isRecurring,
          recurringType: message.recurringType,
          isGhost: message.isGhost,
          isBlind: message.isBlind,
          isAI: message.isAI
        }
      });

    } catch (error: any) {
      console.error('Schedule message error:', error);
      res.status(500).json({ 
        error: 'Failed to schedule message',
        message: error.message 
      });
    }
  });

  // Get scheduled messages for a chat
  app.get("/api/message/scheduled/:chatId", async (req, res) => {
    try {
      const { chatId } = req.params;
      const { userId, isGroup } = req.query;

      if (!chatId || !userId) {
        return res.status(400).json({ 
          error: 'chatId and userId are required' 
        });
      }

      // Only show scheduled messages to the SENDER (not to receiver until sent time arrives)
      // This ensures receivers don't see "Scheduled for..." badges before message is delivered
      let query: any = {
        isScheduled: true,
        status: 'scheduled',
        senderId: new mongoose.Types.ObjectId(userId as string)
      };

      if (isGroup === 'true') {
        // Group chat - match by groupId
        query.groupId = new mongoose.Types.ObjectId(chatId);
      }

      const messages = await Message.find(query)
        .sort({ scheduledTime: 1 })
        .select('-__v');

      res.json({
        success: true,
        count: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          text: m.text,
          scheduledTime: m.scheduledTime,
          status: m.status,
          to: m.to,
          groupId: m.groupId,
          senderId: m.senderId,
          createdAt: m.createdAt,
          image: m.image,
          video: m.video,
          audio: m.audio
        }))
      });

    } catch (error: any) {
      console.error('Get scheduled messages error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch scheduled messages',
        message: error.message 
      });
    }
  });

  // Cancel a scheduled message
  app.delete("/api/message/scheduled/:messageId", async (req, res) => {
    try {
      const { messageId } = req.params;
      const { userId } = req.query;

      // Find the message
      const message = await Message.findOne({
        id: messageId,
        isScheduled: true,
        status: 'scheduled'
      } as any);

      if (!message) {
        return res.status(404).json({ error: 'Scheduled message not found' });
      }

      // Verify ownership
      if (message.senderId?.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this message' });
      }

      // Remove from queue if Redis is available
      if (scheduledMessageQueue) {
        const job = await scheduledMessageQueue.getJob(messageId);
        if (job) {
          await job.remove();
        }
      }

      // Update message status
      message.status = 'cancelled';
      await message.save();

      console.log(`❌ Scheduled message cancelled: ${messageId}`);

      res.json({
        success: true,
        message: 'Scheduled message cancelled successfully'
      });

    } catch (error: any) {
      console.error('Cancel scheduled message error:', error);
      res.status(500).json({ 
        error: 'Failed to cancel scheduled message',
        message: error.message 
      });
    }
  });

  // Manual process scheduled messages (fallback when Redis is not running)
  app.post("/api/message/process-scheduled", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const now = new Date();
      
      // Find all scheduled messages that should be sent now
      const scheduledMessages = await Message.find({
        isScheduled: true,
        status: 'scheduled',
        senderId: new mongoose.Types.ObjectId(userId),
        scheduledTime: { $lte: now }
      });

      console.log(`🔄 Manual process: Found ${scheduledMessages.length} scheduled messages to send`);

      const results = [];
      
      for (const message of scheduledMessages) {
        try {
          // Update message status
          message.status = 'sent';
          message.isScheduled = false;
          message.scheduledTime = null;
          
          if (!message.readBy.some((r: any) => r.userId?.toString() === message.senderId?.toString())) {
            message.readBy.push({ userId: message.senderId, readAt: new Date() });
          }
          
          await message.save();
          
          // Broadcast the message
          const broadcastMessage = {
            id: message.id,
            user: message.user,
            senderId: message.senderId,
            to: message.to,
            groupId: message.groupId,
            text: message.text,
            image: message.image,
            video: message.video,
            audio: message.audio,
            timestamp: new Date().toISOString(),
            profilePic: message.profilePic,
            isGhost: message.isGhost,
            isAI: message.isAI,
            isSystem: message.isSystem,
            isBlind: message.isBlind,
            isScheduled: false,
            deliveryStatus: 'delivered',
            deliveredAt: new Date(),
            readBy: message.readBy,
            reactions: message.reactions || {},
            isForwarded: message.isForwarded,
            forwardedFrom: message.forwardedFrom,
            originalMessageId: message.originalMessageId,
            createdAt: message.createdAt
          };
          
          // Emit via socket.io
          if (message.groupId) {
            io.to(String(message.groupId)).emit('message received', broadcastMessage);
            io.to(String(message.groupId)).emit('receive_message', broadcastMessage);
          } else if (message.to) {
            const recipient = await User.findOne({ name: message.to });
            if (recipient) {
              io.to(recipient._id.toString()).emit('message received', broadcastMessage);
              io.to(recipient._id.toString()).emit('receive_message', broadcastMessage);
            }
            
            if (message.senderId) {
              io.to(message.senderId.toString()).emit('message received', broadcastMessage);
              io.to(message.senderId.toString()).emit('receive_message', broadcastMessage);
              io.to(message.senderId.toString()).emit('scheduled_message_sent', { messageId: message.id });
            }
          }
          
          results.push({ id: message.id, status: 'sent', text: message.text });
          
          // Handle recurring - schedule next occurrence
          if (message.isRecurring && message.parentMessageId) {
            const nextTime: Date | null = calculateNextRecurringDate(now, message.recurringType, message.recurringDays);
            if (nextTime) {
              const newId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await Message.create({
                ...message.toObject(),
                _id: new mongoose.Types.ObjectId(),
                id: newId,
                scheduledMessageId: newId,
                scheduledTime: nextTime,
                status: 'scheduled',
                isScheduled: true
              });
            }
          }
          
        } catch (msgError) {
          console.error(`Error sending scheduled message ${message.id}:`, msgError);
          results.push({ id: message.id, status: 'error', error: String(msgError) });
        }
      }
      
      res.json({
        success: true,
        processed: results.length,
        results
      });
      
    } catch (error: any) {
      console.error('Process scheduled messages error:', error);
      res.status(500).json({ 
        error: 'Failed to process scheduled messages',
        message: error.message 
      });
    }
  });

  // --- AI Routes ---
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt } = req.body;
      const groqKey = process.env.GROQ_API_KEY;

      // Prefer Groq for "AI Explain" UX (faster + clean text).
      if (groqKey) {
        const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            messages: [
              {
                role: "system",
                content: "You are a friendly and helpful companion. Keep responses clear and easy to understand. Respond in the same language as the user (Hindi/English/Hinglish).",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        const data: any = await response.json().catch(() => ({}));
        const text = data?.choices?.[0]?.message?.content;
        return res.json({ text: text || "Sorry, I couldn't generate an explanation right now." });
      }

      // Try Gemini first
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `You are My Assistant, a friendly and helpful companion. 
            A user is talking to you: "${prompt}". 
            
            Your Personality:
            - You are a real friend. Talk naturally, like a human would.
            - Respond in the SAME LANGUAGE as the user (Hindi, English, or Hinglish).
            - Be warm, empathetic, and casual.
            - You can chat about anything.
            - Keep it simple and easy to understand.
            
            Respond now as a close friend.`,
          });

          return res.json({ text: response.text || "I'm sorry, I couldn't process that." });
        } catch (geminiError) {
          console.error("Gemini API failed:", geminiError.message);
        }
      }

      // Fallback to OpenAI
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        try {
          const openai = new OpenAI({ apiKey: openaiKey });
          const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are My Assistant, a friendly and helpful companion. Respond in the same language as the user (Hindi/English/Hinglish). Be warm, empathetic, and casual.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
          });

          return res.json({ text: response.choices[0]?.message?.content || "I'm sorry, I couldn't process that." });
        } catch (openaiError) {
          console.error("OpenAI API failed:", openaiError.message);
        }
      }

      // No AI keys available
      const responses = [
        "I'm currently in offline mode because no AI keys are configured. Please add GEMINI_API_KEY or OPENAI_API_KEY in .env",
        "Hello! I'm your assistant. My AI is offline right now. Try again later.",
        "You can still chat, but AI features need API keys on the server."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      return res.json({ text: randomResponse });

    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ message: "AI Node is currently busy or offline." });
    }
  });

  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { history } = req.body;
      const raw = (history || "").trim();
      if (!raw) {
        return res.json({ text: "No messages to summarize yet." });
      }

      const lines = raw.split("\n").filter(Boolean);

      let summary = "";
      let usedAPI = "";

      // Better prompt for comprehensive summary
      const summaryPrompt = `Please provide a comprehensive summary of the following chat conversation. 

Instructions:
- Summarize ALL the messages and topics discussed
- Capture the flow of conversation from start to end
- Mention key points, decisions, questions, and answers
- Include who said what (sender names)
- Keep it detailed but concise (5-8 bullet points or 3-4 paragraphs)
- Don't just mention first and last message - cover everything in between

Chat History:
${history}

Comprehensive Summary:`;

      // Try Groq first (fastest and most reliable)
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant that creates comprehensive chat summaries. Summarize ALL messages in the conversation, not just the beginning and end. Cover all topics discussed, who said what, and the flow of conversation.",
                },
                { role: "user", content: summaryPrompt },
              ],
              temperature: 0.3,
              max_tokens: 800,
            }),
          });
          
          const data = await response.json();
          summary = data.choices[0]?.message?.content || "Could not generate summary.";
          usedAPI = "Groq";
          console.log("✅ Groq summary generated successfully");
        } catch (groqError) {
          console.error("Groq summarize failed:", groqError.message);
        }
      }

      // Fallback to OpenAI if Groq failed (with key validation)
      if (!summary && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('sk-your-actual-openai-api-key-here')) {
        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that creates comprehensive chat summaries. Summarize ALL messages in the conversation, not just the beginning and end. Cover all topics discussed, who said what, and the flow of conversation.",
              },
              { role: "user", content: summaryPrompt },
            ],
            temperature: 0.3,
            max_tokens: 800,
          });

          summary = response.choices[0]?.message?.content || "Could not generate summary.";
          usedAPI = "OpenAI";
          console.log("✅ OpenAI summary generated successfully");
        } catch (openaiError) {
          console.error("OpenAI summarize failed:", openaiError.message);
        }
      }

      // Last resort: Gemini (if quota allows)
      if (!summary && process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: summaryPrompt,
            config: {
              temperature: 0.3,
              maxOutputTokens: 800,
            }
          });

          summary = response.text || "Could not generate summary.";
          usedAPI = "Gemini AI";
          console.log("✅ Gemini summary generated successfully");
        } catch (geminiError) {
          console.error("Gemini summarize failed:", geminiError.message);
        }
      }

      // If all APIs failed or no keys, create a manual summary from all messages
      if (!summary) {
        // Create a simple but comprehensive manual summary
        const messageCount = lines.length;
        const allMessages = lines.slice(0, 20); // Take up to 20 messages
        
        summary = `📊 Chat Summary (${messageCount} messages)\n\n`;
        summary += `Key Messages:\n`;
        
        allMessages.forEach((line, idx) => {
          const cleanLine = line.length > 100 ? line.slice(0, 100) + "..." : line;
          summary += `${idx + 1}. ${cleanLine}\n`;
        });
        
        if (messageCount > 20) {
          summary += `\n... and ${messageCount - 20} more messages`;
        }
      }
      // Note: API attribution removed for security - don't expose which API is being used

      return res.json({ text: summary });

    } catch (error) {
      console.error("AI Summarize Error:", error);
      // Return a friendly error instead of server error
      return res.json({ 
        text: "Sorry, summarization is temporarily unavailable. Please try again later." 
      });
    }
  });

  // Paragraph-based message summarizer
  app.post("/api/ai/paragraph-summarize", async (req, res) => {
    try {
      const { messages, chatId, userId } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ 
          error: 'Messages array is required and cannot be empty' 
        });
      }

      // Check if OpenAI service is available
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          error: 'Paragraph summarizer service not available. Please configure OPENAI_API_KEY.' 
        });
      }

      // Import the paragraph summary function
      const { generateParagraphSummary } = await import('./server/services/openaiService.js');
      
      // Generate paragraph summary
      const paragraphSummary = await generateParagraphSummary(messages);
      
      if (!paragraphSummary) {
        return res.status(500).json({ 
          error: 'Failed to generate paragraph summary' 
        });
      }

      res.json({ 
        summary: paragraphSummary,
        messageCount: messages.length,
        type: 'paragraph'
      });

    } catch (error) {
      console.error("Paragraph Summarize Error:", error);
      res.status(500).json({ 
        error: 'Failed to generate paragraph summary',
        message: error.message 
      });
    }
  });

  app.post("/api/ai/smart-replies", async (req, res) => {
    try {
      const { message } = req.body || {};
      if (!message || typeof message !== "string") {
        return res.json({ replies: ["OK", "Thanks", "Sure"] });
      }

      // Try Groq first (fastest and most reliable)
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
              messages: [
                {
                  role: "system",
                  content: "Return ONLY a JSON array of exactly 3 short reply strings (1–4 words each). Example format: [\"Thanks\",\"OK\",\"Sure\"]",
                },
                { role: "user", content: message.slice(0, 500) },
              ],
              temperature: 0.3,
              max_tokens: 100,
            }),
          });
          
          const data = await response.json();
          const text = data.choices[0]?.message?.content || '["OK","Thanks","Sure"]';
          let replies: string[] = [];
          try {
            replies = JSON.parse(text);
          } catch {
            replies = ["OK", "Thanks", "Sure"];
          }
          return res.json({ replies: Array.isArray(replies) ? replies.slice(0, 3) : ["OK", "Thanks", "Sure"] });
        } catch (groqError) {
          console.error("Groq smart-replies failed:", groqError.message);
        }
      }

      // Fallback to OpenAI
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && !openaiKey.includes('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')) {
        try {
          const openai = new OpenAI({ apiKey: openaiKey });
          const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "Return ONLY a JSON array of exactly 3 short reply strings (1–4 words each). Example format: [\"Thanks\",\"OK\",\"Sure\"]",
              },
              { role: "user", content: message.slice(0, 500) },
            ],
            temperature: 0.3,
            max_tokens: 100,
          });

          const text = response.choices[0]?.message?.content || '["OK","Thanks","Sure"]';
          let replies: string[] = [];
          try {
            replies = JSON.parse(text);
          } catch {
            replies = ["OK", "Thanks", "Sure"];
          }
          return res.json({ replies: Array.isArray(replies) ? replies.slice(0, 3) : ["OK", "Thanks", "Sure"] });
        } catch (openaiError) {
          console.error("OpenAI smart-replies failed:", openaiError.message);
        }
      }

      // Last resort: Gemini (if quota allows)
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `Return ONLY a JSON array of exactly 3 short reply strings (1–4 words each) to this message: "${message.slice(0, 500)}". Example format: ["Thanks","OK","Sure"]`,
          });
          let replies: string[] = [];
          try {
            const raw = (response.text || "").trim();
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            replies = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
          } catch {
            replies = ["OK", "Thanks", "Sure"];
          }
          return res.json({ replies: Array.isArray(replies) ? replies.slice(0, 3) : ["OK", "Thanks", "Sure"] });
        } catch (geminiError) {
          console.error("Gemini smart-replies failed:", geminiError.message);
        }
      }

      // No AI keys available or all failed
      return res.json({ replies: ["👍", "Got it", "Thanks"] });

    } catch (e) {
      console.error("smart-replies", e);
      res.json({ replies: ["OK", "Thanks", "Sure"] });
    }
  });

  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, targetLanguage = 'en', sourceLanguage = 'auto' } = req.body || {};
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Missing text" });
      }

      const normalizeLangCode = (code: string): string => {
        const c = (code || '').toLowerCase().trim();
        const aliases: Record<string, string> = {
          eng: 'en', english: 'en', hindi: 'hi', spanish: 'es', french: 'fr', german: 'de',
          italian: 'it', portuguese: 'pt', russian: 'ru', japanese: 'ja', korean: 'ko',
          chinese: 'zh', arabic: 'ar', turkish: 'tr', vietnamese: 'vi', thai: 'th',
          indonesian: 'id', tamil: 'ta', telugu: 'te', marathi: 'mr', bengali: 'bn',
          gujarati: 'gu', kannada: 'kn', malayalam: 'ml', punjabi: 'pa', urdu: 'ur',
          jp: 'ja', cn: 'zh', ch: 'zh', zhcn: 'zh', zhtw: 'zh', ua: 'uk'
        };
        return aliases[c] || c || 'auto';
      };

      const normalizedTarget = normalizeLangCode(typeof targetLanguage === 'string' && targetLanguage.trim() !== '' ? targetLanguage : 'en');
      const normalizedSource = normalizeLangCode(typeof sourceLanguage === 'string' && sourceLanguage.trim() !== '' ? sourceLanguage : 'auto');
      
      // Language code mapping for MyMemory API
      const langMapping: Record<string, string> = {
        en: 'en', hi: 'hi', es: 'es', fr: 'fr', de: 'de', it: 'it', pt: 'pt',
        ru: 'ru', ja: 'ja', ko: 'ko', zh: 'zh', ar: 'ar', tr: 'tr', vi: 'vi',
        th: 'th', id: 'id', ta: 'ta', te: 'te', mr: 'mr', bn: 'bn', gu: 'gu',
        kn: 'kn', ml: 'ml', pa: 'pa', ur: 'ur'
      };
      
      const languageNames: Record<string, string> = {
        en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', de: 'German',
        it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
        ko: 'Korean', zh: 'Chinese', ar: 'Arabic', tr: 'Turkish',
        vi: 'Vietnamese', th: 'Thai', id: 'Indonesian', ta: 'Tamil',
        te: 'Telugu', mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati',
        kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu',
        uk: 'Ukrainian'
      };

      const detectSourceForFallback = (input: string): string => {
        const s = (input || '').trim();
        if (!s) return 'en';
        
        // Check for Devanagari (Hindi/Marathi etc)
        if (/[ऀ-ॿ]/.test(s)) return 'hi';
        // Check for Arabic
        if (/[؀-ۿ]/.test(s)) return 'ar';
        // Check for CJK
        if (/[一-鿿]/.test(s)) return 'zh';
        // Check for Japanese Hiragana/Katakana
        if (/[ぁ-ヿ]/.test(s)) return 'ja';
        // Check for Korean Hangul
        if (/[가-힯]/.test(s)) return 'ko';

        // For Roman script, check for common Hindi words
        const lowerS = s.toLowerCase();
        const hindiWordPatterns = [
          'kya', 'kar', 'rahi', 'rahe', 'hai', 'ho', 'kaise', 'aap', 'tum', 'mein',
          'nahi', 'accha', 'theek', 'dhanyawad', 'shukriya', 'namaste', 'alvida',
          'maaf', 'bahut', 'achha', 'bura', 'kal', 'aaj', 'parson', 'kesi', 'kese',
          'kyun', 'kidhar', 'kahan', 'jab', 'tab', 'yahan', 'vahan', 'sath', 'saath',
          'liye', 'wala', 'wale', 'wali', 'bhi', 'toh', 'par', 'lekin', 'magar',
          'phir', 'fir', 'abhi', 'ab', 'pehle', 'badmein', 'jaldi', 'der', 'thik', 'hain', 'karti', 'kraha', 'haalchal', 'chaal', 'chal'
        ];
        
        const hindiWordCount = hindiWordPatterns.filter(word => lowerS.includes(word)).length;
        if (hindiWordCount >= 1) {
          return 'hi';
        }
        
        return 'en';
      };
const detectSourceForPrompt = (input: string): string => {
        const detected = detectSourceForFallback(input);
        if (['en', 'hi', 'ar', 'zh', 'ja', 'ko'].includes(detected)) {
          return detected;
        }
        return 'en';
      };

      const effectiveSource = normalizedSource !== 'auto' ? normalizedSource : detectSourceForPrompt(text);
      const targetName = languageNames[normalizedTarget] || normalizedTarget.toUpperCase();
      const sourceName = normalizedSource !== 'auto'
        ? languageNames[normalizedSource] || normalizedSource.toUpperCase()
        : (languageNames[effectiveSource] || 'detected');
      
      console.log('[Translate] START - Input:', { text: text.slice(0, 40), sourceLanguage, targetLanguage, normalizedSource, normalizedTarget, effectiveSource, sourceName, targetName });

      if (effectiveSource === normalizedTarget) {
        return res.json({ success: true, text: text.trim(), source: 'same', fallback: false, originalText: text.trim() });
      }

      // Translation function that tries all methods in sequence
      const tryTranslation = async (): Promise<{ success: boolean; text: string; source?: string }> => {
        // PRIMARY: Use server AI service (Gemini/OpenAI/GROQ fallback) for accurate translation
        try {
          const prompt = `Translate the following text from ${sourceName} to ${targetName}.
Return ONLY the translation (no quotes, no extra words, and no explanation).

TEXT:
${text.slice(0, 4000)}`;

          const translatedRaw = await aiService.generateWithFallback(prompt, 600, 0.1);
          let translatedText = translatedRaw?.trim();

          // Remove common unwanted prefixes/suffixes if model adds them
          translatedText = translatedText?.replace(/^["'`]+|["'`]+$/g, '');
          translatedText = translatedText?.replace(/^\s*(translation|translated)\s*[:\-]\s*/i, '');
          translatedText = translatedText?.replace(/\s+/g, ' ').trim();

          if (translatedText) {
            console.log("[Translate] AI SUCCESS:", sourceName, "→", targetName, ":", translatedText.slice(0, 50));
            return { success: true, text: translatedText, source: 'ai' };
          } else {
            console.log("[Translate] AI returned empty/null response");
          }
        } catch (aiErr: any) {
          console.log("[Translate] AI service failed:", aiErr?.message || aiErr);
        }

        // FALLBACK: Google public translate endpoint (no key, best-effort)
        try {
          const normalizeLangCode = (code: string): string => {
            const c = (code || '').toLowerCase().trim();
            const aliases: Record<string, string> = {
              jp: 'ja',
              cn: 'zh',
              ch: 'zh',
              zhcn: 'zh',
              zhtw: 'zh',
              ua: 'uk',
            };
            return aliases[c] || c || 'en';
          };

          const sl = normalizeLangCode(normalizedSource !== 'auto' ? normalizedSource : detectSourceForFallback(text));
          const tl = normalizeLangCode(normalizedTarget);

          const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text.slice(0, 2000))}`;
          console.log("[Translate] Trying Google gtx fallback...", { sl, tl });

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(gUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json,text/plain,*/*' },
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));

          if (resp.ok) {
            const data = await resp.json().catch(() => null);
            // Expected: [[["translated","original",...]],...]
            const translated = Array.isArray(data?.[0])
              ? data[0].map((chunk: any) => chunk?.[0]).filter(Boolean).join('')
              : '';

            const translatedText = (translated || '').trim();
            if (translatedText && translatedText.toLowerCase() !== text.toLowerCase()) {
              console.log("[Translate] Google gtx success:", sourceName, "→", targetName, ":", translatedText.slice(0, 50));
              return { success: true, text: translatedText, source: 'google-gtx' };
            } else if (!translatedText) {
              console.log("[Translate] Google gtx returned empty text");
            } else {
              console.log("[Translate] Google gtx returned same as input (case-insensitive)");
            }
          } else {
            console.log("[Translate] Google gtx HTTP error:", resp.status);
          }
        } catch (gtxErr: any) {
          console.log("[Translate] Google gtx failed:", gtxErr?.message || gtxErr);
        }

        // FALLBACK: Try MyMemory API (free, no key required)
        try {
          // MyMemory doesn't reliably support 'auto', so we guess a source when needed
          const guessedSource = normalizedSource !== 'auto' ? normalizedSource : detectSourceForFallback(text);
          const fromParam = `${guessedSource}|${normalizedTarget}`;
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${fromParam}`;
          
          console.log("[Translate] Trying MyMemory API fallback...", { guessedSource, normalizedTarget, langpair: fromParam, text: text.slice(0, 40) });
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));
          
          if (response.ok) {
            const data = await response.json();
            console.log("[Translate] MyMemory response:", { status: data.responseStatus, hasText: !!data.responseData?.translatedText });
            if (data.responseStatus === 200 && data.responseData?.translatedText) {
              const translatedText = data.responseData.translatedText;
              if (translatedText && translatedText.trim() !== '' && translatedText.toLowerCase() !== text.trim().toLowerCase()) {
                console.log("[Translate] MyMemory SUCCESS:", sourceName, "→", targetName, ":", translatedText.slice(0, 50));
                return { success: true, text: translatedText, source: 'mymemory' };
              } else {
                console.log("[Translate] MyMemory returned same/empty text");
              }
            } else {
              console.log("[Translate] MyMemory returned non-200 status or no text:", data.responseStatus);
            }
          } else {
            console.log("[Translate] MyMemory HTTP error:", response.status);
          }
        } catch (mymemoryError) {
          console.error("[Translate] MyMemory failed:", mymemoryError.message);
        }

        // Final fallback - return original text
        console.log("[Translate] FALLBACK: All services failed, returning original text unchanged");
        return { success: true, text: text, source: undefined };
      };

      // Try all translation methods
      const result = await tryTranslation();
      
      return res.json({ 
        success: result.success, 
        text: result.text, 
        source: result.source,
        fallback: !result.source,
        originalText: text.trim()
      });

    } catch (e) {
      console.error("translate", e);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  app.post("/api/ai/draw", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Missing prompt" });
      }

      // Try Gemini first
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `User wants a picture of: "${prompt.slice(0, 500)}". Reply with ONE short vivid paragraph describing the scene (we show this as text when inline image is not available).`,
          });

          return res.json({ imageUrl: null, textFallback: response.text || "" });
        } catch (geminiError) {
          console.error("Gemini draw failed:", geminiError.message);
        }
      }

      // Fallback to OpenAI
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        try {
          const openai = new OpenAI({ apiKey: openaiKey });
          const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "User wants a picture of something. Reply with ONE short vivid paragraph describing the scene.",
              },
              { role: "user", content: prompt.slice(0, 500) },
            ],
            temperature: 0.7,
            max_tokens: 200,
          });

          return res.json({ imageUrl: null, textFallback: response.choices[0]?.message?.content || "" });
        } catch (openaiError) {
          console.error("OpenAI draw failed:", openaiError.message);
        }
      }

      // No AI keys available
      return res.status(503).json({ message: "Set AI API key on the server for AI features. Add GEMINI_API_KEY or OPENAI_API_KEY in .env" });

    } catch (e) {
      console.error("draw", e);
      res.status(500).json({ message: "Image request failed" });
    }
  });

  // --- Friend Request Routes ---
  app.post("/api/friends/request", async (req, res) => {
    try {
      const { from, to } = req.body;
      const existingRequest = await FriendRequest.findOne({ from, to, status: 'pending' });
      if (existingRequest) return res.status(400).json({ message: "Request already sent" });
      
      const request = await FriendRequest.create({ from, to });
      const populatedRequest = await FriendRequest.findById(request._id).populate('from', '-password');
      io.to(to.toString()).emit("friend_request_received", populatedRequest);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ message: "Error sending friend request" });
    }
  });

  app.get("/api/friends/requests/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const requests = await FriendRequest.find({ to: userId, status: 'pending' }).populate('from', 'name pic email');
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Error fetching requests" });
    }
  });

  app.post("/api/friends/respond", async (req, res) => {
    try {
      const { requestId, status } = req.body;
      const request = await FriendRequest.findById(requestId);
      if (!request) return res.status(404).json({ message: "Request not found" });
      
      request.status = status;
      await request.save();

      if (status === 'accepted') {
        await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
        await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
        
        const userB = await User.findById(request.to);
        if (userB) {
          io.to(request.from.toString()).emit("friend_request_accepted", { from: userB.name, fromId: userB._id });
        }
      }
      res.json({ message: `Request ${status}` });
    } catch (error) {
      res.status(500).json({ message: "Error responding to request" });
    }
  });

  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).populate('friends', 'name pic email');
      res.json(user?.friends || []);
    } catch (error) {
      res.status(500).json({ message: "Error fetching friends" });
    }
  });

  app.get("/api/friends/sent/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const requests = await FriendRequest.find({ from: userId, status: 'pending' }).populate('to', 'name pic email');
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sent requests" });
    }
  });

  // Cancel Friend Request Route
  app.post("/api/friends/cancel", async (req, res) => {
    try {
      const { requestId } = req.body;
      
      if (useInMemory) {
        // In-memory storage - would need to implement in-memory friend requests
        return res.status(500).json({ message: "In-memory storage not implemented for friend requests" });
      }
      
      const request = await FriendRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      // Delete the friend request
      await FriendRequest.findByIdAndDelete(requestId);
      res.json({ message: "Friend request cancelled" });
    } catch (error) {
      res.status(500).json({ message: "Error cancelling friend request" });
    }
  });

  // Restore Friend Request Route  
  app.post("/api/friends/restore", async (req, res) => {
    try {
      const { requestId } = req.body;
      
      if (useInMemory) {
        return res.status(500).json({ message: "In-memory storage not implemented for friend requests" });
      }
      
      // Find the deleted request (this would require soft delete or storing cancelled requests separately)
      // For now, we'll create a new request with the same details
      // In a real implementation, you'd want to store cancelled requests separately
      
      res.status(400).json({ message: "Restore functionality not implemented - cancelled requests cannot be restored" });
    } catch (error) {
      res.status(500).json({ message: "Error restoring friend request" });
    }
  });

  // Remove Friend Route
  app.delete("/api/friends/:userId/:friendId", async (req, res) => {
    try {
      const { userId, friendId } = req.params;
      await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
      await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
      
      // Also delete messages between them? 
      // User said "uska sara data bhi fir nadikhe"
      const userA = await User.findById(userId);
      const userB = await User.findById(friendId);
      if (userA && userB) {
        await Message.deleteMany({
          $or: [
            { user: userA.name, to: userB.name },
            { user: userB.name, to: userA.name }
          ]
        });
      }
      
      res.json({ message: "Friend removed and conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error removing friend" });
    }
  });

  // Seed Sample Friends (John & Shreya) - for testing/demo purposes
  app.post("/api/friends/seed/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (useInMemory) {
        return res.status(500).json({ message: "Seed not available in in-memory mode" });
      }
      
      // Find the current user
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create sample friends if they don't exist
      const sampleFriends = [
        { name: "John", email: "john@example.com", pic: "https://ui-avatars.com/api/?name=John&background=random" },
        { name: "Shreya", email: "shreya@example.com", pic: "https://ui-avatars.com/api/?name=Shreya&background=random" }
      ];
      
      const createdFriends = [];
      
      for (const friendData of sampleFriends) {
        let friend = await User.findOne({ email: friendData.email });
        
        if (!friend) {
          friend = await User.create({
            name: friendData.name,
            email: friendData.email,
            pic: friendData.pic,
            password: Math.random().toString(36).substr(2, 10), // Random password
            isGoogleAuth: false
          });
        }
        
        // Add to friends list if not already friends
        if (!currentUser.friends.includes(friend._id)) {
          currentUser.friends.push(friend._id);
          
          // Add current user to friend's list too (mutual friendship)
          if (!friend.friends.includes(currentUser._id)) {
            friend.friends.push(currentUser._id);
            await friend.save();
          }
        }
        
        createdFriends.push(friend);
      }
      
      await currentUser.save();
      
      // Create some sample messages between users
      const sampleMessages = [
        { text: "Hey! How are you? 👋", from: currentUser.name, to: createdFriends[0].name },
        { text: "I'm good! Long time no see!", from: createdFriends[0].name, to: currentUser.name },
        { text: "We should catch up soon! ☕", from: currentUser.name, to: createdFriends[0].name },
        { text: "Hi there! 😊", from: currentUser.name, to: createdFriends[1].name },
        { text: "Hello! Nice to hear from you!", from: createdFriends[1].name, to: currentUser.name }
      ];
      
      for (const msgData of sampleMessages) {
        const existingMsg = await Message.findOne({
          text: msgData.text,
          user: msgData.from,
          to: msgData.to
        });
        
        if (!existingMsg) {
          await Message.create({
            id: Math.random().toString(36).substr(2, 15),
            user: msgData.from,
            senderId: msgData.from === currentUser.name ? currentUser._id : 
                      (msgData.to === createdFriends[0].name ? createdFriends[0]._id : createdFriends[1]._id),
            to: msgData.to,
            text: msgData.text,
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(), // Random time in last week
            profilePic: msgData.from === currentUser.name ? currentUser.pic : 
                       (msgData.from === "John" ? createdFriends[0].pic : createdFriends[1].pic),
            reactions: {}
          });
        }
      }
      
      res.json({ 
        message: "Sample friends created successfully", 
        friends: createdFriends.map(f => ({ _id: f._id, name: f.name, email: f.email, pic: f.pic })),
        note: "Chat history with John and Shreya has been created"
      });
    } catch (error) {
      console.error("Seed friends error:", error);
      res.status(500).json({ message: "Error seeding sample friends" });
    }
  });

  // Profile Picture Upload Route
  app.post("/api/upload-profile", async (req, res) => {
    try {
      // For now, just return success without file upload
      // The client-side will handle the base64 conversion and localStorage
      const { userId, profilePic } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "User ID is required" 
        });
      }
      
      // If profilePic is provided (base64), update user in database
      if (profilePic && !useInMemory && mongoose.Types.ObjectId.isValid(userId)) {
        await User.findByIdAndUpdate(userId, { pic: profilePic });
      }
      
      res.json({ 
        success: true, 
        url: profilePic || null,
        message: "Profile picture updated successfully" 
      });
    } catch (error) {
      console.error('Profile upload error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update profile picture" 
      });
    }
  });

  // Socket event for profile picture updates
  io.on('connection', (socket) => {
    socket.on('profile_pic_updated', (data) => {
      const { userId, profilePic, userName } = data;
      console.log(`👤 Profile picture updated for ${userName}`);
      
      // Broadcast to all connected users
      socket.broadcast.emit('user_profile_updated', {
        userId,
        userName,
        profilePic
      });
    });
    
    // Call tracking events
    socket.on('call_initiated', (data) => {
      const { fromUserId, fromUserName, toUserId, toUserName, callType, timestamp } = data;
      console.log(`📞 Call initiated: ${fromUserName} -> ${toUserName} (${callType})`);
      
      // Notify the receiver about the incoming call - use io.to for guaranteed delivery
      io.to(toUserId).emit('incoming_call_notification', {
        from: fromUserName,
        fromUserId,
        type: callType,
        timestamp
      });
      
      // Also broadcast to all sockets except sender as fallback
      socket.broadcast.emit('incoming_call_notification', {
        from: fromUserName,
        fromUserId,
        type: callType,
        timestamp,
        targetUserId: toUserId // Include target to filter on client side
      });
    });
    
    socket.on('call_accepted', (data) => {
      const { fromUserId, fromUserName, toUserId, toUserName, callType, timestamp } = data;
      console.log(`📞 Call accepted: ${fromUserName} <-> ${toUserName} (${callType})`);
      
      // Both users get the call in their received/outgoing history
      io.to(fromUserId).emit('call_history_update', {
        type: 'outgoing',
        to: toUserName,
        callType,
        timestamp,
        duration: 0 // Will be updated when call ends
      });
      
      io.to(toUserId).emit('call_history_update', {
        type: 'received',
        from: fromUserName,
        callType,
        timestamp,
        duration: 0 // Will be updated when call ends
      });
    });
    
    socket.on('call_missed', (data) => {
      const { fromUserId, fromUserName, toUserId, toUserName, callType, timestamp } = data;
      
      // Create unique key for this call event (within 5 minute window for better deduplication)
      const callKey = `${fromUserId}_${toUserId}_${callType}_${Math.floor(timestamp / 300000)}`;
      
      // Skip if already processed
      if (processedCallEvents.has(callKey)) {
        console.log(`📞 Duplicate call_missed ignored: ${fromUserName} -> ${toUserName}`);
        return;
      }
      
      // Mark as processed
      processedCallEvents.add(callKey);
      
      // Also mark the reverse key to prevent duplicates from other sources
      const reverseKey = `${toUserId}_${fromUserId}_${callType}_${Math.floor(timestamp / 300000)}`;
      processedCallEvents.add(reverseKey);
      
      // Cleanup old entries (keep last 1000 entries)
      if (processedCallEvents.size > 1000) {
        const entries = Array.from(processedCallEvents).slice(-500);
        processedCallEvents.clear();
        entries.forEach(e => processedCallEvents.add(e));
      }
      
      console.log(`📞 Call missed: ${fromUserName} -> ${toUserName} (${callType})`);
      
      // First, immediately notify receiver to clear their incoming call UI and stop auto-reject timer
      io.to(toUserId).emit('caller_cancelled', {
        fromUserId,
        fromUserName,
        callType,
        timestamp
      });
      
      // Add to caller's outgoing history as missed (for their records)
      io.to(fromUserId).emit('call_history_update', {
        type: 'outgoing',
        to: toUserName,
        callType,
        timestamp
      });
      
      // Add to receiver's missed calls (they missed the call)
      io.to(toUserId).emit('call_history_update', {
        type: 'missed',
        from: fromUserName,
        callType,
        timestamp
      });
    });
    
    socket.on('call_auto_rejected', (data) => {
      const { fromUserId, toUserId, fromUserName, toUserName, callType, timestamp } = data;
      console.log(`📞 Call auto-rejected (timeout): ${fromUserName} missed call from ${toUserName}`);

      // Create unique key for deduplication (same 5-minute window as call_missed)
      const callKey = `${toUserId}_${fromUserId}_${callType}_${Math.floor(timestamp / 300000)}`;

      if (processedCallEvents.has(callKey)) {
        console.log(`📞 Duplicate auto-reject ignored`);
        return;
      }
      processedCallEvents.add(callKey);
      
      // Also add reverse key to prevent duplicates
      const reverseKey = `${fromUserId}_${toUserId}_${callType}_${Math.floor(timestamp / 300000)}`;
      processedCallEvents.add(reverseKey);

      // Notify the receiver (who missed the call) - use toUserName as the caller's name
      io.to(fromUserId).emit('call_history_update', {
        type: 'missed',
        from: toUserName || 'Unknown',
        callType,
        timestamp
      });

      // Notify caller that their call was not answered
      io.to(toUserId).emit('call_not_answered', {
        toUserId: fromUserId,
        toUserName: fromUserName,
        callType,
        timestamp
      });
    });
    
    socket.on('call_rejected', (data) => {
      const { fromUserId, fromUserName, toUserId, toUserName, callType, timestamp } = data;
      console.log(`📞 Call rejected: ${toUserName} rejected ${fromUserName}'s ${callType} call`);
      
      // Notify the caller that call was rejected
      io.to(fromUserId).emit('call_rejected', {
        fromUserName: toUserName,
        callType,
        timestamp
      });
      
      // Also emit call_ended to both sides to ensure call UI closes
      io.to(fromUserId).emit('call_ended', {
        fromUserName: toUserName,
        fromUserId: toUserId,
        reason: 'rejected'
      });
      
      io.to(toUserId).emit('call_ended', {
        fromUserName: fromUserName,
        fromUserId: fromUserId,
        reason: 'rejected'
      });
    });
    
    socket.on('call_ended', (data) => {
      const { fromUserId, fromUserName, toUserId, toUserName, callType, startTime, endTime } = data;
      const duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
      
      console.log(`📞 Call ended: ${fromUserName} <-> ${toUserName} (${callType}) - ${duration}s`);
      
      // Notify both users that call ended
      io.to(fromUserId).emit('call_ended', {
        fromUserName: toUserName,
        fromUserId: toUserId,
        reason: 'ended'
      });
      
      io.to(toUserId).emit('call_ended', {
        fromUserName: fromUserName,
        fromUserId: fromUserId,
        reason: 'ended'
      });
      
      // Update call history with duration for both users
      io.to(fromUserId).emit('call_duration_update', {
        to: toUserName,
        callType,
        startTime,
        duration
      });
      
      io.to(toUserId).emit('call_duration_update', {
        from: fromUserName,
        callType,
        startTime,
        duration
      });
    });
  });

  // Socket.io Setup (Merging user's logic)
  const onlineUserIds = new Set<string>();
  const socketIdToUserId = new Map<string, string>();
  const onlineUsers = new Map<string, any>(); // Map of userId to user data

  const broadcastOnline = async () => {
    try {
      const ids = Array.from(onlineUserIds);
      console.log(`📡 Broadcasting online status for ${ids.length} users:`, ids);
      
      if (ids.length === 0) {
        io.emit("user_status_change", []);
        return;
      }

      let mapped = [];
      
      if (useInMemory) {
        // Use in-memory users for broadcasting
        mapped = inMemoryUsers
          .filter(user => onlineUserIds.has(user._id.toString()))
          .map(user => ({
            _id: user._id.toString(),
            name: user.name,
            pic: user.pic,
            email: user.email,
            isOnline: true,
            lastSeen: new Date()
          }));
      } else {
        // Use MongoDB users - include ALL online users, not just valid ObjectIds
        // Some users may have non-ObjectId IDs (e.g., Google Auth users)
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
        
        // Get users with valid MongoDB ObjectIds
        if (validIds.length > 0) {
          const users = await User.find({ _id: { $in: validIds } }, { password: 0 }).select("_id name pic email lastSeen");
          mapped = users.map((u: any) => ({
            _id: u._id.toString(),
            name: u.name,
            pic: u.pic,
            email: u.email,
            isOnline: true,
            lastSeen: u.lastSeen || new Date()
          }));
        }
        
        // Also find users with non-ObjectId IDs (e.g., Google Auth with custom IDs)
        if (invalidIds.length > 0) {
          const nonObjectIdUsers = await User.find({ _id: { $in: invalidIds } }, { password: 0 }).select("_id name pic email lastSeen");
          const nonObjectIdMapped = nonObjectIdUsers.map((u: any) => ({
            _id: u._id.toString(),
            name: u.name,
            pic: u.pic,
            email: u.email,
            isOnline: true,
            lastSeen: u.lastSeen || new Date()
          }));
          mapped = [...mapped, ...nonObjectIdMapped];
        }
      }
      
      // Debug: Check if any online users weren't found in database
      const foundIds = new Set(mapped.map(u => u._id.toString()));
      const notFoundIds = ids.filter(id => !foundIds.has(id.toString()));
      if (notFoundIds.length > 0) {
        console.log(`⚠️ Users in onlineUserIds but not found in DB:`, notFoundIds);
      }
      
      console.log(`📤 Broadcasting ${mapped.length} online users:`, mapped.map(u => u.name));
      io.emit("user_status_change", mapped);
    } catch (e) {
      console.error("broadcastOnline error:", e);
    }
  };

  io.on("connection", (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    console.log('🔌 Server ready to receive setup events');
    let currentUserId: string | null = null;

    socket.on("setup", async (userData) => {
      console.log(`📥 Setup event received from ${socket.id}:`, userData?.name, userData?._id);
      console.log(`📥 Full user data:`, JSON.stringify(userData, null, 2));
      if (userData && userData._id) {
        try {
          const uid = userData._id.toString();
          currentUserId = uid;
          socket.join(uid);
          socketIdToUserId.set(socket.id, uid);
          onlineUserIds.add(uid);
          console.log(`📥 Adding user to onlineUsers map: ${userData.name} (${uid})`);
          onlineUsers.set(uid, { _id: uid, name: userData.name, pic: userData.pic, email: userData.email });
        
        // Handle multiple devices for same user
        const existingSockets = Array.from(io.sockets.sockets.values())
          .filter(s => s.id !== socket.id && socketIdToUserId.get(s.id) === uid);
        
        console.log(`👤 User setup: ${userData.name} (${uid})`);
        console.log(`📱 Active devices for user: ${existingSockets.length + 1}`);
        console.log(`📡 Current online users after setup: ${Array.from(onlineUserIds)}`);
        console.log(`📡 Online users map contents:`, Array.from(onlineUsers.entries()).map(([id, user]) => ({ id, name: user.name })));
        
        // Update user's online status in database
        try {
          // Only update MongoDB if we're not in in-memory mode and the ID is valid ObjectId
          if (!useInMemory && mongoose.Types.ObjectId.isValid(uid)) {
            await User.findByIdAndUpdate(uid, { 
              isOnline: true,
              lastSeen: new Date()
            });
          }
        } catch (error) {
          console.error("Error updating user online status:", error);
        }
        
        socket.emit("connected");
        
        // Enhanced: Immediate broadcast of online users
        await broadcastOnline();
        
        // Enhanced: Sync messages across all devices for this user
        try {
          const recentMessages = await Message.find({
            $or: [
              { user: userData.name },
              { to: userData.name }
            ]
          }).sort({ createdAt: -1 }).limit(50).lean();

          // Filter scheduled messages: only show to sender, hide from receiver until scheduled time
          const filteredMessages = recentMessages.filter((msg: any) => {
            // If message is not scheduled, show it
            if (!msg.isScheduled || msg.status !== 'scheduled') {
              return true;
            }
            // If message is scheduled, only show to the sender
            const msgSenderId = msg.senderId ? msg.senderId.toString() : '';
            const currentUserId = userData._id ? userData._id.toString() : '';
            return msgSenderId === currentUserId;
          });

          // Convert to plain serializable objects to avoid circular reference issues
          const cleanMessages = filteredMessages.reverse().map(msg => ({
            ...msg,
            _id: msg._id?.toString(),
            senderId: msg.senderId?.toString(),
            groupId: msg.groupId?.toString(),
            readBy: msg.readBy?.map((rb: any) => ({
              userId: rb.userId?.toString(),
              readAt: rb.readAt?.toISOString?.() || rb.readAt
            })) || [],
            deliveredAt: msg.deliveredAt?.toISOString?.() || msg.deliveredAt,
            readAt: msg.readAt?.toISOString?.() || msg.readAt,
            createdAt: msg.createdAt?.toISOString?.() || msg.createdAt,
            updatedAt: msg.updatedAt?.toISOString?.() || msg.updatedAt
          }));

          // Send recent messages to newly connected device
          socket.emit("message_sync", cleanMessages);
        } catch (error) {
          console.error("Error syncing messages:", error);
        }
        } catch (e) {
          console.error("❌ Setup error:", e);
        }
      } else {
        console.log(`❌ Setup rejected from ${socket.id} - no user data provided`);
      }
    });

    // Enhanced: Get online users on demand
    socket.on("get_online_users", async () => {
      try {
        const ids = Array.from(onlineUserIds);
        console.log(`📡 get_online_users request from ${socket.id}: ${ids.length} users in onlineUserIds:`, ids);
        
        if (ids.length === 0) {
          socket.emit("online_users", []);
          return;
        }

        let mapped = [];
        
        if (useInMemory) {
          mapped = inMemoryUsers
            .filter(user => onlineUserIds.has(user._id.toString()))
            .map(user => ({
              _id: user._id.toString(),
              name: user.name,
              pic: user.pic,
              email: user.email,
              isOnline: true,
              lastSeen: new Date()
            }));
        } else {
          // Include ALL online users, not just valid ObjectIds
          const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
          const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
          
          // Get users with valid MongoDB ObjectIds
          if (validIds.length > 0) {
            const users = await User.find({ _id: { $in: validIds } }, { password: 0 }).select("_id name pic email lastSeen");
            mapped = users.map((u: any) => ({
              _id: u._id.toString(),
              name: u.name,
              pic: u.pic,
              email: u.email,
              isOnline: true,
              lastSeen: u.lastSeen || new Date()
            }));
          }
          
          // Also find users with non-ObjectId IDs
          if (invalidIds.length > 0) {
            const nonObjectIdUsers = await User.find({ _id: { $in: invalidIds } }, { password: 0 }).select("_id name pic email lastSeen");
            const nonObjectIdMapped = nonObjectIdUsers.map((u: any) => ({
              _id: u._id.toString(),
              name: u.name,
              pic: u.pic,
              email: u.email,
              isOnline: true,
              lastSeen: u.lastSeen || new Date()
            }));
            mapped = [...mapped, ...nonObjectIdMapped];
          }
        }
        
        // Debug: Check if any users weren't found
        const foundIds = new Set(mapped.map(u => u._id?.toString()));
        const notFoundIds = ids.filter(id => !foundIds.has(id.toString()));
        if (notFoundIds.length > 0) {
          console.log(`⚠️ get_online_users - IDs not found in DB:`, notFoundIds);
        }
        
        console.log(`📤 Sending ${mapped.length} online users to socket ${socket.id}:`, mapped.map(u => u.name));
        socket.emit("online_users", mapped);
      } catch (e) {
        console.error("get_online_users error:", e);
        socket.emit("online_users", []);
      }
    });

    socket.on("join chat", (room) => {
      socket.join(room);
      console.log("User Joined Room: " + room);
    });

    socket.on("typing", (data: { room: string, userName: string, userId: string }) => {
      if (!data?.room || !data?.userId) {
        console.warn(`⚠️ Invalid typing data:`, data);
        return;
      }
      console.log(`⌨️ ${data.userName} is typing in room: ${data.room}`);
      socket.to(data.room).emit("user_typing", {
        userId: data.userId,
        userName: data.userName,
        room: data.room
      });
    });

    socket.on("stop typing", (data: { room: string, userId: string }) => {
      if (!data?.room || !data?.userId) {
        console.warn(`⚠️ Invalid stop typing data:`, data);
        return;
      }
      console.log(`⏹️ User ${data.userId} stopped typing in room: ${data.room}`);
      socket.to(data.room).emit("user_stopped_typing", {
        userId: data.userId
      });
    });

    socket.on("join_room", (data: { room: string }) => {
      if (!data?.room) {
        console.warn(`⚠️ Invalid join_room data:`, data);
        return;
      }
      console.log(`📱 Socket ${socket.id} joining room: ${data.room}`);
      socket.join(data.room);
      socket.emit("room_joined", { room: data.room });
    });

    socket.on("new message", async (newMessageReceived) => {
      console.log("📨 Server received new message:", newMessageReceived.to, "from:", newMessageReceived.sender?.name);
      
      // CRITICAL: Don't broadcast scheduled messages immediately
      // They will be sent by the scheduler at the scheduled time
      if (newMessageReceived.isScheduled || newMessageReceived.scheduledTime) {
        console.log("📅 Scheduled message received via socket - skipping immediate broadcast");
        return;
      }

      const chat = newMessageReceived.chat;
      const groupId = newMessageReceived.groupId;
      
      // Handle different message formats
      const messageData = {
        id: newMessageReceived.id,
        user: newMessageReceived.sender?.name || newMessageReceived.user,
        senderId: newMessageReceived.sender?._id || newMessageReceived.senderId,
        to: newMessageReceived.to,
        groupId: groupId,
        text: newMessageReceived.content || newMessageReceived.text,
        originalText: newMessageReceived.originalText,
        image: newMessageReceived.image,
        video: newMessageReceived.video,
        audio: newMessageReceived.audio,
        timestamp: newMessageReceived.timestamp || new Date().toISOString(),
        profilePic: newMessageReceived.sender?.pic || newMessageReceived.profilePic,
        isGhost: newMessageReceived.isGhost,
        isAI: newMessageReceived.isAI,
        isSystem: newMessageReceived.isSystem,
        isBlind: newMessageReceived.isBlind,
        reelId: newMessageReceived.reelId,
        reelData: newMessageReceived.reelData,
        isForwarded: newMessageReceived.isForwarded || false,
        forwardedFrom: newMessageReceived.forwardedFrom,
        originalMessageId: newMessageReceived.originalMessageId,
        reactions: {},
        deliveryStatus: 'delivered',
        deliveredAt: new Date()
      };
      
      // BROADCAST IMMEDIATELY for real-time performance (don't wait for DB)
      // This ensures messages appear instantly in the chat
      
      // Broadcast message to appropriate recipients
      if (groupId) {
        console.log("📢 Broadcasting to group:", groupId);
        // Use io.to() to broadcast to ALL sockets in the group (including all user devices)
        io.to(String(groupId)).emit("message received", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
        io.to(String(groupId)).emit("receive_message", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
        
        // Notify sender of delivery
        socket.emit("message_delivered", { messageId: newMessageReceived.id, groupId, deliveredAt: new Date() });
        return;
      }

      // Handle private messages
      if (newMessageReceived.to && newMessageReceived.to !== 'My Assistant' && newMessageReceived.to !== 'Global Chat') {
        console.log("📢 Broadcasting private message to:", newMessageReceived.to);
        console.log("📢 Full message data:", JSON.stringify(newMessageReceived, null, 2));
        
        // Get sender ID
        const senderId = newMessageReceived.sender?._id || newMessageReceived.senderId;
        console.log("📢 Sender ID:", senderId);
        
        // Try to get recipient ID from message data first (more reliable)
        let recipientId = newMessageReceived.recipientId || newMessageReceived.toUserId;
        console.log("📢 Recipient ID from message data:", recipientId);
        
        // If no recipientId provided, try to find by name
        if (!recipientId && !useInMemory) {
          try {
            console.log("📢 Looking up recipient by name:", newMessageReceived.to);
            const recipient = await User.findOne({ name: newMessageReceived.to });
            console.log("📢 Found recipient:", recipient);
            if (recipient) {
              recipientId = String(recipient._id);
            }
          } catch (error) {
            console.error("Error finding recipient by name:", error);
          }
        }
        
        // In memory mode, try to get recipient from in-memory users
        if (!recipientId && useInMemory) {
          console.log("📢 In-memory mode - looking up recipient:", newMessageReceived.to);
          console.log("📢 Available online users:", Array.from(onlineUsers.values()).map(u => ({ name: u.name, id: u._id })));
          const recipient = Array.from(onlineUsers.values()).find(u => u.name === newMessageReceived.to);
          if (recipient) {
            recipientId = String(recipient._id);
            console.log("📢 Found recipient in online users:", recipient);
          } else {
            console.log("⚠️ Recipient not found in online users, checking all users...");
            // Also check the socketIdToUserId map
            const recipientBySocketId = socketIdToUserId.get(Array.from(socketIdToUserId.entries()).find(([socketId, userId]) => userId === recipientId)?.[0]);
            if (recipientBySocketId) {
              console.log("📢 Found recipient via socket mapping:", recipientBySocketId);
              recipientId = recipientId;
            }
          }
        }
        
        // Emit to recipient if we have their ID
        if (recipientId) {
          console.log("📢 Emitting to recipient room:", recipientId);
          io.to(String(recipientId)).emit("message received", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
          io.to(String(recipientId)).emit("receive_message", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
          console.log("✅ Message sent to recipient:", recipientId);
        } else {
          console.log("⚠️ No recipient ID found for:", newMessageReceived.to);
          console.log("⚠️ Available online users:", Array.from(onlineUsers.values()).map(u => ({ name: u.name, id: u._id })));
        }
        
        // ALWAYS emit back to sender so they see their message immediately
        if (senderId) {
          console.log("📢 Emitting back to sender room:", senderId);
          io.to(String(senderId)).emit("message received", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
          io.to(String(senderId)).emit("receive_message", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
        }
        
        // Notify sender of delivery
        socket.emit("message_delivered", { messageId: newMessageReceived.id, to: recipientId, deliveredAt: new Date() });
        return;
      }

      // Global chat broadcast
      console.log("📢 Broadcasting to global chat");
      
      // Check if ghost message is already expired
      if (newMessageReceived.isGhost) {
        const now = Date.now();
        const messageAge = (now - new Date(newMessageReceived.timestamp).getTime()) / 1000;
        if (messageAge >= 60) {
          console.log(`\ud83d\udc7b Ghost message ${newMessageReceived.id} already expired (${Math.floor(messageAge)}s old) - NOT BROADCASTING`);
          return;
        }
      }
      
      io.emit("message received", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
      io.emit("receive_message", { ...newMessageReceived, deliveryStatus: 'delivered', deliveredAt: new Date() });
      
      // Notify sender of delivery to all
      socket.emit("message_delivered", { messageId: newMessageReceived.id, deliveredAt: new Date() });
      socket.join(groupId);
      console.log("User Joined Group: " + groupId);
    });

    // Support for the "Quantum" UI events if they differ
    socket.on("send_message", async (data: any) => {
      // CRITICAL: Don't broadcast scheduled messages immediately
      if (data.isScheduled || data.scheduledTime) {
        console.log("📅 Scheduled message received via send_message - skipping broadcast");
        return;
      }

      try {
        const savedMessage = await Message.create({
          id: data.id || Math.random().toString(36).substr(2, 9),
          user: data.user,
          to: data.to,
          groupId: data.groupId,
          text: data.text,
          image: data.image,
          video: data.video,
          audio: data.audio,
          timestamp: data.timestamp || new Date().toISOString(),
          profilePic: data.profilePic,
          isGhost: data.isGhost,
          isAI: data.isAI,
          isSystem: data.isSystem,
          reactions: data.reactions || {}
        });
        
        if (data.isGhost) {
          console.log(`\ud83d\udc7b Ghost message saved to DB via send_message: ${savedMessage.id}`);
        }
      } catch (err) {
        console.error("Error saving message to MongoDB:", err);
      }
      // Targeted delivery — avoid broadcasting every chat to every socket
      if (data.groupId) {
        io.to(String(data.groupId)).emit("receive_message", data);
        return;
      }
      if (data.to) {
        try {
          const recipient = await User.findOne({ name: data.to });
          if (recipient) {
            io.to(recipient._id.toString()).emit("receive_message", data);
          }
        } catch (e) {
          console.error("send_message target lookup:", e);
        }
        return;
      }
      io.emit("receive_message", data);
    });

    // Message Reactions
    socket.on("add_reaction", async ({ messageId, emoji, username }) => {
      try {
        const message = await Message.findOne({ id: messageId });
        if (message) {
          const reactions = message.reactions || {};
          if (!reactions[emoji]) reactions[emoji] = [];
          
          const userIndex = reactions[emoji].indexOf(username);
          if (userIndex > -1) {
            reactions[emoji].splice(userIndex, 1);
          } else {
            reactions[emoji].push(username);
          }

          await Message.updateOne({ id: messageId }, { $set: { reactions } });
          io.emit("reaction_updated", { messageId, reactions });
        }
      } catch (err) {
        console.error("Error updating reaction in MongoDB:", err);
      }
    });

    // WebRTC Signaling — prefer user rooms so multiple clients don't cross-talk
    socket.on("offer", (data: any) => {
      console.log(`📞 Call Offer from ${data.from} (${data.type})`);
      
      // Track call initiation for missed call detection
      const callData = {
        fromUserId: data.fromUserId,
        fromUserName: data.from,
        toUserId: data.toUserId,
        toUserName: data.to || 'Unknown',
        callType: data.type,
        timestamp: Date.now()
      };
      
      // Notify receiver about call initiation
      if (data.toUserId) {
        io.to(String(data.toUserId)).emit("offer", data);
        // Also emit call_initiated to receiver for tracking
        io.to(String(data.toUserId)).emit("call_initiated", callData);
      } else {
        // Fallback: broadcast with targetUserId for client-side filtering
        socket.broadcast.emit("offer", { ...data, targetUserId: data.toUserId });
        socket.broadcast.emit("call_initiated", callData);
      }
    });

    socket.on("answer", (data: any) => {
      console.log(`📞 Call Answer to ${data.toUserId || data.to}`);
      if (data.toUserId) {
        io.to(String(data.toUserId)).emit("answer", data);
      } else {
        socket.broadcast.emit("answer", data);
      }
    });

    socket.on("ice-candidate", (data: any) => {
      if (data.toUserId) {
        io.to(String(data.toUserId)).emit("ice-candidate", data);
      } else {
        socket.broadcast.emit("ice-candidate", data);
      }
    });

    // Call subtitle broadcast (real-time translation)
    socket.on("call_subtitle", (data: { toUserId: string, subtitle: any }) => {
      if (data.toUserId) {
        io.to(String(data.toUserId)).emit("call_subtitle", {
          subtitle: data.subtitle,
          fromUserId: socket.id
        });
      }
    });

    socket.on("end_call", (data?: { toUserId?: string, fromUserId?: string, fromUserName?: string }) => {
      console.log("📞 Call Ended by", data?.fromUserName || 'Unknown');
      
      // Notify the other user that call ended
      if (data?.toUserId) {
        io.to(String(data.toUserId)).emit("call_ended", { 
          fromUserName: data?.fromUserName,
          fromUserId: data?.fromUserId,
          reason: 'ended'
        });
      } else {
        socket.broadcast.emit("call_ended", { 
          fromUserName: data?.fromUserName,
          fromUserId: data?.fromUserId,
          reason: 'ended'
        });
      }
      
      // Also notify the sender that their end_call was processed
      if (data?.fromUserId) {
        io.to(String(data.fromUserId)).emit("call_ended_confirmed", {
          toUserId: data?.toUserId,
          timestamp: Date.now()
        });
      }
    });

    // Edit Message
    socket.on("edit_message", async (editedMsg) => {
      if (mongoose.connection.readyState === 1) {
        try {
          await Message.updateOne(
            { id: editedMsg.id },
            { $set: { text: editedMsg.text, isEdited: true, editedAt: editedMsg.editedAt } }
          );
          socket.broadcast.emit("message_edited", editedMsg);
        } catch (err: any) {
          console.error("Error editing message in MongoDB:", err.message);
        }
      } else {
        socket.broadcast.emit("message_edited", editedMsg); // Still broadcast even if DB fails
      }
    });

    // Delete Message
    socket.on("delete_for_me", async ({ id, userId }) => {
      console.log(`🗑️ Deleting message for me: ${id} by ${userId}`);
      if (mongoose.connection.readyState === 1) {
        try {
          await Message.updateOne(
            { id },
            { $addToSet: { deletedFor: userId } }
          );
          // Only emit back to the user who deleted it
          socket.emit("message_deleted_for_me", { id, userId });
        } catch (err: any) {
          console.error("Error deleting message for me in MongoDB:", err.message);
        }
      }
    });

    socket.on("delete_for_everyone", async ({ id }) => {
      console.log(`🗑️ Deleting message for everyone: ${id}`);
      if (mongoose.connection.readyState === 1) {
        try {
          await Message.updateOne(
            { id },
            { $set: { isDeleted: true, text: "🚫 This message was deleted" } }
          );
          io.emit("message_deleted_for_everyone", { id });
        } catch (err: any) {
          console.error("Error deleting message for everyone in MongoDB:", err.message);
        }
      } else {
        io.emit("message_deleted_for_everyone", { id });
      }
    });

    socket.on("delete_message", async ({ id }) => {
      console.log(`🗑️ Deleting message: ${id}`);
      if (mongoose.connection.readyState === 1) {
        try {
          const result = await Message.updateOne(
            { id },
            { $set: { isDeleted: true, text: "🚫 This message was deleted" } }
          );
          console.log(`🗑️ Delete result: ${JSON.stringify(result)}`);
          io.emit("message_deleted", { id });
        } catch (err: any) {
          console.error("Error deleting message in MongoDB:", err.message);
        }
      } else {
        io.emit("message_deleted", { id }); // Still broadcast even if DB fails
      }
    });

    // Ghost Message Auto-Deletion (60 seconds = 1 minute)
    socket.on("delete_ghost_message", async ({ messageId, timestamp }) => {
      console.log(`\ud83d\udc7b Deleting ghost message: ${messageId} after 60 seconds`);
      if (mongoose.connection.readyState === 1) {
        try {
          // Delete from database
          await Message.deleteOne({ id: messageId, isGhost: true });
          // Broadcast to all clients to remove the message
          io.emit("ghost_message_deleted", { messageId, timestamp });
        } catch (err: any) {
          console.error("Error deleting ghost message in MongoDB:", err.message);
        }
      } else {
        // Still broadcast even if DB fails
        io.emit("ghost_message_deleted", { messageId, timestamp });
      }
    });

    // Delete All Messages (Socket)
    socket.on("delete_all_messages", async () => {
      try {
        await Message.deleteMany({});
        io.emit("all_messages_deleted");
      } catch (err) {
        console.error("Error deleting all messages:", err);
      }
    });

    // Read Receipt Handler
    socket.on("mark_message_read", async ({ messageId, userId }) => {
      console.log(`📖 Marking message ${messageId} as read by user ${userId}`);
      
      try {
        if (mongoose.connection.readyState === 1) {
          // Update in database
          await Message.updateOne(
            { id: messageId },
            { 
              $set: { 
                deliveryStatus: 'read', 
                readAt: new Date() 
              },
              $addToSet: { readBy: userId }
            }
          );
        }

        // Find the message to get sender info
        const message = await Message.findOne({ id: messageId });
        if (message) {
          // Notify the original sender that their message was read
          io.to(String(message.senderId)).emit("message_read", {
            messageId,
            readBy: userId,
            readAt: new Date()
          });
        }

        // Broadcast read status to all participants in group/chat
        socket.broadcast.emit("message_status_updated", {
          messageId,
          status: 'read',
          readBy: userId,
          readAt: new Date()
        });

      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // Share reel to friends and groups
    socket.on("share_reel_to_friends_and_groups", async (shareData) => {
      // If modular reels socket is active, don't run legacy logic (prevents duplicates + double DB writes).
      // If modular init failed, we still want reel sharing to work.
      if ((io as any).modularReelsEnabled) return;
      console.log("?? Sharing reel to friends and groups:", shareData);
      console.log("Friends array:", shareData.friends);
      console.log("Groups array:", shareData.groups);
      
      try {
        const { from, fromId, reelId, caption, mediaUrl, mediaType, friends, groups } = shareData;
        
        // Create message content for sharing
        const messageContent = `📸 Reel: ${caption || 'Shared Reel'}`;
        
        // Share to individual friends
        for (const friendId of friends) {
          try {
            // Get friend's details for proper message routing
            const friendUser = await User.findById(friendId);
            if (!friendUser) {
              console.log(`⚠️ Friend not found: ${friendId}`);
              continue;
            }
            
            const messageData = {
              id: Math.random().toString(36).substr(2, 9),
              user: from,
              senderId: fromId,
              to: friendUser.name, // Use friend's name instead of ID
              text: messageContent,
              image: mediaType === 'image' ? mediaUrl : undefined,
              video: mediaType === 'video' ? mediaUrl : undefined,
              timestamp: new Date().toISOString(),
              isSystem: false,
              isAI: false,
              isGhost: false,
              profilePic: undefined,
              reelId: reelId,
              reelData: {
                _id: reelId,
                caption: caption,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                createdBy: fromId,
                createdAt: new Date().toISOString()
              }
            };

            // Send to friend's room (using their user ID)
            io.to(friendId).emit("message received", messageData);
            io.to(friendId).emit("receive_message", messageData);
            
            console.log(`📨 Reel shared to friend: ${friendUser.name} (${friendId})`);
            
            // Save to database
            if (mongoose.connection.readyState === 1) {
              try {
                const message = new Message(messageData);
                await message.save();
              } catch (err) {
                console.error("Error saving shared reel message to DB:", err);
              }
            }
          } catch (err) {
            console.error(`Error sharing reel to friend ${friendId}:`, err);
          }
        }

        // Share to groups
        for (const groupId of groups) {
          try {
            const groupMessageData = {
              id: Math.random().toString(36).substr(2, 9),
              user: from,
              senderId: fromId,
              groupId: groupId,
              text: messageContent,
              image: mediaType === 'image' ? mediaUrl : undefined,
              video: mediaType === 'video' ? mediaUrl : undefined,
              timestamp: new Date().toISOString(),
              isSystem: false,
              isAI: false,
              isGhost: false,
              profilePic: undefined,
              reelId: reelId,
              reelData: {
                _id: reelId,
                caption: caption,
                mediaUrl: mediaUrl,
                mediaType: mediaType,
                createdBy: fromId,
                createdAt: new Date().toISOString()
              }
            };

            // Send to group room
            io.to(groupId).emit("message received", groupMessageData);
            io.to(groupId).emit("receive_message", groupMessageData);
            
            console.log(`📨 Reel shared to group: ${groupId}`);
            
            // Save to database
            if (mongoose.connection.readyState === 1) {
              try {
                const message = new Message(groupMessageData);
                await message.save();
              } catch (err) {
                console.error("Error saving shared reel message to DB:", err);
              }
            }
          } catch (err) {
            console.error(`Error sharing reel to group ${groupId}:`, err);
          }
        }

        // Send confirmation to sender
        socket.emit("reel_shared_confirmation", {
          reelId,
          friendsCount: friends.length,
          groupsCount: groups.length
        });

      } catch (error) {
        console.error("Error sharing reel:", error);
        socket.emit("reel_share_error", { message: "Failed to share reel" });
      }
    });

    // Follow notification handler - relay follow notifications between users
    socket.on("follow_notification", (data: { from: any; to: string; action: 'follow' | 'unfollow'; timestamp: string }) => {
      console.log(`👥 Follow notification: ${data.from.name} ${data.action} user ${data.to}`);
      
      // Broadcast to the target user
      io.to(String(data.to)).emit("follow_notification", {
        from: data.from,
        action: data.action,
        timestamp: data.timestamp
      });
      
      // Also broadcast to the sender for confirmation
      socket.emit("follow_notification_sent", {
        to: data.to,
        action: data.action,
        timestamp: data.timestamp
      });
    });

    // Forward message to friends and groups
    socket.on("forward_message", async (forwardData) => {
      console.log("Forwarding message:", forwardData);
      console.log("Selected users:", forwardData.selectedUsers);
      console.log("Selected groups:", forwardData.selectedGroups);
      
      try {
        const { 
          originalMessage, 
          from, 
          fromId, 
          selectedUsers, 
          selectedGroups 
        } = forwardData;
        
        // Create forwarded message data
        const forwardedMessageData = {
          id: Math.random().toString(36).substr(2, 9),
          user: from,
          senderId: fromId,
          text: originalMessage.text,
          image: originalMessage.image,
          video: originalMessage.video,
          audio: originalMessage.audio,
          timestamp: new Date().toISOString(),
          profilePic: originalMessage.profilePic,
          isSystem: false,
          isAI: false,
          isGhost: false,
          isForwarded: true, // Mark as forwarded
          forwardedFrom: originalMessage.user, // Show original sender
          originalMessageId: originalMessage.id, // Track original message
          reelId: originalMessage.reelId,
          reelData: originalMessage.reelData,
          reactions: {},
          // Add proper message structure for client compatibility
          to: undefined, // Will be set per recipient
          groupId: undefined // Will be set per group
        };

        // Forward to individual users
        for (const userId of selectedUsers) {
          try {
            // Get user's details for proper message routing
            const targetUser = await User.findById(userId);
            if (!targetUser) {
              console.log(`User not found: ${userId}`);
              continue;
            }

            const userMessageData = {
              ...forwardedMessageData,
              to: targetUser.name, // Use user's name instead of ID
              groupId: undefined
            };

            // Send to user's room
            io.to(userId).emit("receive_message", userMessageData);
            
            console.log(`Message forwarded to user: ${targetUser.name} (${userId})`);
            
            // Save to database
            if (mongoose.connection.readyState === 1) {
              try {
                const message = new Message(userMessageData);
                await message.save();
              } catch (err) {
                console.error("Error saving forwarded message to DB:", err);
              }
            }
          } catch (err) {
            console.error(`Error forwarding message to user ${userId}:`, err);
          }
        }

        // Forward to groups
        for (const groupId of selectedGroups) {
          try {
            const groupMessageData = {
              ...forwardedMessageData,
              to: undefined,
              groupId: groupId
            };

            // Send to group room
            io.to(groupId).emit("receive_message", groupMessageData);
            
            console.log(`Message forwarded to group: ${groupId}`);
            
            // Save to database
            if (mongoose.connection.readyState === 1) {
              try {
                const message = new Message(groupMessageData);
                await message.save();
              } catch (err) {
                console.error("Error saving forwarded message to DB:", err);
              }
            }
          } catch (err) {
            console.error(`Error forwarding message to group ${groupId}:`, err);
          }
        }

        // Send confirmation to sender
        socket.emit("message_forwarded_confirmation", {
          originalMessageId: originalMessage.id,
          usersCount: selectedUsers.length,
          groupsCount: selectedGroups.length
        });

      } catch (error) {
        console.error("Error forwarding message:", error);
        socket.emit("message_forward_error", { message: "Failed to forward message" });
      }
    });

    // Enhanced disconnect handling with better cleanup
    socket.on("disconnect", async (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
      
      if (currentUserId) {
        // Check if user has other active connections
        const remainingSockets = Array.from(io.sockets.sockets.values())
          .filter(s => s.id !== socket.id && socketIdToUserId.get(s.id) === currentUserId);
        
        if (remainingSockets.length === 0) {
          // User is completely offline
          onlineUserIds.delete(currentUserId);
          console.log(`👤 User ${currentUserId} is now completely offline`);
          
          // Update database
          try {
            if (!useInMemory && mongoose.Types.ObjectId.isValid(currentUserId)) {
              await User.findByIdAndUpdate(currentUserId, { 
                isOnline: false,
                lastSeen: new Date()
              });
            }
          } catch (error) {
            console.error("Error updating user offline status:", error);
          }
        } else {
          console.log(`� User ${currentUserId} still has ${remainingSockets.length} active connections`);
        }
        
        // Broadcast updated online status
        await broadcastOnline();
        console.log(`⚠️ Unknown socket disconnected: ${socket.id}`);
      }
    });
  });

  // ==========================================
  // NEW MODULAR SOCKET.IO SYSTEM (WhatsApp-like Features)
  // ==========================================
  // Initialize modular socket system alongside existing system
  // This provides: advanced read receipts, typing indicators, presence tracking, smart notifications
  try {
    const { presenceManager, typingManager, notificationManager } = initializeSocketIO(io, {
      Message,
      Chat: null, // Will be implemented when Chat model is migrated
      User,
      Group
    });
    
    console.log('✅ Modular Socket.IO system initialized');
    console.log('   Features: Read Receipts | Typing Indicators | Presence | Smart Notifications');
    
    // Expose for potential external use
    (io as any).presenceManager = presenceManager;
    (io as any).typingManager = typingManager;
    (io as any).notificationManager = notificationManager;
  } catch (error) {
    console.error('⚠️ Modular Socket.IO initialization failed:', error);
    console.log('   Falling back to legacy socket system only');
  }

  // Vite middleware for development
  // Force development mode if not explicitly production
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_ENV = "development";
  }
  const isProduction = process.env.NODE_ENV === "production";
  console.log(`🚀 Running in ${isProduction ? "Production" : "Development"} Mode`);

  if (!isProduction) {
    console.log("🚀 Running in Development Mode - Enabling Vite Middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // SPA fallback for client-side routes in development
    // This ensures /about, /reels, /stories etc. serve index.html
    app.get("*", async (req, res, next) => {
      // Skip API routes and static files
      if (req.url.startsWith('/api') || req.url.startsWith('/auth') || req.url.startsWith('/socket.io')) {
        return next();
      }
      try {
        const template = await vite.transformIndexHtml(req.url, `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>IntelliCall</title>
            </head>
            <body>
              <div id="root"></div>
              <script type="module" src="/src/main.tsx"></script>
            </body>
          </html>
        `);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("🚀 Running in Production Mode - Serving static files");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = process.argv.includes('--port') ? parseInt(process.argv[process.argv.indexOf('--port') + 1]) : 3009;

  // Function to start server with proper error handling
  // Graceful shutdown handler for queue and worker
  async function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    try {
      // Close scheduled message worker
      if (scheduledMessageWorker) {
        await scheduledMessageWorker.close();
        console.log('👷 Scheduled message worker closed');
      }
      
      // Close scheduled message queue
      if (scheduledMessageQueue) {
        await scheduledMessageQueue.close();
        console.log('📅 Scheduled message queue closed');
      }
      
      // Close Redis connection
      if (redisConnection) {
        await redisConnection.quit();
        console.log('🔌 Redis connection closed');
      }
      
      // Close HTTP server
      httpServer.close(() => {
        console.log('🚪 HTTP server closed');
        process.exit(0);
      });
      
      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
  
  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  const startServerWithFallback = (port: number, maxRetries: number = 1) => {
    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`🚀 IntelliCall Server running on http://localhost:${port}`);
      console.log(`👥 Multiple users can connect simultaneously`);
      if (!isProduction) {
        console.log(`🔗 Frontend: http://localhost:3000 (Vite Dev Server)`);
      } else {
        console.log(`🔗 Application: http://localhost:${port}`);
      }
      console.log(`📱 Real-time features enabled for all users`);
      if (redisAvailable) {
        console.log(`📅 Scheduled message feature enabled (BullMQ + Redis)`);
      } else {
        console.log(`📅 Scheduled message feature enabled (DB-only mode - start Redis for real-time delivery)`);
      }
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        if (maxRetries > 0) {
          console.log(`⚠️ Port ${port} busy, trying ${port + 1}...`);
          startServerWithFallback(port + 1, maxRetries - 1);
        } else {
          console.error(`❌ Port ${port} is busy. Please stop other services or use: npm run dev -- --port <PORT>`);
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  };

  startServerWithFallback(PORT);
}

startServer();
