import { Catalog, makeBase, type AxisVal, type Base, type DefExtra } from './catalog.js';

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
const REASONS = ['spam', 'harassment', 'raid', 'nsfw', 'advertising', 'toxicity', 'scam', 'impersonation', 'ban-evasion', 'off-topic', 'threats', 'other'];
const SEVERITY = range(1, 5), DAYS = range(0, 7), MIN = range(1, 1440), HOURS = range(1, 720);
const BET = range(1, 1000), RULES = ['spam', 'duplicates', 'mentions', 'invites', 'caps', 'zalgo', 'emoji', 'profanity'];
const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'], DIFF = ['easy', 'medium', 'hard'];
const CATS = ['general', 'science', 'history', 'geography', 'tech', 'games', 'anime', 'music'];

const B: Base[] = [];
const d = (module: string, root: string, name: string, desc: string, x?: DefExtra) => B.push(makeBase(module, root, name, desc, x));
const axis = (o: Record<string, AxisVal[]>) => o;

// ── moderation ───────────────────────────────────────────────────────────────
d('moderation', 'mod', 'ban', 'Ban a member', { p: 'BanMembers', risk: true, cd: 2000, o: 'user:u!,reason:s,days:i', ax: axis({ reason: REASONS, days: DAYS }) });
d('moderation', 'mod', 'unban', 'Unban by user ID', { p: 'BanMembers', risk: true, o: 'userid:s!,reason:s', ax: axis({ reason: REASONS }) });
d('moderation', 'mod', 'tempban', 'Ban for N hours then auto-unban', { p: 'BanMembers', risk: true, cd: 2000, o: 'user:u!,hours:i,reason:s,days:i', ax: axis({ hours: HOURS, reason: REASONS, days: [0, 1, 7] }) });
d('moderation', 'mod', 'softban', 'Ban+unban to purge recent messages', { p: 'BanMembers', risk: true, cd: 2000, o: 'user:u!,reason:s,days:i', ax: axis({ reason: REASONS, days: range(1, 7) }) });
d('moderation', 'mod', 'kick', 'Kick a member', { p: 'KickMembers', risk: true, o: 'user:u!,reason:s', ax: axis({ reason: REASONS }) });
d('moderation', 'mod', 'timeout', 'Timeout a member', { p: 'ModerateMembers', risk: true, o: 'user:u!,minutes:i,reason:s', ax: axis({ minutes: MIN, reason: REASONS }) });
d('moderation', 'mod', 'unmute', 'Remove a timeout', { p: 'ModerateMembers', risk: true, o: 'user:u!,reason:s', ax: axis({ reason: REASONS }) });
d('moderation', 'mod', 'warn', 'Warn a member (logged as a case)', { p: 'ModerateMembers', risk: true, o: 'user:u!,reason:s,severity:i', ax: axis({ reason: REASONS, severity: SEVERITY }), ctx: { type: 'user', label: 'Eclipse: Warn' } });
d('moderation', 'mod', 'cases', 'List cases for a user', { p: 'ModerateMembers', o: 'user:u!' });
d('moderation', 'mod', 'case', 'Show one case', { p: 'ModerateMembers', o: 'id:i!' });
d('moderation', 'mod', 'purge', 'Bulk delete recent messages', { p: 'ManageMessages', risk: true, cd: 3000, o: 'amount:i!,filter:s,user:u', ax: axis({ amount: range(1, 100), filter: ['all', 'bots', 'humans', 'links', 'attachments', 'embeds'] }) });
d('moderation', 'mod', 'slowmode', 'Set channel slowmode', { p: 'ManageChannels', risk: true, o: 'seconds:i!,channel:c', ax: axis({ seconds: [0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600] }) });
d('moderation', 'mod', 'lock', 'Lock a channel for @everyone', { p: 'ManageChannels', risk: true, o: 'channel:c,reason:s', ax: axis({ reason: REASONS }) });
d('moderation', 'mod', 'unlock', 'Unlock a channel', { p: 'ManageChannels', risk: true, o: 'channel:c,reason:s', ax: axis({ reason: REASONS }) });

// ── automod ──────────────────────────────────────────────────────────────────
d('automod', 'automod', 'rule', 'Enable/disable a rule and set its threshold', { p: 'ManageGuild', o: 'rule:s!,enabled:b,threshold:i,action:s', ax: axis({ rule: RULES, enabled: [true, false], threshold: range(1, 50), action: ['delete', 'warn', 'timeout', 'kick'] }) });
d('automod', 'automod', 'status', 'Show automod config', { p: 'ManageGuild' });
d('automod', 'automod', 'escalate', 'Strike counts that trigger timeout/kick/ban', { p: 'ManageGuild', o: 'timeout_at:i!,kick_at:i!,ban_at:i!', ax: axis({ timeout_at: range(1, 10), kick_at: range(2, 15), ban_at: range(3, 20) }) });
d('automod', 'automod', 'strikes', 'Show a user’s strikes', { p: 'ModerateMembers', o: 'user:u!' });
d('automod', 'automod', 'clearstrikes', 'Clear a user’s strikes', { p: 'ModerateMembers', risk: true, o: 'user:u!' });
d('automod', 'automod', 'wordadd', 'Add a profanity word', { p: 'ManageGuild', o: 'word:s!' });
d('automod', 'automod', 'wordremove', 'Remove a profanity word', { p: 'ManageGuild', o: 'word:s!' });

// ── community (Carl/Dyno) ────────────────────────────────────────────────────
d('community', 'info', 'server', 'Server information');
d('community', 'info', 'user', 'User information', { o: 'user:u', ctx: { type: 'user', label: 'Eclipse: Inspect' } });
d('community', 'info', 'role', 'Role information', { o: 'role:r!' });
d('community', 'info', 'avatar', 'Show an avatar', { o: 'user:u' });
d('community', 'afk', 'afk', 'Set AFK status (mentions are summarised on return)', { o: 'reason:s', cd: 5000 });
d('community', 'poll', 'poll', 'Create a button poll', { cd: 5000, o: 'question:s!,options:s!,minutes:i', ax: axis({ minutes: [5, 15, 30, 60, 180, 720, 1440] }) });
d('community', 'panel', 'buttons', 'Role panel with buttons', { p: 'ManageRoles', risk: true, o: 'title:s!,roles:s!,channel:c' });
d('community', 'panel', 'select', 'Role panel with a select menu', { p: 'ManageRoles', risk: true, o: 'title:s!,roles:s!,channel:c' });
d('community', 'starboard', 'set', 'Configure the starboard', { p: 'ManageGuild', o: 'channel:c!,threshold:i,emoji:s', ax: axis({ threshold: range(1, 25) }) });
d('community', 'welcome', 'set', 'Configure welcome/leave/boost cards', { p: 'ManageGuild', o: 'kind:s!,channel:c!,message:s', ax: axis({ kind: ['welcome', 'leave', 'boost'] }) });
d('community', 'welcome', 'test', 'Preview a card', { p: 'ManageGuild', o: 'kind:s!', ax: axis({ kind: ['welcome', 'leave', 'boost'] }) });

// ── security (Wick) ──────────────────────────────────────────────────────────
d('security', 'security', 'enable', 'Turn anti-nuke on/off', { p: 'Administrator', risk: true, o: 'enabled:b!', ax: axis({ enabled: [true, false] }) });
d('security', 'security', 'threshold', 'Set guard threshold (actions per window)', { p: 'Administrator', risk: true, o: 'guard:s!,limit:i!,window_sec:i!', ax: axis({ guard: ['channelDelete', 'channelCreate', 'roleDelete', 'roleCreate', 'webhook', 'ban', 'kick'], limit: range(1, 20), window_sec: [5, 10, 20, 30, 60, 120, 300] }) });
d('security', 'security', 'trust', 'Trust/untrust a user or role (bypasses guards)', { p: 'Administrator', risk: true, o: 'user:u,role:r,remove:b' });
d('security', 'security', 'status', 'Show security config', { p: 'ManageGuild' });
d('security', 'security', 'quarantine', 'Set the quarantine role', { p: 'Administrator', risk: true, o: 'role:r!' });
d('security', 'security', 'lockdown', 'Emergency: lock every text channel', { p: 'Administrator', risk: true, cd: 30000, o: 'reason:s', ax: axis({ reason: REASONS }) });
d('security', 'security', 'recover', 'End lockdown and restore channels', { p: 'Administrator', risk: true, cd: 30000 });
d('security', 'security', 'verify', 'Configure the verification gate', { p: 'Administrator', risk: true, o: 'role:r!,channel:c!' });
d('security', 'security', 'incidents', 'Recent security incidents', { p: 'ManageGuild' });
d('security', 'security', 'approvebot', 'Approve a bot ID to be added', { p: 'Administrator', risk: true, o: 'botid:s!' });

// ── economy / shop / levels / aesthetics (Mimu) ──────────────────────────────
d('economy', 'economy', 'balance', 'Check balance', { o: 'user:u' });
d('economy', 'economy', 'daily', 'Claim daily coins', { cd: 5000 });
d('economy', 'economy', 'work', 'Work for coins', { cd: 5000 });
d('economy', 'economy', 'give', 'Give coins', { cd: 3000, risk: true, o: 'user:u!,amount:i!', ax: axis({ amount: BET }) });
d('economy', 'economy', 'rob', 'Attempt to rob someone', { cd: 8000, risk: true, o: 'user:u!' });
d('economy', 'economy', 'flip', 'Coin-flip bet', { cd: 3000, o: 'amount:i!,call:s!', ax: axis({ amount: BET, call: ['heads', 'tails'] }) });
d('economy', 'economy', 'slots', 'Slot machine', { cd: 3000, o: 'amount:i!,mode:s', ax: axis({ amount: BET, mode: ['safe', 'normal', 'high'] }) });
d('economy', 'economy', 'trade', 'Offer a coin-for-item trade', { cd: 5000, risk: true, o: 'user:u!,item:s!,price:i!', ax: axis({ price: BET }) });
d('economy', 'economy', 'top', 'Richest members');
d('economy', 'shop', 'list', 'Browse the server shop');
d('economy', 'shop', 'add', 'Add a shop item', { p: 'ManageGuild', o: 'name:s!,price:i!,kind:s,role:r', ax: axis({ kind: ['cosmetic', 'consumable', 'equip', 'role'] }) });
d('economy', 'shop', 'remove', 'Remove a shop item', { p: 'ManageGuild', o: 'name:s!' });
d('economy', 'shop', 'buy', 'Buy an item', { o: 'name:s!,qty:i', ax: axis({ qty: range(1, 25) }) });
d('economy', 'shop', 'inventory', 'Your inventory', { o: 'user:u' });
d('economy', 'shop', 'use', 'Use a consumable', { o: 'name:s!' });
d('economy', 'shop', 'equip', 'Equip an item to your profile', { o: 'name:s!' });
d('economy', 'level', 'rank', 'XP rank card', { o: 'user:u' });
d('economy', 'level', 'top', 'XP leaderboard');
d('economy', 'level', 'rewardadd', 'Role reward at a level', { p: 'ManageRoles', risk: true, o: 'level:i!,role:r!', ax: axis({ level: range(1, 100) }) });
d('economy', 'level', 'rewardremove', 'Remove a level reward', { p: 'ManageRoles', o: 'level:i!' });
d('economy', 'profile', 'view', 'Profile card', { o: 'user:u' });
d('economy', 'profile', 'set', 'Set bio/color', { o: 'bio:s,color:s' });
d('economy', 'embed', 'save', 'Save an embed template', { p: 'ManageMessages', o: 'name:s!,title:s!,description:s!,color:s' });
d('economy', 'embed', 'send', 'Send a saved embed template', { p: 'ManageMessages', o: 'name:s!,channel:c' });

// ── tickets / giveaways (Bravers/Astra) ──────────────────────────────────────
d('tickets', 'ticket', 'panel', 'Post a ticket panel', { p: 'ManageGuild', risk: true, o: 'channel:c,label:s!,category:c,support_role:r', ax: axis({ label: ['Support', 'Report', 'Appeal', 'Partnership', 'Billing', 'Bug', 'Other'] }) });
d('tickets', 'ticket', 'claim', 'Claim this ticket', { p: 'ManageMessages' });
d('tickets', 'ticket', 'close', 'Close this ticket (saves transcript)', { p: 'ManageMessages', risk: true });
d('tickets', 'ticket', 'transcript', 'Post a transcript of this ticket', { p: 'ManageMessages' });
d('tickets', 'ticket', 'adduser', 'Add a user to this ticket', { p: 'ManageMessages', o: 'user:u!' });
d('tickets', 'giveaway', 'start', 'Start a giveaway', { p: 'ManageGuild', risk: true, o: 'prize:s!,minutes:i!,winners:i,role:r,min_level:i', ax: axis({ minutes: [1, 5, 10, 30, 60, 180, 360, 720, 1440, 4320, 10080], winners: range(1, 10), min_level: [0, 1, 5, 10, 20, 30] }) });
d('tickets', 'giveaway', 'end', 'End a giveaway now', { p: 'ManageGuild', risk: true, o: 'message_id:s!' });
d('tickets', 'giveaway', 'reroll', 'Reroll winners', { p: 'ManageGuild', risk: true, o: 'message_id:s!,winners:i', ax: axis({ winners: range(1, 10) }) });

// ── admin utilities / invites ───────────────────────────────────────────────
d('admin', 'admin', 'bulkrole', 'Add/remove a role for many members', { p: 'ManageRoles', risk: true, cd: 60000, o: 'action:s!,role:r!,filter:s', ax: axis({ action: ['add', 'remove'], filter: ['humans', 'bots', 'all'] }) });
d('admin', 'admin', 'bulkchannel', 'Delete channels by name prefix', { p: 'ManageChannels', risk: true, cd: 60000, o: 'prefix:s!' });
d('admin', 'admin', 'permaudit', 'Find dangerous permissions on roles', { p: 'ManageGuild' });
d('admin', 'admin', 'backup', 'Snapshot roles/channels/overwrites', { p: 'Administrator', risk: true, cd: 30000 });
d('admin', 'admin', 'backups', 'List snapshots', { p: 'Administrator' });
d('admin', 'admin', 'backupdiff', 'Diff current server vs a snapshot', { p: 'Administrator', o: 'id:i!' });
d('admin', 'admin', 'logchannel', 'Set the audit log channel', { p: 'ManageGuild', risk: true, o: 'channel:c!' });
d('admin', 'invite', 'create', 'Create an invite (optionally granting roles / for one user)', { p: 'CreateInstantInvite', risk: true, cd: 5000, o: 'channel:c,role:r,target_user:u,max_uses:i,hours:i', ax: axis({ max_uses: [0, 1, 5, 10, 25, 50, 100], hours: [0, 1, 6, 12, 24, 72, 168] }) });

// ── music (Astra) ────────────────────────────────────────────────────────────
for (const [n, desc, o] of [['play', 'Queue a track', 'query:s!'], ['queue', 'Show queue', ''], ['skip', 'Skip', ''], ['pause', 'Pause', ''], ['resume', 'Resume', ''],
  ['loop', 'Loop mode', 'mode:s!'], ['shuffle', 'Shuffle queue', ''], ['remove', 'Remove a queue position', 'pos:i!'], ['clear', 'Clear queue', ''], ['status', 'Audio backend status', '']] as const)
  d('music', 'music', n, desc, { o, cd: 1500, ...(n === 'loop' ? { ax: axis({ mode: ['off', 'track', 'queue'] }) } : {}) });

// ── AI / triggers / reminders / workflows (Edith, Kryton, Luna) ─────────────
d('ai', 'ai', 'chat', 'Chat with the configured AI', { cd: 8000, o: 'prompt:s!,persona:s', ax: axis({ persona: ['assistant', 'concise', 'teacher', 'critic', 'planner'] }) });
d('ai', 'ai', 'code', 'Code help', { cd: 8000, o: 'prompt:s!,lang:s', ax: axis({ lang: ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'sql', 'bash'] }) });
d('ai', 'ai', 'summarize', 'Summarise recent channel messages', { cd: 15000, p: 'ReadMessageHistory', o: 'count:i', ax: axis({ count: [10, 25, 50, 100] }), ctx: { type: 'message', label: 'Eclipse: Summarize' } });
d('ai', 'ai', 'research', 'Research a topic (model knowledge only; no web search wired)', { cd: 15000, o: 'topic:s!,depth:s', ax: axis({ depth: ['brief', 'standard', 'deep'] }) });
d('ai', 'trigger', 'add', 'Add keyword/regex auto-responder', { p: 'ManageGuild', o: 'pattern:s!,response:s!,regex:b' });
d('ai', 'trigger', 'list', 'List triggers', { p: 'ManageGuild' });
d('ai', 'trigger', 'remove', 'Remove a trigger', { p: 'ManageGuild', o: 'id:i!' });
d('ai', 'remind', 'set', 'Set a reminder', { cd: 3000, o: 'minutes:i!,text:s!', ax: axis({ minutes: MIN }) });
d('ai', 'remind', 'list', 'List your reminders');
d('ai', 'remind', 'cancel', 'Cancel a reminder', { o: 'id:i!' });
d('ai', 'workflow', 'add', 'Append a registry step to a workflow', { p: 'ManageGuild', o: 'name:s!,feature:s!@,user:u,role:r,channel:c,text:s,number:n,flag:b' });
d('ai', 'workflow', 'show', 'Show a workflow', { p: 'ManageGuild', o: 'name:s!' });
d('ai', 'workflow', 'run', 'Run a workflow (explicit confirmation)', { p: 'ManageGuild', risk: true, cd: 10000, o: 'name:s!' });
d('ai', 'workflow', 'delete', 'Delete a workflow', { p: 'ManageGuild', o: 'name:s!' });

// ── games ────────────────────────────────────────────────────────────────────
d('games', 'game', 'toss', 'Coin toss', { cd: 2000, o: 'call:s', ax: axis({ call: ['heads', 'tails'] }) });
d('games', 'game', 'streak', 'Coin toss streak: keep calling until you miss', { cd: 5000 });
d('games', 'game', 'dice', 'Roll dice', { cd: 2000, o: 'sides:i,count:i', ax: axis({ sides: [4, 6, 8, 10, 12, 20, 100], count: range(1, 10) }) });
d('games', 'game', 'rps', 'Rock paper scissors', { cd: 2000, o: 'pick:s!', ax: axis({ pick: ['rock', 'paper', 'scissors'] }) });
d('games', 'game', 'trivia', 'Trivia question', { cd: 5000, o: 'category:s,difficulty:s', ax: axis({ category: CATS, difficulty: DIFF }) });
d('games', 'game', 'duel', 'Number duel vs another member', { cd: 10000, o: 'user:u!,max:i', ax: axis({ max: [10, 20, 50, 100, 500, 1000] }) });
d('games', 'game', 'top', 'Game leaderboard', { o: 'game:s', ax: axis({ game: ['toss', 'streak', 'rps', 'trivia', 'duel', 'akinator', 'anicatch'] }) });
d('akinator', 'akinator', 'start', 'Think of a character; I will guess', { cd: 5000, o: 'deck:s', ax: axis({ deck: ['all', 'anime', 'games', 'movies'] }) });
d('anicatch', 'anicatch', 'spawn', 'Force a spawn here (admin)', { p: 'ManageGuild', cd: 5000, o: 'rarity:s', ax: axis({ rarity: RARITY }) });
d('anicatch', 'anicatch', 'config', 'Spawn channel + rate', { p: 'ManageGuild', o: 'channel:c!,every:i', ax: axis({ every: [10, 20, 30, 50, 75, 100, 150, 200] }) });
d('anicatch', 'anicatch', 'collection', 'Your collection', { o: 'user:u,rarity:s', ax: axis({ rarity: ['all', ...RARITY] }) });
d('anicatch', 'anicatch', 'dex', 'Dex progress', { o: 'page:i', ax: axis({ page: range(1, 10) }) });
d('anicatch', 'anicatch', 'pity', 'Show pity counter');
d('anicatch', 'anicatch', 'team', 'Set a team slot', { o: 'slot:i!,creature:i!', ax: axis({ slot: [1, 2, 3] }) });
d('anicatch', 'anicatch', 'battle', 'Challenge a member (turn-based)', { cd: 15000, o: 'user:u!' });
d('anicatch', 'anicatch', 'trade', 'Offer a creature swap', { cd: 10000, risk: true, o: 'user:u!,mine:i!,theirs:i!' });
d('anicatch', 'anicatch', 'top', 'AniCatch leaderboard');

// ── core ─────────────────────────────────────────────────────────────────────
d('core', 'eclipse', 'search', 'Search the feature registry', { o: 'query:s!@' });
d('core', 'eclipse', 'run', 'Run any registry entry/preset', { risk: true, o: 'feature:s!@,user:u,role:r,channel:c,text:s,number:n,flag:b' });
d('core', 'eclipse', 'stats', 'Registry index stats');
d('core', 'eclipse', 'health', 'Latency, memory, registry, permission diagnostics', { p: 'ManageGuild' });
d('core', 'eclipse', 'module', 'Enable/disable a module for this server', { p: 'ManageGuild', risk: true, o: 'name:s!,enabled:b!' });
d('core', 'eclipse', 'bundle', 'List or apply preset bundles', { p: 'ManageGuild', risk: true, o: 'name:s,apply:b' });

export const catalog = new Catalog(B);
