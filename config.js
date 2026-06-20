require('dotenv').config();

module.exports = {
  // Bot Details
  name: 'Leonex',
  credits: 'Developed by Akhilesh | Leonex Official',
  defaultPrefix: '!',
  
  // Discord Connection
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  
  // Database Configuration
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leonex',
  
  // Visual Aesthetics (Colors in Hex Decimal)
  colors: {
    primary: '#5865F2',   // Discord Blurple
    success: '#57F287',   // Pastel Green
    warning: '#FEE75C',   // Pastel Yellow
    danger: '#ED4245',    // Pastel Red
    dark: '#2F3136',      // Dark Mode Background
    gold: '#F1C40F'       // Premium Gold
  },
  
  // External APIs
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  
  // Dashboard Configurations
  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT) || 3000,
    secret: process.env.DASHBOARD_SECRET || 'leonex_secret_session_key_12345',
    clientSecret: process.env.DASHBOARD_CLIENT_SECRET,
    callbackUrl: process.env.DASHBOARD_CALLBACK_URL || 'http://localhost:3000/auth/callback'
  },
  
  // Default Settings for Servers
  defaults: {
    language: 'en',
    theme: 'primary',
    xpCooldown: 60 * 1000, // 1 minute XP cooldown
    minXPGained: 15,
    maxXPGained: 25,
    voiceXPRate: 10 // 10 XP per minute in VC
  }
};
