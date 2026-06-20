const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const config = require('../../../config');
const Guild = require('../../models/Guild');

// ─── Middleware: auth guard ─────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ─── HOME ───────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const client = req.app.locals.client;
  const stats = {
    guilds: client ? client.guilds.cache.size : 0,
    users: client ? client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) : 0,
    uptime: client ? formatUptime(client.uptime) : '–'
  };
  res.render('index', { stats });
});

// ─── LOGIN (Discord OAuth2) ──────────────────────────────────────────────────
router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.dashboard.callbackUrl,
    response_type: 'code',
    scope: 'identify guilds'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// ─── OAUTH2 CALLBACK ─────────────────────────────────────────────────────────
router.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/');

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.dashboard.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.dashboard.callbackUrl
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect('/');

    // Fetch Discord user identity
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    // Fetch user's guilds
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const guildsData = await guildsRes.json();

    req.session.user = userData;
    req.session.userGuilds = guildsData;
    req.session.accessToken = tokenData.access_token;

    res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth2 callback error:', err);
    res.redirect('/');
  }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ─── DASHBOARD (Guild Selector) ───────────────────────────────────────────────
router.get('/dashboard', requireAuth, (req, res) => {
  const client = req.app.locals.client;
  const userGuilds = req.session.userGuilds || [];

  // Only show guilds where user has MANAGE_GUILD (0x20)
  const manageableGuilds = userGuilds.filter(g => (BigInt(g.permissions) & BigInt(0x20)) !== BigInt(0));

  const guildsWithStatus = manageableGuilds.map(g => ({
    ...g,
    botPresent: client ? client.guilds.cache.has(g.id) : false,
    iconUrl: g.icon
      ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png'
  }));

  res.render('dashboard', { guilds: guildsWithStatus });
});

// ─── GUILD SETTINGS (GET) ─────────────────────────────────────────────────────
router.get('/dashboard/:guildId', requireAuth, async (req, res) => {
  const client = req.app.locals.client;
  const { guildId } = req.params;

  // Confirm bot is in guild
  const guild = client ? client.guilds.cache.get(guildId) : null;
  if (!guild) return res.redirect('/dashboard');

  // Confirm user manages this guild
  const userGuilds = req.session.userGuilds || [];
  const userGuild = userGuilds.find(g => g.id === guildId);
  if (!userGuild || (BigInt(userGuild.permissions) & BigInt(0x20)) === BigInt(0)) {
    return res.redirect('/dashboard');
  }

  let guildSettings = await Guild.findOne({ guildId });
  if (!guildSettings) guildSettings = await Guild.create({ guildId });

  const channels = guild.channels.cache
    .filter(c => c.type === 0) // Text only
    .map(c => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id)
    .map(r => ({ id: r.id, name: r.name }))
    .sort((a, b) => b.position - a.position);

  res.render('settings', {
    guild: { id: guild.id, name: guild.name, iconUrl: guild.iconURL() || '' },
    settings: guildSettings,
    channels,
    roles,
    saved: req.query.saved || null
  });
});

// ─── GUILD SETTINGS (POST) ────────────────────────────────────────────────────
router.post('/dashboard/:guildId', requireAuth, async (req, res) => {
  const client = req.app.locals.client;
  const { guildId } = req.params;

  // Security: verify user manages this guild
  const userGuilds = req.session.userGuilds || [];
  const userGuild = userGuilds.find(g => g.id === guildId);
  if (!userGuild || (BigInt(userGuild.permissions) & BigInt(0x20)) === BigInt(0)) {
    return res.redirect('/dashboard');
  }

  let guildSettings = await Guild.findOne({ guildId });
  if (!guildSettings) guildSettings = await Guild.create({ guildId });

  const body = req.body;

  // General
  if (body.prefix) guildSettings.prefix = body.prefix.trim().substring(0, 5);

  // Welcome
  guildSettings.welcomeEnabled = body.welcomeEnabled === 'on';
  guildSettings.welcomeChannelId = body.welcomeChannelId || null;
  guildSettings.welcomeMessage = body.welcomeMessage || guildSettings.welcomeMessage;
  guildSettings.welcomeEmbed = body.welcomeEmbed === 'on';

  // Goodbye
  guildSettings.goodbyeEnabled = body.goodbyeEnabled === 'on';
  guildSettings.goodbyeChannelId = body.goodbyeChannelId || null;
  guildSettings.goodbyeMessage = body.goodbyeMessage || guildSettings.goodbyeMessage;
  guildSettings.goodbyeEmbed = body.goodbyeEmbed === 'on';

  // Mod Logs
  guildSettings.modLogsChannelId = body.modLogsChannelId || null;
  guildSettings.auditLogsChannelId = body.auditLogsChannelId || null;

  // Security
  guildSettings.antiSpam = body.antiSpam === 'on';
  guildSettings.antiLinks = body.antiLinks === 'on';
  guildSettings.antiBadwords = body.antiBadwords === 'on';
  guildSettings.altDetection = body.altDetection === 'on';
  guildSettings.antiRaid = body.antiRaid === 'on';

  // Leveling
  guildSettings.levelingEnabled = body.levelingEnabled === 'on';
  guildSettings.levelingChannelId = body.levelingChannelId || null;

  // Tickets
  guildSettings.ticketCategoryId = body.ticketCategoryId || null;
  guildSettings.ticketStaffRoleId = body.ticketStaffRoleId || null;
  guildSettings.ticketTranscriptsChannelId = body.ticketTranscriptsChannelId || null;

  // Suggestions
  guildSettings.suggestionsChannelId = body.suggestionsChannelId || null;

  // Counting Game
  guildSettings.countingChannelId = body.countingChannelId || null;

  // Verification
  guildSettings.verificationEnabled = body.verificationEnabled === 'on';
  guildSettings.verificationRoleId = body.verificationRoleId || null;
  guildSettings.verificationChannelId = body.verificationChannelId || null;

  await guildSettings.save();
  res.redirect(`/dashboard/${guildId}?saved=true`);
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatUptime(ms) {
  if (!ms) return '–';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${m % 60}m`;
}

module.exports = router;
