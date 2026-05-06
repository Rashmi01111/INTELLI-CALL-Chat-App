import mongoose from 'mongoose';

const summaryCacheSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lastMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  unreadCount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours
  }
});

// Compound index for quick lookup
summaryCacheSchema.index({ chatId: 1, userId: 1 }, { unique: true });

const SummaryCache = mongoose.model('SummaryCache', summaryCacheSchema);
export default SummaryCache;
