const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');
const Logger = require('./logger');

let genAI = null;

if (config.geminiApiKey) {
  try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    Logger.system('Gemini AI system initialized successfully.');
  } catch (err) {
    Logger.error('Failed to initialize Gemini AI SDK. Fallback AI active.', err.stack);
  }
} else {
  Logger.warn('No GEMINI_API_KEY provided in configuration. Rule-based conversational fallback active.');
}

const fallbackReplies = [
  "Hello there! I am Leonex, your premium multi-purpose assistant. How can I help you today?",
  "I'm here to moderate, play music, track leveling, and assist you with anything you need!",
  "Beep boop! If you configure a GEMINI_API_KEY in my `.env` file, I can chat using Google's advanced Gemini AI. For now, I can answer basic commands!",
  "Interesting point! Let's keep making this server awesome.",
  "Did you know? You can configure moderation, welcome messages, and leveling stats on my web dashboard at http://localhost:3000!",
  "I'm Akhilesh's creation, Leonex! Let's make this server a grand community."
];

async function generateChatResponse(prompt, userId, guildName = 'this guild') {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
        systemInstruction: `You are Leonex, a premium-quality, advanced, multi-purpose Discord bot. You were developed by Akhilesh. You are friendly, knowledgeable, slightly witty, and highly helpful. Keep replies clear and concise (under 150 words), and suitable for a Discord chat response. User ID asking is ${userId} in server ${guildName}.`,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (err) {
      Logger.error(`Gemini generation failed, using fallback. Error: ${err.message}`);
    }
  }

  // Smart Rule-based / Fallback Logic
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes('hello') || lowercasePrompt.includes('hi') || lowercasePrompt.includes('hey')) {
    return `Hello! How's it going? I'm Leonex, your Discord companion.`;
  }
  if (lowercasePrompt.includes('who are you') || lowercasePrompt.includes('your name')) {
    return `I am **Leonex**, an advanced multi-purpose Discord bot created by Akhilesh to help manage and entertain your server!`;
  }
  if (lowercasePrompt.includes('creator') || lowercasePrompt.includes('developer') || lowercasePrompt.includes('owner') || lowercasePrompt.includes('akhilesh')) {
    return `Leonex was developed by Akhilesh. You can see credits by typing \`!stats\` or via the web dashboard.`;
  }
  if (lowercasePrompt.includes('help') || lowercasePrompt.includes('command')) {
    return `You can view all my commands by typing \`!help\` or checking the help dashboard page.`;
  }
  if (lowercasePrompt.includes('music')) {
    return `I support playing high-quality music! Try joining a voice channel and typing \`!play <song name>\`.`;
  }

  // Random generic fallback response
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

module.exports = {
  generateChatResponse
};
