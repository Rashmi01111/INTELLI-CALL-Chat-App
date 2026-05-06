# AI-Powered Unread Message Summarizer

## Overview
This feature automatically summarizes unread messages in a chat using OpenAI's GPT-3.5-turbo model when there are 5 or more unread messages.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Route   │────▶│  Controller │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌──────────────┐     ┌──────▼──────┐
                    │     Cache    │◀────│  OpenAI     │
                    │   (MongoDB)  │     │   Service   │
                    └──────────────┘     └─────────────┘
```

## API Endpoint

### GET `/chat/:chatId/unread-summary`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "unreadCount": 12,
  "summary": "Alice discussed project deadlines and shared the new design mockups. Bob asked about the meeting schedule for next week. The team agreed on Friday for the review session.",
  "cached": false,
  "lastMessageId": "507f1f77bcf86cd799439011"
}
```

**Response (Less than 5 messages):**
```json
{
  "unreadCount": 3,
  "summary": null,
  "messages": [
    {"id": "...", "sender": "Alice", "message": "Hi!", "createdAt": "..."}
  ]
}
```

## How It Works

1. **Unread Detection**: Fetches messages where user's ID is NOT in `readBy` array
2. **Threshold Check**: Only summarizes if ≥ 5 unread messages
3. **Caching**: Stores summary in MongoDB with `chatId + userId` as key
4. **Auto-Invalidation**: Cache clears when:
   - New messages arrive (via socket)
   - User marks messages as read
   - 24-hour TTL expires

## Security & Cost Optimization

### API Key Security
- OpenAI API key is stored in environment variable `OPENAI_API_KEY`
- Never exposed to client-side
- Server-side only access via `openaiService.js`

### Cost Controls
1. **Rate Limiting**: 
   - 10 summary requests per 5 minutes per IP
   - 5 AI calls per minute per user
   
2. **Message Limits**:
   - Max 50 messages sent to OpenAI per request
   - Only calls API when unread ≥ 5
   
3. **Caching**:
   - Cached summaries reused until new messages arrive
   - 24-hour auto-expiry on cache documents

4. **Token Limits**:
   - Max 150 tokens per summary response
   - Uses cost-effective `gpt-3.5-turbo` model

## Environment Variables

```bash
# Required for AI summarization
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

## Database Schema

### SummaryCache Collection
```javascript
{
  chatId: ObjectId,
  userId: ObjectId,
  lastMessageId: ObjectId,  // For cache validation
  summary: String,
  unreadCount: Number,
  createdAt: Date            // TTL: 24 hours
}
```

### Message Collection
```javascript
{
  chatId: ObjectId,
  senderId: ObjectId,
  message: String,
  createdAt: Date,
  readBy: [ObjectId]         // Users who have read this message
}
```

## Socket Events

### Client → Server
- `mark_messages_read`: Invalidates user's summary cache
- `request_summary_update`: Force refresh summary

### Server → Client
- `summary_cache_cleared`: Cache was cleared, fetch new summary
- `summary_invalidated`: New messages arrived, summary outdated

## Frontend Integration Example

```javascript
// Fetch summary when opening chat
const fetchSummary = async (chatId) => {
  const response = await fetch(`/chat/${chatId}/unread-summary`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.summary) {
    showSummaryCard(data.summary, data.unreadCount);
  }
};

// Listen for invalidation
socket.on('summary_invalidated', ({ chatId }) => {
  // Refresh summary
  fetchSummary(chatId);
});
```

## Error Handling

| Error Code | Meaning |
|------------|---------|
| 400 | Chat ID missing |
| 401 | Unauthorized (not logged in) |
| 429 | Rate limit exceeded |
| 503 | OpenAI service not configured |
| 500 | Internal server error |

## Testing

```bash
# Test endpoint with curl
curl -X GET \
  http://localhost:5000/chat/507f1f77bcf86cd799439011/unread-summary \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Performance Metrics

- **Cache Hit**: ~50ms response time
- **Cache Miss**: ~2-3s (includes OpenAI API call)
- **Database Query**: ~20ms with indexes

## Future Enhancements

1. Multi-language summaries
2. Sentiment analysis in summary
3. Action item extraction
4. Summary length customization per user
