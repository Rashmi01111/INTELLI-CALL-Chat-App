import { OpenAI } from 'openai';

// Initialize OpenAI with API key from environment variables
// The API key is never exposed to clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a concise summary of chat messages
 * @param {Array} messages - Array of message objects with sender and text
 * @returns {Promise<string>} - Generated summary
 */
async function generateSummary(messages) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Format messages for the prompt
  const formattedMessages = messages.map(msg => 
    `${msg.senderName || 'User'}: ${msg.message}`
  ).join('\n');

  const prompt = `Summarize the following chat messages in 3-4 concise lines. Capture the main topics and key points discussed:

${formattedMessages}

Summary:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes chat conversations concisely. Provide clear, informative summaries in 3-4 lines.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.5
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw new Error('Failed to generate summary');
  }
}

/**
 * Generate a comprehensive paragraph-based summary of chat messages
 * @param {Array} messages - Array of message objects with sender and text
 * @returns {Promise<string>} - Generated paragraph summary
 */
async function generateParagraphSummary(messages) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Format messages for the prompt with timestamps if available
  const formattedMessages = messages.map(msg => {
    const timestamp = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '';
    return `[${timestamp}] ${msg.senderName || 'User'}: ${msg.message}`;
  }).join('\n');

  const prompt = `Please provide a comprehensive paragraph summary of the following chat conversation.

Instructions:
- Create a well-structured paragraph that flows naturally
- Cover all main topics and key discussion points
- Include who said what and the conversation flow
- Mention any decisions, questions, or important outcomes
- Write in clear, readable paragraph format (not bullet points)
- Keep it concise but comprehensive (150-250 words)

Chat Messages:
${formattedMessages}

Paragraph Summary:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates comprehensive paragraph summaries of chat conversations. Write well-structured paragraphs that capture the essence of the discussion.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.4
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('OpenAI Paragraph Summary Error:', error.message);
    throw new Error('Failed to generate paragraph summary');
  }
}

/**
 * Check if OpenAI service is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

export {
  generateSummary,
  generateParagraphSummary,
  isConfigured
};

export default {
  generateSummary,
  generateParagraphSummary,
  isConfigured
};
