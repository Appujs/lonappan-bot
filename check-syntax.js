const { execSync } = require('child_process');
const path = require('path');

const files = [
  'index.js',
  'deploy-commands.js',
  'src/handlers/commandHandler.js',
  'src/handlers/eventHandler.js',
  'src/utils/gemini.js',
  'src/utils/musicPlayer.js',
  'src/utils/embedBuilder.js',
  'src/events/ready.js',
  'src/events/interactionCreate.js',
  'src/events/messageCreate.js',
  'src/events/guildMemberAdd.js',
  'src/events/guildMemberRemove.js',
  'src/events/voiceStateUpdate.js',
  'src/commands/moderation/ban.js',
  'src/commands/moderation/kick.js',
  'src/commands/moderation/mute.js',
  'src/commands/moderation/unmute.js',
  'src/commands/moderation/warn.js',
  'src/commands/moderation/purge.js',
  'src/commands/moderation/lockdown.js',
  'src/commands/tickets/ticket-setup.js',
  'src/commands/tickets/ticket.js',
  'src/commands/community/rank.js',
  'src/commands/community/leaderboard.js',
  'src/commands/community/marry.js',
  'src/commands/community/divorce.js',
  'src/commands/community/afk.js',
  'src/commands/ai/chat.js',
  'src/commands/music/play.js',
  'src/commands/music/skip.js',
  'src/commands/music/stop.js',
  'src/commands/music/queue.js',
  'src/commands/music/volume.js',
  'src/commands/security/settings.js',
  'src/commands/utility/help.js',
  'src/commands/utility/ping.js',
  'src/commands/utility/stats.js',
  'src/commands/utility/userinfo.js',
  'src/commands/utility/serverinfo.js',
  'src/commands/utility/suggestions.js',
  'src/commands/utility/counting.js',
  'src/dashboard/server.js',
  'src/dashboard/routes/index.js',
];

let passed = 0;
let failed = 0;

for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    console.log(`  ✅ ${file}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${file}`);
    console.error(`     ${err.stderr.toString().trim()}`);
    failed++;
  }
}

console.log(`\n────────────────────────────────────────`);
console.log(`  Passed: ${passed}  |  Failed: ${failed}`);
if (failed === 0) console.log(`  🎉 All files passed syntax check!`);
