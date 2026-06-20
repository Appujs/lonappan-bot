const { GoogleGenAI } = require('@google/generative-ai');
const config = require('../../config');
const Logger = require('../utils/logger');

// Initialize Gemini if key is provided
let model = null;
if (config.geminiApiKey) {
  try {
    // Note: In newer @google/generative-ai SDKs, it can be initialized like:
    // const { GoogleGenerativeAI } = require("@google/generative-ai");
    // const genAI = new GoogleGenerativeAI(apiKey);
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are "Leonex", a powerful, modern, feature-rich Discord bot designed for premium server management and community engagement. You were developed by Akhilesh (Leonex Official).
Keep your responses helpful, engaging, slightly friendly, and relatively concise (perfect for Discord messages).
Format your responses using clean Markdown. Feel free to use emojis.
Always credit your developer: "Developed by Akhilesh | Leonex Official" when asked about who created you. 
If asked about commands, suggest users type /help.`
    });
    Logger.system('Gemini AI Chatbot service loaded successfully.');
  } catch (error) {
    Logger.error('Failed to initialize Gemini AI SDK. Falling back to local AI agent.', error.stack || error);
    model = null;
  }
}

class AIService {
  /**
   * Generates a chat response to a user query
   * @param {string} prompt - User question
   * @param {string} username - User display name
   * @returns {Promise<string>} Bot response
   */
  static async chat(prompt, username) {
    if (model) {
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `User (${username}) says: ${prompt}` }] }]
        });
        const text = result.response.text();
        return text;
      } catch (error) {
        Logger.error('Error querying Gemini AI:', error.stack || error);
        return this.getLocalFallbackResponse(prompt, username);
      }
    } else {
      return this.getLocalFallbackResponse(prompt, username);
    }
  }

  /**
   * Conversational rules-based fallback engine
   */
  static getLocalFallbackResponse(prompt, username) {
    const text = prompt.toLowerCase().trim();

    // 1. Author / Developer Credits
    if (text.includes('developer') || text.includes('creator') || text.includes('make you') || text.includes('built you') || text.includes('who made') || text.includes('akhilesh')) {
      return `👋 Hello! I am **Leonex**, a modern, multipurpose community bot. I was **Developed by Akhilesh | Leonex Official**! 💻✨`;
    }

    // 2. Greetings
    if (/^(hi|hello|hey|yo|sup|greetings|good morning|good afternoon)/i.test(text)) {
      return `Hey **${username}**! Leonex here. How can I help you today? Use \`/help\` to view all of my commands! 🚀`;
    }

    // 3. Help / Information
    if (text.includes('help') || text.includes('command') || text.includes('features')) {
      return `Sure, **${username}**! I have a full suite of moderation, ticket support, security backups, high-quality music, leveling, economy, and AI features. You can type \`/help\` to explore all available commands!`;
    }

    // 4. Status / How are you
    if (text.includes('how are you') || text.includes('how is it going') || text.includes('are you ok')) {
      return `I'm running at peak performance, thank you for asking! ⚙️ Currently monitoring channels, keeping chat clean, and ready to play music. How can I assist you, **${username}**?`;
    }

    // 5. Music features
    if (text.includes('music') || text.includes('play') || text.includes('song')) {
      return `🎵 I feature a premium, zero-lag music system! Use \`/play\` followed by a song title or link, and control playback using interactive buttons in the voice channel!`;
    }

    // 6. Security Features
    if (text.includes('security') || text.includes('backup') || text.includes('lockdown')) {
      return `🛡️ I protect your server with advanced security: \n- **Anti-Nuke system** to halt malicious admin actions.\n- **Channel & Role backups** (\`/backup\`)\n- **Emergency Lockdown mode** (\`/lockdown\`).`;
    }

    // 7. Generic Fallback
    return `Interesting point, **${username}**! I am currently running in local mode because my Gemini AI keys are being set up, but I can answer questions about developer credits, features, and help commands. Type \`/help\` to get started! \n\n*Developed by Akhilesh | Leonex Official*`;
  }
}

module.exports = AIService;
