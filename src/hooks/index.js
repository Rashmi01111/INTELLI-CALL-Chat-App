/**
 * React Hooks for IntelliCall Chat Features
 * 
 * useSocketChat - Main chat hook with socket management
 * useReadReceipts - WhatsApp-style read receipts
 * usePresence - Online/offline status tracking
 */

export { useSocketChat } from './useSocketChat';
export { useReadReceipts } from './useReadReceipts';
export { usePresence, formatLastSeen } from './usePresence';
