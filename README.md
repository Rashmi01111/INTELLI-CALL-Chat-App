# IntelliCall

A modern real-time chat application with AI features, built with React, TypeScript, and Node.js.

## Features

- Real-time messaging with Socket.IO
- User authentication and registration
- AI-powered chat assistance
- Stories and Reels functionality
- Dark mode support
- Responsive design with Tailwind CSS

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd intelli-call
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3009

## Browser Extensions

For a better development experience, install the following browser extensions:

### React DevTools
Install React DevTools for your browser:
- [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

## Environment Variables

The application supports the following environment variables:

- `MONGODB_URI`: MongoDB connection string (optional - falls back to in-memory storage)
- `GEMINI_API_KEY`: Google AI API key for AI features
- `GROQ_API_KEY`: Groq API key for AI chat features
- `GEMINI_MODEL`: AI model to use (default: gemini-3-flash-preview)
- `GROQ_MODEL`: Groq model to use (default: llama-3.1-8b-instant)

## API Endpoints

### Authentication
- `POST /api/user/login` - User login
- `POST /api/user/register` - User registration

### Chat
- `GET /api/messages` - Fetch messages
- `POST /api/messages/clear` - Clear chat history

### AI Features
- `POST /api/ai/chat` - AI chat
- `POST /api/ai/summarize` - Summarize chat history
- `POST /api/ai/smart-replies` - Get smart replies
- `POST /api/ai/translate` - Translate text
- `POST /api/ai/draw` - AI image generation

### Users & Groups
- `GET /api/users` - Get all users
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create group

## Development Notes

- The application falls back to in-memory storage if MongoDB is not available
- AI features require API keys to function properly
- The server runs on port 3009 by default
- Vite dev server runs on port 3000

## Troubleshooting

### Common Issues

1. **500 Internal Server Error on Login**
   - Check if MongoDB is running and accessible
   - Verify environment variables are set correctly
   - The app will fall back to in-memory storage if MongoDB fails

2. **React Router Warnings**
   - These are deprecation warnings for future React Router versions
   - They don't affect functionality but can be resolved by updating to the latest version

3. **Port Conflicts**
   - If port 3009 is busy, the server will try alternative ports
   - You can specify a port with: `npm run dev -- --port <PORT>`

## License

MIT License