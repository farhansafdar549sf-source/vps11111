require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const TOKEN = String(process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN || '').trim().replace(/^['"]|['"]$/g, '');
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '';
const PREFIX = process.env.PREFIX || '-'; // legacy default
const PREFIX_STATS = process.env.PREFIX_STATS || '-'; // invites, messages, si, lb
const PREFIX_STOCK = process.env.PREFIX_STOCK || '$'; // stock, pay, gen
const PREFIX_MOD = process.env.PREFIX_MOD || '?'; // moderation, giveaways, autorole, etc.
const PREFIX_MOD_ALT = process.env.PREFIX_MOD_ALT || '!'; // alias for mod (e.g. !help)

const MEMBER_ROLE_ID = process.env.MEMBER_ROLE_ID || '1540362727581818947';
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID || '1554158102826188962'; // access after verify
const FLARE_GUILD_ID = process.env.GUILD_ID || process.env.FLARE_GUILD_ID || '1540362727514701894';
const DEFAULT_GUILD_ID = FLARE_GUILD_ID;

const PORT = process.env.PORT || 3000;

const BRAND = {
  color: 0x1abc9c,
  colorDark: 0x2b2d31,
  colorPink: 0xbe2c71,
  colorRed: 0xed4245,
  colorGreen: 0x57f287,
  colorBlurple: 0x5865f2,
  footer: 'Coded by DashWho · Enhanced by ! Abu Farhan',
  name: 'Flare Drop'
};

// OpenAI — key usually starts with sk- (not project-). project- is often a Project ID.
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || process.env.GROQ_API_KEY || '').trim();
// Groq free: https://api.groq.com/openai/v1  | OpenAI: https://api.openai.com/v1
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || process.env.GROQ_BASE_URL || '').replace(/\/$/, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || '';
const AI_SYSTEM_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  [
    'You are the Flare Drop Discord assistant.',
    'Answer the user question directly. No filler intros like "Hey I am here to help" or "I am a bot".',
    'Be concise, clear, and practical. Use short paragraphs or bullets when useful.',
    'You know this is a rewards / digital goods Discord: invites, tickets, stock (MCFA etc.), staff commands.',
    'Prefixes: - stats (invites/messages/si/lb), $ stock/pay/gen, ? or ! moderation/tickets/giveaways.',
    'If you lack live stock numbers, say to use $stock or open a ticket — do not invent inventory.',
    'Refuse: scams, phishing, hacking, carding, account theft, doxxing, illegal activity.',
    'Never claim you can ban users or change settings yourself; point to the right command or staff.'
  ].join(' ');


// Staff role hierarchy for -staffstats (highest first)
const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID || '1540362727514701895'; // foundz.exe / Owner
const CO_OWNER_ROLE_ID = process.env.CO_OWNER_ROLE_ID || '1540615105039827065'; // Ownz
const MANAGER_ROLE_ID = process.env.MANAGER_ROLE_ID || '1540362727514701898'; // Maneger
const HEAD_ADMIN_ROLE_ID = process.env.HEAD_ADMIN_ROLE_ID || '1540362727514701897'; // Director
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1540362727535419449'; // Moderator
const STAFF_TEAM_ROLE_ID = process.env.STAFF_TEAM_ROLE_ID || '1540362727543799901'; // Staff
const REWARD_STAFF_ROLE_ID = process.env.REWARD_STAFF_ROLE_ID || '1540362727543799901';
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || ''; // category for support tickets
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || ''; // welcome messages channel
const WELCOME_MESSAGE = process.env.WELCOME_MESSAGE || 'Welcome {user} to **{server}**! You are member #{count}.';
const TICKET_SUPPORT_ROLE_ID = process.env.TICKET_SUPPORT_ROLE_ID || process.env.STAFF_TEAM_ROLE_ID || '';


// Anti-raid / automod / anti-nuke settings
const ANTIRAID_LOG_CHANNEL_ID = process.env.ANTIRAID_LOG_CHANNEL_ID || ''; // optional log channel
const TEAMUP_CATEGORY_ID = process.env.TEAMUP_CATEGORY_ID || ''; // optional category for teamup tickets
const MASS_PING_LIMIT = 3;          // same user mentioned this many times
const MASS_PING_WINDOW_MS = 15000;  // within 15 seconds
const MASS_PING_TIMEOUT_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SPAM_MSG_LIMIT = parseInt(process.env.SPAM_MSG_LIMIT || '6', 10); // messages
const SPAM_WINDOW_MS = parseInt(process.env.SPAM_WINDOW_MS || '5000', 10);
const SPAM_TIMEOUT_MS = parseInt(process.env.SPAM_TIMEOUT_MS || String(10 * 60 * 1000), 10); // 10m
const JOIN_RAID_LIMIT = parseInt(process.env.JOIN_RAID_LIMIT || '8', 10); // joins
const JOIN_RAID_WINDOW_MS = parseInt(process.env.JOIN_RAID_WINDOW_MS || '15000', 10);
const NUKE_ACTION_LIMIT = parseInt(process.env.NUKE_ACTION_LIMIT || '3', 10); // channel deletes / bans
const NUKE_WINDOW_MS = parseInt(process.env.NUKE_WINDOW_MS || '20000', 10);
const BAD_WORDS = (process.env.BAD_WORDS || 'nigger,faggot,retard')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const AUTOMOD_ENABLED = process.env.AUTOMOD_ENABLED !== 'false';
const ANTINUKE_ENABLED = process.env.ANTINUKE_ENABLED !== 'false';


// Product stock keys (Ultimate multi-stock)
const PRODUCT_STOCKS = {
  // emojiNames = your server custom emoji names (case-insensitive). Bot resolves <:name:id> live.
  mcfa: { label: 'MCFA', emoji: '🟩', emojiNames: ['MINECRAFT', 'minecraft', 'mcfa'], cmd: ['mcfa'], type: 'stock' },
  donut: { label: 'DONUT', emoji: '🍩', emojiNames: ['donut', 'Donut'], cmd: ['donut'], type: 'stock' },
  hypixel: { label: 'HYPIXEL', emoji: '⚔️', emojiNames: ['hypixel', 'Hypixel'], cmd: ['hypixel', 'hyp'], type: 'stock' },
  nitro: { label: 'NITRO', emoji: '💜', emojiNames: ['Nitro', 'nitro'], cmd: ['nitro'], type: 'stock' },
  netflix: { label: 'NETFLIX', emoji: '🎬', emojiNames: ['netflix', 'Netflix'], cmd: ['netflix'], type: 'stock' },
  crunchyroll: { label: 'CRUNCHYROLL', emoji: '🍥', emojiNames: ['crunchyroll', 'Crunchyroll'], cmd: ['crunchyroll', 'cruncyroll', 'cr'], type: 'stock' },
  steam: { label: 'STEAM', emoji: '🎮', emojiNames: ['STEAM', 'steam', 'Steam'], cmd: ['steam'], type: 'stock' },
  xbox: { label: 'XBOX', emoji: '🎮', emojiNames: ['xbox', 'Xbox', 'XBOX'], cmd: ['xbox', 'xboxcodes', 'xboxcode'], type: 'stock' },
  // methods
  mcredeem: { label: 'McRedeem Code', emoji: '🎟️', emojiNames: ['MINECRAFT', 'minecraft'], cmd: ['mcredeem', 'mcredeemcode', 'redeem'], type: 'method' },
  mccode: { label: 'McCode Method', emoji: '📜', emojiNames: ['MINECRAFT', 'minecraft'], cmd: ['mccode', 'mccodemethod', 'mccodes'], type: 'method' },
  xboxmethod: { label: 'XboxCode Method', emoji: '📘', emojiNames: ['xbox', 'Xbox'], cmd: ['xboxmethod', 'xboxcodemethod'], type: 'method' },
  nitromethod: { label: 'Nitro Method', emoji: '💎', emojiNames: ['Nitro', 'nitro'], cmd: ['nitromethod', 'nitrom'], type: 'method' },
  xboxgift: { label: 'Xbox Gift Card Method', emoji: '🎁', emojiNames: ['xbox', 'Xbox'], cmd: ['xboxgift', 'xboxgiftcard', 'xboxgiftmethod'], type: 'method' },
  netflixnocc: { label: 'Netflix Method NoCC', emoji: '📺', emojiNames: ['netflix', 'Netflix'], cmd: ['netflixnocc', 'netflixmethod', 'nfnocc'], type: 'method' }
};

/** Resolve server custom emoji by name, else fallback unicode */
function stockEmoji(guild, meta) {
  const fallback = (meta && meta.emoji) || '•';
  if (!guild || !guild.emojis || !meta) return fallback;
  const names = meta.emojiNames || [];
  for (const name of names) {
    const found = guild.emojis.cache.find(
      (em) => em.name && em.name.toLowerCase() === String(name).toLowerCase()
    );
    if (found) return found.toString(); // <:name:id> or <a:name:id>
  }
  // also try product key / label
  for (const name of [meta.label, ...(meta.cmd || [])]) {
    const found = guild.emojis.cache.find(
      (em) => em.name && em.name.toLowerCase() === String(name).toLowerCase()
    );
    if (found) return found.toString();
  }
  return fallback;
}


const VOUCH_CHANNEL_ID = process.env.VOUCH_CHANNEL_ID || ''; // disabled for Flare
const PROOF_CHANNEL_ID = process.env.PROOF_CHANNEL_ID || ''; // disabled for Flare
const SALARY_ADD_CHANNEL_ID = process.env.SALARY_ADD_CHANNEL_ID || '';
const BIRTHDAY_USER_ID = process.env.BIRTHDAY_USER_ID || '1398979148063571989';
// Secret birthday memory journey (Oct 18) — only these two users
const BDAY_STORY_IDS = (process.env.BDAY_STORY_IDS || '1398979148063571989,1080190046138802306')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const BDAY_STORY_REWARD = process.env.BDAY_STORY_REWARD || 'A special gift from DashWho — thank you for every raid survived and every day on Ultimate Rewards.';
const BDAY_STORY_PRODUCT = process.env.BDAY_STORY_PRODUCT || ''; // optional stock key e.g. mcfa
const BDAY_FRIEND_ID = process.env.BDAY_FRIEND_ID || '1080190046138802306';
const BDAY_DASHWHO_ID = process.env.BDAY_DASHWHO_ID || '1398979148063571989';
const FALCON_BOT_ID = process.env.FALCON_BOT_ID || '899899858981371935'; // Falcon™

const FREE_GEN_ROLE_ID = process.env.FREE_GEN_ROLE_ID || '1550508537766215773';
const PAID_GEN_ROLE_ID = process.env.PAID_GEN_ROLE_ID || '1550509503710240953';
const FREE_STATUS_TEXT = process.env.FREE_STATUS_TEXT || 'Legit mcfas on discord.gg/r9spJKVbsM';
const MEDIA_ROLE_ID = process.env.MEDIA_ROLE_ID || '1540362727560843365';
const OUR_BOTS_ROLE_ID = process.env.OUR_BOTS_ROLE_ID || '1540362727560843367';
const OWNZ_ROLE_ID = process.env.OWNZ_ROLE_ID || '1540615105039827065';
const DIRECTOR_ROLE_ID = process.env.DIRECTOR_ROLE_ID || '1540362727514701897';
const FLARE_WEB = 'https://flaredrop.base44.app';
const STAFF_APPLY_PING_ROLES = [OWNER_ROLE_ID, CO_OWNER_ROLE_ID].filter(Boolean);

function ensureStocks(d) {
  if (!d.stocks || typeof d.stocks !== 'object') d.stocks = {};
  if (!d.genStocks || typeof d.genStocks !== 'object') d.genStocks = {};
  if (!d.methods || typeof d.methods !== 'object') d.methods = {};
  for (const key of Object.keys(PRODUCT_STOCKS)) {
    if (PRODUCT_STOCKS[key].type === 'method') {
      if (typeof d.methods[key] !== 'string') d.methods[key] = '';
    } else {
      if (!Array.isArray(d.stocks[key])) d.stocks[key] = [];
      if (!Array.isArray(d.genStocks[key])) d.genStocks[key] = [];
    }
  }
  // migrate legacy
  if (Array.isArray(d.mcfaStock) && d.mcfaStock.length && d.stocks.mcfa.length === 0) {
    d.stocks.mcfa = d.mcfaStock.slice();
  }
  if (Array.isArray(d.customStock) && d.customStock.length && (!d.stocks.custom || !d.stocks.custom.length)) {
    d.stocks.custom = d.customStock.slice();
  }
  d.mcfaStock = d.stocks.mcfa || [];
  d.customStock = d.stocks.custom || [];
  if (d.staffApplyOpen == null) d.staffApplyOpen = true;
  if (!d.staffApplications) d.staffApplications = {};
      if (!d.giveaways) d.giveaways = {};
      if (!d.warnings) d.warnings = {};
  return d;
}

/** pool: 'normal' (pay/claim) or 'gen' (fgen/pgen) */
function getStock(key, pool = 'normal') {
  ensureStocks(data);
  if (pool === 'gen') return data.genStocks[key] || [];
  return data.stocks[key] || [];
}

function setStock(key, arr, pool = 'normal') {
  ensureStocks(data);
  if (pool === 'gen') {
    data.genStocks[key] = arr;
  } else {
    data.stocks[key] = arr;
    if (key === 'mcfa') data.mcfaStock = arr;
    if (key === 'custom') data.customStock = arr;
  }
}

function resolveProductKey(name) {
  const n = String(name || '').toLowerCase();
  for (const [key, meta] of Object.entries(PRODUCT_STOCKS)) {
    if (key === n || meta.cmd.includes(n) || meta.label.toLowerCase() === n) return key;
  }
  return null;
}

function buildStockListEmbed(guild) {
  ensureStocks(data);
  const lines = Object.entries(PRODUCT_STOCKS)
    .filter(([, meta]) => meta.type !== 'method')
    .map(([key, meta]) => {
      const n = (data.stocks[key] || []).length;
      const icon = stockEmoji(guild, meta);
      return `${icon} **${meta.label}**  |  \`${n}\``;
    });
  return new EmbedBuilder()
    .setColor(0xbe2c71)
    .setTitle('CURRENT STOCK STATUS')
    .setDescription(lines.join('\n') || 'No stock products configured.')
    .setFooter({ text: 'USE -buy <product> OR -pay / -<product> @user — Flare Drop' })
    .setTimestamp();
}


function isTicketChannel(ch) {
  if (!ch || !ch.name) return false;
  const name = ch.name.toLowerCase();
  return (
    name.startsWith('ticket') ||
    name.startsWith('claim') ||
    name.includes('ticket') ||
    (TICKET_CATEGORY_ID && ch.parentId === TICKET_CATEGORY_ID)
  );
}


const DATA_PATH = process.env.RENDER
  ? path.join('/tmp', 'flare-bot-data.json')
  : path.join(__dirname, 'data.json');

if (!TOKEN) {
  console.error('Missing DISCORD_BOT_TOKEN');
  process.exit(1);
}


const DASHBOARD_ADMIN_PASSWORD = process.env.DASHBOARD_ADMIN_PASSWORD || 'ultimate-admin';
const OAUTH_CLIENT_ID = (process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '').trim();
const OAUTH_CLIENT_SECRET = (process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();
const OAUTH_REDIRECT_URI = (process.env.OAUTH_REDIRECT_URI || process.env.REDIRECT_URI || '').trim();
const dashSessions = new Map();

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('=') || '');
  }
  return '';
}
function publicBase(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
function redirectUri(req) {
  if (OAUTH_REDIRECT_URI) return OAUTH_REDIRECT_URI;
  return `${publicBase(req)}/auth/callback`;
}
async function memberCanAccessDashboard(userId) {
  try {
    const guild = client.guilds.cache.get(FLARE_GUILD_ID) || await client.guilds.fetch(FLARE_GUILD_ID).catch(() => null);
    if (!guild) return false;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return false;
    if (isStaff(member) || canViewStock(member)) return true;
    if (guild.ownerId === userId) return true;
    return false;
  } catch (_) {
    return false;
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathName = url.pathname;
    const json = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    const parseBody = async () => {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
    };
    try {
      if (pathName === '/' || pathName === '/dashboard') {
        let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
        // Force password login UI even if public/index.html is outdated
        if (html.includes('Login with Discord') || html.includes('Discord login required')) {
          html = html.replace(
            /<p class="muted">Staff dashboard · Discord login required<\/p>\s*<a class="btn primary" href="\/auth\/login">Login with Discord<\/a>\s*<p id="gateErr" class="err"><\/p>/,
            `<p class="muted">Staff dashboard · Admin password</p>
      <input id="gatePassword" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;max-width:280px;margin:0 auto 10px;display:block;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.35);color:#fff;box-sizing:border-box" />
      <button type="button" class="btn primary" id="gateLoginBtn">Login</button>
      <p id="gateErr" class="err"></p>`
          );
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        res.end(html);
        return;
      }
      if (pathName === '/styles.css') {
        res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'no-store' });
        res.end(fs.readFileSync(path.join(__dirname, 'public', 'styles.css'), 'utf8'));
        return;
      }
      if (pathName === '/app.js') {
        let js = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
        if (!js.includes('doPasswordLogin')) {
          js += `
async function doPasswordLogin() {
  var password = (document.getElementById('gatePassword') || {}).value || '';
  var err = document.getElementById('gateErr');
  if (!password) { if (err) err.textContent = 'Enter password'; return; }
  try {
    var r = await fetch('/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    });
    var j = await r.json().catch(function(){ return {}; });
    if (!r.ok) throw new Error(j.error || 'Wrong password');
    if (err) err.textContent = '';
    location.reload();
  } catch (e) {
    if (err) err.textContent = e.message || 'Wrong password';
  }
}
document.addEventListener('DOMContentLoaded', function() {
  var b = document.getElementById('gateLoginBtn');
  if (b) b.addEventListener('click', function(){ doPasswordLogin(); });
  var p = document.getElementById('gatePassword');
  if (p) p.addEventListener('keydown', function(e){ if (e.key === 'Enter') doPasswordLogin(); });
});
`;
        }
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store'
        });
        res.end(js);
        return;
      }
      if (
        pathName === '/logo.png' ||
        pathName === '/bg-desktop.jpg' ||
        pathName === '/bg-desktop.jpeg' ||
        pathName === '/bg-mobile.jpg' ||
        pathName === '/bg-mobile.jpeg'
      ) {
        const name = pathName.slice(1);
        let f = path.join(__dirname, 'public', name);
        if (!fs.existsSync(f) && name.endsWith('.jpg')) {
          f = path.join(__dirname, 'public', name.replace(/\.jpg$/, '.jpeg'));
        }
        if (!fs.existsSync(f)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        const type = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
        res.writeHead(200, { 'Content-Type': type });
        res.end(fs.readFileSync(f));
        return;
      }
      // Admin password login (Discord OAuth disabled for dashboard)
      if (pathName === '/auth/login' && req.method === 'GET') {
        res.writeHead(302, { Location: '/' });
        res.end();
        return;
      }
      if (pathName === '/auth/login' && req.method === 'POST') {
        let body = {};
        try {
          body = await parseBody(req);
        } catch (_) {}
        const password = String(body.password || body.pass || '');
        if (!password || password !== DASHBOARD_ADMIN_PASSWORD) {
          return json(401, { error: 'Wrong password' });
        }
        const sid = 'admin';
        dashSessions.set(sid, { tag: 'Admin', at: Date.now(), via: 'password' });
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `flare_uid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
        });
        res.end(JSON.stringify({ ok: true, tag: 'Admin' }));
        return;
      }
      if (pathName === '/auth/callback') {
        res.writeHead(302, { Location: '/' });
        res.end();
        return;
      }
      if (pathName === '/auth/logout') {
        const uid = getCookie(req, 'flare_uid');
        if (uid) dashSessions.delete(uid);
        res.writeHead(302, { Location: '/', 'Set-Cookie': 'flare_uid=; Path=/; Max-Age=0' });
        res.end();
        return;
      }
      const uid = getCookie(req, 'flare_uid');
      const authed = !!(uid && dashSessions.has(uid));
      if (pathName === '/api/status') {
        return json(200, {
          online: !!client.user,
          tag: client.user?.tag,
          authed: !!authed,
          userId: authed ? uid : null,
          userTag: authed ? dashSessions.get(uid)?.tag : null,
          error: undefined,
          hint: authed ? undefined : 'Enter admin password to login'
        });
      }
      if (!authed && pathName.startsWith('/api/')) return json(401, { error: 'Login required' });
      if (pathName === '/api/stock') {
        ensureStocks(data);
        const pay = {}, gen = {};
        for (const key of Object.keys(PRODUCT_STOCKS)) {
          if (PRODUCT_STOCKS[key].type === 'method') {
            pay[key] = getMethodText(key) ? '∞' : 0;
            gen[key] = pay[key];
          } else {
            pay[key] = getStock(key).length;
            gen[key] = getStock(key, 'gen').length;
          }
        }
        return json(200, { pay, gen });
      }
      if (pathName === '/api/genadd' && req.method === 'POST') {
        const body = await parseBody();
        const product = resolveProductKey(body.product);
        if (!product || PRODUCT_STOCKS[product]?.type === 'method') return json(400, { error: 'Bad product' });
        const lines = String(body.lines || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const arr = getStock(product, 'gen');
        let added = 0;
        for (const a of lines) {
          if (!arr.includes(a)) { arr.push(a); added++; }
        }
        setStock(product, arr, 'gen');
        saveData();
        return json(200, { added, total: arr.length });
      }
      if (pathName === '/api/export' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="flare-full-export.json"'
        });
        res.end(JSON.stringify(data, null, 2));
        return;
      }
      if (pathName === '/api/import' && req.method === 'POST') {
        const body = await parseBody();
        if (!body || typeof body !== 'object') return json(400, { error: 'Invalid JSON' });
        // merge full export into live data
        for (const k of Object.keys(body)) {
          data[k] = body[k];
        }
        ensureStocks(data);
        saveData();
        return json(200, { ok: true, keys: Object.keys(body).length });
      }
      if (pathName === '/api/economy' && req.method === 'POST') {
        const body = await parseBody();
        if (!data.coins) data.coins = {};
        data.coins[body.userId] = Math.max(0, parseInt(body.coins, 10) || 0);
        saveData();
        return json(200, { ok: true });
      }
      if (pathName === '/api/overview') {
        ensureStocks(data);
        let payTotal = 0, genTotal = 0, methodsSet = 0;
        for (const key of Object.keys(PRODUCT_STOCKS)) {
          if (PRODUCT_STOCKS[key].type === 'method') {
            if (getMethodText(key)) methodsSet++;
          } else {
            payTotal += getStock(key).length;
            genTotal += getStock(key, 'gen').length;
          }
        }
        const gw = Object.keys(data.giveaways || {}).length;
        const warnUsers = Object.keys(data.warnings || {}).length;
        const coinUsers = Object.keys(data.coins || {}).length;
        return json(200, { payTotal, genTotal, methodsSet, giveaways: gw, warnUsers, coinUsers });
      }
      if (pathName === '/api/payadd' && req.method === 'POST') {
        const body = await parseBody();
        const product = resolveProductKey(body.product);
        if (!product || PRODUCT_STOCKS[product]?.type === 'method') return json(400, { error: 'Bad product' });
        const lines = String(body.lines || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const arr = getStock(product);
        let added = 0;
        for (const a of lines) {
          if (!arr.includes(a)) { arr.push(a); added++; }
        }
        setStock(product, arr);
        saveData();
        return json(200, { added, total: arr.length });
      }
      if (pathName === '/api/methods') {
        ensureStocks(data);
        if (req.method === 'GET') {
          const methods = {};
          for (const key of Object.keys(PRODUCT_STOCKS)) {
            if (PRODUCT_STOCKS[key].type === 'method') methods[key] = getMethodText(key) || '';
          }
          return json(200, { methods });
        }
        if (req.method === 'POST') {
          const body = await parseBody();
          const product = resolveProductKey(body.product);
          if (!product || PRODUCT_STOCKS[product]?.type !== 'method') return json(400, { error: 'Bad product' });
          if (!data.methods) data.methods = {};
          data.methods[product] = String(body.text || '').trim();
          saveData();
          return json(200, { ok: true });
        }
      }
      if (pathName === '/api/giveaways') {
        const list = Object.entries(data.giveaways || {}).map(([id, g]) => ({
          id,
          prize: g.prize,
          winners: g.winners,
          ends: g.ends,
          channelId: g.channelId,
          entries: g.entries || [],
          hostId: g.hostId
        }));
        return json(200, { giveaways: list });
      }
      
      
      if (pathName === '/api/invites' || pathName.startsWith('/api/invites?')) {
        const g = client.guilds.cache.first()?.id;
        if (!g) return json(200, { top: [] });
        const stats = data.inviteStats?.[g] || data.invites?.[g] || {};
        const rows = [];
        for (const id of Object.keys(stats)) {
          const b = getInviteBreakdown(g, id);
          let name = id;
          try { name = (await client.users.fetch(id)).username; } catch (_) {}
          rows.push({ id, name, ...b });
        }
        rows.sort((a, b) => b.total - a.total);
        return json(200, { top: rows.slice(0, 25), guildId: g });
      }

      if (pathName === '/api/protection') {
        if (req.method === 'GET') {
          return json(200, { protection: getProtection() });
        }
        if (req.method === 'POST') {
          const body = await parseBody();
          const allowed = [
            'automod', 'antinuke', 'antiraid', 'logChannelId', 'badWords',
            'spamMsgLimit', 'spamWindowMs', 'spamTimeoutMs',
            'joinRaidLimit', 'joinRaidWindowMs',
            'nukeActionLimit', 'nukeWindowMs',
            'massPingLimit', 'massPingWindowMs', 'massPingTimeoutMs'
          ];
          const patch = {};
          for (const k of allowed) {
            if (body[k] !== undefined) patch[k] = body[k];
          }
          return json(200, { protection: saveProtection(patch) });
        }
      }

      if (pathName === '/api/warnings') {
        const users = Object.entries(data.warnings || {}).map(([userId, arr]) => ({
          userId,
          count: (arr || []).length,
          lastReason: (arr && arr.length ? arr[arr.length - 1].reason : '') || ''
        }));
        users.sort((a, b) => b.count - a.count);
        return json(200, { users });
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Flare Staff Bot online');
    } catch (e) {
      console.error('http', e);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('error');
      }
    }
  })
  .listen(PORT, '0.0.0.0', () => console.log(`Flare dashboard + bot on port ${PORT}`));


function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const d = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      if (!d.messages) d.messages = {};
      if (!d.invites) d.invites = {};
      if (!d.inviteUses) d.inviteUses = {};
      if (!d.invitedBy) d.invitedBy = {}; // guildId -> memberId -> inviterId
      if (!d.inviteStats) d.inviteStats = {}; // guildId -> userId -> { joins, leaves, fake, bonus }
      if (!d.ticketCount) d.ticketCount = {};
      if (!Array.isArray(d.mcfaStock)) d.mcfaStock = [];
      if (!Array.isArray(d.mcfaUsed)) d.mcfaUsed = [];
      if (!Array.isArray(d.customStock)) d.customStock = [];
      if (!Array.isArray(d.customUsed)) d.customUsed = [];
      if (!d.coins) d.coins = {};
      if (!d.daily) d.daily = {};
      if (!d.counting) d.counting = {}; // { channelId: { current: number, lastUserId: string } }
      if (!d.teamups) d.teamups = {};
      if (!Array.isArray(d.hits)) d.hits = [];
      if (!d.exportCounts) d.exportCounts = { mcfa: 0, custom: 0, hits: 0 };
      ensureStocks(d);
      if (typeof d.staffApplyOpen !== 'boolean') d.staffApplyOpen = true;
      if (!d.staffApplications) d.staffApplications = {};
      if (!d.giveaways) d.giveaways = {};
      if (!d.warnings) d.warnings = {};
      if (!d.falconInvites) d.falconInvites = {};
      return d;
    }
  } catch (e) {
    console.error('Load error:', e.message);
  }
  return {
    messages: {},
    invites: {},
    inviteUses: {},
    invitedBy: {},
    inviteStats: {},
    ticketCount: {},
    mcfaStock: [],
    mcfaUsed: [],
    customStock: [],
    customUsed: [],
    coins: {},
    daily: {},
    counting: {},
    teamups: {},
    hits: [],
    exportCounts: { mcfa: 0, custom: 0, hits: 0 },
    stocks: {},
    staffApplyOpen: true,
    staffApplications: {}
  };
  // note: ensureStocks applied after load below
}

function saveData() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Save error:', e.message);
  }
}

let data = loadData();
ensureStocks(data);

// In-memory anti-raid trackers (reset on restart – fine for short windows)
const recentMentions = new Map();
const spamTracker = new Map(); // userId -> timestamps[]
const joinRaidTracker = new Map(); // guildId -> timestamps[]
const nukeTracker = new Map(); // actorId:type -> timestamps[]
 // key: `${authorId}:${targetId}` → timestamps[]
const recentChannelRenames = new Map();

const hitRunner = { running: false, timer: null, channelId: null, index: 0, queue: [] };


const botIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.DirectMessages
];
// Presence is privileged — only enable if portal has it ON (else Discord drops the connection)
// Presence ON by default (turn off with PRESENCE_INTENT=false if portal doesn't have it)
if (process.env.PRESENCE_INTENT !== 'false' && process.env.PRESENCE_INTENT !== '0') {
  botIntents.push(GatewayIntentBits.GuildPresences);
}

const client = new Client({
  intents: botIntents,
  partials: [Partials.Channel]
});
console.log('Discord intents ready. Presence intent:', botIntents.includes(GatewayIntentBits.GuildPresences));

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (STAFF_ROLE_ID && member.roles.cache.has(STAFF_ROLE_ID)) return true;
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  return false;
}

function canViewStock(member) {
  if (!member) return false;
  if (isStaff(member)) return true;
  if (MEMBER_ROLE_ID && member.roles.cache.has(MEMBER_ROLE_ID)) return true;
  return false;
}

function isCoOwnerOrAbove(member) {
  if (!member) return false;
  if (OWNER_ROLE_ID && member.roles.cache.has(OWNER_ROLE_ID)) return true;
  if (CO_OWNER_ROLE_ID && member.roles.cache.has(CO_OWNER_ROLE_ID)) return true;
  return false;
}

function isHeadAdminOrAbove(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (OWNER_ROLE_ID && member.roles.cache.has(OWNER_ROLE_ID)) return true;
  if (CO_OWNER_ROLE_ID && member.roles.cache.has(CO_OWNER_ROLE_ID)) return true;
  if (MANAGER_ROLE_ID && member.roles.cache.has(MANAGER_ROLE_ID)) return true;
  if (HEAD_ADMIN_ROLE_ID && member.roles.cache.has(HEAD_ADMIN_ROLE_ID)) return true;
  return false;
}

function getCoins(userId) {
  return data.coins[userId] || 0;
}

function setCoins(userId, amount) {
  data.coins[userId] = Math.max(0, Math.floor(amount));
  saveData();
}

function addCoins(userId, amount) {
  setCoins(userId, getCoins(userId) + amount);
}

function buildTeamupPanel(team) {
  const count = (team.members || []).length;
  const status = team.status || 'pending';
  const statusEmoji = status === 'closed' ? '🔒' : status === 'open' ? '🟢' : '🟡';
  const statusText = status === 'closed' ? 'Closed' : status === 'open' ? 'Open' : 'Pending';
  const memberLines = (team.members || [])
    .map((id, i) => `\`#${i + 1}\` <@${id}>`)
    .join('\n') || '—';

  return new EmbedBuilder()
    .setColor(status === 'closed' ? 0xed4245 : 0x57f287)
    .setTitle('🎮 TeamUp Live Panel')
    .setDescription(
      `**People in the team:** \`${count}/20\`\n` +
      `**Status:** ${statusEmoji} **${statusText}**\n\n` +
      `**Members**\n${memberLines}\n\n` +
      `\`-leave\` — leave this TeamUp\n` +
      `\`-close\` — close & delete (creator/staff)`
    )
    .setFooter({ text: BRAND.footer })
    .setTimestamp();
}

async function updateTeamupPanel(channel, team) {
  if (!team?.panelMsgId) return;
  try {
    const msg = await channel.messages.fetch(team.panelMsgId);
    await msg.edit({ embeds: [buildTeamupPanel(team)] });
  } catch (_) {}
}


const REWARD_TIERS = [
  { id: 1, invites: 2, name: 'MCFA', type: 'reward' },
  { id: 2, invites: 4, name: 'Xbox Code', type: 'reward' },
  { id: 3, invites: 5, name: 'MCFA — Hypixel Unbanned', type: 'reward' },
  { id: 4, invites: 8, name: 'Netflix Premium — PC Login', type: 'reward' },
  { id: 5, invites: 10, name: 'Crunchyroll Premium', type: 'reward' },
  { id: 6, invites: 2, name: 'MC Redeem Code Method', type: 'method' },
  { id: 7, invites: 4, name: 'Nitro Basic Yearly Method', type: 'method' },
  { id: 8, invites: 5, name: 'MCFA Email Change Method', type: 'method' },
  { id: 9, invites: 8, name: 'MCFA Password Change Method', type: 'method' },
  { id: 10, invites: 12, name: '5,000 Robux Method', type: 'method' }
];

function ensureInviteStats(guildId, userId) {
  if (!data.inviteStats) data.inviteStats = {};
  if (!data.inviteStats[guildId]) data.inviteStats[guildId] = {};
  if (!data.inviteStats[guildId][userId]) {
    data.inviteStats[guildId][userId] = { joins: 0, leaves: 0, fake: 0, bonus: 0 };
  }
  // migrate old flat count once
  const flat = data.invites?.[guildId]?.[userId];
  if (typeof flat === 'number' && flat > 0 && data.inviteStats[guildId][userId].joins === 0) {
    data.inviteStats[guildId][userId].joins = flat;
  }
  return data.inviteStats[guildId][userId];
}

/** Falcon-style totals: regular = joins - leaves - fake, total = regular + bonus */
function getInviteBreakdown(guildId, userId) {
  const s = ensureInviteStats(guildId, userId);
  const joins = s.joins || 0;
  const leaves = s.leaves || 0;
  const fake = s.fake || 0;
  const bonus = s.bonus || 0;
  const regular = Math.max(0, joins - leaves - fake);
  const total = Math.max(0, regular + bonus);
  return { joins, leaves, fake, bonus, regular, total };
}

function getUserInvites(guildId, userId) {
  return getInviteBreakdown(guildId, userId).total;
}


function getVerifyConfig(guildId) {
  if (!data.verification) data.verification = {};
  const cfg = data.verification[guildId];
  if (cfg && cfg.roleId) return cfg;
  // default verified role so panel still works after setup
  if (VERIFIED_ROLE_ID) {
    return { roleId: VERIFIED_ROLE_ID, channelId: null };
  }
  return null;
}

function randomMathChallenge() {
  const roll = Math.floor(Math.random() * 3);
  if (roll === 0) {
    const a = 1 + Math.floor(Math.random() * 40);
    const b = 1 + Math.floor(Math.random() * 40);
    return { q: a + ' + ' + b + ' = ?', a: a + b };
  }
  if (roll === 1) {
    const a = 10 + Math.floor(Math.random() * 30);
    const b = 1 + Math.floor(Math.random() * 9);
    return { q: a + ' − ' + b + ' = ?', a: a - b };
  }
  const a = 2 + Math.floor(Math.random() * 10);
  const b = 2 + Math.floor(Math.random() * 8);
  return { q: a + ' × ' + b + ' = ?', a: a * b };
}

if (!global.__flarePendingVerify) global.__flarePendingVerify = new Map();
const pendingVerify = global.__flarePendingVerify;

function buildFalconInviteEmbed(user, guildId, requestedBy) {
  const b = getInviteBreakdown(guildId, user.id);
  const rejoins = (data.inviteStats?.[guildId]?.[user.id]?.rejoins) || 0;
  const display = user.globalName || user.username;
  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle('Invite log')
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setDescription(`≫ **${display}** has **${b.total}** invites`)
    .addFields(
      { name: 'Joins', value: String(b.joins), inline: false },
      { name: 'Left', value: String(b.leaves), inline: false },
      { name: 'Fake', value: String(b.fake), inline: false },
      { name: 'Rejoins', value: `${rejoins} (7d)`, inline: false }
    )
    .setFooter({
      text: (requestedBy ? `Requested by ${requestedBy} · ` : '') + BRAND.footer
    })
    .setTimestamp();
}


/** Parse Falcon -i / invites reply → { userId?, count } */
function parseFalconInvites(msg) {
  if (!msg || msg.author?.id !== FALCON_BOT_ID) return null;
  const text = [
    msg.content || '',
    ...(msg.embeds || []).flatMap((e) => [
      e.title || '',
      e.description || '',
      ...(e.fields || []).map((f) => `${f.name} ${f.value}`)
    ])
  ].join('\n');

  // "Name has 5 invites" or "has total of 42 invites"
  let count = null;
  let m =
    text.match(/has\s+total\s+of\s+(\d+)\s+invites/i) ||
    text.match(/has\s+(\d+)\s+invites/i) ||
    text.match(/\*\*[^*]+\s+has\s+(\d+)\s+invites/i) ||
    text.match(/(\d+)\s+invites\s*\|/i);
  if (m) count = parseInt(m[1], 10);
  if (count === null || Number.isNaN(count)) return null;

  // Prefer mentioned user (Falcon often mentions the target)
  let userId =
    msg.mentions?.users?.first()?.id ||
    null;
  // From <@id> in text
  if (!userId) {
    const um = text.match(/<@!?(\d{15,20})>/);
    if (um) userId = um[1];
  }
  return { userId, count, raw: text.slice(0, 200) };
}

function setFalconInvites(guildId, userId, count) {
  if (!data.invites) data.invites = {};
  if (!data.invites[guildId]) data.invites[guildId] = {};
  const n = Math.max(0, count);
  data.invites[guildId][userId] = n;
  const s = ensureInviteStats(guildId, userId);
  s.joins = n + (s.leaves || 0) + (s.fake || 0);
  s.bonus = s.bonus || 0;
  if (!data.falconInvites) data.falconInvites = {};
  if (!data.falconInvites[guildId]) data.falconInvites[guildId] = {};
  data.falconInvites[guildId][userId] = {
    count: n,
    at: new Date().toISOString()
  };
  saveData();
}


function getEligibleRewards(inviteCount) {
  return REWARD_TIERS.filter((r) => inviteCount >= r.invites);
}

function buildRewardMenuEmbed(user, inviteCount, eligible) {
  const rewardLines = eligible
    .filter((r) => r.type === 'reward')
    .map((r) => `\`${r.id}.\` **${r.invites} Invites** → **${r.name}**`);
  const methodLines = eligible
    .filter((r) => r.type === 'method')
    .map((r) => `\`${r.id}.\` **${r.invites} Invites** → **${r.name}**`);

  let desc = `**Your invites:** \`${inviteCount}\`\n\n`;
  if (!eligible.length) {
    desc += '❌ You need at least **2 invites** to claim a reward.';
  } else {
    if (rewardLines.length) {
      desc += '### 🎁 Reward Tiers\n' + rewardLines.join('\n') + '\n\n';
    }
    if (methodLines.length) {
      desc += '### 🛠️ Method Rewards\n' + methodLines.join('\n') + '\n\n';
    }
    desc += '**Reply with the number** of the reward you want (e.g. `3`)';
  }

  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle('Claim your reward')
    .setDescription(desc)
    .setFooter({ text: BRAND.footer })
    .setTimestamp();
}

async function pingOnlineRewardStaff(guild, claimUser, rewardName) {
  const roleId = REWARD_STAFF_ROLE_ID;
  if (!roleId) return null;
  const role = guild.roles.cache.get(roleId);
  if (!role) return null;

  try {
    await guild.members.fetch();
  } catch (_) {}

  const online = role.members.filter(
    (m) =>
      !m.user.bot &&
      m.presence &&
      ['online', 'idle', 'dnd'].includes(m.presence.status)
  );

  if (!online.size) {
    // fallback: mention the role
    return {
      content:
        `<@&${roleId}> ${claimUser} needs **${rewardName}** — please kindly pay them.`,
      allowedMentions: { roles: [roleId], users: [claimUser.id] }
    };
  }

  const pings = [...online.values()].map((m) => `<@${m.id}>`).join(' ');
  return {
    content:
      `${pings}\n${claimUser} needs **${rewardName}** — please kindly pay them.`,
    allowedMentions: { users: [...online.keys(), claimUser.id] }
  };
}

async function startRewardClaimFlow(channel, user) {
  const invites = getUserInvites(channel.guild.id, user.id);
  const eligible = getEligibleRewards(invites);
  const embed = buildRewardMenuEmbed(user, invites, eligible);
  const menuMsg = await channel.send({ content: `${user}`, embeds: [embed] });

  if (!eligible.length) return;

  const collector = channel.createMessageCollector({
    filter: (m) => m.author.id === user.id && !m.author.bot,
    time: 5 * 60 * 1000,
    max: 10
  });

  collector.on('collect', async (m) => {
    const num = parseInt(m.content.trim(), 10);
    if (!num) {
      await channel.send(`${user} Please reply with a **number** from the list.`).catch(() => {});
      return;
    }
    const chosen = eligible.find((r) => r.id === num);
    if (!chosen) {
      await channel.send(
        `${user} That option is not available for you. Pick a number from the list above.`
      ).catch(() => {});
      return;
    }

    collector.stop('chosen');

    // Auto-deliver from stock INTO THE TICKET (not DM)
    const nameL = chosen.name.toLowerCase();
    let productKey = 'mcfa';
    if (nameL.includes('netflix') && (nameL.includes('nocc') || nameL.includes('no cc') || nameL.includes('method')))
      productKey = 'netflixnocc';
    else if (nameL.includes('netflix')) productKey = 'netflix';
    else if (nameL.includes('crunchy')) productKey = 'crunchyroll';
    else if (nameL.includes('xbox') && nameL.includes('gift')) productKey = 'xboxgift';
    else if (nameL.includes('xbox') && nameL.includes('method')) productKey = 'xboxmethod';
    else if (nameL.includes('xbox')) productKey = 'xbox';
    else if (nameL.includes('nitro') && nameL.includes('method')) productKey = 'nitromethod';
    else if (nameL.includes('nitro')) productKey = 'nitro';
    else if (nameL.includes('mcredeem') || (nameL.includes('redeem') && nameL.includes('mc')))
      productKey = 'mcredeem';
    else if (nameL.includes('mccode') || (nameL.includes('code') && nameL.includes('method') && nameL.includes('mc')))
      productKey = 'mccode';

    const taken = await takeFromStock(productKey, 1);
    if (!taken) {
      await channel.send(
        `${user} selected **${chosen.name}** but **${productKey}** stock is empty.\n` +
          `Staff will assist. <@&${OWNER_ROLE_ID}>`
      ).catch(() => {});
      return;
    }

    const meta = PRODUCT_STOCKS[productKey] || { label: productKey, emoji: '📦' };
    const deliverEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🎁 Reward delivered')
      .setDescription(
        `**Reward:** ${chosen.name}\n` +
          `**Product:** ${meta.emoji} **${meta.label}**\n` +
          `**User:** ${user}\n\n` +
          `# ARE WE LEGIT?\n` +
          `If there is any login issue, reply here and ping staff.`
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp();

    await channel.send({ content: `${user}`, embeds: [deliverEmbed] }).catch(() => {});
    await channel.send(`||${taken[0]}||`).catch(() => {});
  });

  collector.on('end', async (_, reason) => {
    if (reason !== 'chosen') {
      await channel.send(`${user} Reward selection timed out. Use \`$claim\` to try again.`).catch(() => {});
    }
  });
}



function emailFormatOk(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}
function domainOf(email) {
  const i = String(email || '').lastIndexOf('@');
  return i >= 0 ? String(email).slice(i + 1).toLowerCase() : '';
}
function isAllowedEmailDomain(domain) {
  const d = String(domain || '').toLowerCase();
  if (!d) return false;
  const exact = new Set([
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'passport.com',
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.in', 'icloud.com', 'me.com', 'mac.com',
    'proton.me', 'protonmail.com'
  ]);
  if (exact.has(d)) return true;
  // outlook.fr, hotmail.es, live.co.uk, outlook.com.br, msn.nl, etc.
  if (/^(outlook|hotmail|live|msn)(\.[a-z0-9-]+)+$/i.test(d)) return true;
  if (/^gmail(\.[a-z]{2,})+$/i.test(d)) return true;
  if (/^yahoo(\.[a-z0-9-]+)+$/i.test(d)) return true;
  return false;
}
function passNotes(pass) {
  const notes = [];
  const pw = String(pass || '');
  if (pw.length >= 8) notes.push('length 8+');
  else notes.push('short (<8)');
  if (/[A-Z]/.test(pw)) notes.push('uppercase');
  if (/[a-z]/.test(pw)) notes.push('lowercase');
  if (/[0-9]/.test(pw)) notes.push('number');
  if (/[^A-Za-z0-9]/.test(pw)) notes.push('symbol');
  return notes.join(', ');
}
function classifyAccount(acc) {
  const idx = acc.indexOf(':');
  const email = acc.slice(0, idx);
  const pass = acc.slice(idx + 1);
  const domain = domainOf(email);
  const fmt = emailFormatOk(email);
  const domOk = isAllowedEmailDomain(domain);
  return { email, pass, domain, fmt, domOk, ok: fmt && domOk, acc: `${email}:${pass}` };
}

function parseHitEntry(item) {
  // email:pass  OR  email:pass:MCUsername (username = 3–16 alphanumeric/_)
  if (!item || !item.includes(':')) return null;
  const first = item.indexOf(':');
  const email = item.slice(0, first).trim();
  const rest = item.slice(first + 1).trim();
  if (!email || !rest) return null;
  const last = rest.lastIndexOf(':');
  if (last > 0) {
    const maybe = rest.slice(last + 1).trim();
    if (/^[A-Za-z0-9_]{3,16}$/.test(maybe)) {
      return { email, pass: rest.slice(0, last), username: maybe };
    }
  }
  return { email, pass: rest, username: null };
}

function parseAccounts(text) {
  // Accept: mail:pass | mail:pass,mail:pass | one per line | with ||spoilers||
  const cleaned = text
    .replace(/\|\|/g, ' ')
    .replace(/,/g, '\n')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const item of cleaned) {
    if (!item.includes(':')) continue;
    // basic mail:pass (allow extra colons in pass)
    const idx = item.indexOf(':');
    if (idx <= 0) continue;
    const mail = item.slice(0, idx).trim();
    const pass = item.slice(idx + 1).trim();
    if (mail && pass) out.push(`${mail}:${pass}`);
  }
  return out;
}

function addMessage(guildId, userId) {
  if (!data.messages[guildId]) data.messages[guildId] = {};
  data.messages[guildId][userId] = (data.messages[guildId][userId] || 0) + 1;
  saveData();
}

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    if (!data.inviteUses[guild.id]) data.inviteUses[guild.id] = {};
    invites.forEach((inv) => {
      data.inviteUses[guild.id][inv.code] = {
        uses: inv.uses || 0,
        inviterId: inv.inviter?.id || null
      };
    });
    saveData();
  } catch (e) {
    console.error('Invite cache failed:', e.message);
  }
}


// ========== Secret birthday memory journey ==========
const bdayStorySessions = new Map(); // userId -> step

function canUseBdayStory(userId) {
  return BDAY_STORY_IDS.includes(String(userId));
}

function bdayStorySteps() {
  return [
    {
      title: 'A quiet night…',
      body:
        'Hey.\n\n' +
        'Before the noise, before the raids, before the tickets — there was a start.\n\n' +
        '**Ultimate Rewards** began on **13 July 2026**.\n' +
        'A small idea. A server. People who showed up anyway.'
    },
    {
      title: 'First storm — 25 Aug 2026',
      body:
        '**25 August 2026** — the first server raid.\n\n' +
        'Chaos. Channels. Names that did not belong.\n' +
        'But the server did not disappear.\n' +
        'Neither did you.'
    },
    {
      title: 'Second raid — 31 Aug 2026',
      body:
        '**31 August 2026** — raid number two.\n\n' +
        'Same pressure. Same mess.\n' +
        'Still here. Still building.\n' +
        'Some people leave in storms. You did not.'
    },
    {
      title: 'Third raid — 7 Sep 2026',
      body:
        '**7 September 2026** — the third raid.\n\n' +
        'Some people pointed fingers.\n' +
        'Some even blamed **DashWho**.\n\n' +
        'But the truth stayed simple:\n' +
        'you both kept the place alive when it was easier to walk away.'
    },
    {
      title: 'From DashWho',
      body:
        '**DashWho** wanted this to reach you on your day.\n\n' +
        'Happy Birthday.\n\n' +
        'Thank you for every late night, every rebuild after a raid, every time you stayed when it was ugly.\n' +
        'Ultimate Rewards is not only a server — it is the people who refused to quit.\n\n' +
        'You are one of them.\n\n' +
        'Wishing you a calm year, real wins, and a family that has your back — including this one.'
    },
    {
      title: 'Your gift',
      body:
        'This chapter ends with something for you — not because of drama, but because you mattered through all of it.\n\n' +
        'Tap **Claim gift** when you are ready.'
    }
  ];
}

function buildBdayEmbed(stepIndex, avatarUrl) {
  const steps = bdayStorySteps();
  const step = steps[stepIndex] || steps[0];
  const total = steps.length;
  const embed = new EmbedBuilder()
    .setColor(0xf5c542)
    .setTitle(step.title)
    .setDescription(step.body)
    .setFooter({ text: `Memory ${stepIndex + 1} / ${total} · Secret · For you only` });
  if (avatarUrl) embed.setThumbnail(avatarUrl);
  return embed;
}

function bdayButtons(stepIndex) {
  const steps = bdayStorySteps();
  const row = new ActionRowBuilder();
  if (stepIndex > 0) {
    row.addComponents(
      new ButtonBuilder().setCustomId('bday_prev').setLabel('Back').setStyle(ButtonStyle.Secondary)
    );
  }
  if (stepIndex < steps.length - 1) {
    row.addComponents(
      new ButtonBuilder().setCustomId('bday_next').setLabel('Continue').setStyle(ButtonStyle.Primary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId('bday_claim').setLabel('Claim gift').setStyle(ButtonStyle.Success)
    );
  }
  return row;
}

async function startBdayStory(channel, user) {
  if (!canUseBdayStory(user.id)) {
    return channel.send({ content: 'This is private.' }).catch(() => {});
  }
  bdayStorySessions.set(user.id, 0);
  let avatarUrl = user.displayAvatarURL({ size: 256 });
  try {
    const friend = await client.users.fetch(BDAY_FRIEND_ID).catch(() => null);
    if (friend) avatarUrl = friend.displayAvatarURL({ size: 256 });
  } catch (_) {}

  const files = [];
  const pfpPath = path.join(__dirname, 'public', 'bday-friend.png');
  if (fs.existsSync(pfpPath)) {
    files.push(new AttachmentBuilder(pfpPath, { name: 'bday-friend.png' }));
  }

  const embed = buildBdayEmbed(0, files.length ? 'attachment://bday-friend.png' : avatarUrl);
  return channel.send({
    content: `${user}`,
    embeds: [embed],
    components: [bdayButtons(0)],
    files: files.length ? files : undefined
  });
}



// ========== Ticket panel ==========

async function postTicketPanel(channel, { description, bannerUrl, bannerAttachment } = {}) {
  const custom = description && String(description).trim();
  const embed = new EmbedBuilder()
    .setColor(0xbe2c71)
    .setAuthor({ name: 'Flare Drop · Support' })
    .setTitle('Ticket panel')
    .setDescription(
      (custom ? custom + '\n\n' : '') +
        '╭────────────────────╮\n' +
        '  **How it works**\n' +
        '╰────────────────────╯\n\n' +
        '**1.** Click a button below\n' +
        '**2.** Tell us briefly what you need\n' +
        '**3.** Staff help you in a private channel\n\n' +
        '_One open ticket per person._'
    )
    .addFields(
      { name: 'Support', value: 'General help & questions', inline: true },
      { name: 'Claim', value: 'Invite rewards / payouts', inline: true },
      { name: 'Report', value: 'Issues or reports', inline: true }
    )
    .setFooter({ text: BRAND.footer })
    .setTimestamp();
  if (bannerUrl) embed.setImage(bannerUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open_support').setLabel('Support').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    new ButtonBuilder().setCustomId('ticket_open_claim').setLabel('Claim reward').setStyle(ButtonStyle.Success).setEmoji('🎁'),
    new ButtonBuilder().setCustomId('ticket_open_report').setLabel('Report').setStyle(ButtonStyle.Secondary).setEmoji('🛡️')
  );

  const payload = { embeds: [embed], components: [row] };
  if (bannerAttachment) payload.files = [bannerAttachment];
  return channel.send(payload);
}

async function createSupportTicket(guild, user, reason) {
  if (!data.ticketCount) data.ticketCount = {};
  data.ticketCount[guild.id] = (data.ticketCount[guild.id] || 0) + 1;
  const n = data.ticketCount[guild.id];
  saveData();

  const overwrites = [
    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    },
    {
      id: client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels
      ]
    }
  ];
  if (TICKET_SUPPORT_ROLE_ID) {
    overwrites.push({
      id: TICKET_SUPPORT_ROLE_ID,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const parent = TICKET_CATEGORY_ID || undefined;
  const channel = await guild.channels.create({
    name: `ticket-${n}-${user.username}`.slice(0, 90).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    type: ChannelType.GuildText,
    parent: parent || null,
    permissionOverwrites: overwrites,
    topic: `Ticket for ${user.id} | ${reason || 'support'}`
  });

  const embed = new EmbedBuilder()
    .setColor(0xbe2c71)
    .setAuthor({ name: 'Flare Drop · Ticket' })
    .setTitle('Your ticket is open')
    .setDescription(
      `Hey ${user} — thanks for reaching out.\n\n` +
        (reason ? `**Topic:** ${reason}\n\n` : '') +
        `Staff has been notified. Share any proof here if needed.\n\n` +
        `_Close with the button below when you are done._`
    )
    .setFooter({ text: BRAND.footer })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: TICKET_SUPPORT_ROLE_ID
      ? `${user} · <@&${TICKET_SUPPORT_ROLE_ID}>`
      : `${user}`,
    embeds: [embed],
    components: [row]
  });
  return channel;
}



async function protectionLog(guild, title, description, color = 0xed4245) {
  try {
    const logId = getProtection().logChannelId || ANTIRAID_LOG_CHANNEL_ID;
    if (!logId) return;
    const ch = guild.channels.cache.get(logId) ||
      await guild.channels.fetch(logId).catch(() => null);
    if (!ch) return;
    await ch.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(description)
          .setTimestamp()
          .setFooter({ text: BRAND.footer })
      ]
    }).catch(() => {});
  } catch (_) {}
}

function trackWindow(map, key, windowMs) {
  const now = Date.now();
  let arr = (map.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  map.set(key, arr);
  return arr.length;
}

function isProtectedStaff(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (typeof isCoOwnerOrAbove === 'function' && isCoOwnerOrAbove(member)) return true;
  if (typeof isStaff === 'function' && isStaff(member)) return true;
  return member.permissions?.has?.(PermissionFlagsBits.Administrator);
}


function getProtection() {
  if (!data.protection || typeof data.protection !== 'object') {
    data.protection = {
      automod: true,
      antinuke: true,
      antiraid: true,
      logChannelId: '',
      badWords: ['nigger', 'faggot', 'retard'],
      spamMsgLimit: 6,
      spamWindowMs: 5000,
      spamTimeoutMs: 10 * 60 * 1000,
      joinRaidLimit: 8,
      joinRaidWindowMs: 15000,
      nukeActionLimit: 3,
      nukeWindowMs: 20000,
      massPingLimit: 3,
      massPingWindowMs: 15000,
      massPingTimeoutMs: 3 * 24 * 60 * 60 * 1000
    };
  }
  const p = data.protection;
  // coerce
  if (!Array.isArray(p.badWords)) p.badWords = [];
  return p;
}

function saveProtection(patch = {}) {
  const p = getProtection();
  Object.assign(p, patch);
  data.protection = p;
  saveData();
  return p;
}


/** Multi-prefix command groups */
const STATS_CMDS = new Set([
  'i', 'inv', 'invite', 'invites', 'falcon',
  'm', 'messages', 'msgcount',
  'si', 'serverinfo', 'server',
  'leaderboard', 'lb', 'top',
  'removeinvite', 'removeinvites', 'rinv', 'rmi',
  'addinvite', 'addinvites', 'ainv',
  'best'
]);
const STOCK_CMDS = new Set([
  'stock', 'mcfa', 'pay', 'buy', 'salary', 'clear',
  'genstock', 'gstock', 'g3n', 'genadd', 'genclear',
  'fgen', 'pgen', 'cstatus', 'claim',
  'donut', 'hypixel', 'nitro', 'netflix', 'steam', 'xbox', 'custom',
  'addstock', 'export', 'import', 'hit', 'msg',
  'format', 'custompay', 'custom'
]);
const MOD_CMDS = new Set([
  'ban', 'unban', 'kick', 'timeout', 'mute', 'unmute', 'untimeout',
  'warn', 'warnings', 'purge', 'clearmsg', 'prune', 'nuke',
  'lock', 'unlock', 'slowmode', 'nick', 'nickname', 'role',
  'gstart', 'giveaway', 'greroll', 'gend',
  'ticketpanel', 'ticket-panel', 'setwelcome',
  'protection', 'automod', 'security',
  'staff', 'staffstats', 'online',
  'teamup', 'close', 'leave', 'team',
  'autorole', 'autoroles', 'autoreact', 'autoreaction',
  'react', 'say', 'embed', 'announce', 'poll',
  'userinfo', 'ui', 'avatar', 'av', 'banner',
  'roleinfo', 'channelinfo', 'emoji', 'emojis',
  'addrole', 'removerole', 'softban', 'massban',
  'hide', 'show', 'snipe', 'editsnipe',
  'afk', 'remind', 'reminder', 'ping', 'uptime', 'steal', 'addemoji',
  'membercount', 'botinfo', 'invite', 'support',
  'modhelp', 'help'
]);

function detectPrefix(content) {
  if (!content) return null;
  // longest first: avoid matching partial
  const candidates = [PREFIX_STATS, PREFIX_STOCK, PREFIX_MOD, PREFIX_MOD_ALT, PREFIX].filter(Boolean);
  // unique preserve order
  const seen = new Set();
  for (const p of candidates) {
    if (seen.has(p)) continue;
    seen.add(p);
    if (content.startsWith(p)) return p;
  }
  return null;
}

function expectedPrefixFor(cmd) {
  if (cmd === 'help' || cmd === 'commands' || cmd === 'modhelp') return null; // any prefix
  if (STATS_CMDS.has(cmd)) return PREFIX_STATS;
  if (STOCK_CMDS.has(cmd)) return PREFIX_STOCK;
  if (MOD_CMDS.has(cmd)) return PREFIX_MOD;
  return null;
}


function buildFullHelpEmbeds() {
  const s = PREFIX_STATS;
  const k = PREFIX_STOCK;
  const m = PREFIX_MOD;
  const m2 = PREFIX_MOD_ALT || '!';
  const pages = [
    {
      title: 'Flare Drop · Help',
      desc:
        '**Three prefixes**\n' +
        '`' + s + '` **Stats** — invites, messages, server, leaderboards\n' +
        '`' + k + '` **Stock** — inventory, pay, gen, claim\n' +
        '`' + m + '` / `' + m2 + '` **Mod** — moderation, tickets, giveaways, tools\n\n' +
        'Slash commands `/` also work for many features.\n' +
        'Use `' + m + 'help` or `' + m2 + 'help` anytime.'
    },
    {
      title: 'Stats  ' + s,
      desc: [
        '`' + s + 'i` / `' + s + 'invites` [@user] — invite card',
        '`' + s + 'invites top` — invite leaderboard',
        '`' + s + 'invites reset @user|all` — reset (staff)',
        '`' + s + 'invites add/remove/set/bonus` — manage (staff)',
        '`' + s + 'rmi` / `' + s + 'removeinvite @user` — remove joins',
        '`' + s + 'm` / `' + s + 'messages` [@user] — message count',
        '`' + s + 'si` / `' + s + 'serverinfo` — server info',
        '`' + s + 'leaderboard m` — message LB',
        '`' + s + 'leaderboard i` — invite LB',
        '`' + s + 'best @role` — top by messages + invites'
      ].join('\n')
    },
    {
      title: 'Stock  ' + k,
      desc: [
        '`' + k + 'stock` — pay stock list',
        '`' + k + 'mcfa` / product cmds — product stock',
        '`' + k + 'pay @user [product] [n]` — pay from stock',
        '`' + k + 'claim` — claim invite reward (ticket)',
        '`' + k + 'fgen` / `' + k + 'pgen` — free / paid gen',
        '`' + k + 'genstock` / `' + k + 'genadd` — gen pool',
        '`' + k + 'cstatus` — free-gen status check',
        '`' + k + 'salary @user` — salary pay (restricted)',
        '`' + k + 'clear` — clear MCFA pay stock',
        '`' + k + 'format email:pass` — validate format',
        '`' + k + 'addstock` — add pay lines (staff)'
      ].join('\n')
    },
    {
      title: 'Mod & tools  ' + m + ' / ' + m2,
      desc: [
        '`' + m + 'ban` `' + m + 'unban` `' + m + 'kick`',
        '`' + m + 'timeout` / `' + m + 'mute` · `' + m + 'unmute`',
        '`' + m + 'warn` `' + m + 'warnings`',
        '`' + m + 'purge <1-100>` [`@user`] · `' + m + 'lock` `' + m + 'unlock` `' + m + 'slowmode`',
        '`' + m + 'hide` `' + m + 'show` `' + m + 'nick` `' + m + 'role add|remove`',
        '`' + m + 'softban` `' + m + 'say` `' + m + 'embed` `' + m + 'poll` `' + m + 'snipe`',
        '`' + m + 'userinfo` `' + m + 'avatar` `' + m + 'ping` `' + m + 'uptime` `' + m + 'botinfo`',
        '`' + m + 'gstart <time> <winners> <prize>`',
        '`' + m + 'greroll <messageId>`',
        '`' + m + 'ticketpanel [text]` + optional image',
        '`' + m + 'setwelcome #channel`',
        '`' + m + 'protection` — auto-mod / anti-nuke settings',
        '`' + m + 'autorole set @role`',
        '`' + m + 'autoreact add <word> <emoji>`',
        '`' + m + 'staffstats` `' + m + 'online @role`',
        '`' + m + 'teamup @users` `' + m + 'close` `' + m + 'leave`',
        '`' + m + 'help` / `' + m2 + 'help` — this menu'
      ].join('\n')
    }
  ];
  return pages.map((p, i) =>
    new EmbedBuilder()
      .setColor(BRAND.colorDark)
      .setTitle(p.title)
      .setDescription(p.desc)
      .setFooter({ text: `Page ${i + 1}/${pages.length} · ${BRAND.footer}` })
      .setTimestamp()
  );
}

async function onReady() {
  cleanupClosedTickets();
  setInterval(cleanupClosedTickets, 10 * 60 * 1000);
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const cmds = [
      new SlashCommandBuilder().setName('help').setDescription('List bot commands'),
      new SlashCommandBuilder().setName('memories').setDescription('Private memory journey (invite only)'),
      new SlashCommandBuilder().setName('gstart').setDescription('Start giveaway')
        .addStringOption(o => o.setName('time').setDescription('10m / 1h / 1d').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true))
        .addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true)),
      new SlashCommandBuilder().setName('greroll').setDescription('Reroll giveaway')
        .addStringOption(o => o.setName('message_id').setDescription('Giveaway message id').setRequired(true)),
      new SlashCommandBuilder().setName('stock').setDescription('View pay + gen stock'),
      new SlashCommandBuilder().setName('genstock').setDescription('View gen stock'),
      new SlashCommandBuilder().setName('genadd').setDescription('Add accounts to gen stock (staff)')
        .addStringOption(o => o.setName('product').setDescription('mcfa / nitro / netflix…').setRequired(true))
        .addStringOption(o => o.setName('lines').setDescription('Accounts, one per line or space-separated').setRequired(true)),
      new SlashCommandBuilder().setName('pay').setDescription('Pay a user from stock (staff)')
        .addUserOption(o => o.setName('user').setDescription('User to pay').setRequired(true))
        .addStringOption(o => o.setName('product').setDescription('mcfa / nitro / netflix…'))
        .addIntegerOption(o => o.setName('amount').setDescription('How many (default 1)')),
      new SlashCommandBuilder().setName('claim').setDescription('Claim invite reward (use in ticket)'),
      new SlashCommandBuilder().setName('fgen').setDescription('Free gen — take 1 from gen stock')
        .addStringOption(o => o.setName('product').setDescription('mcfa / nitro / netflix…')),
      new SlashCommandBuilder().setName('pgen').setDescription('Paid gen — take 1 from gen stock')
        .addStringOption(o => o.setName('product').setDescription('mcfa / nitro / netflix…')),
      new SlashCommandBuilder().setName('cstatus').setDescription('Check free-gen status requirement'),
      new SlashCommandBuilder().setName('best').setDescription('Top members in a role by messages + invites')
        .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
      new SlashCommandBuilder().setName('online').setDescription('Show online members in a role')
        .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
      new SlashCommandBuilder().setName('staffstats').setDescription('Staff team overview'),
      new SlashCommandBuilder().setName('flare').setDescription('Economy: balance / top / daily')
        .addStringOption(o => o.setName('action').setDescription('balance | top | daily | give')
          .addChoices(
            { name: 'balance', value: 'balance' },
            { name: 'top', value: 'top' },
            { name: 'daily', value: 'daily' },
            { name: 'give', value: 'give' }
          ))
        .addUserOption(o => o.setName('user').setDescription('User (for balance/give)'))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount (for give)')),
      new SlashCommandBuilder().setName('ticketpanel').setDescription('Post ticket panel (staff)')
        .addStringOption(o => o.setName('description').setDescription('Panel text (optional)').setRequired(false))
        .addAttachmentOption(o => o.setName('banner').setDescription('Optional banner image under the panel').setRequired(false)),
      new SlashCommandBuilder().setName('setwelcome').setDescription('Set welcome channel (staff)')
        .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').setRequired(true)),
      new SlashCommandBuilder().setName('invites').setDescription('Invites (Falcon-style)')
        .addStringOption(o =>
          o.setName('action').setDescription('view | top | reset | remove | add | bonus')
            .addChoices(
              { name: 'view', value: 'view' },
              { name: 'top', value: 'top' },
              { name: 'reset', value: 'reset' },
              { name: 'reset_all', value: 'reset_all' },
              { name: 'remove', value: 'remove' },
              { name: 'add', value: 'add' },
              { name: 'bonus', value: 'bonus' }
            )
        )
        .addUserOption(o => o.setName('user').setDescription('User (for view/reset/remove/add/bonus)'))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount for remove/add/bonus').setMinValue(1)),
      new SlashCommandBuilder().setName('removeinvite').setDescription('Remove invite joins from a user (staff)')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('How many (default 1)').setMinValue(1)),
      new SlashCommandBuilder().setName('leaderboard').setDescription('Message or invite leaderboard')
        .addStringOption(o =>
          o.setName('type').setDescription('messages or invites')
            .addChoices(
              { name: 'messages', value: 'messages' },
              { name: 'invites', value: 'invites' }
            )
        ),
      new SlashCommandBuilder().setName('clear').setDescription('Clear MCFA pay stock (staff)'),
      new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
        .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
      new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
        .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
      new SlashCommandBuilder().setName('timeout').setDescription('Timeout (mute) a member')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('10m / 1h / 1d').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
      new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
      new SlashCommandBuilder().setName('warn').setDescription('Warn a member')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
      new SlashCommandBuilder().setName('warnings').setDescription('List warnings for a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
      new SlashCommandBuilder().setName('staff').setDescription('Staff apply open/close or apply')
        .addStringOption(o => o.setName('action').setDescription('apply | open | close').setRequired(true)
          .addChoices(
            { name: 'apply', value: 'apply' },
            { name: 'open', value: 'open' },
            { name: 'close', value: 'close' }
          )),
      new SlashCommandBuilder().setName('daily').setDescription('Daily tools (staff)')
        .addStringOption(o => o.setName('mode').setDescription('pay = spin reward for user')
          .addChoices({ name: 'pay', value: 'pay' }))
        .addUserOption(o => o.setName('user').setDescription('User for daily pay')),
      new SlashCommandBuilder().setName('teamup').setDescription('Create TeamUp channel with users')
        .addUserOption(o => o.setName('user1').setDescription('Member 1').setRequired(true))
        .addUserOption(o => o.setName('user2').setDescription('Member 2'))
        .addUserOption(o => o.setName('user3').setDescription('Member 3')),
      new SlashCommandBuilder().setName('close').setDescription('Close TeamUp channel (creator/staff)'),
      new SlashCommandBuilder().setName('leave').setDescription('Leave TeamUp channel'),
      new SlashCommandBuilder().setName('format').setDescription('Validate email:pass format')
        .addStringOption(o => o.setName('account').setDescription('email:pass').setRequired(true)),
      new SlashCommandBuilder().setName('salary').setDescription('Send salary reward (restricted)')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('How many')),
      new SlashCommandBuilder().setName('addstock').setDescription('Add to pay stock (staff)')
        .addStringOption(o => o.setName('product').setDescription('mcfa nitro netflix…').setRequired(true))
        .addStringOption(o => o.setName('lines').setDescription('email:pass lines').setRequired(true)),
      new SlashCommandBuilder().setName('g3n').setDescription('Gen stock view or add')
        .addStringOption(o => o.setName('action').setDescription('stock | add').setRequired(true)
          .addChoices({ name: 'stock', value: 'stock' }, { name: 'add', value: 'add' }))
        .addStringOption(o => o.setName('product').setDescription('For add: product name'))
        .addStringOption(o => o.setName('lines').setDescription('For add: accounts')),
      new SlashCommandBuilder().setName('genclear').setDescription('Clear gen stock for a product')
        .addStringOption(o => o.setName('product').setDescription('mcfa…').setRequired(true)),
      new SlashCommandBuilder().setName('hit').setDescription('Hits queue')
        .addStringOption(o => o.setName('action').setDescription('start | stop | add').setRequired(true)
          .addChoices({ name: 'start', value: 'start' }, { name: 'stop', value: 'stop' }, { name: 'add', value: 'add' }))
        .addStringOption(o => o.setName('type').setDescription('hypixel | donut | etc'))
        .addStringOption(o => o.setName('lines').setDescription('email:pass for add')),
      new SlashCommandBuilder().setName('msg').setDescription('Post free/paid gen tutorial embeds (staff)')
        .addStringOption(o => o.setName('which').setDescription('free | paid | both')
          .addChoices({ name: 'free', value: 'free' }, { name: 'paid', value: 'paid' }, { name: 'both', value: 'both' })),
      new SlashCommandBuilder().setName('birthday').setDescription('Birthday gift (owner)')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
      new SlashCommandBuilder().setName('mute').setDescription('Timeout a member')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('10m / 1h / 1d').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),
      new SlashCommandBuilder().setName('unmute').setDescription('Remove timeout')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
      new SlashCommandBuilder().setName('protection').setDescription('Protection status / toggles (staff)')
        .addStringOption(o =>
          o.setName('action').setDescription('What to do')
            .addChoices(
              { name: 'status', value: 'status' },
              { name: 'automod_on', value: 'automod_on' },
              { name: 'automod_off', value: 'automod_off' },
              { name: 'antinuke_on', value: 'antinuke_on' },
              { name: 'antinuke_off', value: 'antinuke_off' }
            )
        ),
      new SlashCommandBuilder().setName('si').setDescription('Server information'),
      new SlashCommandBuilder().setName('m').setDescription('Message count')
        .addUserOption(o => o.setName('user')),
      new SlashCommandBuilder().setName('i').setDescription('Invite card')
        .addUserOption(o => o.setName('user')),
      new SlashCommandBuilder().setName('rmi').setDescription('Remove invites (staff)')
        .addUserOption(o => o.setName('user').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setMinValue(1)),
      new SlashCommandBuilder().setName('lock').setDescription('Lock channel (staff)'),
      new SlashCommandBuilder().setName('unlock').setDescription('Unlock channel (staff)'),
      new SlashCommandBuilder().setName('slowmode').setDescription('Slowmode (staff)')
        .addIntegerOption(o => o.setName('seconds').setRequired(true).setMinValue(0).setMaxValue(21600)),
      new SlashCommandBuilder().setName('purge').setDescription('Bulk delete messages (staff)')
        .addIntegerOption(o => o.setName('amount').setRequired(true).setMinValue(1).setMaxValue(100)),
      new SlashCommandBuilder().setName('nick').setDescription('Set nickname (staff)')
        .addUserOption(o => o.setName('user').setRequired(true))
        .addStringOption(o => o.setName('nickname')),
      new SlashCommandBuilder().setName('role').setDescription('Add/remove role (staff)')
        .addStringOption(o => o.setName('action').setRequired(true)
          .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }))
        .addUserOption(o => o.setName('user').setRequired(true))
        .addRoleOption(o => o.setName('role').setRequired(true))
    ].map(c => c.toJSON());
    await rest.put(Routes.applicationCommands(client.user.id), { body: cmds });
    console.log('Slash commands registered (help pay claim stock fgen pgen …)');
  } catch (e) {
    console.error('slash register', e.message);
  }

  console.log(`Logged in as ${client.user.tag}`);
  for (const [, guild] of client.guilds.cache) {
    await cacheGuildInvites(guild);
  }
  setInterval(() => saveData(), 60_000);
}

client.once('ready', onReady);

async function cleanupClosedTickets() {
  try {
    for (const [, guild] of client.guilds.cache) {
      for (const [, ch] of guild.channels.cache) {
        if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) continue;
        const n = (ch.name || '').toLowerCase();
        // closed ticket channels
        if (n.startsWith('closed-') || n.includes('ticket-closed') || n.startsWith('closed│') || n.startsWith('closed|')) {
          await ch.delete('Auto-delete closed ticket').catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('ticket cleanup', e.message);
  }
}

client.once('clientReady', onReady);

client.on('inviteCreate', async (invite) => {
  try {
    if (!data.inviteUses[invite.guild.id]) data.inviteUses[invite.guild.id] = {};
    data.inviteUses[invite.guild.id][invite.code] = {
      uses: invite.uses || 0,
      inviterId: invite.inviter?.id || null
    };
    saveData();
  } catch (_) {}
});

client.on('guildMemberAdd', async (member) => {
  const guild = member.guild;
  let inviterId = null;
  try {
    // Do NOT auto-role the verified/access role — that must come from verification only
    const roleId = data.autorole?.[guild.id];
    const vRole = (data.verification?.[guild.id]?.roleId) || VERIFIED_ROLE_ID;
    if (roleId && roleId !== vRole) {
      await member.roles.add(roleId, 'Auto-role').catch(() => {});
    }
  } catch (_) {}

  // Join-raid detection
  try {
    if (getProtection().antinuke) {
      const protJ = getProtection();
      const joins = trackWindow(joinRaidTracker, member.guild.id, protJ.joinRaidWindowMs);
      if (joins >= protJ.joinRaidLimit) {
        await protectionLog(
          member.guild,
          'Anti-raid · Mass join',
          `**${joins}** joins in ${Math.round(protJ.joinRaidWindowMs / 1000)}s.\nLatest: ${member.user.tag}`
        );
        // timeout newest non-staff joiners is aggressive; just log + optional kick if very new account
        const age = Date.now() - member.user.createdTimestamp;
        if (age < 3 * 24 * 60 * 60 * 1000) {
          await member.kick('Anti-raid: mass join + new account').catch(() => {});
        }
      }
    }
  } catch (_) {}


  try {
    const invites = await guild.invites.fetch();
    const previous = data.inviteUses[guild.id] || {};
    let used = null;
    invites.forEach((inv) => {
      const before = previous[inv.code]?.uses || 0;
      if ((inv.uses || 0) > before) used = inv;
    });
    data.inviteUses[guild.id] = {};
    invites.forEach((inv) => {
      data.inviteUses[guild.id][inv.code] = {
        uses: inv.uses || 0,
        inviterId: inv.inviter?.id || null
      };
    });
    if (used && used.inviter) {
      inviterId = used.inviter.id;
      const gid = guild.id;
      const s = ensureInviteStats(gid, inviterId);
      s.joins = (s.joins || 0) + 1;
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][inviterId] = getInviteBreakdown(gid, inviterId).total;
      if (!data.invitedBy[gid]) data.invitedBy[gid] = {};
      data.invitedBy[gid][member.id] = inviterId; // for leave cancellation
      // mark join time for fake detection (leave < 1 day = fake optional)
      if (!data.inviteJoinAt) data.inviteJoinAt = {};
      if (!data.inviteJoinAt[gid]) data.inviteJoinAt[gid] = {};
      data.inviteJoinAt[gid][member.id] = Date.now();
    }
    saveData();
  } catch (e) {
    console.error('guildMemberAdd invite track:', e.message);
  }

  // Welcome message
  try {
    const chId = (data.settings && data.settings.welcomeChannelId) || WELCOME_CHANNEL_ID;
    const ch = chId
      ? await guild.channels.fetch(chId).catch(() => null)
      : guild.systemChannel;
    if (ch && ch.isTextBased?.()) {
      const msg = String(WELCOME_MESSAGE)
        .replace(/\{user\}/gi, `${member}`)
        .replace(/\{server\}/gi, guild.name)
        .replace(/\{count\}/gi, String(guild.memberCount))
        .replace(/\{inviter\}/gi, inviterId ? `<@${inviterId}>` : 'Unknown');
      const embed = new EmbedBuilder()
        .setColor(0xbe2c71)
        .setTitle('Welcome')
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({
          text: inviterId
            ? `Invited by someone · Total members ${guild.memberCount}`
            : `Total members ${guild.memberCount}`
        })
        .setTimestamp();
      if (inviterId) {
        embed.addFields({ name: 'Invited by', value: `<@${inviterId}>`, inline: true });
      }
      await ch.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
    }
  } catch (e) {
    console.error('welcome:', e.message);
  }
});

// Invite cancellation when member leaves
client.on('guildMemberRemove', async (member) => {
  try {
    const gid = member.guild.id;
    const inviterId = data.invitedBy?.[gid]?.[member.id];
    if (inviterId) {
      const s = ensureInviteStats(gid, inviterId);
      s.leaves = (s.leaves || 0) + 1;
      // left within 24h → count as fake (Falcon-style)
      const joinedAt = data.inviteJoinAt?.[gid]?.[member.id];
      if (joinedAt && Date.now() - joinedAt < 24 * 60 * 60 * 1000) {
        s.fake = (s.fake || 0) + 1;
      }
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][inviterId] = getInviteBreakdown(gid, inviterId).total;
      delete data.invitedBy[gid][member.id];
      if (data.inviteJoinAt?.[gid]) delete data.inviteJoinAt[gid][member.id];
      saveData();
      console.log(`Invite leave: ${member.id} → inviter ${inviterId} leaves=${s.leaves}`);
    }
  } catch (e) {
    console.error('guildMemberRemove invite cancel:', e.message);
  }
});




async function exportStockToChannel(message, kind, lines, label) {
  if (!lines.length) {
    return message.reply(`No **${label}** stock to export.`);
  }
  const ch =
    message.mentions.channels.first() ||
    message.guild.channels.cache.get((message.content.match(/<#(\d+)>/) || [])[1]) ||
    message.channel;

  if (!ch || !ch.isTextBased?.()) {
    return message.reply('Mention a text channel: `-mcfa export #channel`');
  }

  if (!data.exportCounts) data.exportCounts = { mcfa: 0, custom: 0, hits: 0 };
  data.exportCounts[kind] = (data.exportCounts[kind] || 0) + 1;
  const n = data.exportCounts[kind];
  saveData();

  const filename = `export_${n}.txt`;
  const body =
    `Flare Drop — ${label} export #${n}\n` +
    `Exported by: ${message.author.tag} (${message.author.id})\n` +
    `At: ${new Date().toISOString()}\n` +
    `Count: ${lines.length}\n` +
    `${'='.repeat(40)}\n` +
    lines.join('\n') +
    `\n`;

  const file = new AttachmentBuilder(Buffer.from(body, 'utf8'), { name: filename });
  await ch.send({
    content: `📤 **${label} export** \`${filename}\` — **${lines.length}** item(s)`,
    files: [file]
  });
  return message.reply(
    `Exported successful all available **${label}** into ${ch}.\nUploaded as **${filename}**.`
  );
}


async function askOpenAI(userText, username) {
  let key = (OPENAI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!key) return null;

  // Valid secrets: sk-..., sk-proj-..., gsk_... (Groq)
  // Invalid alone: project-xxxx without sk-
  if (/^project-/i.test(key) && !/^sk-/i.test(key)) {
    console.warn('OPENAI_API_KEY is a project id only. Use sk- / sk-proj- / gsk_ secret.');
    return '__BAD_KEY_FORMAT__';
  }

  // gsk_ = ALWAYS Groq (ignore OPENAI_BASE_URL if it points at openai.com)
  let base = OPENAI_BASE_URL || '';
  if (/^gsk_/i.test(key)) {
    base = 'https://api.groq.com/openai/v1';
  } else if (!base) {
    base = 'https://api.openai.com/v1';
  }
  base = String(base).replace(/\/$/, '');

  let model = (OPENAI_MODEL || '').trim();
  if (!model) {
    model = /^gsk_/i.test(key) || /groq\.com/i.test(base)
      ? 'openai/gpt-oss-20b'
      : 'gpt-4o-mini';
  }
  // Map dead/wrong models when using Groq
  if (/^gsk_/i.test(key) || /groq\.com/i.test(base)) {
    if (/gpt-4o|gpt-4|gpt-3|o1|o3|llama-3\.1-8b|llama-3\.3-70b/i.test(model)) {
      model = 'openai/gpt-oss-20b';
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + key
  };
  // OpenAI org/project only (not used by Groq)
  if (!/groq\.com/i.test(base)) {
    if (process.env.OPENAI_ORG_ID) headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID.trim();
    if (process.env.OPENAI_PROJECT_ID) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID.trim();
  }

  try {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 800,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              userText && userText.trim()
                ? userText.trim()
                : 'One short useful line about Flare Drop. No intro fluff.'
          }
        ]
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data?.error?.message || res.statusText || String(res.status);
      console.error('AI error', base, res.status, errMsg);
      return '__API_ERROR__:' + errMsg;
    }
    const out = data?.choices?.[0]?.message?.content;
    return out && String(out).trim() ? String(out).trim().slice(0, 1900) : null;
  } catch (e) {
    console.error('AI fetch', e.message);
    return '__API_ERROR__:' + e.message;
  }
}

function ultimateFaqReply(text) {
  const q = String(text || '').toLowerCase().trim();

  // Block: bot-making + clearly illegal
  if (/(how to (make|code|build|create) (a )?bot|discord\.js tutorial|steal account|hack account|crack account|carding|phishing|doxx|ransomware)/i.test(q)) {
    return "I can't help with that. For **Flare Drop** help, open a ticket or ask staff.";
  }

  if (!q || q === 'help' || /^(hi|hello|hey)\b/.test(q)) {
    return (
      "**Flare Drop** — site: https://flaredrop.base44.app\n" +
      "Commands: `-help` · tickets: `?ticketpanel` · stock: `$stock`\n" +
      "Ask a specific question (invites, MCFA, tickets, prices)."
    );
  }

  if (/(website|site|web page|webstore|store link|url)/i.test(q)) {
    return (
      "**Website:** https://flaredrop.base44.app\n" +
      "Login with Discord → products, payment, tickets."
    );
  }

  if (/\bmcfa\b/.test(q)) {
    return (
      "**MCFA** = Minecraft **Full Access** (you get email + password style access as delivered by staff).\n" +
      "Order/claim via ticket or the website. Staff verify payment then deliver."
    );
  }
  if (/\bnfa\b/.test(q)) {
    return (
      "**NFA** = **Non-Full Access** account type (more limited than MCFA).\n" +
      "Ask staff in a ticket what's in stock right now."
    );
  }
  if (/\bsfa\b/.test(q)) {
    return (
      "**SFA** = **Semi-Full Access** — between NFA and MCFA depending on the listing.\n" +
      "Open a ticket for current stock and details."
    );
  }

  if (/(ticket|support|staff help|order problem|payment issue|upi|qr)/i.test(q)) {
    return (
      "Open a **support ticket** on this Discord, or use the site:\n" +
      "https://flaredrop.base44.app\n" +
      "Describe your issue and staff will help."
    );
  }

  if (/(invite|reward|claim|milestone)/i.test(q)) {
    return (
      "Create a **permanent invite**, invite real friends, hit a milestone, then open a ticket and use **`$claim`** (or follow the ticket bot) to pick your reward.\n" +
      "Fake/J4J invites don't count."
    );
  }

  if (/(price|cost|how much|rate|inr|robux|crunchyroll|youtube|premium)/i.test(q)) {
    return (
      "Prices change — check **https://flaredrop.base44.app** or ask staff in a ticket for the latest rates."
    );
  }

  if (/(legit|scam|trusted|safe)/i.test(q)) {
    return (
      "Use official tickets and the website only. Never pay random DMs.\n" +
      "Site: https://flaredrop.base44.app — if something's wrong, open a ticket."
    );
  }

  if (/(stock|available|have mcfa|out of stock)/i.test(q)) {
    return "Stock changes fast. Ask staff in a ticket or check the website for what's available.";
  }

  if (/(discord|server|rules)/i.test(q)) {
    return "This is the **Flare Drop** server — rewards, digital products, invite events. Follow staff instructions in tickets. Website: https://flaredrop.base44.app";
  }

  return (
    "Not sure on that.\n" +
    "Site: https://flaredrop.base44.app · Ticket for staff · `$stock` / `-i` / `!help`"
  );
}



async function deliverProductWithVouch(message, user, productKey, items, skipVouch) {
  const meta = PRODUCT_STOCKS[productKey] || { label: productKey, emoji: '📦' };
  const staff = message.author;
  const list = Array.isArray(items) ? items : [items];

  try {
    if (isMethodProduct(productKey)) {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xbe2c71)
            .setTitle(`Flare Drop — ${meta.label}`)
            .setDescription(
              `# ARE WE LEGIT?
Delivered by **${staff.username}**
Full method is in the spoiler message(s) below.`
            )
        ]
      });
      for (const it of list) await sendLongSpoiler(user, meta.label, it);
      return true;
    }
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xbe2c71)
          .setTitle(`Flare Drop — ${meta.label}`)
          .setDescription(
            list.map((it, i) => `**#${i + 1}** ||${it}||`).join('\n') +
              `\n\n# ARE WE LEGIT?\n` +
              `Delivered by **${staff.username}**\n` +
              `If login fails, open a ticket.\n` +
              `${typeof FLARE_WEB !== 'undefined' ? FLARE_WEB : 'https://flaredrop.base44.app'}`
          )
          .setTimestamp()
      ]
    });
    return true;
  } catch (e) {
    try {
      let dm =
        `**Flare Drop — ${meta.label}**\n` +
        list.map((it, i) => `**#${i + 1}** ||${it}||`).join('\n') +
        `\n\n# ARE WE LEGIT?\nDelivered by ${staff.username}`;
      await user.send(dm);
      return true;
    } catch (_) {
      return false;
    }
  }
}

function isMethodProduct(productKey) {
  return PRODUCT_STOCKS[productKey]?.type === 'method';
}
function getMethodText(productKey) {
  ensureStocks(data);
  const text = data.methods?.[productKey];
  return text && String(text).trim() ? String(text) : null;
}
function setMethodText(productKey, text) {
  ensureStocks(data);
  if (!data.methods) data.methods = {};
  data.methods[productKey] = String(text || '');
  saveData();
}
async function sendLongSpoiler(target, title, text) {
  const body = String(text || '');
  if (body.length <= 1800) {
    await target.send(`**${title}**
||${body}||`);
    return;
  }
  const chunkSize = 1700;
  let part = 1;
  for (let i = 0; i < body.length; i += chunkSize) {
    const slice = body.slice(i, i + chunkSize);
    await target.send(`**${title}** (part ${part})
||${slice}||`);
    part++;
  }
}

function parseDuration(str) {
  const m = String(str).trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  return n * ({ s: 1000, m: 60000, h: 3600000, d: 86400000 }[u] || 0);
}
function buildGiveawayLiveEmbed(g, hostTag) {
  const ends = Math.floor((g.ends || Date.now()) / 1000);
  const entries = (g.entries || []).length;
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({ name: 'Flare Drop · Giveaway' })
    .setTitle('GIVEAWAY')
    .setDescription(
      `╭──────────────────╮\n` +
        `   **${g.prize}**\n` +
        `╰──────────────────╯\n\n` +
        `**Winners** · \`${g.winners || 1}\`\n` +
        `**Entries** · \`${entries}\`\n` +
        `**Ends** · <t:${ends}:R> (<t:${ends}:f>)\n` +
        (hostTag ? `**Hosted by** · ${hostTag}\n` : '') +
        `\nClick **Enter** below to join.`
    )
    .setFooter({ text: BRAND.footer })
    .setTimestamp(g.ends || Date.now());
}

function buildGiveawayEndedEmbed(g, winners, reroll = false) {
  const entries = [...new Set(g.entries || [])].length;
  const winnerLine = winners.length
    ? winners.map((id, i) => `**${i + 1}.** <@${id}>`).join('\n')
    : '_No valid entries — no winners._';
  return new EmbedBuilder()
    .setColor(winners.length ? 0x57f287 : 0xed4245)
    .setAuthor({ name: reroll ? 'Flare Drop · Reroll' : 'Flare Drop · Ended' })
    .setTitle(reroll ? 'GIVEAWAY REROLLED' : 'GIVEAWAY ENDED')
    .setDescription(
      `╭──────────────────╮\n` +
        `   **${g.prize}**\n` +
        `╰──────────────────╯\n\n` +
        `**Winners**\n${winnerLine}\n\n` +
        `**Total entries** · \`${entries}\`\n` +
        `**Drawn** · <t:${Math.floor(Date.now() / 1000)}:f>`
    )
    .setFooter({
      text: winners.length ? 'Congratulations · Flare Drop' : 'Better luck next time · Flare Drop'
    })
    .setTimestamp();
}

function giveawayButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('gw_join').setLabel('Enter').setEmoji('🎉').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('gw_leave').setLabel('Leave').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId('gw_entries').setLabel('Entries').setStyle(ButtonStyle.Primary).setDisabled(disabled)
  );
}

async function endGiveaway(messageId, reroll = false) {
  const g = data.giveaways?.[messageId];
  if (!g) return;
  const ch = await client.channels.fetch(g.channelId).catch(() => null);
  if (!ch) return;
  const entries = [...new Set(g.entries || [])];
  const winners = [];
  const pool = entries.slice();
  const count = Math.min(g.winners || 1, pool.length);
  for (let i = 0; i < count; i++) {
    if (!pool.length) break;
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  g.ended = true;
  g.winnerIds = winners;
  saveData();
  const endEmbed = buildGiveawayEndedEmbed(g, winners, reroll);
  const ping = winners.length ? winners.map((id) => `<@${id}>`).join(' ') : null;
  try {
    const msg = await ch.messages.fetch(messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [endEmbed], components: [giveawayButtons(true)] }).catch(() => {});
    }
  } catch (_) {}
  await ch.send({
    content: ping ? `${reroll ? '**Reroll!**' : '**Giveaway ended!**'} ${ping}` : undefined,
    embeds: [
      new EmbedBuilder()
        .setColor(winners.length ? 0xf1c40f : 0x95a5a6)
        .setTitle(reroll ? 'New winner(s) drawn' : 'Thanks for entering')
        .setDescription(
          winners.length
            ? `Prize: **${g.prize}**\n\nPlease open a ticket or wait for staff to deliver your reward.`
            : `Prize **${g.prize}** had no entries.`
        )
        .setFooter({ text: BRAND.footer })
        .setTimestamp()
    ]
  }).catch(() => {});
}

async function takeFromStock(productKey, amount, pool = 'normal') {
  ensureStocks(data);
  if (isMethodProduct(productKey)) {
    const text = getMethodText(productKey);
    if (!text) return null;
    return Array.from({ length: amount || 1 }, () => text);
  }
  const arr = getStock(productKey, pool).slice();
  if (arr.length < amount) return null;
  const taken = arr.splice(0, amount);
  setStock(productKey, arr, pool);
  saveData();
  return taken;
}



client.on('presenceUpdate', async (before, after) => {
  try {
    if (!after || after.user?.bot || !after.guild) return;
    const role = after.guild.roles.cache.get(FREE_GEN_ROLE_ID);
    if (!role) return;
    const custom = after.activities?.find((a) => a.type === 4);
    const statusText = custom?.state || '';
    const ok = statusText.includes(FREE_STATUS_TEXT);
    const has = after.roles.cache.has(FREE_GEN_ROLE_ID);
    if (ok && !has) await after.roles.add(role).catch(() => {});
    if (!ok && has) await after.roles.remove(role).catch(() => {});
  } catch (_) {}
});


client.on('messageDelete', async (message) => {
  try {
    if (!message.guild || message.author?.bot) return;
    if (!data.snipes) data.snipes = {};
    data.snipes[message.channel.id] = {
      content: message.content || '',
      tag: message.author?.tag,
      avatar: message.author?.displayAvatarURL?.({ size: 64 }),
      at: Date.now()
    };
  } catch (_) {}
});

client.on('messageCreate', async (message) => {
  // ===== Verification math answer (DM only) =====
  if (!message.guild) {
    if (message.author.bot) return;
    if (!pendingVerify.has(message.author.id)) return;
    const pend = pendingVerify.get(message.author.id);
    if (Date.now() - pend.at > 10 * 60 * 1000) {
      pendingVerify.delete(message.author.id);
      await message.reply('Verification expired. Click **Verify** again in the server.').catch(() => {});
      return;
    }
    const ans = parseInt(String(message.content).replace(/[^0-9-]/g, ''), 10);
    if (Number.isNaN(ans)) {
      await message.reply('Send the **number** only, e.g. `55`').catch(() => {});
      return;
    }
    if (ans !== pend.answer) {
      const challenge = randomMathChallenge();
      pend.answer = challenge.a;
      pend.at = Date.now();
      pendingVerify.set(message.author.id, pend);
      await message.reply(`Wrong answer. Try again:\n## ${challenge.q}`).catch(() => {});
      return;
    }
    pendingVerify.delete(message.author.id);
    try {
      const guild = client.guilds.cache.get(pend.guildId) || await client.guilds.fetch(pend.guildId);
      const member = await guild.members.fetch(message.author.id);
      await member.roles.add(pend.roleId, 'Math verification');
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Verified!')
            .setDescription(`You are verified in **${guild.name}**. Welcome!`)
            .setFooter({ text: BRAND.footer })
        ]
      }).catch(() => {});
    } catch (e) {
      await message.reply('Correct, but I could not give the role. Ask staff. (' + (e.message || e) + ')').catch(() => {});
    }
    return;
  }

  // ========== Falcon -i invite sync ==========
  if (message.author.bot && message.author.id === FALCON_BOT_ID) {
    try {
      const parsed = parseFalconInvites(message);
      if (parsed && parsed.count !== null) {
        let uid = parsed.userId;
        // If Falcon didn't mention user, try reference (reply to -i command)
        if (!uid && message.reference?.messageId) {
          const ref = await message.channel.messages
            .fetch(message.reference.messageId)
            .catch(() => null);
          if (ref) {
            uid =
              ref.mentions?.users?.first()?.id ||
              ref.author?.id ||
              null;
            // -i @user → mention; -i alone → author
            if (ref.content && /^[-/]?i(nvites)?/i.test(ref.content.trim())) {
              uid = ref.mentions?.users?.first()?.id || ref.author.id;
            }
          }
        }
        if (uid) {
          setFalconInvites(message.guild.id, uid, parsed.count);
          console.log(
            `Falcon sync: ${uid} → ${parsed.count} invites in ${message.guild.id}`
          );
        }
      }
    } catch (e) {
      console.error('Falcon parse:', e.message);
    }
    return;
  }

  if (message.author.bot) return;

  addMessage(message.guild.id, message.author.id);

  // ========== LEGIT REACTION ==========
  // If message contains the word "legit" → react with ✅
  try {
    if (/\blegit\b/i.test(message.content)) {
      await message.react('✅').catch(() => {});
    }
  } catch (_) {}


  // ========== @Bot AI — only when USER is @mentioned, not @everyone/@here ==========
  try {
    if (
      client.user &&
      message.mentions.users.has(client.user.id) &&
      !message.mentions.everyone
    ) {
      const cleaned = message.content
        .replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '')
        .replace(/<@&\d+>/g, '')
        .replace(/@everyone/gi, '')
        .replace(/@here/gi, '')
        .trim();

      // Skip if this is mostly a mass role ping with no real question
      if (!cleaned && message.mentions.roles.size > 0) {
        // no-op
      } else {
        await message.channel.sendTyping().catch(() => {});
        let replyText = await askOpenAI(
          cleaned || 'Reply in one short useful line for Flare Drop. No intro fluff.',
          message.author.username
        );
                if (replyText === '__BAD_KEY_FORMAT__') {
          replyText =
            'AI key format wrong. Use secret key in OPENAI_API_KEY (starts with sk-, sk-proj-, or gsk_). A bare project- id is not enough.';
        } else if (replyText && String(replyText).startsWith('__API_ERROR__:')) {
          const err = String(replyText).slice('__API_ERROR__:'.length);
          replyText = 'AI error: ' + err.slice(0, 200);
        } else if (!replyText) {
          replyText = ultimateFaqReply(cleaned || 'help');
        }

        await message.reply({ content: replyText, allowedMentions: { repliedUser: true, parse: [] } }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('ai:', e.message);
  }


  // Vouch auto-thanks disabled for Flare (no vouch channel required)


  // ========== ANTI MASS-PING ==========
  // If the same user is mentioned 3+ times quickly by one person → 3 day timeout
  try {
    if (message.mentions.users.size > 0 && message.member && message.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const now = Date.now();
      for (const [targetId] of message.mentions.users) {
        if (targetId === message.author.id) continue; // ignore self-pings

        // Never punish for pinging someone who has the Owner role
        const targetMember = message.guild.members.cache.get(targetId) ||
          await message.guild.members.fetch(targetId).catch(() => null);
        if (targetMember && OWNER_ROLE_ID && targetMember.roles.cache.has(OWNER_ROLE_ID)) {
          continue;
        }

        const key = `${message.author.id}:${targetId}`;
        let times = recentMentions.get(key) || [];
        const _mpWin = getProtection().massPingWindowMs || MASS_PING_WINDOW_MS;
        times = times.filter((t) => now - t < _mpWin);
        times.push(now);
        recentMentions.set(key, times);

        if (times.length >= (getProtection().massPingLimit || MASS_PING_LIMIT)) {
          recentMentions.delete(key);
          // Apply 3-day timeout
          await message.member.timeout(MASS_PING_TIMEOUT_MS, `Anti-raid: mass pinged the same user ${MASS_PING_LIMIT}+ times`);
          await message.reply(
            `⏱️ **${message.author.username}** has been timed out for **3 days** for mass-pinging.`
          ).catch(() => {});

          // Optional log
          if (getProtection().logChannelId || ANTIRAID_LOG_CHANNEL_ID) {
            const logCh = message.guild.channels.cache.get(ANTIRAID_LOG_CHANNEL_ID);
            if (logCh) {
              const embed = new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle('🛡️ Anti-Raid — Mass Ping')
                .setDescription(
                  `**User:** ${message.author.tag} (\`${message.author.id}\`)
` +
                  `**Target:** <@${targetId}>
` +
                  `**Action:** Timed out for 3 days
` +
                  `**Channel:** ${message.channel}`
                )
                .setTimestamp();
              logCh.send({ embeds: [embed] }).catch(() => {});
            }
          }
          break;
        }
      }
    }
  } catch (e) {
    console.error('Mass-ping protection error:', e.message);
  }


  // ========== AUTO-MOD: spam + bad words ==========
  try {
    if (getProtection().automod && message.guild && message.member && !message.author.bot) {
      if (!isProtectedStaff(message.member)) {
        // Spam: too many messages in window
        const prot = getProtection();
        const sc = trackWindow(spamTracker, message.author.id, prot.spamWindowMs);
        if (sc >= prot.spamMsgLimit) {
          spamTracker.delete(message.author.id);
          await message.delete().catch(() => {});
          await message.member.timeout(prot.spamTimeoutMs, 'Auto-mod: spam').catch(() => {});
          await message.channel.send(
            `**${message.author.username}** timed out for spam.`
          ).catch(() => {});
          await protectionLog(
            message.guild,
            'Auto-mod · Spam',
            `**User:** ${message.author.tag} (\`${message.author.id}\`)\n**Channel:** ${message.channel}`
          );
        } else {
          // Bad words
          const lower = (message.content || '').toLowerCase();
          const hit = getProtection().badWords.find((w) => w && lower.includes(w));
          if (hit) {
            await message.delete().catch(() => {});
            await message.channel.send(
              `${message.author} message removed (filtered word).`
            ).catch(() => {});
            await protectionLog(
              message.guild,
              'Auto-mod · Filter',
              `**User:** ${message.author.tag}\n**Channel:** ${message.channel}`
            );
          }
          // Mass mentions (@everyone or 5+ users)
          const mentionCount = message.mentions.users.size + (message.mentions.everyone ? 5 : 0);
          if (mentionCount >= 5 || message.mentions.everyone) {
            if (!message.member.permissions.has(PermissionFlagsBits.MentionEveryone)) {
              await message.delete().catch(() => {});
              await message.member.timeout(getProtection().spamTimeoutMs, 'Auto-mod: mass mention').catch(() => {});
              await protectionLog(
                message.guild,
                'Auto-mod · Mass mention',
                `**User:** ${message.author.tag}\n**Channel:** ${message.channel}`
              );
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('automod:', e.message);
  }


  // Auto-reactions
  try {
    const rules = data.autoreact?.[message.guild.id];
    if (rules?.length && message.content && !message.author.bot) {
      const lower = message.content.toLowerCase();
      for (const r of rules) {
        if (r.trigger && lower.includes(r.trigger)) {
          await message.react(r.emoji).catch(() => {});
        }
      }
    }
  } catch (_) {}

  // ========== COUNTING CHANNEL ==========
  try {
    const countData = data.counting[message.channel.id];
    if (countData && !detectPrefix(message.content)) {
      const content = message.content.trim();
      // Only pure numbers count
      if (/^\d+$/.test(content)) {
        const num = parseInt(content, 10);
        const expected = (countData.current || 0) + 1;

        if (message.author.id === countData.lastUserId) {
          await message.react('❌').catch(() => {});
          await message.reply(
            `❌ **${message.author.username}** — you can't count twice in a row! Next number is **${expected}**.`
          ).catch(() => {});
        } else if (num !== expected) {
          await message.react('❌').catch(() => {});
          await message.reply(
            `❌ Wrong number! Expected **${expected}**. Count reset to **0**.`
          ).catch(() => {});
          data.counting[message.channel.id] = { current: 0, lastUserId: null };
          saveData();
        } else {
          // Correct
          data.counting[message.channel.id] = {
            current: num,
            lastUserId: message.author.id
          };
          saveData();
          await message.react('✅').catch(() => {});
        }
      }
      // Non-number messages in counting channel are ignored (or you can delete them later)
      return; // don't process as command
    }
  } catch (e) {
    console.error('Counting error:', e.message);
  }

  const usedPrefix = detectPrefix(message.content);
  if (!usedPrefix) return;
  if (message.author.bot) return;

  const body = message.content.slice(usedPrefix.length).trim();
  const args = body.split(/\s+/);
  const cmd = (args.shift() || '').toLowerCase();
  if (!cmd) return;

  // Preferred: - stats, $ stock, ?/! mod — commands not blocked by prefix


  // ========== -best @role ==========
  if (cmd === 'best') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get((args[0] || '').replace(/[<@&>]/g, ''));

    if (!role) {
      return message.reply('Usage: `-best @role`');
    }

    try {
      await message.guild.members.fetch();
    } catch (_) {}

    const membersWithRole = message.guild.members.cache.filter(
      (m) => !m.user.bot && m.roles.cache.has(role.id)
    );

    if (!membersWithRole.size) {
      return message.reply(`No members found with role **${role.name}**.`);
    }

    const ranked = [...membersWithRole.values()]
      .map((m) => {
        const messages = data.messages[message.guild.id]?.[m.id] || 0;
        const invites = data.invites[message.guild.id]?.[m.id] || 0;
        const score = messages + invites * 25;
        return { m, messages, invites, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    const lines = ranked.map((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
      return `${medal} ${r.m} — **${r.score}** pts · 💬 ${r.messages} · 🎟️ ${r.invites}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xe8c84a)
      .setTitle(`Best in @${role.name}`)
      .setDescription(lines.join('\n') || 'No data yet.')
      .setFooter({ text: 'Score = messages + (invites × 25)' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // ========== -mcfa / -stock ==========
  // -mcfa              → show stock count (staff)
  // -mcfa list         → paste available as ||mail:pass|| (staff, in channel)
  // -mcfa add ...      → add accounts (staff)
  // -stock ...         → same aliases
  if (cmd === 'stock') {
    if (!canViewStock(message.member)) return message.reply('Members / staff only.');
    const sub = (args[0] || '').toLowerCase();
    if (!sub || sub === 'list' || sub === 'status') {
      return message.reply({ embeds: [buildStockListEmbed(message.guild)] });
    }
    return message.reply('`-stock list` — show all product stock counts');
  }

  // Generic product stock: -mcfa / -crunchyroll / -xbox / -netflix / -hypixel / -donut / -nitro / -steam
  if (resolveProductKey(cmd) && cmd !== 'custom') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const productKey = resolveProductKey(cmd);
    const meta = PRODUCT_STOCKS[productKey];
    const sub = (args[0] || '').toLowerCase();
    ensureStocks(data);

    if (meta.type === 'method') {
      if (!sub || sub === 'count' || sub === 'left' || sub === 'status') {
        const has = !!getMethodText(productKey);
        return message.reply(
          `${meta.emoji} **${meta.label}** · ${has ? '**set** (∞)' : '**not set**'}\n` +
            `\`$${cmd} set <paste full method text>\``
        );
      }
      if (sub === 'list' || sub === 'show' || sub === 'view') {
        const text = getMethodText(productKey);
        if (!text) return message.reply(`No **${meta.label}** yet.`);
        await message.channel.send(`**${meta.label}** (staff preview)`);
        await sendLongSpoiler(message.channel, meta.label, text);
        return;
      }
      if (sub === 'set' || sub === 'add') {
        let rest = body.slice(body.toLowerCase().indexOf(sub) + sub.length).trim();
        if (rest.startsWith('```')) {
          rest = rest.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
        }
        if (!rest) {
          return message.reply(`Paste the **full method** after the command:\n\`$${cmd} set\` + entire guide`);
        }
        setMethodText(productKey, rest);
        return message.reply(
          `${meta.emoji} **${meta.label}** saved (${rest.length} chars). Unlimited delivery.`
        );
      }
      if (sub === 'clear') {
        setMethodText(productKey, '');
        return message.reply(`Cleared **${meta.label}**.`);
      }
      return message.reply(
        `**${meta.label}** (method ∞)\n\`$${cmd} set <full text>\` · \`$${cmd} show\` · \`$${cmd} clear\``
      );
    }

    if (!sub || sub === 'count' || sub === 'left') {
      return message.reply(
        `${meta.emoji} **${meta.label}** stock: **${getStock(productKey).length}**`
      );
    }
    if (sub === 'list' || sub === 'paste') {
      const stock = getStock(productKey);
      if (!stock.length) return message.reply(`No **${meta.label}** stock.`);
      const spoilers = stock.map((a) => `||${a}||`);
      const chunks = [];
      let buf = `**${meta.label} stock (${stock.length})**\n`;
      for (const s of spoilers) {
        if ((buf + s + '\n').length > 1900) {
          chunks.push(buf);
          buf = '';
        }
        buf += s + '\n';
      }
      if (buf.trim()) chunks.push(buf);
      for (const c of chunks) await message.channel.send(c);
      return;
    }
    if (sub === 'add') {
      const rest = body.slice(body.toLowerCase().indexOf('add') + 3).trim();
      const accounts = parseAccounts(rest).length
        ? parseAccounts(rest)
        : rest.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      if (!accounts.length) {
        return message.reply(`Usage: \`$${cmd} add <item>\` (multiple OK)`);
      }
      let added = 0;
      const arr = getStock(productKey);
      for (const a of accounts) {
        if (!arr.includes(a)) {
          arr.push(a);
          added++;
        }
      }
      setStock(productKey, arr);
      saveData();
      return message.reply(
        `Added **${added}** to **${meta.label}** · Stock now **${arr.length}**`
      );
    }
    if (sub === 'clear') {
      const n = getStock(productKey).length;
      setStock(productKey, []);
      saveData();
      return message.reply(`Cleared **${n}** from **${meta.label}**.`);
    }
    if (sub === 'export') {
      return exportStockToChannel(
        message,
        productKey,
        getStock(productKey),
        meta.label
      );
    }
    return message.reply(
      `**${meta.label}**\n\`$${cmd}\` · \`$${cmd} list\` · \`$${cmd} add\` · \`$${cmd} clear\` · \`$${cmd} export #ch\``
    );
  }

  if (cmd === 'mcfa_legacy_disabled_placeholder') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const sub = (args[0] || '').toLowerCase();

    if (!sub || sub === 'count' || sub === 'left') {
      return message.reply(
        `MCFA stock: **${data.mcfaStock.length}** available · **${data.mcfaUsed.length}** delivered`
      );
    }

    if (sub === 'list' || sub === 'paste') {
      if (!data.mcfaStock.length) {
        return message.reply('No MCFA stock left. Add with `-mcfa add mail:pass`');
      }
      // Discord message limit ~2000 — batch
      const spoilers = data.mcfaStock.map((a) => `||${a}||`);
      const chunks = [];
      let buf = `**MCFA stock (${data.mcfaStock.length})**\n`;
      for (const s of spoilers) {
        if ((buf + s + '\n').length > 1900) {
          chunks.push(buf);
          buf = '';
        }
        buf += s + '\n';
      }
      if (buf.trim()) chunks.push(buf);
      for (const c of chunks) {
        await message.channel.send(c);
      }
      return;
    }

    if (sub === 'add') {
      const rest = body.slice(body.toLowerCase().indexOf('add') + 3).trim();
      const accounts = parseAccounts(rest);
      if (!accounts.length) {
        return message.reply(
          'Usage:\n`-mcfa add mail:pass`\n`-mcfa add mail:pass mail:pass`\nOnly valid domains (outlook.fr, gmail, …) are stored.'
        );
      }
      let added = 0;
      let skipped = 0;
      for (const a of accounts) {
        const c = classifyAccount(a);
        if (!c.ok) { skipped++; continue; }
        if (!data.mcfaStock.includes(c.acc)) {
          data.mcfaStock.push(c.acc);
          added++;
        }
      }
      saveData();
      return message.reply(
        `Added **${added}** MCFA · skipped invalid **${skipped}** · Stock now **${data.mcfaStock.length}**`
      );
    }

    
    if (sub === 'export') {
      const lines = data.mcfaStock || [];
      return exportStockToChannel(message, 'mcfa', lines, 'MCFA');
    }

if (sub === 'clear') {
      const n = data.mcfaStock.length;
      data.mcfaStock = [];
      saveData();
      return message.reply(`Cleared **${n}** from stock.`);
    }

    return message.reply(
      'MCFA commands (staff):\n' +
        '`-mcfa` — stock count\n' +
        '`-mcfa list` — paste all as ||mail:pass||\n' +
        '`-mcfa add mail:pass` — add stock\n' +
        '`-mcfa clear` / `-clear` — clear stock\n' +
        '`-mcfa export #channel` — export stock as export_N.txt\n' +
        '`-pay @user [n]` — DM MCFA\n' +
        '`-salary @user [n]` — salary (restricted)'
    );
  }

  // ========== -pay @user [product] [amount] ==========
  // -pay @user → 1 mcfa
  // -pay @user 5 → 5 mcfa
  // -pay @user netflix 2 → 2 netflix
  // -crunchyroll @user 1 also works via product cmds below
  if (cmd === 'pay') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const user =
      message.mentions.users.first() ||
      (args[0] && (await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null)));

    if (!user || user.bot) {
      return message.reply(
        'Usage: `-pay @user` · `-pay @user 5` · `-pay @user netflix 2`\n' +
          'Products: mcfa, donut, hypixel, nitro, netflix, steam, crunchyroll, xbox, custom'
      );
    }

    let productKey = 'mcfa';
    let amount = 1;
    for (const a of args) {
      if (/^\d+$/.test(a)) {
        amount = Math.min(50, Math.max(1, parseInt(a, 10)));
        continue;
      }
      const pk = resolveProductKey(a);
      if (pk) productKey = pk;
    }

    const meta = PRODUCT_STOCKS[productKey];
    const taken = await takeFromStock(productKey, amount);
    if (!taken) {
      return message.reply(
        `Not enough **${meta.label}**. Need **${amount}**, have **${getStock(productKey).length}**.`
      );
    }

    const ok = await deliverProductWithVouch(message, user, productKey, taken, false);
    if (!ok) {
      // restore
      const arr = getStock(productKey);
      arr.unshift(...taken);
      setStock(productKey, arr);
      saveData();
      return message.reply(`Could not DM ${user}. Stock restored.`);
    }
    return message.reply(
      `Paid **${taken.length}× ${meta.emoji} ${meta.label}** to ${user} · left **${getStock(productKey).length}** · waiting **yes/no** in DM`
    );
  }

  // ========== -salary @user [amount] ==========
  // Only usable by user ID 1398979148063571989 or members with role 1547183159794204675
  if (cmd === 'salary') {
    // -salary add — owners only, locked channel
    if ((args[0] || '').toLowerCase() === 'add') {
      const allowed =
        message.author.id === BIRTHDAY_USER_ID || isCoOwnerOrAbove(message.member);
      if (!allowed) return message.reply('Owners only.');
      if (String(message.channel.id) !== String(SALARY_ADD_CHANNEL_ID)) {
        return message.reply(`Use this only in <#${SALARY_ADD_CHANNEL_ID}>.`);
      }
      const rest = body.slice(body.toLowerCase().indexOf('add') + 3).trim();
      if (!rest) return message.reply('Usage: `-salary add email:pass`');
      const items = parseAccounts(rest).length
        ? parseAccounts(rest)
        : rest.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      ensureStocks(data);
      const arr = getStock('mcfa');
      for (const it of items) {
        if (!arr.includes(it)) arr.push(it);
      }
      setStock('mcfa', arr);
      saveData();
      const reply = await message.reply(
        `Added **${items.length}** salary reward(s) · pool **${arr.length}**`
      );
      setTimeout(() => {
        message.delete().catch(() => {});
        reply.delete().catch(() => {});
      }, 3000);
      return;
    }

    const ALLOWED_USER_ID = '1398979148063571989';
    const ALLOWED_ROLE_ID = '1547183159794204675';

    const isAllowed =
      message.author.id === ALLOWED_USER_ID ||
      (message.member && message.member.roles.cache.has(ALLOWED_ROLE_ID));

    if (!isAllowed) {
      return message.reply('You do not have permission to use this command.');
    }

    const user =
      message.mentions.users.first() ||
      (args[0] && (await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null)));

    if (!user || user.bot) {
      return message.reply('Usage: `-salary @user` or `-salary @user 3`');
    }

    let amount = 1;
    for (const a of args) {
      if (/^\d+$/.test(a)) {
        amount = Math.min(25, Math.max(1, parseInt(a, 10)));
        break;
      }
    }

    if (data.mcfaStock.length < amount) {
      return message.reply(
        `Not enough stock. Need **${amount}**, have **${data.mcfaStock.length}**.`
      );
    }

    const sent = [];
    for (let i = 0; i < amount; i++) {
      const account = data.mcfaStock.shift();
      data.mcfaUsed.push({
        account,
        to: user.id,
        by: message.author.id,
        at: new Date().toISOString(),
        type: 'salary'
      });
      sent.push(account);
    }
    saveData();

    let salaryMsg =
      `# 💰 Staff Salary\n\n` +
      `Your staff reward for this month (**${sent.length}**):\n\n`;
    sent.forEach((acc, i) => {
      salaryMsg += `« Reward #${i + 1}: ||${acc}|| »\n`;
    });
    salaryMsg +=
      `\nThank you for your hard work and dedication to Flare Drop! 🫡\n` +
      `Keep up the great work! 🚀`;

    try {
      await user.send(salaryMsg);
      return message.reply(
        `Sent **${sent.length}** Staff Salary to ${user} via DM · Stock left: **${data.mcfaStock.length}**`
      );
    } catch (e) {
      for (let i = sent.length - 1; i >= 0; i--) {
        data.mcfaStock.unshift(sent[i]);
        data.mcfaUsed.pop();
      }
      saveData();
      return message.reply(
        `Could not DM ${user} (DMs closed). Accounts were **not** taken from stock.`
      );
    }
  }

  // ========== -clear ==========
  // Shortcut to clear MCFA stock
  if (cmd === 'clear') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const n = data.mcfaStock.length;
    data.mcfaStock = [];
    saveData();
    return message.reply(`Cleared **${n}** from MCFA stock.`);
  }

  // ========== -online @role ==========
  if (cmd === 'online') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get((args[0] || '').replace(/[<@&>]/g, ''));

    if (!role) {
      return message.reply('Usage: `-online @role`');
    }

    try {
      await message.guild.members.fetch();
    } catch (_) {}

    const onlineMembers = message.guild.members.cache.filter(
      (m) =>
        !m.user.bot &&
        m.roles.cache.has(role.id) &&
        m.presence &&
        ['online', 'idle', 'dnd'].includes(m.presence.status)
    );

    if (!onlineMembers.size) {
      return message.reply(`No online members found with role **${role.name}**.`);
    }

    const lines = [...onlineMembers.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((m) => {
        const status = m.presence?.status || 'unknown';
        const emoji = status === 'online' ? '🟢' : status === 'idle' ? '🟡' : '🔴';
        return `${emoji} ${m} (\`${status}\`)`;
      });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`Online in @${role.name}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${onlineMembers.size} online` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // ========== -custom (custom stock system) ==========
  if (cmd === 'custom') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const sub = (args[0] || '').toLowerCase();

    if (!sub || sub === 'count' || sub === 'left') {
      return message.reply(
        `Custom stock: **${data.customStock.length}** available · **${data.customUsed.length}** delivered`
      );
    }

    if (sub === 'list' || sub === 'paste') {
      if (!data.customStock.length) {
        return message.reply('No custom stock left. Add with `-custom add <text>`');
      }
      const spoilers = data.customStock.map((a) => `||${a}||`);
      const chunks = [];
      let buf = `**Custom stock (${data.customStock.length})**\n`;
      for (const s of spoilers) {
        if ((buf + s + '\n').length > 1900) {
          chunks.push(buf);
          buf = '';
        }
        buf += s + '\n';
      }
      if (buf.trim()) chunks.push(buf);
      for (const c of chunks) {
        await message.channel.send(c);
      }
      return;
    }

    if (sub === 'add') {
      const rest = body.slice(body.toLowerCase().indexOf('add') + 3).trim();
      if (!rest) {
        return message.reply('Usage: `-custom add <any text>`');
      }
      // allow multiple lines / items separated by newlines
      const items = rest
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      let added = 0;
      for (const item of items) {
        if (!data.customStock.includes(item)) {
          data.customStock.push(item);
          added++;
        }
      }
      saveData();
      return message.reply(`Added **${added}** custom item(s) · Stock now **${data.customStock.length}**`);
    }

    
    if (sub === 'export') {
      const lines = data.customStock || [];
      return exportStockToChannel(message, 'custom', lines, 'Custom');
    }

if (sub === 'clear') {
      const n = data.customStock.length;
      data.customStock = [];
      saveData();
      return message.reply(`Cleared **${n}** from custom stock.`);
    }

    return message.reply(
      'Custom commands (staff):\n' +
        '`-custom` — stock count\n' +
        '`-custom list` — paste all as spoilers\n' +
        '`-custom add <text>` — add item(s)\n' +
        '`-custom clear` — clear custom stock\n' +
        '`-custom export #channel` — export as export_N.txt\n' +
        '`-custompay @user` — DM 1 item\n' +
        '`-custompay @role` — DM 1 to role members'
    );
  }

  // ========== -custompay @user  OR  -custompay @role ==========
  // If a role is given → sends 1 item to EVERY member in that role
  if (cmd === 'custompay') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    // Prefer role if mentioned, otherwise try user
    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get((args[0] || '').replace(/[<@&>]/g, ''));

    const user =
      !role
        ? message.mentions.users.first() ||
          (args[0] && (await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null)))
        : null;

    // ---------- ROLE MODE ----------
    if (role) {
      try {
        await message.guild.members.fetch();
      } catch (_) {}

      const targets = message.guild.members.cache.filter(
        (m) => !m.user.bot && m.roles.cache.has(role.id)
      );

      if (!targets.size) {
        return message.reply(`No members found with role **${role.name}**.`);
      }

      if (data.customStock.length < targets.size) {
        return message.reply(
          `Not enough custom stock. Need **${targets.size}** items, only **${data.customStock.length}** left.`
        );
      }

      let sent = 0;
      let failed = 0;

      for (const [, member] of targets) {
        const item = data.customStock.shift();
        data.customUsed.push({
          item,
          to: member.id,
          by: message.author.id,
          at: new Date().toISOString(),
          role: role.id
        });

        try {
          await member.send(
            `**Custom delivery**\n` +
              `Here is your item (click to reveal):\n||${item}||\n\n` +
              `Delivered by staff.`
          );
          sent++;
        } catch (e) {
          // put item back if DM failed
          data.customStock.unshift(item);
          data.customUsed.pop();
          failed++;
        }
      }

      saveData();
      return message.reply(
        `Role **@${role.name}**: sent to **${sent}** members` +
          (failed ? ` · **${failed}** failed (DMs closed)` : '') +
          ` · Stock left: **${data.customStock.length}**`
      );
    }

    // ---------- USER MODE ----------
    if (!user || user.bot) {
      return message.reply(
        'Usage:\n`-custompay @user` — send 1 item to one user\n`-custompay @role` — send 1 item to every member in the role'
      );
    }

    if (!data.customStock.length) {
      return message.reply('No custom stock left. Add with `-custom add <text>`');
    }

    const item = data.customStock.shift();
    data.customUsed.push({
      item,
      to: user.id,
      by: message.author.id,
      at: new Date().toISOString()
    });
    saveData();

    try {
      await user.send(
        `**Custom delivery**\n` +
          `Here is your item (click to reveal):\n||${item}||\n\n` +
          `Delivered by staff.`
      );
      return message.reply(
        `Sent **1 custom item** to ${user} via DM · Stock left: **${data.customStock.length}**`
      );
    } catch (e) {
      data.customStock.unshift(item);
      data.customUsed.pop();
      saveData();
      return message.reply(
        `Could not DM ${user} (DMs closed). Item was **not** taken from stock.`
      );
    }
  }


  // ========== -ultimate (economy) ==========
  // -ultimate                 → show your balance
  // -ultimate @user           → show someone's balance
  // -ultimate add <amt> [@user] → add coins (Owner/Co-Owner)
  // -ultimate give/send @user <amt> → transfer coins
  // -ultimate cf <amt> <head|tail> → coin flip
  // -ultimate daily           → claim daily reward
  // -ultimate top             → richest users
  if (cmd === 'flare' || cmd === 'ultimate' || cmd === 'economy') {
    const sub = (args[0] || '').toLowerCase();

    // ---- -ultimate add <amount> [@user] ----
    if (sub === 'add') {
      if (!isCoOwnerOrAbove(message.member)) {
        return message.reply('Only **Owner** and **Co-Owner** can add coins.');
      }
      const amount = parseInt(args[1], 10);
      if (!amount || amount < 1) {
        return message.reply('Usage: `-flare add <amount> [@user]`');
      }
      let target = message.mentions.users.first();
      if (!target && args[2]) {
        target = await client.users.fetch(args[2].replace(/[<@!>]/g, '')).catch(() => null);
      }
      if (!target) target = message.author;
      if (target.bot) return message.reply('Cannot add coins to bots.');

      addCoins(target.id, amount);
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('💰 Coins Added')
        .setDescription(
          `Added **${amount.toLocaleString()}** coins to **${target.username}**\n` +
          `New balance: **${getCoins(target.id).toLocaleString()}** 🪙`
        )
        .setFooter({ text: BRAND.footer })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ---- -ultimate give / send @user <amount> ----
    if (sub === 'give' || sub === 'send') {
      const target =
        message.mentions.users.first() ||
        (args[1] && (await client.users.fetch(args[1].replace(/[<@!>]/g, '')).catch(() => null)));

      // amount can be args[1] or args[2] depending on whether mention is used
      let amount = parseInt(args[1], 10);
      if (message.mentions.users.first()) {
        amount = parseInt(args[1], 10); // -ultimate give @user 100  → args = ['give', '100'] after shift? 
        // actually after cmd shift, args[0]=give, args[1]=maybe id or amount
      }
      // Better parse: find the number in remaining args
      const numArg = args.find((a) => /^\d+$/.test(a));
      amount = numArg ? parseInt(numArg, 10) : NaN;

      if (!target || target.bot) {
        return message.reply('Usage: `-flare give @user <amount>`');
      }
      if (!amount || amount < 1) {
        return message.reply('Usage: `-flare give @user <amount>`');
      }
      if (target.id === message.author.id) {
        return message.reply("You can't give coins to yourself.");
      }

      const bal = getCoins(message.author.id);
      if (amount > bal) {
        return message.reply(`You only have **${bal.toLocaleString()}** coins.`);
      }

      addCoins(message.author.id, -amount);
      addCoins(target.id, amount);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('💸 Coins Sent')
        .setDescription(
          `**${message.author.username}** gave **${amount.toLocaleString()}** coins to **${target.username}**\n\n` +
          `Your new balance: **${getCoins(message.author.id).toLocaleString()}** 🪙`
        )
        .setFooter({ text: BRAND.footer })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ---- -ultimate cf <amount> <head|tail> ----
    if (sub === 'cf' || sub === 'coinflip') {
      const amount = parseInt(args[1], 10);
      const choice = (args[2] || '').toLowerCase();

      if (!amount || amount < 1) {
        return message.reply('Usage: `-flare cf <amount> <head|tail>`');
      }
      if (!['head', 'heads', 'h', 'tail', 'tails', 't'].includes(choice)) {
        return message.reply('Choose **head** or **tail**.\nExample: `-flare cf 100 head`');
      }

      const bal = getCoins(message.author.id);
      if (amount > bal) {
        return message.reply(`You only have **${bal.toLocaleString()}** coins.`);
      }

      const normalized = ['head', 'heads', 'h'].includes(choice) ? 'head' : 'tail';
      const result = Math.random() < 0.5 ? 'head' : 'tail';
      const won = normalized === result;

      if (won) addCoins(message.author.id, amount);
      else addCoins(message.author.id, -amount);

      const embed = new EmbedBuilder()
        .setColor(won ? 0x57f287 : 0xed4245)
        .setTitle(won ? '🎉 You won!' : '💀 You lost...')
        .setDescription(
          `You chose **${normalized}**\n` +
          `The coin landed on **${result}**\n\n` +
          (won
            ? `You won **${amount.toLocaleString()}** coins!`
            : `You lost **${amount.toLocaleString()}** coins.`) +
          `\n\nNew balance: **${getCoins(message.author.id).toLocaleString()}** 🪙`
        )
        .setFooter({ text: BRAND.footer })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ---- -ultimate daily ----
    if (sub === 'daily') {
      const uid = message.author.id;
      const now = Date.now();
      const last = data.daily[uid] || 0;
      const cooldown = 24 * 60 * 60 * 1000; // 24h

      if (now - last < cooldown) {
        const left = cooldown - (now - last);
        const h = Math.floor(left / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        return message.reply(`Daily already claimed. Come back in **${h}h ${m}m**.`);
      }

      const reward = 500 + Math.floor(Math.random() * 501); // 500–1000
      data.daily[uid] = now;
      addCoins(uid, reward);

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🎁 Daily Reward')
        .setDescription(
          `You claimed **${reward.toLocaleString()}** coins!\n` +
          `New balance: **${getCoins(uid).toLocaleString()}** 🪙`
        )
        .setFooter({ text: BRAND.footer })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ---- -ultimate top ----
    if (sub === 'top' || sub === 'lb' || sub === 'leaderboard') {
      const entries = Object.entries(data.coins || {})
        .map(([id, bal]) => ({ id, bal: bal || 0 }))
        .filter((e) => e.bal > 0)
        .sort((a, b) => b.bal - a.bal)
        .slice(0, 10);

      if (!entries.length) {
        return message.reply('No one has any coins yet.');
      }

      const lines = [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        let name = e.id;
        try {
          const u = await client.users.fetch(e.id);
          name = u.username;
        } catch (_) {}
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        lines.push(`${medal} **${name}** — ${e.bal.toLocaleString()} 🪙`);
      }

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Flare Richest')
        .setDescription(lines.join('\n'))
        .setFooter({ text: BRAND.footer })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ---- -ultimate  or  -ultimate @user  → show balance ----
    let target = message.mentions.users.first();
    if (!target && args[0] && !['add', 'cf', 'coinflip', 'give', 'send', 'daily', 'top', 'lb', 'leaderboard'].includes(sub)) {
      target = await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);
    }
    if (!target) target = message.author;

    const bal = getCoins(target.id);
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🪙 Flare Balance')
      .setDescription(
        target.id === message.author.id
          ? `You have **${bal.toLocaleString()}** coins.`
          : `**${target.username}** has **${bal.toLocaleString()}** coins.`
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // ========== -count #channel ==========
  // Staff only — enable / disable / status counting in a channel
  if (cmd === 'count') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const sub = (args[0] || '').toLowerCase();
    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get((args[0] || '').replace(/[<#>]/g, '')) ||
      (sub && !['status', 'off', 'stop', 'disable', 'reset'].includes(sub)
        ? message.guild.channels.cache.get(sub.replace(/[<#>]/g, ''))
        : null) ||
      message.channel;

    // -count status / -count  (current channel)
    if (!sub || sub === 'status' || sub === 'info') {
      const info = data.counting[channel.id];
      if (!info) {
        return message.reply(`Counting is **not active** in ${channel}.\nEnable with \`-count ${channel}\``);
      }
      return message.reply(
        `**Counting in ${channel}**\n` +
        `Current number: **${info.current || 0}**\n` +
        `Last counter: ${info.lastUserId ? `<@${info.lastUserId}>` : '—'}\n` +
        `Next number: **${(info.current || 0) + 1}**`
      );
    }

    // -count off / stop / disable
    if (['off', 'stop', 'disable'].includes(sub)) {
      const target =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get((args[1] || '').replace(/[<#>]/g, '')) ||
        message.channel;
      if (data.counting[target.id]) {
        delete data.counting[target.id];
        saveData();
        return message.reply(`Counting **disabled** in ${target}.`);
      }
      return message.reply(`Counting was not active in ${target}.`);
    }

    // -count reset
    if (sub === 'reset') {
      const target =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get((args[1] || '').replace(/[<#>]/g, '')) ||
        message.channel;
      if (!data.counting[target.id]) {
        return message.reply(`Counting is not active in ${target}.`);
      }
      data.counting[target.id] = { current: 0, lastUserId: null };
      saveData();
      return message.reply(`Counting **reset to 0** in ${target}. Next number is **1**.`);
    }

    // -count #channel  → enable
    if (channel.type !== 0 && channel.type !== 5) { // GuildText or GuildAnnouncement
      return message.reply('Please mention a text channel.');
    }

    data.counting[channel.id] = { current: 0, lastUserId: null };
    saveData();
    return message.reply(
      `✅ Counting **enabled** in ${channel}.\n` +
      `Rules:\n` +
      `• Count in order: 1, 2, 3, …\n` +
      `• Same person cannot count twice in a row\n` +
      `• Wrong number = reset to 0`
    );
  }


  // ========== -team <game> ... ==========
  // LFG announcement for supported games
  if (cmd === 'team') {
    const gameRaw = (args[0] || '').toLowerCase();
    const rest = args.slice(1);

    const games = {
      minecraft: { name: 'Minecraft', emoji: '⛏️', timeMax: 5 },
      pubg: { name: 'PUBG', emoji: '🔫', timeMax: 5 },
      bgmi: { name: 'BGMI', emoji: '📱', timeMax: 5 },
      freefire: { name: 'Free Fire', emoji: '🔥', timeMax: 5 },
      'free-fire': { name: 'Free Fire', emoji: '🔥', timeMax: 5 },
      ff: { name: 'Free Fire', emoji: '🔥', timeMax: 5 },
      amongus: { name: 'Among Us', emoji: '🚀', timeMax: 10 },
      'among-us': { name: 'Among Us', emoji: '🚀', timeMax: 10 },
      au: { name: 'Among Us', emoji: '🚀', timeMax: 10 }
    };

    // normalize "among us" / "free fire"
    let gameKey = gameRaw;
    if (gameRaw === 'among' && (args[1] || '').toLowerCase() === 'us') {
      gameKey = 'amongus';
      rest.shift();
    } else if (gameRaw === 'free' && (args[1] || '').toLowerCase() === 'fire') {
      gameKey = 'freefire';
      rest.shift();
    }

    const game = games[gameKey];
    if (!game) {
      return message.reply(
        '**Supported games:**\n' +
        '`-team minecraft <ip:port> <1-5min>`\n' +
        '`-team pubg <in-game id> <1-5min>`\n' +
        '`-team bgmi <in-game id> <1-5min>`\n' +
        '`-team freefire <in-game id> <1-5min>`\n' +
        '`-team amongus <lobby code> <1-10min>`'
      );
    }

    if (rest.length < 2) {
      return message.reply(`Usage: \`-team ${gameKey} <info> <time>\``);
    }

    const timeStr = rest[rest.length - 1].toLowerCase().replace(/min(ute)?s?/, '');
    const time = parseInt(timeStr, 10);
    const info = rest.slice(0, -1).join(' ');

    if (!time || time < 1 || time > game.timeMax) {
      return message.reply(`Time must be between **1-${game.timeMax} minutes**.`);
    }
    if (!info) {
      return message.reply(`Please provide the required info for **${game.name}**.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`👬 Looking for Team`)
      .setDescription(
        `**Game:** ${game.name}\n` +
        `**Info:** \`${info}\`\n` +
        `**Duration:** currently / **${time} min**\n` +
        `**Status:** 🟢 **Active**\n` +
        `**Members in the group:** \`1/20\`\n\n` +
        `**Host:** ${message.author.username}`
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // ========== -teamup @user(s) ==========
  // Creates a private temporary channel for the group (max 20) with live panel
  if (cmd === 'teamup') {
    const targets = [...message.mentions.users.values()].filter((u) => !u.bot && u.id !== message.author.id);

    if (!targets.length) {
      return message.reply('Usage: `-teamup @user1 @user2 ...` (mention who you want to play with)');
    }
    if (targets.length > 19) {
      return message.reply('Max **20** people total (you + 19 others).');
    }

    if (!message.guild.members.me?.permissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel])) {
      return message.reply('I need **Manage Channels** permission to create teamup tickets.');
    }

    const memberIds = [message.author.id, ...targets.map((u) => u.id)];
    const channelName = `teamup-${message.author.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

    try {
      const overwrites = [
        { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: message.guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        }
      ];

      for (const id of memberIds) {
        overwrites.push({
          id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        });
      }

      for (const roleId of [OWNER_ROLE_ID, CO_OWNER_ROLE_ID, MANAGER_ROLE_ID, HEAD_ADMIN_ROLE_ID, ADMIN_ROLE_ID, STAFF_TEAM_ROLE_ID]) {
        if (roleId && message.guild.roles.cache.has(roleId)) {
          overwrites.push({
            id: roleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          });
        }
      }

      const createOpts = {
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: overwrites,
        topic: `TeamUp by ${message.author.username} | -close to close | -leave to leave`,
        reason: `TeamUp created by ${message.author.tag}`
      };
      if (TEAMUP_CATEGORY_ID) createOpts.parent = TEAMUP_CATEGORY_ID;

      const ch = await message.guild.channels.create(createOpts);

      const team = {
        creatorId: message.author.id,
        members: memberIds,
        panelMsgId: null,
        status: 'pending' // pending → open → closed
      };

      const panel = buildTeamupPanel(team);
      const mentionList = memberIds.map((id) => `<@${id}>`).join(' ');
      const panelMsg = await ch.send({ content: mentionList, embeds: [panel] });

      team.panelMsgId = panelMsg.id;
      team.status = 'open';
      data.teamups[ch.id] = team;
      saveData();

      // Update panel to "Open"
      await panelMsg.edit({ embeds: [buildTeamupPanel(team)] });

      return message.reply(`✅ TeamUp created: ${ch}`);
    } catch (e) {
      console.error('teamup error:', e.message);
      return message.reply('Failed to create TeamUp channel. Check my permissions.');
    }
  }

  // ========== -close / -leave (inside TeamUp channels) ==========
  if (cmd === 'close' || cmd === 'leave') {
    const ch = message.channel;
    if (!ch.name?.startsWith('teamup-')) {
      return message.reply('This command only works inside a **TeamUp** channel.');
    }

    const team = data.teamups[ch.id];

    if (cmd === 'leave') {
      try {
        await ch.permissionOverwrites.edit(message.author.id, { ViewChannel: false });

        if (team) {
          team.members = (team.members || []).filter((id) => id !== message.author.id);
          saveData();
          await updateTeamupPanel(ch, team);
        }

        await message.reply(`👋 **${message.author.username}** left the TeamUp.`);
      } catch (e) {
        return message.reply('Could not remove you from this channel.');
      }
      return;
    }

    // -close
    const isCreator = team
      ? team.creatorId === message.author.id
      : ch.name.includes(message.author.username.toLowerCase().replace(/[^a-z0-9]/g, ''));

    if (!isCreator && !isStaff(message.member)) {
      return message.reply('Only the **creator** or **staff** can close this TeamUp.');
    }

    if (team) {
      team.status = 'closed';
      saveData();
      await updateTeamupPanel(ch, team);
    }

    await message.reply('🔒 Closing TeamUp in 3 seconds...');
    setTimeout(() => {
      if (data.teamups[ch.id]) {
        delete data.teamups[ch.id];
        saveData();
      }
      ch.delete('TeamUp closed').catch(() => {});
    }, 3000);
    return;
  }


  // ========== $claim ==========
  // In a ticket: show eligible rewards based on invites, then ping online staff
  if (cmd === 'claim') {
    if (!isTicketChannel(message.channel)) {
      return message.reply('`$claim` only works **inside tickets**.');
    }
    await startRewardClaimFlow(message.channel, message.author);
    return;
  }

  // ========== -staffstats ==========
  if (cmd === 'staffstats') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    // Role hierarchy (highest priority first) — members appear only under their highest role
    const staffRoleConfig = [
      { id: OWNER_ROLE_ID, label: '👑 foundz.exe', key: 'foundz' },
      { id: OWNZ_ROLE_ID, label: '💎 Ownz', key: 'ownz' },
      { id: DIRECTOR_ROLE_ID, label: '🎬 Director', key: 'director' },
      { id: MANAGER_ROLE_ID, label: '📋 Maneger', key: 'manager' },
      { id: ADMIN_ROLE_ID, label: '⚔️ Moderator', key: 'mod' },
      { id: MEDIA_ROLE_ID, label: '📷 Media', key: 'media' },
      { id: STAFF_TEAM_ROLE_ID, label: '👥 Staff', key: 'staff' },
      { id: OUR_BOTS_ROLE_ID, label: '🤖 Our bots', key: 'bots' }
    ].filter((r) => r.id);

    if (!staffRoleConfig.length) {
      return message.reply(
        'No staff roles configured.\n' +
          'Set staff role IDs in your environment (OWNER, CO_OWNER, MANAGER, HEAD_ADMIN, ADMIN, STAFF_TEAM).'
      );
    }

    try {
      await message.guild.members.fetch();
    } catch (_) {}

    // Map: key → array of clean display names
    const groups = {};
    const counted = new Set(); // prevent duplicates across roles
    let totalStaff = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    for (const cfg of staffRoleConfig) {
      groups[cfg.key] = [];
      const role = message.guild.roles.cache.get(cfg.id);
      if (!role) continue;

      for (const [, member] of role.members) {
        if (member.user.bot) continue;
        if (counted.has(member.id)) continue; // already listed under higher role
        counted.add(member.id);

        const name = member.displayName || member.user.username;
        groups[cfg.key].push(name);
        totalStaff++;

        const status = member.presence?.status;
        if (status && ['online', 'idle', 'dnd'].includes(status)) {
          onlineCount++;
        } else {
          offlineCount++;
        }
      }
    }

    // Collect bots
    const botNames = [];
    for (const [, member] of message.guild.members.cache) {
      if (member.user.bot) {
        botNames.push(member.displayName || member.user.username);
      }
    }

    // Build description sections
    const sections = [];
    for (const cfg of staffRoleConfig) {
      const role = message.guild.roles.cache.get(cfg.id);
      if (!role) continue;
      const names = groups[cfg.key] || [];
      if (!names.length) {
        sections.push(`**${cfg.label}**\n• —`);
      } else {
        sections.push(`**${cfg.label}**\n${names.map((n) => `• ${n}`).join('\n')}`);
      }
    }

    // Bots section
    if (botNames.length) {
      sections.push(`**🤖 Bots**\n${botNames.map((n) => `• ${n}`).join('\n')}`);
    } else {
      sections.push('**🤖 Bots**\n• —');
    }

    // Role counts line
    const roleCounts = staffRoleConfig
      .map((cfg) => {
        const role = message.guild.roles.cache.get(cfg.id);
        if (!role) return null;
        const count = (groups[cfg.key] || []).length;
        return `• ${role.name}: ${count}`;
      })
      .filter(Boolean)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('🛡️ STAFF STATS')
      .setDescription(
        [
          '```',
          '╭───────────────╮',
          '  STAFF TEAM',
          '╰───────────────╯',
          '```',
          '',
          sections.join('\n\n'),
          '',
          '━━━━━━━━━━━━━━━━━━━━',
          '',
          '**SERVER STAFF OVERVIEW**',
          `👥 Total Staff: **${totalStaff}**`,
          `🟢 Currently Online: **${onlineCount}**`,
          `⚫ Currently Offline: **${offlineCount}**`,
          '',
          '**ROLES**',
          roleCounts || '• No roles found',
          '',
          '━━━━━━━━━━━━━━━━━━━━'
        ].join('\n')
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp();

    // Simple pagination if description would be too long (> 4000 chars)
    // For most servers this single embed is enough. If needed later we can add buttons.
    return message.reply({ embeds: [embed] });
  }


  // ========== -format email:pass (format + domain only — NO login) ==========
  // -format a:b c:d     → check only
  // -format add a:b     → check + add valid ones to MCFA stock
  if (cmd === 'format' || cmd === 'emailcheck') {
    if (!isStaff(message.member)) return message.reply('Staff only.');

    const rest = body.slice(cmd.length).trim();
    if (!rest) {
      return message.reply(
        'Usage:\n' +
          '`-format email:pass` — check only\n' +
          '`-format add email:pass` — check + **add valid to stock**\n' +
          'Multiple accounts OK. Accepts `outlook.fr`, `hotmail.es`, etc.\n' +
          'Does **not** try to log in.'
      );
    }

    const doAdd = (args[0] || '').toLowerCase() === 'add';
    const listText = doAdd
      ? body.slice(body.toLowerCase().indexOf('add') + 3).trim()
      : rest;
    const accounts = parseAccounts(listText);
    if (!accounts.length) {
      return message.reply('No `email:pass` found. Example: `-format add user@outlook.fr:Pass123!`');
    }

    const valid = [];
    const invalid = [];

    for (const acc of accounts) {
      const c = classifyAccount(acc);
      const passOk = c.pass.length >= 8;
      const block =
        `📧 **Email Check**\n` +
        `Email: \`${c.email}\`\n` +
        `Password: \`••••••••\`\n` +
        `─────────────\n` +
        `${c.fmt ? '✅' : '❌'} Email format: ${c.fmt ? 'Valid' : 'Invalid'}\n` +
        `${c.domOk ? '✅' : '❌'} Domain: ${c.domain || '—'}${c.domOk ? '' : ' (not allowed)'}\n` +
        `${passOk ? '✅' : '⚠️'} Password length: ${passOk ? 'OK (8+)' : 'Too short'}\n` +
        `⚠️ Notes: ${passNotes(c.pass)}\n` +
        `─────────────\n` +
        `Status: **${c.ok ? 'Looks valid' : 'Invalid / skipped'}**`;

      if (c.ok) valid.push({ ...c, block });
      else invalid.push({ email: c.email, block });
    }

    let added = 0;
    if (doAdd) {
      for (const v of valid) {
        if (!data.mcfaStock.includes(v.acc)) {
          data.mcfaStock.push(v.acc);
          added++;
        }
      }
      saveData();
    }

    await message.reply(
      `Checked **${accounts.length}** · ✅ valid: **${valid.length}** · ❌ skipped: **${invalid.length}**` +
        (doAdd ? ` · 📥 added to stock: **${added}** (stock now **${data.mcfaStock.length}**)` : '')
    );

    for (const v of valid.slice(0, 12)) {
      await message.channel.send(v.block + `\nReveal: ||${v.acc}||`);
    }
    if (valid.length > 12) {
      await message.channel.send(`…and **${valid.length - 12}** more valid.`);
    }
    if (invalid.length && invalid.length <= 15) {
      await message.channel.send(
        '**Skipped (invalid format/domain):**\n' +
          invalid.map((x) => `• \`${x.email}\``).join('\n')
      );
    }
    return;
  }



  // ========== -hit (Ultimate — blue embed UI) ==========
  function buildHitEmbed(hit) {
    const hyp = hit.hypixel || 'Not Available';
    const don = hit.donut || 'Not Available';
    const ign = hit.username || null;
    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setAuthor({ name: 'Flare Drop • Hit' })
      .addFields(
        { name: '📧 Email', value: `||${hit.email}||`, inline: false },
        { name: '🔑 Password', value: `||${hit.pass}||`, inline: false },
        {
          name: '🧑 IGN',
          value: ign ? `**${ign}**` : '_not set — add as email:pass:Username_',
          inline: false
        },
        { name: '🐯 Type', value: 'MCFA', inline: false },
        { name: '🛡️ Hypixel', value: `📢 **${hyp}**`, inline: true },
        {
          name: 'Hypixel Stats',
          value: '```\nRank: N/A\nLevel: N/A\n```',
          inline: true
        },
        { name: '🛡️ Donut', value: `📢 **${don}**`, inline: true },
        {
          name: 'Donut Stats',
          value: '```\nPlaytime: N/A\nMoney: N/A\n```',
          inline: true
        },
        { name: '🌸 Capes', value: 'Starter Free Cape', inline: false },
        { name: '🔑 Combo', value: `||${hit.email}:${hit.pass}||`, inline: false }
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp(hit.uploadedAt ? new Date(hit.uploadedAt) : new Date());

    // Public skin (no login) via mc-heads
    if (ign) {
      embed.setThumbnail(
        `https://mc-heads.net/avatar/${encodeURIComponent(ign)}/128`
      );
      embed.setImage(
        `https://mc-heads.net/body/${encodeURIComponent(ign)}/120`
      );
    }
    return embed;
  }

  async function stopHitRunner(msg, channel) {
    if (hitRunner.timer) clearTimeout(hitRunner.timer);
    hitRunner.timer = null;
    hitRunner.running = false;
    hitRunner.queue = [];
    hitRunner.index = 0;
    if (channel && msg) await channel.send(msg).catch(() => {});
  }

  async function runNextHit() {
    if (!hitRunner.running) return;
    const ch = client.channels.cache.get(hitRunner.channelId);
    if (!ch) {
      hitRunner.running = false;
      return;
    }
    if (hitRunner.index >= hitRunner.queue.length) {
      await stopHitRunner(
        `✅ **Hit run finished** — sent **${hitRunner.queue.length}** hit(s).`,
        ch
      );
      return;
    }
    const hit = hitRunner.queue[hitRunner.index++];
    try {
      await ch.send({ embeds: [buildHitEmbed(hit)] });
    } catch (e) {
      console.error('hit send:', e.message);
    }
    if (!hitRunner.running) return;
    if (hitRunner.index >= hitRunner.queue.length) {
      await stopHitRunner(
        `✅ **Hit run finished** — sent **${hitRunner.queue.length}** hit(s).`,
        ch
      );
      return;
    }
    hitRunner.timer = setTimeout(() => runNextHit(), 5000);
  }

  if (cmd === 'hit') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'start') {
      if (hitRunner.running) return message.reply('Already running. `-hit stop` first.');
      if (!(data.hits || []).length) {
        return message.reply('Queue empty. `-hit add hypixel email:pass` or `-hit add donut email:pass`');
      }
      hitRunner.running = true;
      hitRunner.channelId = message.channel.id;
      hitRunner.index = 0;
      hitRunner.queue = [...data.hits];
      await message.reply(
        `🚀 **Hit run started** — **${hitRunner.queue.length}** hit(s), **5s** apart.\n\`-hit stop\` to cancel.`
      );
      runNextHit();
      return;
    }

    if (sub === 'stop') {
      if (!hitRunner.running) return message.reply('No hit run active.');
      await stopHitRunner('🛑 **Hit run stopped.**', message.channel);
      return;
    }

    if (sub === 'list' || sub === 'queue' || !sub) {
      const hits = data.hits || [];
      if (!hits.length) return message.reply('Hit queue empty.');
      const lines = hits.slice(0, 30).map((h, i) => {
        const flags = [
          h.hypixel === 'Available' ? 'Hyp' : null,
          h.donut === 'Available' ? 'Donut' : null
        ]
          .filter(Boolean)
          .join('+') || '—';
        return `\`#${i + 1}\` \`${h.email}\` · ${flags}`;
      });
      return message.reply(
        `**Hit queue:** **${hits.length}**\n${lines.join('\n')}` +
          (hits.length > 30 ? `\n…+${hits.length - 30} more` : '')
      );
    }

    if (sub === 'export') {
      const hits = data.hits || [];
      if (!hits.length) return message.reply('Nothing to export.');
      const lines = hits.map(
        (h) =>
          `${h.email}:${h.pass} | hyp=${h.hypixel} | donut=${h.donut}`
      );
      const chunks = [];
      let buf = '**Hit export (backup before redeploy)**\n```\n';
      for (const line of lines) {
        if ((buf + line + '\n').length > 1800) {
          chunks.push(buf + '```');
          buf = '```\n';
        }
        buf += line + '\n';
      }
      chunks.push(buf + '```');
      for (const c of chunks) await message.channel.send(c);
      return;
    }

    if (sub === 'clear') {
      const n = (data.hits || []).length;
      data.hits = [];
      saveData();
      return message.reply(`Cleared **${n}** hits.`);
    }

    if (sub === 'add') {
      // -hit add hypixel email:pass ...
      // -hit add donut email:pass ...
      // -hit add both email:pass ...
      const kind = (args[1] || '').toLowerCase();
      if (!['hypixel', 'hyp', 'donut', 'both', 'all'].includes(kind)) {
        return message.reply(
          'Usage:\n' +
            '`-hit add hypixel email:pass:Username`\n' +
            '`-hit add donut email:pass:Username`\n' +
            '`-hit add both email:pass` (username optional for skin)'
        );
      }
      const rest = body.slice(body.toLowerCase().indexOf(kind) + kind.length).trim();
      const rawItems = rest
        .replace(/\|\|/g, ' ')
        .replace(/,/g, '\n')
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const entries = [];
      for (const item of rawItems) {
        const e = parseHitEntry(item);
        if (e) entries.push(e);
      }
      if (!entries.length) {
        return message.reply(
          'No entries found.\n' +
            'Format: `email:pass` or `email:pass:MCUsername`\n' +
            'Example: `-hit add hypixel a@b.com:Secret1:Steve`'
        );
      }
      let hyp = 'Not Available';
      let don = 'Not Available';
      if (kind === 'hypixel' || kind === 'hyp' || kind === 'both' || kind === 'all') {
        hyp = 'Available';
      }
      if (kind === 'donut' || kind === 'both' || kind === 'all') {
        don = 'Available';
      }
      if (!data.hits) data.hits = [];
      for (const e of entries) {
        data.hits.push({
          email: e.email,
          pass: e.pass,
          username: e.username || null,
          type: 'MCFA',
          hypixel: hyp,
          donut: don,
          uploadedAt: new Date().toISOString(),
          by: message.author.id
        });
      }
      const withName = entries.filter((e) => e.username).length;
      saveData();
      return message.reply(
        `Added **${entries.length}** hit(s) (**${withName}** with IGN/skin) · Hypixel: **${hyp}** · Donut: **${don}** · Queue: **${data.hits.length}**`
      );
    }

    return message.reply(
      '**Hits**\n' +
        '`-hit add hypixel email:pass ...`\n' +
        '`-hit add donut email:pass ...`\n' +
        '`-hit add both email:pass ...`\n' +
        '`-hit list` · `-hit start` · `-hit stop` · `-hit export` · `-hit clear`'
    );
  }



  // ========== -daily (Head Admin+) ==========
  // -daily @role [n]     — randomly pick n members from role, ping command user
  // -daily pay @user     — 5–8s spin UI → custom ~65% / MCFA ~35% → DM + vouch warning
  if (cmd === 'daily') {
    if (!isHeadAdminOrAbove(message.member)) {
      return message.reply('Head Admin or above only.');
    }

    const sub = (args[0] || '').toLowerCase();

    // ---- -daily pay @user ----
    if (sub === 'pay') {
      const user =
        message.mentions.users.first() ||
        (args[1] &&
          (await client.users.fetch(args[1].replace(/[<@!>]/g, '')).catch(() => null)));

      if (!user || user.bot) {
        return message.reply('Usage: `-daily pay @user`');
      }

      ensureStocks(data);
      const available = Object.keys(PRODUCT_STOCKS).filter((k) => (PRODUCT_STOCKS[k].type === 'method' ? !!getMethodText(k) : getStock(k).length > 0));
      if (!available.length) {
        return message.reply('No stock left in any product for daily pay.');
      }
      // Prefer custom if present (65%), else random among available
      let pool;
      if (available.includes('custom') && Math.random() < 0.65) {
        pool = 'custom';
      } else {
        pool = available[Math.floor(Math.random() * available.length)];
      }

      const spinMs = 5000 + Math.floor(Math.random() * 3001); // 5–8s
      const spinEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎰 Daily Spin')
        .setDescription(
          `Spinning for ${user}…\n\n` +
            `⏳ Please wait **${(spinMs / 1000).toFixed(1)}s**\n` +
            `🎯 Pool: Custom **65%** · MCFA **35%**`
        )
        .setFooter({ text: `Hosted by ${message.author.username} • Flare Drop` })
        .setTimestamp();

      const spinMsg = await message.reply({ embeds: [spinEmbed] });

      await new Promise((r) => setTimeout(r, spinMs));

      const taken = await takeFromStock(pool, 1);
      if (!taken) {
        return message.reply('Stock changed during spin — try again.');
      }
      const rewardText = taken[0];
      const meta = PRODUCT_STOCKS[pool];

      const resultEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🎉 Daily Spin Result')
        .setDescription(
          `${user} won **${meta.emoji} ${meta.label}**!\n\n` +
            `Reward sent to **DMs** (yes/no confirm).\n` +
            `Left in that stock: **${getStock(pool).length}**`
        )
        .setFooter({ text: `Spun by ${message.author.username}` })
        .setTimestamp();

      await spinMsg.edit({ embeds: [resultEmbed] }).catch(() =>
        message.channel.send({ embeds: [resultEmbed] })
      );

      const ok = await deliverProductWithVouch(message, user, pool, taken, false);
      if (!ok) {
        const arr = getStock(pool);
        arr.unshift(rewardText);
        setStock(pool, arr);
        saveData();
        await message.channel.send(
          `Could not DM ${user} (DMs closed). Reward **returned** to stock.`
        );
      }
      return;
    }

    // ---- -daily @role [n] ----
    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get((args[0] || '').replace(/[<@&>]/g, ''));

    if (!role) {
      return message.reply(
        'Usage:\n' +
          '`-daily @role 5` — pick **5** random members from role (pings you)\n' +
          '`-daily pay @user` — spin daily reward (Custom 65% / MCFA 35%)'
      );
    }

    let n = 1;
    for (const a of args) {
      if (/^\d+$/.test(a)) {
        n = Math.min(25, Math.max(1, parseInt(a, 10)));
        break;
      }
    }

    try {
      await message.guild.members.fetch();
    } catch (_) {}

    const pool = [...role.members.filter((m) => !m.user.bot).values()];
    if (!pool.length) {
      return message.reply(`No human members in **${role.name}**.`);
    }

    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, Math.min(n, pool.length));

    const lines = picked.map((m, i) => `\`#${i + 1}\` ${m} (\`${m.user.username}\`)`);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎲 Daily Random Pick')
      .setDescription(
        `Role: ${role}\n` +
          `Requested: **${n}** · Picked: **${picked.length}**\n\n` +
          lines.join('\n')
      )
      .setFooter({ text: `Drawn by ${message.author.username}` })
      .setTimestamp();

    return message.reply({
      content: `${message.author} — your daily picks: ${picked.map((m) => m.toString()).join(' ')}`,
      embeds: [embed]
    });
  }



  // ========== -birthday gift send @user (owner only) ==========
  if (cmd === 'birthday') {
    if (message.author.id !== BIRTHDAY_USER_ID) {
      return message.reply('Only the designated owner can use birthday gifts.');
    }
    const sub = (args[0] || '').toLowerCase();
    if (sub !== 'gift') {
      return message.reply('Usage: `-birthday gift @user` or `-birthday gift send @user`');
    }
    const user =
      message.mentions.users.first() ||
      (args[1] && args[1].toLowerCase() === 'send'
        ? message.mentions.users.first()
        : null) ||
      (args[2] && (await client.users.fetch(args[2].replace(/[<@!>]/g, '')).catch(() => null))) ||
      (args[1] && (await client.users.fetch(args[1].replace(/[<@!>]/g, '')).catch(() => null)));

    if (!user || user.bot) {
      return message.reply('Usage: `-birthday gift @user`');
    }

    // Prefer custom, else any available stock
    ensureStocks(data);
    let key = getStock('custom').length ? 'custom' : null;
    if (!key) {
      const avail = Object.keys(PRODUCT_STOCKS).filter((k) => (PRODUCT_STOCKS[k].type === 'method' ? !!getMethodText(k) : getStock(k).length));
      key = avail[0] || null;
    }
    if (!key) return message.reply('No stock available for a birthday gift.');
    const taken = await takeFromStock(key, 1);
    const ok = await deliverProductWithVouch(message, user, key, taken, true);
    if (!ok) {
      getStock(key).unshift(taken[0]);
      setStock(key, getStock(key));
      saveData();
      return message.reply('Could not DM them — gift restored to stock.');
    }
    return message.reply(
      `🎂 Birthday gift (**${PRODUCT_STOCKS[key].label}**) sent to ${user}!`
    );
  }

  // ========== -staff apply / OPEN / CLOSED ==========
  if (cmd === 'staff') {
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'apply') {
      const mode = (args[1] || '').toLowerCase();

      if (mode === 'closed') {
        if (!isStaff(message.member)) return message.reply('Staff only.');
        data.staffApplyOpen = false;
        saveData();
        return message.reply('🔒 **Staff applications are now CLOSED.**');
      }
      if (mode === 'open') {
        if (!isStaff(message.member)) return message.reply('Staff only.');
        data.staffApplyOpen = true;
        saveData();
        return message.reply('🔓 **Staff applications are now OPEN.**');
      }

      // user applying
      if (!isTicketChannel(message.channel)) {
        return message.reply('`-staff apply` only works **inside a ticket**.');
      }
      if (!data.staffApplyOpen) {
        return message.reply('**Staff apply is currently closed !**');
      }

      const questions = [
        'How long have you been in Flare Drop / this community?',
        'Why do you want to join the staff team?',
        'What skills or strengths make you a strong staff candidate?',
        'Have you had any previous staff / moderation experience? (where & what)',
        'How many hours per day/week can you be active on Discord?',
        'How would you handle a member clearly breaking the rules?',
        'Two members are arguing in chat — what do you do step by step?',
        'Your close friend breaks a rule — how do you handle it fairly?',
        'How would you deal with a difficult or disrespectful member?',
        'Why should Flare Drop choose *you* over other applicants?',
        'Full form of MCFA, SMFA, NFA, FA?',
        'Will you use stocks as your salary?'
      ];

      await message.reply(
        '📋 **Staff Application** — answer each question in this ticket.\n' +
          'Type `cancel` anytime to stop.'
      );

      const answers = [];
      for (let i = 0; i < questions.length; i++) {
        await message.channel.send(`**${i + 1}/${questions.length}.** ${questions[i]}`);
        const collected = await message.channel
          .awaitMessages({
            filter: (m) => m.author.id === message.author.id && !m.author.bot,
            max: 1,
            time: 10 * 60 * 1000
          })
          .catch(() => null);
        if (!collected || !collected.size) {
          await message.channel.send('Timed out. Run `-staff apply` again when ready.');
          return;
        }
        const ans = collected.first().content.trim();
        if (ans.toLowerCase() === 'cancel') {
          await message.channel.send('Application cancelled.');
          return;
        }
        answers.push({ q: questions[i], a: ans });
      }

      const appId = `${message.author.id}-${Date.now()}`;
      if (!data.staffApplications) data.staffApplications = {};
      data.staffApplications[appId] = {
        userId: message.author.id,
        at: new Date().toISOString(),
        answers
      };
      saveData();

      const summary = answers
        .map((x, i) => `**${i + 1}.** ${x.q}\n> ${x.a}`)
        .join('\n\n');
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📨 Staff Application Submitted')
        .setDescription(summary.slice(0, 4000))
        .setFooter({ text: message.author.tag })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      const ownerPing = OWNER_ROLE_ID ? `<@&${OWNER_ROLE_ID}>` : '@owner';
      await message.channel.send(
        `${ownerPing}
${message.author}'s **staff application is ready** — please review.`
      );

      return;
    }

    return message.reply(
      '`-staff apply` — apply in a ticket\n' +
        '`-staff apply OPEN` / `-staff apply CLOSED` — staff toggle'
    );
  }



  // ========== -settings export / import (messages + invites backup) ==========
  if (cmd === 'settings' || cmd === 'setting' || cmd === 'settungs') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    if (sub === 'export') {
      const ch =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get((args[1] || '').replace(/[<#>]/g, '')) ||
        message.channel;

      if (!ch || !ch.isTextBased?.()) {
        return message.reply('Usage: `-settings export #channel`');
      }

      if (!data.exportCounts) data.exportCounts = { mcfa: 0, custom: 0, hits: 0, settings: 0 };
      data.exportCounts.settings = (data.exportCounts.settings || 0) + 1;
      const n = data.exportCounts.settings;
      saveData();

      const payload = {
        type: 'flare-staff-settings',
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: message.author.id,
        guildId: gid,
        messages: data.messages[gid] || {},
        invites: data.invites[gid] || {},
        inviteUses: data.inviteUses[gid] || {},
        coins: data.coins || {},
        daily: data.daily || {}
      };

      const filename = `settings_export_${n}.json`;
      const body = JSON.stringify(payload, null, 2);
      const file = new AttachmentBuilder(Buffer.from(body, 'utf8'), { name: filename });

      await ch.send({
        content:
          `📤 **Settings export** \`${filename}\`\n` +
          `Messages users: **${Object.keys(payload.messages).length}** · ` +
          `Invite users: **${Object.keys(payload.invites).length}**\n` +
          `Import later: \`-settings import ${'{message_id}'}\` (reply to this file or paste ID)`,
        files: [file]
      });
      return message.reply(`Exported settings into ${ch} as **${filename}**.`);
    }

    if (sub === 'import') {
      let msgId = (args[1] || '').replace(/\D/g, '');
      // allow reply-to import
      if (!msgId && message.reference?.messageId) {
        msgId = message.reference.messageId;
      }
      if (!msgId) {
        return message.reply(
          'Usage: `-settings import <message_id>`\n' +
            'Or reply to the export message with `-settings import`'
        );
      }

      let targetMsg = null;
      // search current channel then common channels
      try {
        targetMsg = await message.channel.messages.fetch(msgId);
      } catch (_) {}
      if (!targetMsg) {
        for (const ch of message.guild.channels.cache.values()) {
          if (!ch.isTextBased?.()) continue;
          try {
            targetMsg = await ch.messages.fetch(msgId);
            if (targetMsg) break;
          } catch (_) {}
        }
      }
      if (!targetMsg) {
        return message.reply('Could not find that message ID in this server.');
      }

      let jsonText = null;
      if (targetMsg.attachments.size) {
        const att = targetMsg.attachments.find(
          (a) =>
            (a.name || '').endsWith('.json') ||
            (a.contentType || '').includes('json') ||
            (a.name || '').includes('settings')
        ) || targetMsg.attachments.first();
        if (att) {
          const res = await fetch(att.url);
          jsonText = await res.text();
        }
      }
      if (!jsonText) {
        const m = targetMsg.content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) jsonText = m[1];
      }
      if (!jsonText) {
        return message.reply('No `.json` attachment or JSON code block found on that message.');
      }

      let payload;
      try {
        payload = JSON.parse(jsonText);
      } catch (e) {
        return message.reply('Invalid JSON in that export.');
      }

      if (!payload || typeof payload !== 'object') {
        return message.reply('Empty export payload.');
      }

      // merge messages/invites for this guild (or payload.guildId)
      const targetGid = payload.guildId || gid;
      if (!data.messages[targetGid]) data.messages[targetGid] = {};
      if (!data.invites[targetGid]) data.invites[targetGid] = {};
      if (!data.inviteUses[targetGid]) data.inviteUses[targetGid] = {};

      const msgIn = payload.messages || {};
      const invIn = payload.invites || {};
      const usesIn = payload.inviteUses || {};

      let msgCount = 0;
      let invCount = 0;
      for (const [uid, count] of Object.entries(msgIn)) {
        data.messages[targetGid][uid] = Math.max(
          data.messages[targetGid][uid] || 0,
          Number(count) || 0
        );
        msgCount++;
      }
      for (const [uid, count] of Object.entries(invIn)) {
        data.invites[targetGid][uid] = Math.max(
          data.invites[targetGid][uid] || 0,
          Number(count) || 0
        );
        invCount++;
      }
      for (const [code, info] of Object.entries(usesIn)) {
        data.inviteUses[targetGid][code] = info;
      }
      if (payload.coins && typeof payload.coins === 'object') {
        data.coins = { ...data.coins, ...payload.coins };
      }
      if (payload.daily && typeof payload.daily === 'object') {
        data.daily = { ...data.daily, ...payload.daily };
      }
      saveData();

      return message.reply(
        `✅ **Settings imported** from \`${msgId}\`\n` +
          `Message records: **${msgCount}** users · Invite records: **${invCount}** users\n` +
          `(Merged with max counts — existing higher values kept.)`
      );
    }

    return message.reply(
      '**Settings backup**\n' +
        '`-settings export #channel` — save messages + invites as JSON file\n' +
        '`-settings import <message_id>` — restore from that export message\n' +
        'Or **reply** to the export message: `-settings import`'
    );
  }



  // -falcon → same as full invite card
  if (cmd === 'falcon') {
    const user =
      message.mentions.users.first() ||
      (args[0] && (await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null))) ||
      message.author;
    return message.reply({ embeds: [buildFalconInviteEmbed(user, message.guild.id)] });
  }


  // ========== -cstatus — check free-gen status requirement ==========
  if (cmd === 'cstatus') {
    const member = message.member;
    if (!member) return message.reply('Members only.');
    const custom = member.presence?.activities?.find((a) => a.type === 4); // Custom
    const statusText = custom?.state || '';
    const ok = statusText && statusText.includes(FREE_STATUS_TEXT);
    const role = message.guild.roles.cache.get(FREE_GEN_ROLE_ID);
    const hasRole = role && member.roles.cache.has(FREE_GEN_ROLE_ID);

    if (ok) {
      if (role && !hasRole) {
        await member.roles.add(role).catch(() => {});
      }
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('✅ Status check')
            .setDescription(
              `Your status matches:\n\`${FREE_STATUS_TEXT}\`\n\n` +
                `Free gen role: **${hasRole || role ? 'YES' : 'added'}** <@&${FREE_GEN_ROLE_ID}>\n` +
                `Use \`-fgen <product>\` e.g. \`-fgen mcfa\``
            )
        ]
      });
    }
    if (role && hasRole) {
      await member.roles.remove(role).catch(() => {});
    }
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('❌ Status not set')
          .setDescription(
            `Set your **custom status** exactly including:\n\`\`\`\n${FREE_STATUS_TEXT}\n\`\`\`\n` +
              `Then run \`-cstatus\` again.\n\n` +
              `**Paid gen:** $3 — open a ticket and ping <@&${OWNZ_ROLE_ID}>`
          )
      ]
    });
  }




  // ========== Moderation -ban -kick -timeout -warn ==========
  if (['ban', 'kick', 'timeout', 'mute', 'untimeout', 'unmute', 'warn', 'warnings'].includes(cmd)) {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const user = message.mentions.users.first();
    if (!user && cmd !== 'warnings') return message.reply(`\`$${cmd} @user [reason/duration]\``);
    if (cmd === 'warnings') {
      const u = user || message.mentions.users.first();
      if (!u) return message.reply('`-warnings @user`');
      const list = (data.warnings && data.warnings[u.id]) || [];
      const text = list.length
        ? list.map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.at / 1000)}:R>`).join('\n')
        : 'No warnings.';
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle(`Warnings — ${u.tag}`).setDescription(text)] });
    }
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    const reason = args.slice(1).join(' ').replace(/<@!?\d+>/g, '').trim() || 'No reason';
    if (cmd === 'warn') {
      if (!data.warnings) data.warnings = {};
      if (!data.warnings[user.id]) data.warnings[user.id] = [];
      data.warnings[user.id].push({ reason: args.slice(1).join(' ') || 'No reason', by: message.author.id, at: Date.now() });
      saveData();
      await user.send(`⚠️ Warned in **${message.guild.name}**: ${data.warnings[user.id].slice(-1)[0].reason}`).catch(() => {});
      return message.reply(`Warned **${user.tag}** (${data.warnings[user.id].length} total)`);
    }
    if (!member) return message.reply('Member not in server.');
    if (cmd === 'ban') {
      await member.ban({ reason: `${reason} | ${message.author.tag}` });
      return message.reply(`Banned **${user.tag}**`);
    }
    if (cmd === 'kick') {
      await member.kick(`${reason} | ${message.author.tag}`);
      return message.reply(`Kicked **${user.tag}**`);
    }
    if (cmd === 'timeout' || cmd === 'mute') {
      const dur = args[1] || '1h';
      const ms = parseDuration(dur);
      if (!ms) return message.reply('`-timeout @user 1h reason`');
      await member.timeout(ms, reason);
      return message.reply(`Timed out **${user.tag}** for **${dur}**`);
    }
    if (cmd === 'untimeout' || cmd === 'unmute') {
      await member.timeout(null);
      return message.reply(`Timeout removed for **${user.tag}**`);
    }
  }



  // ========== ?purge / ?clearmsg / ?prune ==========
  if (cmd === 'purge' || cmd === 'clearmsg' || cmd === 'prune') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('Need **Manage Messages**.');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('I need **Manage Messages** in this channel.');
    }
    let amount = parseInt(args[0], 10);
    if (!amount || amount < 1) {
      return message.reply('Usage: `?purge <1-100>` · optional `@user` to filter');
    }
    amount = Math.min(amount, 100);
    const target = message.mentions.users.first();
    try {
      await message.delete().catch(() => {});
      let deleted = 0;
      if (target) {
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        const filtered = [...fetched.values()]
          .filter((m) => m.author.id === target.id)
          .slice(0, amount);
        if (!filtered.length) return message.channel.send('No messages found for that user.').then((m) => setTimeout(() => m.delete().catch(() => {}), 4000));
        const res = await message.channel.bulkDelete(filtered, true);
        deleted = res.size;
      } else {
        const res = await message.channel.bulkDelete(amount, true);
        deleted = res.size;
      }
      const conf = await message.channel.send(`🗑️ Deleted **${deleted}** message(s).`);
      setTimeout(() => conf.delete().catch(() => {}), 4000);
    } catch (e) {
      return message.channel.send('Purge failed: ' + (e.message || e) + ' (messages older than 14 days cannot be bulk-deleted).').catch(() => {});
    }
    return;
  }

  // ========== ?lock / ?unlock ==========
  if (cmd === 'lock') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const ch = message.mentions.channels.first() || message.channel;
    await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => null);
    return message.reply(`🔒 Locked ${ch}`);
  }
  if (cmd === 'unlock') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const ch = message.mentions.channels.first() || message.channel;
    await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => null);
    return message.reply(`🔓 Unlocked ${ch}`);
  }

  // ========== ?slowmode ==========
  if (cmd === 'slowmode' || cmd === 'slow') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const secs = parseInt(args[0], 10);
    if (isNaN(secs) || secs < 0 || secs > 21600) {
      return message.reply('Usage: `?slowmode <seconds 0-21600>`');
    }
    await message.channel.setRateLimitPerUser(secs).catch(() => null);
    return message.reply(secs === 0 ? 'Slowmode **off**.' : `Slowmode set to **${secs}s**.`);
  }

  // ========== ?hide / ?show channel ==========
  if (cmd === 'hide') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const ch = message.mentions.channels.first() || message.channel;
    await ch.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false }).catch(() => null);
    return message.reply(`👁️‍🗨️ Hidden ${ch}`);
  }
  if (cmd === 'show') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const ch = message.mentions.channels.first() || message.channel;
    await ch.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null }).catch(() => null);
    return message.reply(`👁️ Shown ${ch}`);
  }

  // ========== ?nick ==========
  if (cmd === 'nick' || cmd === 'nickname') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const member = message.mentions.members.first() || message.member;
    const nick = args.filter((a) => !a.startsWith('<@')).join(' ') || null;
    await member.setNickname(nick).catch((e) => message.reply('Failed: ' + e.message));
    return message.reply(nick ? `Nickname set to **${nick}**` : `Nickname cleared for **${member.user.username}**`);
  }

  // ========== ?role add|remove ==========
  if (cmd === 'role' || cmd === 'addrole' || cmd === 'removerole') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    let sub = (args[0] || '').toLowerCase();
    let userArg = message.mentions.members.first();
    let roleArg = message.mentions.roles.first();
    if (cmd === 'addrole') sub = 'add';
    if (cmd === 'removerole') sub = 'remove';
    if (!roleArg) {
      const rid = (args.find((a) => /^\d{15,}$/.test(a)) || '').trim();
      if (rid) roleArg = message.guild.roles.cache.get(rid);
    }
    if (!userArg || !roleArg) {
      return message.reply('Usage: `?role add @user @role` · `?role remove @user @role`');
    }
    if (sub === 'add' || sub === 'give') {
      await userArg.roles.add(roleArg).catch((e) => message.reply('Failed: ' + e.message));
      return message.reply(`Added **${roleArg.name}** to **${userArg.user.username}**`);
    }
    if (sub === 'remove' || sub === 'take') {
      await userArg.roles.remove(roleArg).catch((e) => message.reply('Failed: ' + e.message));
      return message.reply(`Removed **${roleArg.name}** from **${userArg.user.username}**`);
    }
    return message.reply('Usage: `?role add|remove @user @role`');
  }

  // ========== ?softban ==========
  if (cmd === 'softban') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const user = message.mentions.users.first();
    if (!user) return message.reply('Usage: `?softban @user [reason]`');
    const reason = args.slice(1).join(' ') || 'Softban';
    await message.guild.members.ban(user.id, { deleteMessageSeconds: 86400, reason }).catch(() => null);
    await message.guild.members.unban(user.id, 'Softban unban').catch(() => null);
    return message.reply(`Softbanned **${user.tag}** (ban + unban, messages cleaned).`);
  }


  // ========== !steal <emoji> — add custom emoji to this server ==========
  if (cmd === 'steal' || cmd === 'addemoji') {
    const canEmoji =
      isStaff(message.member) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      (PermissionFlagsBits.ManageGuildExpressions && message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) ||
      (PermissionFlagsBits.ManageEmojisAndStickers && message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers));
    if (!canEmoji) {
      return message.reply('Need **Manage Expressions** permission or staff.');
    }
    const raw = args[0] || '';
    const match = raw.match(/<(a?):([a-zA-Z0-9_]+):(\d+)>/);
    if (!match) {
      return message.reply('Usage: `!steal <custom emoji>` — paste a custom emoji from any server.');
    }
    const animated = match[1] === 'a';
    let name = (args[1] || match[2]).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
    if (!name || name.length < 2) name = 'emoji' + Date.now().toString().slice(-4);
    const id = match[3];
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=128&quality=lossless`;
    try {
      const emoji = await message.guild.emojis.create({ attachment: url, name });
      return message.reply(`Added ${emoji} as \`:${emoji.name}:\``);
    } catch (e) {
      return message.reply('Failed to steal emoji: ' + (e.message || e) + ' (need Manage Expressions + emoji slots).');
    }
  }

  // ========== ?say / ?embed / ?announce ==========
  if (cmd === 'say') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const text = args.join(' ');
    if (!text) return message.reply('Usage: `?say <message>`');
    await message.delete().catch(() => {});
    return message.channel.send({ content: text.slice(0, 2000), allowedMentions: { parse: [] } });
  }
  if (cmd === 'embed' || cmd === 'announce') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const text = args.join(' ');
    if (!text) return message.reply('Usage: `?embed <title | description>` or `?embed message`');
    const parts = text.split('|').map((s) => s.trim());
    const emb = new EmbedBuilder()
      .setColor(0xbe2c71)
      .setDescription(parts[1] || parts[0])
      .setFooter({ text: message.guild.name })
      .setTimestamp();
    if (parts[1]) emb.setTitle(parts[0].slice(0, 256));
    await message.delete().catch(() => {});
    return message.channel.send({ embeds: [emb] });
  }

  // ========== ?poll ==========
  if (cmd === 'poll') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const q = args.join(' ');
    if (!q) return message.reply('Usage: `?poll <question>`');
    const emb = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Poll')
      .setDescription(q)
      .setFooter({ text: 'React to vote' });
    const msg = await message.channel.send({ embeds: [emb] });
    await msg.react('👍').catch(() => {});
    await msg.react('👎').catch(() => {});
    return;
  }

  // ========== ?userinfo / ?avatar ==========
  if (cmd === 'userinfo' || cmd === 'ui' || cmd === 'whois') {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user.id).catch(() => null);
    const emb = new EmbedBuilder()
      .setColor(0xbe2c71)
      .setTitle(user.username)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Joined', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '—', inline: true },
        { name: 'Roles', value: member ? [...member.roles.cache.filter((r) => r.id !== message.guild.id).values()].slice(0, 15).map((r) => r.name).join(', ') || 'None' : '—' }
      );
    return message.reply({ embeds: [emb] });
  }
  if (cmd === 'avatar' || cmd === 'av') {
    const user = message.mentions.users.first() || message.author;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xbe2c71)
          .setTitle(`${user.username}'s avatar`)
          .setImage(user.displayAvatarURL({ size: 512 }))
      ]
    });
  }
  if (cmd === 'banner') {
    const user = message.mentions.users.first() || message.author;
    const full = await client.users.fetch(user.id, { force: true }).catch(() => user);
    const banner = full.bannerURL?.({ size: 512 });
    if (!banner) return message.reply('No banner.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(0xbe2c71).setImage(banner).setTitle(`${user.username}'s banner`)] });
  }

  // ========== ?ping / ?uptime / ?botinfo / ?membercount ==========
  if (cmd === 'ping') {
    const sent = await message.reply('Pinging…');
    return sent.edit(`🏓 Pong · **${sent.createdTimestamp - message.createdTimestamp}ms** · WS **${Math.round(client.ws.ping)}ms**`);
  }
  if (cmd === 'uptime') {
    const s = Math.floor(process.uptime());
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return message.reply(`⏱️ Uptime: **${h}h ${m}m ${sec}s**`);
  }
  if (cmd === 'botinfo') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xbe2c71)
          .setTitle('Flare Staff Bot')
          .setDescription(
            `Servers: **${client.guilds.cache.size}**\nPing: **${Math.round(client.ws.ping)}ms**\nUptime: **${Math.floor(process.uptime() / 60)}m**\nPrefixes: \`- $ ? !\``
          )
      ]
    });
  }
  if (cmd === 'membercount') {
    return message.reply(`👥 Members: **${message.guild.memberCount}**`);
  }

  // ========== ?snipe (last deleted message) ==========
  if (cmd === 'snipe') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const sn = data.snipes?.[message.channel.id];
    if (!sn) return message.reply('Nothing to snipe.');
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setAuthor({ name: sn.tag || 'Unknown', iconURL: sn.avatar || undefined })
          .setDescription(sn.content || '*empty*')
          .setFooter({ text: 'Deleted message' })
          .setTimestamp(sn.at || Date.now())
      ]
    });
  }


  // ========== Giveaways -gstart / -greroll ==========
  if (cmd === 'gstart' || cmd === 'giveaway') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    // -gstart 1h 1 Nitro
    const timeRaw = args[0];
    const winners = parseInt(args[1], 10) || 1;
    const prize = args.slice(2).join(' ') || 'Prize';
    if (!timeRaw || !prize) {
      return message.reply('`-gstart <time> <winners> <prize>` e.g. `-gstart 1h 1 Nitro`');
    }
    const ms = parseDuration(timeRaw);
    if (!ms || ms < 10000) return message.reply('Bad time. Use 10m, 1h, 1d');
    const ends = Date.now() + ms;
    const gObj = {
      channelId: message.channel.id,
      prize,
      winners,
      ends,
      hostId: message.author.id,
      entries: []
    };
    const emb = buildGiveawayLiveEmbed(gObj, message.author.toString());
    const msg = await message.channel.send({ embeds: [emb], components: [giveawayButtons(false)] });
    if (!data.giveaways) data.giveaways = {};
    data.giveaways[msg.id] = gObj;
    saveData();
    setTimeout(() => endGiveaway(msg.id).catch(() => {}), ms);
    return;
  }
  if (cmd === 'greroll') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const id = args[0] || (message.reference && message.reference.messageId);
    if (!id || !data.giveaways?.[id]) return message.reply('`-greroll <messageId>` (reply to giveaway)');
    await endGiveaway(id, true);
    return message.reply('Rerolled.');
  }


  // ========== -genstock / -genadd — separate gen stock ==========
  if (cmd === 'genstock' || cmd === 'gstock' || cmd === 'g3n') {
    // -g3n stock | -g3n stock add | -genstock
    if (cmd === 'g3n') {
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'stock' || sub === 'stocks') {
        const sub2 = (args[1] || '').toLowerCase();
        if (sub2 === 'add') {
          if (!isStaff(message.member)) return message.reply('Staff only.');
          // reuse genadd: -g3n stock add product items
          const productKey = resolveProductKey(args[2]);
          if (!productKey) return message.reply('`-g3n stock add <product> email:pass`');
          const meta = PRODUCT_STOCKS[productKey];
          if (meta.type === 'method') {
            return message.reply(`Method — use \`$${productKey} set <text>\``);
          }
          const rest = body.split(/add/i)[1] || '';
          const afterProd = rest.trim().split(/\s+/);
          // body after product name
          let itemsPart = body;
          const pidx = body.toLowerCase().indexOf(args[2].toLowerCase());
          itemsPart = pidx >= 0 ? body.slice(pidx + args[2].length).trim() : '';
          const accounts = parseAccounts(itemsPart).length
            ? parseAccounts(itemsPart)
            : itemsPart.split(/\n+/).map((s) => s.trim()).filter(Boolean);
          if (!accounts.length) return message.reply('`-g3n stock add mcfa email:pass`');
          const arr = getStock(productKey, 'gen');
          let added = 0;
          for (const a of accounts) {
            if (!arr.includes(a)) { arr.push(a); added++; }
          }
          setStock(productKey, arr, 'gen');
          saveData();
          return message.reply(`🎁 Gen **${meta.label}** +${added} · now ${arr.length}`);
        }
        // view gen stock
        if (!canViewStock(message.member)) return message.reply('Members / staff only.');
        cmd = 'genstock';
        // fall through by jumping - rewrite as call
      } else {
        return message.reply('`-g3n stock` · `-g3n stock add <product> <items>`');
      }
    }
    if (cmd === 'genstock' || cmd === 'gstock') {
    if (!canViewStock(message.member)) return message.reply('Members / staff only.');
    ensureStocks(data);
    const lines = Object.entries(PRODUCT_STOCKS)
      .filter(([, m]) => m.type !== 'method')
      .map(([key, meta]) => {
        const g = getStock(key, 'gen').length;
        return `${meta.emoji} **${meta.label}** gen  |  \`${g}\``;
      });
    const methods = Object.entries(PRODUCT_STOCKS)
      .filter(([, m]) => m.type === 'method')
      .map(([key, meta]) => {
        const has = !!getMethodText(key);
        return `${meta.emoji} **${meta.label}**  |  ${has ? '`∞`' : '`not set`'}`;
      });
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🎁 GEN STOCK (fgen / pgen only)')
          .setDescription(lines.join('\n') + '\n\n**Methods (shared ∞)**\n' + methods.join('\n'))
          .setFooter({ text: 'Add: -genadd mcfa email:pass · Pay stock stays separate (-mcfa add)' })
      ]
    });
    }
  }

  if (cmd === 'genadd' || cmd === 'gadd') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const productKey = resolveProductKey(args[0]);
    if (!productKey) {
      return message.reply('Usage: `-genadd <product> <items...>` e.g. `-genadd mcfa a@b.com:pass`');
    }
    const meta = PRODUCT_STOCKS[productKey];
    if (meta.type === 'method') {
      return message.reply(`**${meta.label}** is a method — use \`$${productKey} set <full text>\` (shared ∞ for pay + gen).`);
    }
    const rest = body.slice(body.toLowerCase().indexOf(args[0]) + args[0].length).trim();
    const accounts = parseAccounts(rest).length
      ? parseAccounts(rest)
      : rest.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!accounts.length) {
      return message.reply(`Usage: \`-genadd ${productKey} email:pass\` (multiple OK)`);
    }
    const arr = getStock(productKey, 'gen');
    let added = 0;
    for (const a of accounts) {
      if (!arr.includes(a)) {
        arr.push(a);
        added++;
      }
    }
    setStock(productKey, arr, 'gen');
    saveData();
    return message.reply(
      `🎁 Gen stock **${meta.label}**: +**${added}** · now **${arr.length}** (pay stock unchanged)`
    );
  }

  if (cmd === 'genclear') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const productKey = resolveProductKey(args[0]);
    if (!productKey) return message.reply('`-genclear <product>`');
    const n = getStock(productKey, 'gen').length;
    setStock(productKey, [], 'gen');
    saveData();
    return message.reply(`Cleared **${n}** from **gen** ${productKey}.`);
  }

  // ========== -fgen / -pgen — gen DM (free OR paid role) ==========
  if (cmd === 'fgen' || cmd === 'pgen' || cmd === 'paidgen') {
    const member = message.member;
    if (!member) return message.reply('Members only.');

    const hasFree = member.roles.cache.has(FREE_GEN_ROLE_ID);
    const hasPaid = member.roles.cache.has(PAID_GEN_ROLE_ID);
    const isStaffUser = isStaff(member);

    // -pgen with no product → how to buy
    if ((cmd === 'pgen' || cmd === 'paidgen') && !args[0]) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle('💎 Paid Gen')
            .setDescription(
              `**Price:** $3 USD\n` +
                `1. Open a **ticket**\n` +
                `2. Ping <@&${OWNZ_ROLE_ID}> (**Ownz**)\n` +
                `3. Pay → get <@&${PAID_GEN_ROLE_ID}>\n` +
                `4. Then run: \`-pgen mcfa\` or \`-fgen mcfa\`\n\n` +
                `Website: ${FLARE_WEB}`
            )
        ]
      });
    }

    if (!hasFree && !hasPaid && !isStaffUser) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('❌ No gen access')
            .setDescription(
              `**Free:** status \`${FREE_STATUS_TEXT}\` → \`-cstatus\`\n` +
                `**Paid:** $3 → role <@&${PAID_GEN_ROLE_ID}> → \`-pgen mcfa\``
            )
        ]
      });
    }

    const product = resolveProductKey(args[0] || 'mcfa') || 'mcfa';
    const meta = PRODUCT_STOCKS[product];
    if (!meta) return message.reply('Unknown product. Try: mcfa, xbox, netflix, crunchyroll, …');
    const taken = await takeFromStock(product, 1, 'gen');
    if (!taken) {
      return message.reply(
        `**${meta.label}** **gen** stock is empty.
Staff: \`-genadd ${product} ...\` or \`-genstock\``
      );
    }
    const ok = await deliverProductWithVouch(message, message.author, product, taken, true);
    if (!ok) {
      const arr = getStock(product, 'gen');
      arr.unshift(taken[0]);
      setStock(product, arr, 'gen');
      saveData();
      return message.reply('Could not DM you — open your DMs and try again. Gen stock restored.');
    }
    const tier = hasPaid ? 'Paid' : hasFree ? 'Free' : 'Staff';
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(hasPaid ? 0xfee75c : 0x57f287)
          .setTitle(`✅ ${tier} gen sent`)
          .setDescription(
            `**${meta.emoji} ${meta.label}** sent to your **DMs**.\n# ARE WE LEGIT?\nCheck your DMs.`
          )
      ]
    });
  }

  // ========== -msg — set / post role tutorial ==========
  if (cmd === 'msg') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    if (!data.msgFree) data.msgFree = '';
    if (!data.msgPaid) data.msgPaid = '';

    const sub = (args[0] || '').toLowerCase();
    const sub2 = (args[1] || '').toLowerCase();

    // -msg free set <text>
    // -msg paid set <text>
    // -msg set free <text>  (alt)
    // -msg free  → post free embed
    // -msg paid  → post paid embed
    // -msg       → post both

    const isFree = sub === 'free' || sub2 === 'free';
    const isPaid = sub === 'paid' || sub2 === 'paid';
    const isSet = sub === 'set' || sub2 === 'set';

    if (isSet && (isFree || isPaid || sub === 'set')) {
      // Find text after "set"
      const idx = body.toLowerCase().indexOf('set');
      let rest = idx >= 0 ? body.slice(idx + 3).trim() : '';
      // strip leading free/paid keyword if present after set
      rest = rest.replace(/^(free|paid)\s+/i, '').trim();
      // if order was -msg free set ...
      if ((sub === 'free' || sub === 'paid') && sub2 === 'set') {
        const i2 = body.toLowerCase().indexOf('set');
        rest = i2 >= 0 ? body.slice(i2 + 3).trim() : rest;
      }
      if (!rest) {
        return message.reply(
          'Usage:\n' +
            '`-msg free set <text>`\n' +
            '`-msg paid set <text>`'
        );
      }
      if (isFree || (sub === 'set' && args[1]?.toLowerCase() === 'free')) {
        data.msgFree = rest;
        saveData();
        return message.reply('✅ **Free Gen** tutorial text saved. Post with `-msg free`.');
      }
      if (isPaid || (sub === 'set' && args[1]?.toLowerCase() === 'paid')) {
        data.msgPaid = rest;
        saveData();
        return message.reply('✅ **Paid Gen** tutorial text saved. Post with `-msg paid`.');
      }
      // bare -msg set → save as free by default
      data.msgFree = rest;
      saveData();
      return message.reply('Saved as **Free** text. Use `-msg free set` / `-msg paid set` for separate ones.');
    }

    const defaultFree =
      `Add our status text to your **Discord custom status** to get instant access to **Free Gen**!\n\n` +
      `📌 **Copy & Paste status text below:**\n` +
      `\`\`\`\n${FREE_STATUS_TEXT}\n\`\`\`\n` +
      `➡️ **Once updated**, your **Free Gen** role will be granted automatically!\n` +
      `(Or run \`-cstatus\` to check / refresh.)\n\n` +
      `Then use \`-fgen mcfa\` (or xbox / netflix / …) to receive stock in **DMs**.`;

    const defaultPaid =
      `**Price: $3 USD**\n\n` +
      `1️⃣ Create a **ticket**\n` +
      `2️⃣ Pay **$3** to **Ownz** <@&${OWNZ_ROLE_ID}>\n` +
      `3️⃣ Staff will give you the **Paid Gen** role <@&${PAID_GEN_ROLE_ID}>\n\n` +
      `Website: ${FLARE_WEB}`;

    const freeEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🟢 ACCESS FREE GEN')
      .setDescription((data.msgFree || defaultFree).slice(0, 4000))
      .setFooter({ text: 'Flare Rewards / Flare Drop' })
      .setTimestamp();

    const paidEmbed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('💎 ACCESS PAID GEN')
      .setDescription((data.msgPaid || defaultPaid).slice(0, 4000))
      .setFooter({ text: 'Flare Rewards / Flare Drop' })
      .setTimestamp();

    if (sub === 'free') {
      return message.channel.send({ embeds: [freeEmbed] });
    }
    if (sub === 'paid') {
      return message.channel.send({ embeds: [paidEmbed] });
    }
    if (!sub) {
      return message.channel.send({ embeds: [freeEmbed, paidEmbed] });
    }

    return message.reply(
      '**Tutorial embeds**\n' +
        '`-msg free set <text>` — save Free Gen message\n' +
        '`-msg paid set <text>` — save Paid Gen message\n' +
        '`-msg free` — post Free embed\n' +
        '`-msg paid` — post Paid embed\n' +
        '`-msg` — post both'
    );
  }


  // ========== -help ==========

  // ========== -memories / -bdaystory — secret birthday journey ==========
  if (cmd === 'memories' || cmd === 'bdaystory' || cmd === 'bdayjourney') {
    if (!canUseBdayStory(message.author.id)) {
      return; // silent — secret
    }
    await startBdayStory(message.channel, message.author);
    return;
  }


  // ========== -ticketpanel [description] + optional image ==========
  if (cmd === 'ticketpanel' || cmd === 'ticket-panel') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const description = args.join(' ').trim() || null;
    let bannerUrl = null;
    let bannerAttachment = null;
    const img = message.attachments.find(
      (a) => (a.contentType && a.contentType.startsWith('image/')) || /\.(png|jpe?g|gif|webp)$/i.test(a.name || '')
    );
    if (img) {
      bannerAttachment = new AttachmentBuilder(img.url, { name: 'ticket-banner.png' });
      bannerUrl = 'attachment://ticket-banner.png';
    }
    await postTicketPanel(message.channel, { description, bannerUrl, bannerAttachment });
    return message.reply('Ticket panel posted.').then((m) => setTimeout(() => m.delete().catch(() => {}), 4000));
  }


  // ========== ?verification — lock server until math DM verify ==========
  if (cmd === 'verification' || cmd === 'setupverify' || cmd === 'verifysetup') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    let role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(VERIFIED_ROLE_ID);
    const ch = message.mentions.channels.first() || message.channel;
    if (!role) {
      return message.reply(
        'Create role id `' + VERIFIED_ROLE_ID + '` or run `?verification @YourAccessRole`\n' +
          'That role must be the **only** way to see other channels (set Discord permissions).'
      );
    }
    if (!data.verification) data.verification = {};
    data.verification[message.guild.id] = {
      roleId: role.id,
      channelId: ch.id,
      updatedAt: Date.now()
    };
    saveData();
    const emb = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Verification')
      .setDescription(
        `Welcome to **${message.guild.name}**\n\n` +
          `You only have access to **this channel** until you verify.\n\n` +
          `**Steps**\n` +
          `› Click **Verify** below\n` +
          `› Solve the math question in your **DMs**\n` +
          `› Receive ${role} and unlock the server\n\n` +
          `Enable **DMs from server members** first.`
      )
      .setFooter({ text: BRAND.footer })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('flare_verify_start')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );
    await ch.send({ embeds: [emb], components: [row] });
    return message.reply(
      `Verification ready in ${ch}\n` +
        `Access role: **${role.name}** (\`${role.id}\`)\n` +
        `Remember: lock all other channels so only this role (and staff) can view them.`
    );
  }

  // ========== -setwelcome #channel ==========
  if (cmd === 'setwelcome') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const ch = message.mentions.channels.first();
    if (!ch) {
      return message.reply(
        'Usage: `-setwelcome #channel`\n' +
          'Or set env `WELCOME_CHANNEL_ID`.\n' +
          'Message template env `WELCOME_MESSAGE` supports `{user}` `{server}` `{count}` `{inviter}`'
      );
    }
    // store in data for runtime without redeploy
    if (!data.settings) data.settings = {};
    data.settings.welcomeChannelId = ch.id;
    saveData();
    return message.reply(`Welcome channel set to ${ch}. (Also set WELCOME_CHANNEL_ID in env for reboot persistence.)`);
  }


  // ========== -m messages count ==========
  if (cmd === 'm' || cmd === 'messages' || cmd === 'msgcount') {
    const u = message.mentions.users.first() || message.author;
    const n = data.messages?.[message.guild.id]?.[u.id] || 0;
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xbe2c71)
          .setAuthor({ name: u.username, iconURL: u.displayAvatarURL({ size: 128 }) })
          .setDescription(`**${u.username}** has **${n.toLocaleString()}** messages tracked.`)
          .setFooter({ text: 'Flare · Messages' })
      ]
    });
  }



  // ========== ?autorole on join ==========
  if (cmd === 'autorole' || cmd === 'autoroles') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const sub = (args[0] || '').toLowerCase();
    if (!data.autorole) data.autorole = {};
    if (sub === 'set' || sub === 'add') {
      const role = message.mentions.roles.first();
      if (!role) return message.reply(`Usage: \`${PREFIX_MOD}autorole set @role\``);
      data.autorole[message.guild.id] = role.id;
      saveData();
      return message.reply(`Auto-role set to **${role.name}**.`);
    }
    if (sub === 'off' || sub === 'clear') {
      delete data.autorole[message.guild.id];
      saveData();
      return message.reply('Auto-role cleared.');
    }
    const id = data.autorole[message.guild.id];
    return message.reply(id ? `Auto-role: <@&${id}>` : 'No auto-role set.');
  }

  // ========== ?autoreact ==========
  if (cmd === 'autoreact' || cmd === 'autoreaction' || cmd === 'react') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const sub = (args[0] || '').toLowerCase();
    if (!data.autoreact) data.autoreact = {};
    if (!data.autoreact[message.guild.id]) data.autoreact[message.guild.id] = [];
    const list = data.autoreact[message.guild.id];
    if (sub === 'add') {
      const trigger = (args[1] || '').toLowerCase();
      const emoji = args[2];
      if (!trigger || !emoji) return message.reply(`Usage: \`${PREFIX_MOD}autoreact add <word> <emoji>\``);
      list.push({ trigger, emoji });
      saveData();
      return message.reply(`Will react with ${emoji} when someone says **${trigger}**.`);
    }
    if (sub === 'list') {
      if (!list.length) return message.reply('No auto-reactions.');
      return message.reply(list.map((x, i) => `**${i + 1}.** \`${x.trigger}\` → ${x.emoji}`).join('\n'));
    }
    if (sub === 'remove' || sub === 'rm') {
      const n = parseInt(args[1], 10) - 1;
      if (n < 0 || n >= list.length) return message.reply('Invalid number.');
      const removed = list.splice(n, 1);
      saveData();
      return message.reply(`Removed \`${removed[0].trigger}\`.`);
    }
    return message.reply(`Usage: \`${PREFIX_MOD}autoreact add|list|remove\``);
  }

  // ========== ?unban ==========
  if (cmd === 'unban') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const id = (args[0] || '').replace(/[<@!>]/g, '');
    if (!id) return message.reply(`Usage: \`${PREFIX_MOD}unban <userId>\``);
    await message.guild.members.unban(id).catch(() => null);
    return message.reply(`Unbanned \`${id}\`.`);
  }

  // ========== ?modhelp ==========
  if (cmd === 'modhelp' || cmd === 'commands' || (cmd === 'help' && (usedPrefix === PREFIX_MOD || usedPrefix === PREFIX_MOD_ALT || usedPrefix === PREFIX_STATS || usedPrefix === PREFIX_STOCK))) {
    const embeds = buildFullHelpEmbeds();
    return message.reply({ embeds: embeds.slice(0, 4) });
  }


  // ========== -protection (saved in data, not env) ==========
  if (cmd === 'protection' || cmd === 'automod' || cmd === 'security') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const sub = (args[0] || 'status').toLowerCase();
    const p = getProtection();

    if (sub === 'status' || sub === 'show') {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Flare Protection')
            .setDescription(
              `**Auto-mod** · ${p.automod ? 'ON' : 'OFF'}\n` +
                `**Anti-nuke** · ${p.antinuke ? 'ON' : 'OFF'}\n` +
                `**Anti-raid** · ${p.antiraid !== false ? 'ON' : 'OFF'}\n` +
                `**Log** · ${p.logChannelId ? `<#${p.logChannelId}>` : 'not set'}\n` +
                `**Spam** · ${p.spamMsgLimit} / ${p.spamWindowMs / 1000}s\n` +
                `**Join raid** · ${p.joinRaidLimit} / ${p.joinRaidWindowMs / 1000}s\n` +
                `**Nuke** · ${p.nukeActionLimit} / ${p.nukeWindowMs / 1000}s\n` +
                `**Bad words** · ${p.badWords.length}\n\n` +
                `\`${PREFIX}protection automod on/off\`\n` +
                `\`${PREFIX}protection antinuke on/off\`\n` +
                `\`${PREFIX}protection log #channel\`\n` +
                `\`${PREFIX}protection badword add|remove|list <word>\`\n` +
                `\`${PREFIX}protection spam 6 5\``
            )
            .setFooter({ text: 'Stored in bot data · /api/protection' })
        ]
      });
    }
    if (sub === 'automod') {
      const on = ['on', 'true', '1'].includes((args[1] || '').toLowerCase());
      const off = ['off', 'false', '0'].includes((args[1] || '').toLowerCase());
      if (!on && !off) return message.reply(`Usage: \`${PREFIX}protection automod on|off\``);
      saveProtection({ automod: on });
      return message.reply(`Auto-mod **${on ? 'ON' : 'OFF'}**`);
    }
    if (sub === 'antinuke') {
      const on = ['on', 'true', '1'].includes((args[1] || '').toLowerCase());
      const off = ['off', 'false', '0'].includes((args[1] || '').toLowerCase());
      if (!on && !off) return message.reply(`Usage: \`${PREFIX}protection antinuke on|off\``);
      saveProtection({ antinuke: on });
      return message.reply(`Anti-nuke **${on ? 'ON' : 'OFF'}**`);
    }
    if (sub === 'antiraid') {
      const on = ['on', 'true', '1'].includes((args[1] || '').toLowerCase());
      const off = ['off', 'false', '0'].includes((args[1] || '').toLowerCase());
      if (!on && !off) return message.reply(`Usage: \`${PREFIX}protection antiraid on|off\``);
      saveProtection({ antiraid: on });
      return message.reply(`Anti-raid **${on ? 'ON' : 'OFF'}**`);
    }
    if (sub === 'log') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply(`Usage: \`${PREFIX}protection log #channel\``);
      saveProtection({ logChannelId: ch.id });
      return message.reply(`Log channel → ${ch}`);
    }
    if (sub === 'badword' || sub === 'badwords' || sub === 'filter') {
      const act = (args[1] || '').toLowerCase();
      const word = (args[2] || '').toLowerCase().trim();
      if (act === 'list') return message.reply(p.badWords.length ? p.badWords.map((w) => `\`${w}\``).join(', ') : '(none)');
      if (act === 'add' && word) {
        if (!p.badWords.includes(word)) p.badWords.push(word);
        saveProtection({ badWords: p.badWords });
        return message.reply(`Added \`${word}\``);
      }
      if ((act === 'remove' || act === 'rm') && word) {
        saveProtection({ badWords: p.badWords.filter((w) => w !== word) });
        return message.reply(`Removed \`${word}\``);
      }
      return message.reply(`Usage: \`${PREFIX}protection badword add|remove|list <word>\``);
    }
    if (sub === 'spam') {
      const count = parseInt(args[1], 10);
      const secs = parseInt(args[2], 10);
      if (!count || !secs) return message.reply(`Usage: \`${PREFIX}protection spam 6 5\``);
      saveProtection({ spamMsgLimit: count, spamWindowMs: secs * 1000 });
      return message.reply(`Spam: **${count}** / **${secs}s**`);
    }
    if (sub === 'joinraid') {
      const count = parseInt(args[1], 10);
      const secs = parseInt(args[2], 10);
      if (!count || !secs) return message.reply(`Usage: \`${PREFIX}protection joinraid 8 15\``);
      saveProtection({ joinRaidLimit: count, joinRaidWindowMs: secs * 1000 });
      return message.reply(`Join raid: **${count}** / **${secs}s**`);
    }
    if (sub === 'nuke') {
      const count = parseInt(args[1], 10);
      const secs = parseInt(args[2], 10);
      if (!count || !secs) return message.reply(`Usage: \`${PREFIX}protection nuke 3 20\``);
      saveProtection({ nukeActionLimit: count, nukeWindowMs: secs * 1000 });
      return message.reply(`Nuke: **${count}** / **${secs}s**`);
    }
    return message.reply(`Try \`${PREFIX}protection status\``);
  }

  // ========== -si server info (premium UI) ==========
  if (cmd === 'si' || cmd === 'serverinfo' || cmd === 'server') {
    const g = message.guild;
    const owner = await g.fetchOwner().catch(() => null);
    await g.members.fetch().catch(() => {});
    const online = g.members.cache.filter(
      (m) => !m.user.bot && m.presence && ['online', 'idle', 'dnd'].includes(m.presence.status)
    ).size;
    const bots = g.members.cache.filter((m) => m.user.bot).size;
    const humans = Math.max(0, g.memberCount - bots);
    const textCh = g.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceCh = g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const cats = g.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const boost = g.premiumSubscriptionCount || 0;
    const boostTier = ['None', 'Tier 1', 'Tier 2', 'Tier 3'];
    const tier = boostTier[g.premiumTier] || 'None';
    const verif = {
      0: 'None',
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Very High'
    }[g.verificationLevel] || '—';

    const embed = new EmbedBuilder()
      .setColor(0xbe2c71)
      .setAuthor({ name: g.name, iconURL: g.iconURL({ size: 128 }) || undefined })
      .setTitle('Server information')
      .setThumbnail(g.iconURL({ size: 256 }))
      .setDescription(
        `╭──────────────╮\n` +
          `  **${g.name}**\n` +
          `╰──────────────╯\n\n` +
          (g.description ? `*${g.description.slice(0, 120)}*\n\n` : '')
      )
      .addFields(
        {
          name: 'General',
          value:
            `**Owner** · ${owner ? owner.user.username : '—'}\n` +
            `**Created** · <t:${Math.floor(g.createdTimestamp / 1000)}:D>\n` +
            `**ID** · \`${g.id}\`\n` +
            `**Verification** · ${verif}`,
          inline: true
        },
        {
          name: 'Members',
          value:
            `**Total** · ${g.memberCount}\n` +
            `**Humans** · ${humans}\n` +
            `**Bots** · ${bots}\n` +
            `**Online** · ${online || '—'}`,
          inline: true
        },
        {
          name: 'Structure',
          value:
            `**Channels** · ${g.channels.cache.size}\n` +
            `**Text** · ${textCh} · **Voice** · ${voiceCh}\n` +
            `**Categories** · ${cats}\n` +
            `**Roles** · ${g.roles.cache.size}`,
          inline: true
        },
        {
          name: 'Boosts',
          value: `**Level** · ${tier}\n**Boosts** · ${boost}`,
          inline: true
        }
      )
      .setImage(g.bannerURL({ size: 512 }) || null)
      .setFooter({ text: 'Flare Drop · Server' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // ========== -invites (Falcon-style) ==========
  if (cmd === 'invites' || cmd === 'inv' || cmd === 'invite' || cmd === 'i') {
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    async function inviteTopEmbed(limit = 10) {
      const stats = data.inviteStats?.[gid] || data.invites?.[gid] || {};
      const rows = Object.keys(stats)
        .map((id) => ({ id, ...getInviteBreakdown(gid, id) }))
        .filter((r) => r.total > 0 || r.joins > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
      if (!rows.length) return null;
      const lines = [];
      for (let i = 0; i < rows.length; i++) {
        let name = rows[i].id;
        try {
          name = (await client.users.fetch(rows[i].id)).username;
        } catch (_) {}
        lines.push(
          `**#${i + 1}** ${name} — **${rows[i].total}** total\n` +
            `↳ regular \`${rows[i].regular}\` · bonus \`${rows[i].bonus}\` · leaves \`${rows[i].leaves}\` · fake \`${rows[i].fake}\``
        );
      }
      return new EmbedBuilder()
        .setColor(BRAND.color)
        .setTitle('Invite leaderboard')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: BRAND.footer })
        .setTimestamp();
    }

    if (sub === 'top' || sub === 'lb' || sub === 'leaderboard') {
      const emb = await inviteTopEmbed(15);
      if (!emb) return message.reply('No invite data yet.');
      return message.reply({ embeds: [emb] });
    }

    // -invites reset @user | -invites reset all
    if (sub === 'reset' && isStaff(message.member)) {
      const all = (args[1] || '').toLowerCase() === 'all';
      const u = message.mentions.users.first();
      if (all) {
        if (data.inviteStats) data.inviteStats[gid] = {};
        if (data.invites) data.invites[gid] = {};
        if (data.invitedBy) data.invitedBy[gid] = {};
        if (data.inviteJoinAt) data.inviteJoinAt[gid] = {};
        if (data.falconInvites) data.falconInvites[gid] = {};
        saveData();
        return message.reply('All invite stats for this server were **reset**.');
      }
      if (!u) return message.reply(`Usage: \`${PREFIX}invites reset @user\` or \`${PREFIX}invites reset all\``);
      if (data.inviteStats?.[gid]) delete data.inviteStats[gid][u.id];
      if (data.invites?.[gid]) delete data.invites[gid][u.id];
      if (data.falconInvites?.[gid]) delete data.falconInvites[gid][u.id];
      // clear invitedBy entries pointing to this user as inviter
      if (data.invitedBy?.[gid]) {
        for (const [mid, iid] of Object.entries(data.invitedBy[gid])) {
          if (iid === u.id) delete data.invitedBy[gid][mid];
        }
      }
      saveData();
      return message.reply(`Invite stats for **${u.username}** were **reset**.`);
    }

    // -invites bonus @user 5
    if (sub === 'bonus' && isStaff(message.member)) {
      const u = message.mentions.users.first();
      const amount = parseInt(args.find((a) => /^-?\d+$/.test(a)), 10);
      if (!u || Number.isNaN(amount)) {
        return message.reply(`Usage: \`${PREFIX}invites bonus @user 5\``);
      }
      const s = ensureInviteStats(gid, u.id);
      s.bonus = (s.bonus || 0) + amount;
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
      saveData();
      return message.reply(
        `Bonus for **${u.username}**: **${s.bonus}** bonus · total **${getUserInvites(gid, u.id)}**`
      );
    }

    // -invites add @user 3  (add joins)
    if (sub === 'add' && isStaff(message.member)) {
      const u = message.mentions.users.first();
      const amount = parseInt(args.find((a) => /^-?\d+$/.test(a)), 10);
      if (!u || Number.isNaN(amount)) {
        return message.reply(`Usage: \`${PREFIX}invites add @user 3\``);
      }
      const s = ensureInviteStats(gid, u.id);
      s.joins = Math.max(0, (s.joins || 0) + amount);
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
      saveData();
      return message.reply({ embeds: [buildFalconInviteEmbed(u, gid)] });
    }

    // -invites remove @user 1  OR set amount
    if ((sub === 'remove' || sub === 'rem') && isStaff(message.member)) {
      const u = message.mentions.users.first();
      const amount = parseInt(args.find((a) => /^-?\d+$/.test(a)), 10);
      if (!u || Number.isNaN(amount) || amount < 1) {
        return message.reply(`Usage: \`${PREFIX}invites remove @user 1\``);
      }
      const s = ensureInviteStats(gid, u.id);
      s.joins = Math.max(0, (s.joins || 0) - amount);
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
      saveData();
      return message.reply({ embeds: [buildFalconInviteEmbed(u, gid)] });
    }

    // -invites set @user 10
    if (sub === 'set' && isStaff(message.member)) {
      const u = message.mentions.users.first();
      const amount = parseInt(args.find((a) => /^-?\d+$/.test(a)), 10);
      if (!u || Number.isNaN(amount) || amount < 0) {
        return message.reply(`Usage: \`${PREFIX}invites set @user 10\``);
      }
      const s = ensureInviteStats(gid, u.id);
      s.joins = amount + (s.leaves || 0) + (s.fake || 0);
      s.bonus = s.bonus || 0;
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
      saveData();
      return message.reply({ embeds: [buildFalconInviteEmbed(u, gid)] });
    }

    const u = message.mentions.users.first() || message.author;
    return message.reply({ embeds: [buildFalconInviteEmbed(u, gid, message.author.username)] });
  }

  // ========== -rmi / -removeinvite ==========
  // -rmi              → remove YOUR invites (all joins+bonus → 0)
  // -rmi 5            → remove 5 of YOUR joins
  // -rmi @user [n]    → staff: remove n joins from user (default 1)
  // -rmi @user all    → staff: wipe that user's invite stats
  if (cmd === 'removeinvite' || cmd === 'removeinvites' || cmd === 'rinv' || cmd === 'rmi') {
    const gid = message.guild.id;
    const mentioned = message.mentions.users.first();
    const numArg = args.find((a) => /^\d+$/.test(a));
    const allArg = args.some((a) => /^(all|full|wipe)$/i.test(a));
    const amount = numArg ? parseInt(numArg, 10) : null;

    // Targeting someone else requires staff
    if (mentioned && mentioned.id !== message.author.id && !isStaff(message.member)) {
      return message.reply('You can only remove **your own** invites. Staff can use `-rmi @user`.');
    }

    const u = mentioned || message.author;
    const s = ensureInviteStats(gid, u.id);

    if (allArg || (amount === null && !mentioned && args.length === 0)) {
      // Full wipe for self (or staff on user with "all")
      if (mentioned && !allArg && amount === null) {
        // -rmi @user with no number → remove 1 join (staff)
      } else if (!mentioned && args.length === 0) {
        // -rmi alone → wipe own invites
        s.joins = 0;
        s.leaves = 0;
        s.fake = 0;
        s.bonus = 0;
        if (!data.invites[gid]) data.invites[gid] = {};
        data.invites[gid][u.id] = 0;
        if (data.falconInvites?.[gid]) delete data.falconInvites[gid][u.id];
        saveData();
        return message.reply({
          content: `Your invites were **reset to 0**.`,
          embeds: [buildFalconInviteEmbed(u, gid)]
        });
      }
    }

    if (allArg) {
      s.joins = 0;
      s.leaves = 0;
      s.fake = 0;
      s.bonus = 0;
      if (!data.invites[gid]) data.invites[gid] = {};
      data.invites[gid][u.id] = 0;
      if (data.falconInvites?.[gid]) delete data.falconInvites[gid][u.id];
      saveData();
      return message.reply({
        content: `Wiped invite stats for **${u.username}**.`,
        embeds: [buildFalconInviteEmbed(u, gid)]
      });
    }

    const n = amount || 1;
    const before = getInviteBreakdown(gid, u.id).total;
    s.joins = Math.max(0, (s.joins || 0) - n);
    // Also reduce bonus if joins already 0 and still want removal
    if ((s.joins || 0) === 0 && n > 0 && (s.bonus || 0) > 0 && amount) {
      // only if they asked more than joins available - handled by joins max 0
    }
    if (!data.invites[gid]) data.invites[gid] = {};
    data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
    saveData();
    const after = getInviteBreakdown(gid, u.id).total;
    return message.reply({
      content: `Removed **${n}** join(s) from **${u.username}** · total **${before}** → **${after}**`,
      embeds: [buildFalconInviteEmbed(u, gid)]
    });
  }

  // ========== -addinvite @user [amount] ==========
  if (cmd === 'addinvite' || cmd === 'addinvites' || cmd === 'ainv') {
    if (!isStaff(message.member)) return message.reply('Staff only.');
    const u = message.mentions.users.first();
    const amount = parseInt(args.find((a) => /^\d+$/.test(a)), 10) || 1;
    if (!u) return message.reply(`Usage: \`${PREFIX}addinvite @user [amount]\``);
    const gid = message.guild.id;
    const s = ensureInviteStats(gid, u.id);
    s.joins = (s.joins || 0) + amount;
    if (!data.invites[gid]) data.invites[gid] = {};
    data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
    saveData();
    return message.reply({
      content: `Added **${amount}** join(s) to **${u.username}**.`,
      embeds: [buildFalconInviteEmbed(u, gid)]
    });
  }

  // ========== -leaderboard messages | invites ==========
  if (cmd === 'leaderboard' || cmd === 'lb' || cmd === 'top') {
    const kind = (args[0] || 'messages').toLowerCase();
    const gid = message.guild.id;

    if (kind === 'invites' || kind === 'invite' || kind === 'inv' || kind === 'i') {
      const stats = data.inviteStats?.[gid] || data.invites?.[gid] || {};
      const rows = Object.keys(stats)
        .map((id) => ({ id, ...getInviteBreakdown(gid, id) }))
        .filter((r) => r.total > 0 || r.joins > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);
      if (!rows.length) return message.reply('No invite data yet.');
      const lines = [];
      for (let i = 0; i < rows.length; i++) {
        let name = rows[i].id;
        try {
          name = (await client.users.fetch(rows[i].id)).username;
        } catch (_) {}
        lines.push(`**#${i + 1}** › **${name}** — **${rows[i].total}** invites`);
      }
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(BRAND.color)
            .setTitle('Invite leaderboard')
            .setDescription(lines.join('\n'))
            .setFooter({ text: BRAND.footer })
            .setTimestamp()
        ]
      });
    }

    // messages (default)
    const msgMap = data.messages?.[gid] || {};
    const rows = Object.entries(msgMap)
      .map(([id, n]) => ({ id, n: n || 0 }))
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 15);
    if (!rows.length) return message.reply('No message data yet.');
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      let name = rows[i].id;
      try {
        name = (await client.users.fetch(rows[i].id)).username;
      } catch (_) {}
      lines.push(`**#${i + 1}** ${name} — **${rows[i].n.toLocaleString()}** messages`);
    }
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xbe2c71)
          .setTitle('Message leaderboard')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'Flare · Messages' })
          .setTimestamp()
      ]
    });
  }



  if (cmd === 'help') {
    return message.reply({ embeds: buildFullHelpEmbeds().slice(0, 4) });
  }


});

// ========== ANTI-RAID: Channel / Category rename protection ==========
const RAID_NAME_PATTERNS = [
  /raided/i,
  /this server was raided/i,
  /nigg/i,
  /fuck\s*you/i,
  /get\s*fucked/i,
  /@everyone/i,
  /discord\.gg\//i
];

// Auto-prompt reward claim when a ticket channel is created
client.on('channelCreate', async (channel) => {
  try {
    if (!channel.guild || channel.type !== ChannelType.GuildText) return;
    const name = (channel.name || '').toLowerCase();
    const isTicket =
      name.startsWith('ticket-') ||
      name.startsWith('claim-') ||
      name.includes('ticket') ||
      (TICKET_CATEGORY_ID && channel.parentId === TICKET_CATEGORY_ID);

    if (!isTicket) return;

    // Wait a moment for Ticket Tool to finish setup / permissions
    await new Promise((r) => setTimeout(r, 2500));

    // Find ticket opener from channel name (ticket-username) or topic
    let opener = null;
    const match = channel.name.match(/^ticket[-_]?(.+)$/i);
    if (match) {
      const uname = match[1].replace(/[^a-z0-9._]/gi, '');
      opener = channel.guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === uname.toLowerCase()
      )?.user;
    }
    // Fallback: first non-bot human with view access who isn't staff-only
    if (!opener) {
      try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        const human = msgs.find((m) => !m.author.bot);
        if (human) opener = human.author;
      } catch (_) {}
    }

    if (!opener) {
      await channel.send(
        '🎁 Welcome! Use `$claim` to choose a reward based on your invites.'
      ).catch(() => {});
      return;
    }

    await startRewardClaimFlow(channel, opener);
  } catch (e) {
    console.error('channelCreate ticket claim:', e.message);
  }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
  try {
    if (!newChannel.guild) return;
    if (oldChannel.name === newChannel.name) return;

    const audit = await newChannel.guild.fetchAuditLogs({
      type: 11, // CHANNEL_UPDATE
      limit: 1
    }).catch(() => null);

    const entry = audit?.entries?.first();
    const executor = entry?.executor;
    if (!executor || executor.bot) return;
    if (entry && Date.now() - entry.createdTimestamp > 10000) return; // too old

    const newName = newChannel.name || '';
    const isSuspicious = RAID_NAME_PATTERNS.some((re) => re.test(newName));

    // Also flag very rapid renames by same user
    const now = Date.now();
    const key = executor.id;
    let times = recentChannelRenames.get(key) || [];
    times = times.filter((t) => now - t < 30000); // 30s window
    times.push(now);
    recentChannelRenames.set(key, times);
    const rapidRename = times.length >= 4;

    if (!isSuspicious && !rapidRename) return;

    // Revert the name
    await newChannel.setName(oldChannel.name, 'Anti-raid: suspicious rename').catch(() => {});

    // Timeout the executor (3 days) if possible
    const member = await newChannel.guild.members.fetch(executor.id).catch(() => null);
    if (member && newChannel.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await member.timeout(MASS_PING_TIMEOUT_MS, 'Anti-raid: suspicious channel rename').catch(() => {});
    }

    // Log
    if (getProtection().logChannelId || ANTIRAID_LOG_CHANNEL_ID) {
      const logCh = newChannel.guild.channels.cache.get(ANTIRAID_LOG_CHANNEL_ID);
      if (logCh) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('🛡️ Anti-Raid — Channel Rename Blocked')
          .setDescription(
            `**User:** ${executor.tag} (\`${executor.id}\`)\n` +
            `**Channel:** ${newChannel}\n` +
            `**Old name:** \`${oldChannel.name}\`\n` +
            `**Tried to set:** \`${newName}\`\n` +
            `**Action:** Name reverted` + (member ? ' + 3 day timeout' : '')
          )
          .setTimestamp();
        logCh.send({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('channelUpdate anti-raid error:', e.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'ticket_open_modal' || String(interaction.customId || '').startsWith('ticket_open_modal:')) {
        await interaction.deferReply({ ephemeral: true });
        try {
          const kind = String(interaction.customId).includes(':')
            ? String(interaction.customId).split(':')[1]
            : 'support';
          const reason =
            (interaction.fields.getTextInputValue('ticket_reason')?.trim() || kind) +
            (kind !== 'support' ? ` [${kind}]` : '');
          const existing = interaction.guild.channels.cache.find(
            (c) =>
              c.topic &&
              c.topic.includes(interaction.user.id) &&
              (c.name || '').startsWith('ticket-')
          );
          if (existing) {
            return interaction.editReply({ content: `You already have ${existing}` });
          }
          const ch = await createSupportTicket(interaction.guild, interaction.user, reason);
          return interaction.editReply({ content: `Ticket created: ${ch}` });
        } catch (e) {
          console.error('ticket modal', e.message);
          return interaction.editReply({ content: 'Could not create ticket (permissions / category?).' });
        }
      }
    }
    if (interaction.isButton()) {
      const id = interaction.customId;

      // ===== Verification button =====
      if (id === 'flare_verify_start') {
        const cfg = getVerifyConfig(interaction.guildId);
        if (!cfg || !cfg.roleId) {
          return interaction.reply({
            content: 'Verification is not set up. Staff: `?verification @role`',
            ephemeral: true
          });
        }
        // Already has role?
        const member = interaction.member;
        if (member.roles.cache.has(cfg.roleId)) {
          return interaction.reply({ content: 'You are already verified.', ephemeral: true });
        }
        const challenge = randomMathChallenge();
        pendingVerify.set(interaction.user.id, {
          answer: challenge.a,
          guildId: interaction.guildId,
          roleId: cfg.roleId,
          at: Date.now()
        });
        try {
          await interaction.user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(BRAND.colorBlurple)
                .setTitle('Verification challenge')
                .setDescription(
                  `Solve this to verify in **${interaction.guild.name}**:\n\n` +
                    `## ${challenge.q}\n\n` +
                    `Reply to this DM with the **number only**.\n` +
                    `Example: if the answer is 12, type \`12\``
                )
                .setFooter({ text: BRAND.footer })
            ]
          });
          return interaction.reply({
            content: 'Check your **DMs** for a math question. Answer there to get verified.',
            ephemeral: true
          });
        } catch (e) {
          pendingVerify.delete(interaction.user.id);
          return interaction.reply({
            content: 'I could not DM you. Please enable **DMs from server members**, then click Verify again.',
            ephemeral: true
          });
        }
      }

      // Birthday memory journey (secret)
      if (id === 'bday_next' || id === 'bday_prev' || id === 'bday_claim') {
        if (!canUseBdayStory(interaction.user.id)) {
          return interaction.reply({ content: 'This is private.', ephemeral: true });
        }
        let step = bdayStorySessions.get(interaction.user.id) || 0;
        const steps = bdayStorySteps();
        if (id === 'bday_next') step = Math.min(steps.length - 1, step + 1);
        if (id === 'bday_prev') step = Math.max(0, step - 1);
        if (id === 'bday_claim') {
          bdayStorySessions.delete(interaction.user.id);
          let rewardLine = BDAY_STORY_REWARD;
          let delivered = null;
          if (BDAY_STORY_PRODUCT) {
            try {
              ensureStocks(data);
              const stock = getStock(BDAY_STORY_PRODUCT);
              if (stock && stock.length) {
                delivered = stock.shift();
                if (data.stocks && data.stocks[BDAY_STORY_PRODUCT]) data.stocks[BDAY_STORY_PRODUCT] = stock;
                saveData();
              }
            } catch (_) {}
          }
          const claimEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Happy Birthday')
            .setDescription(
              `**DashWho** and Ultimate Rewards.\n\n${rewardLine}\n\n` +
                (delivered
                  ? 'A little something was sent to your DMs.'
                  : 'Keep this moment — you earned the soft ending.')
            )
            .setFooter({ text: '18 October · With you through every raid' });
          await interaction.update({ embeds: [claimEmbed], components: [] }).catch(() => {});
          if (delivered) {
            try {
              await interaction.user.send(`Birthday gift from DashWho:\n||${delivered}||`);
            } catch {
              await interaction.followup
                .send({ content: `Could not DM you. Here: ||${delivered}||`, ephemeral: true })
                .catch(() => {});
            }
          }
          return;
        }
        bdayStorySessions.set(interaction.user.id, step);
        let thumb = interaction.user.displayAvatarURL({ size: 256 });
        const pfpPath = path.join(__dirname, 'public', 'bday-friend.png');
        const files = [];
        if (fs.existsSync(pfpPath)) {
          files.push(new AttachmentBuilder(pfpPath, { name: 'bday-friend.png' }));
          thumb = 'attachment://bday-friend.png';
        }
        await interaction
          .update({
            embeds: [buildBdayEmbed(step, thumb)],
            components: [bdayButtons(step)],
            files: files.length ? files : undefined
          })
          .catch(() => {});
        return;
      }

      if (id === 'ticket_open' || id === 'ticket_open_support' || id === 'ticket_open_claim' || id === 'ticket_open_report') {
        const existing = interaction.guild.channels.cache.find(
          (c) =>
            c.topic &&
            c.topic.includes(interaction.user.id) &&
            (c.name || '').startsWith('ticket-')
        );
        if (existing) {
          return interaction.reply({ content: `You already have ${existing}`, ephemeral: true });
        }
        const kind = id === 'ticket_open_claim' ? 'claim' : id === 'ticket_open_report' ? 'report' : 'support';
        const modal = new ModalBuilder()
          .setCustomId('ticket_open_modal:' + kind)
          .setTitle(kind === 'claim' ? 'Claim reward' : kind === 'report' ? 'Report' : 'Support ticket');
        const reasonInput = new TextInputBuilder()
          .setCustomId('ticket_reason')
          .setLabel(kind === 'claim' ? 'What are you claiming?' : kind === 'report' ? 'What happened?' : 'How can we help?')
          .setPlaceholder('Optional details…')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500);
        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }
      if (id === 'ticket_close') {
        if (!interaction.channel || !isTicketChannel(interaction.channel)) {
          return interaction.reply({ content: 'Not a ticket channel.', ephemeral: true });
        }
        const staff = isStaff(interaction.member);
        const ownerId = (interaction.channel.topic || '').match(/(\d{15,})/)?.[1];
        if (!staff && interaction.user.id !== ownerId) {
          return interaction.reply({ content: 'Only ticket owner or staff can close.', ephemeral: true });
        }
        await interaction.reply('Closing ticket in 3 seconds…');
        setTimeout(() => {
          interaction.channel.delete('Ticket closed').catch(() => {});
        }, 3000);
        return;
      }

      if (id === 'gw_join' || id === 'gw_leave' || id === 'gw_entries') {
        const g = data.giveaways?.[interaction.message.id];
        if (!g || g.ended) {
          return interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
        }
        if (!g.entries) g.entries = [];
        const uid = interaction.user.id;

        if (id === 'gw_entries') {
          return interaction.reply({
            content: `**${g.entries.length}** entr${g.entries.length === 1 ? 'y' : 'ies'} for **${g.prize}**.`,
            ephemeral: true
          });
        }

        if (id === 'gw_join') {
          if (g.entries.includes(uid)) {
            return interaction.reply({ content: 'You already entered.', ephemeral: true });
          }
          g.entries.push(uid);
          saveData();
          try {
            const host = g.hostId ? `<@${g.hostId}>` : null;
            await interaction.message.edit({
              embeds: [buildGiveawayLiveEmbed(g, host)],
              components: [giveawayButtons(false)]
            }).catch(() => {});
          } catch (_) {}
          return interaction.reply({ content: 'You entered the giveaway. Good luck!', ephemeral: true });
        }

        if (!g.entries.includes(uid)) {
          return interaction.reply({ content: 'You are not in this giveaway.', ephemeral: true });
        }
        g.entries = g.entries.filter((x) => x !== uid);
        saveData();
        try {
          const host = g.hostId ? `<@${g.hostId}>` : null;
          await interaction.message.edit({
            embeds: [buildGiveawayLiveEmbed(g, host)],
            components: [giveawayButtons(false)]
          }).catch(() => {});
        } catch (_) {}
        return interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
      }
    }
    if (interaction.isChatInputCommand()) {
      const name = interaction.commandName;
      // Must ACK within 3s (free host cold start)
      const ephemeralCmds = new Set(['stock','genstock','warnings','greroll','help','invites','cstatus','format','g3n','genclear']);
      await interaction.deferReply({ ephemeral: ephemeralCmds.has(name) }).catch(() => null);
      const reply = async (payload) => {
        if (typeof payload === 'string') payload = { content: payload };
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply(payload);
        }
        return reply(payload);
      };
      if (name === 'gstart') {
        if (!isStaff(interaction.member)) {
          return reply({ content: 'Staff only.' });
        }
        const timeRaw = interaction.options.getString('time');
        const winners = interaction.options.getInteger('winners') || 1;
        const prize = interaction.options.getString('prize');
        const ms = parseDuration(timeRaw);
        if (!ms) return reply({ content: 'Bad time', ephemeral: true });
        const ends = Date.now() + ms;
        const gObj = {
          channelId: interaction.channelId,
          prize,
          winners,
          ends,
          hostId: interaction.user.id,
          entries: []
        };
        const emb = buildGiveawayLiveEmbed(gObj, interaction.user.toString());
        await reply({ embeds: [emb], components: [giveawayButtons(false)] });
        const msg = await interaction.fetchReply();
        if (!data.giveaways) data.giveaways = {};
        data.giveaways[msg.id] = gObj;
        saveData();
        setTimeout(() => endGiveaway(msg.id).catch(() => {}), ms);
        return;
      }
      if (name === 'greroll') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const mid = interaction.options.getString('message_id');
        await endGiveaway(mid, true);
        return reply({ content: 'Rerolled.', ephemeral: true });
      }

      if (name === 'ban' || name === 'kick' || name === 'timeout' || name === 'untimeout' || name === 'warn' || name === 'warnings') {
        if (!isStaff(interaction.member)) {
          return reply({ content: 'Staff only.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (name === 'warnings') {
          const list = (data.warnings && data.warnings[user.id]) || [];
          const text = list.length
            ? list.map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.at / 1000)}:R> by <@${w.by}>`).join('\n')
            : 'No warnings.';
          return reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle(`Warnings — ${user.tag}`).setDescription(text)], ephemeral: true });
        }
        if (name === 'warn') {
          if (!data.warnings) data.warnings = {};
          if (!data.warnings[user.id]) data.warnings[user.id] = [];
          data.warnings[user.id].push({ reason, by: interaction.user.id, at: Date.now() });
          saveData();
          await user.send(`⚠️ You were warned in **${interaction.guild.name}**\nReason: ${reason}`).catch(() => {});
          return reply({ content: `Warned **${user.tag}** — ${reason} (${data.warnings[user.id].length} total)`, ephemeral: false });
        }
        if (!member) return reply({ content: 'Member not found in server.', ephemeral: true });
        if (name === 'ban') {
          await member.ban({ reason: `${reason} | by ${interaction.user.tag}` });
          return reply({ content: `Banned **${user.tag}** — ${reason}` });
        }
        if (name === 'kick') {
          await member.kick(`${reason} | by ${interaction.user.tag}`);
          return reply({ content: `Kicked **${user.tag}** — ${reason}` });
        }
        if (name === 'timeout') {
          const dur = interaction.options.getString('duration');
          const ms = parseDuration(dur);
          if (!ms || ms > 28 * 86400000) return reply({ content: 'Duration: 10m / 1h / 1d (max 28d)', ephemeral: true });
          await member.timeout(ms, `${reason} | by ${interaction.user.tag}`);
          return reply({ content: `Timed out **${user.tag}** for **${dur}** — ${reason}` });
        }
        if (name === 'untimeout') {
          await member.timeout(null, `Removed by ${interaction.user.tag}`);
          return reply({ content: `Timeout removed for **${user.tag}**` });
        }
      }

      if (name === 'stock' || name === 'genstock') {
        if (!canViewStock(interaction.member)) {
          return reply({ content: 'Members / staff only.', ephemeral: true });
        }
        ensureStocks(data);
        const pool = name === 'genstock' ? 'gen' : 'normal';
        const lines = Object.entries(PRODUCT_STOCKS).map(([key, meta]) => {
          if (meta.type === 'method') {
            const has = !!getMethodText(key);
            return `${meta.emoji} **${meta.label}** | ${has ? '∞' : 'not set'}`;
          }
          if (pool === 'gen') return `${meta.emoji} **${meta.label}** gen \`${getStock(key,'gen').length}\``;
          return `${meta.emoji} **${meta.label}** pay \`${getStock(key).length}\` · gen \`${getStock(key,'gen').length}\``;
        });
        return reply({
          embeds: [new EmbedBuilder().setColor(0xbe2c71).setTitle(name === 'genstock' ? 'Gen stock' : 'Stock').setDescription(lines.join('\n'))],
          ephemeral: true
        });
      }

      if (name === 'help') {
        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle('Flare Staff Bot — Slash commands')
              .setDescription(
                [
                  '`/help` `/stock` `/genstock` `/genadd`',
                  '`/pay` `/claim` `/fgen` `/pgen` `/cstatus`',
                  '`/best` `/online` `/staffstats` `/invites`',
                  '`/flare` `/gstart` `/greroll` `/clear`',
                  '`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings`',
                  '`/staff` `/daily` `/teamup` `/close` `/leave`',
                  '`/format` `/salary`',
                  '',
                  'Prefix `$` commands still work the same.'
                ].join('\n')
              )
          ],
          ephemeral: true
        });
      }

      if (name === 'best') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const role = interaction.options.getRole('role');
        try { await interaction.guild.members.fetch(); } catch (_) {}
        const membersWithRole = interaction.guild.members.cache.filter(
          (m) => !m.user.bot && m.roles.cache.has(role.id)
        );
        if (!membersWithRole.size) return reply({ content: `No members with **${role.name}**.`, ephemeral: true });
        const ranked = [...membersWithRole.values()]
          .map((m) => {
            const messages = data.messages[interaction.guild.id]?.[m.id] || 0;
            const invites = data.invites[interaction.guild.id]?.[m.id] || 0;
            return { m, messages, invites, score: messages + invites * 25 };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);
        const lines = ranked.map((r, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
          return `${medal} ${r.m} — **${r.score}** pts · 💬 ${r.messages} · 🎟️ ${r.invites}`;
        });
        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe8c84a)
              .setTitle(`Best in @${role.name}`)
              .setDescription(lines.join('\n') || 'No data yet.')
              .setFooter({ text: 'Score = messages + (invites × 25)' })
          ]
        });
      }

      if (name === 'online') {
        if (!isStaff(interaction.member) && !canViewStock(interaction.member)) {
          return reply({ content: 'Staff / members only.', ephemeral: true });
        }
        const role = interaction.options.getRole('role');
        try { await interaction.guild.members.fetch(); } catch (_) {}
        const online = role.members.filter(
          (m) => !m.user.bot && m.presence && ['online', 'idle', 'dnd'].includes(m.presence.status)
        );
        const lines = [...online.values()].slice(0, 40).map((m) => `• ${m.displayName}`);
        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle(`Online — @${role.name}`)
              .setDescription(lines.join('\n') || 'None online.')
              .setFooter({ text: `${online.size} online` })
          ],
          ephemeral: true
        });
      }

      if (name === 'staffstats') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const roles = [
          ['Owner', OWNER_ROLE_ID],
          ['Co-Owner', CO_OWNER_ROLE_ID],
          ['Manager', MANAGER_ROLE_ID],
          ['Head Admin', HEAD_ADMIN_ROLE_ID],
          ['Admin', ADMIN_ROLE_ID],
          ['Staff', STAFF_TEAM_ROLE_ID]
        ];
        try { await interaction.guild.members.fetch(); } catch (_) {}
        const lines = roles.map(([label, id]) => {
          if (!id) return null;
          const role = interaction.guild.roles.cache.get(id);
          if (!role) return `**${label}** — role missing`;
          const n = role.members.filter((m) => !m.user.bot).size;
          return `**${label}** — ${n} members`;
        }).filter(Boolean);
        return reply({
          embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Staff stats').setDescription(lines.join('\n'))],
          ephemeral: true
        });
      }

      if (name === 'ticketpanel') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const description = interaction.options.getString('description');
        const banner = interaction.options.getAttachment('banner');
        let bannerUrl = null;
        let bannerAttachment = null;
        if (banner) {
          bannerAttachment = new AttachmentBuilder(banner.url, { name: 'ticket-banner.png' });
          bannerUrl = 'attachment://ticket-banner.png';
        }
        await postTicketPanel(interaction.channel, { description, bannerUrl, bannerAttachment });
        return reply({ content: 'Ticket panel posted.', ephemeral: true });
      }
      if (name === 'verification') {
        if (!isStaff(interaction.member)) return reply('Staff only.');
        const role =
          interaction.options.getRole('role') ||
          interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);
        const ch = interaction.options.getChannel('channel') || interaction.channel;
        if (!role) return reply('Role not found. Set VERIFIED_ROLE_ID or pass role option.');
        if (!data.verification) data.verification = {};
        data.verification[interaction.guildId] = { roleId: role.id, channelId: ch.id, updatedAt: Date.now() };
        saveData();
        const emb = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Verification')
          .setDescription(
            `Welcome to **${interaction.guild.name}**!\n\nClick **Verify** below to unlock the server.\nI will DM you a math question. Answer correctly to get ${role}.`
          )
          .setFooter({ text: BRAND.footer });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('flare_verify_start').setLabel('Verify').setStyle(ButtonStyle.Success).setEmoji('✅')
        );
        await ch.send({ embeds: [emb], components: [row] });
        return reply(`Verification panel posted in ${ch}`);
      }
      if (name === 'setwelcome') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const ch = interaction.options.getChannel('channel', true);
        if (!data.settings) data.settings = {};
        data.settings.welcomeChannelId = ch.id;
        saveData();
        return reply({ content: `Welcome channel set to ${ch}.`, ephemeral: true });
      }
      if (name === 'invites') {
        const action = interaction.options.getString('action') || 'view';
        const user = interaction.options.getUser('user') || interaction.user;
        const amount = interaction.options.getInteger('amount') || 1;
        const gid = interaction.guildId;

        if (action === 'top') {
          const stats = data.inviteStats?.[gid] || data.invites?.[gid] || {};
          const rows = Object.keys(stats)
            .map((id) => ({ id, ...getInviteBreakdown(gid, id) }))
            .filter((r) => r.total > 0 || r.joins > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);
          if (!rows.length) return reply({ content: 'No invite data yet.', ephemeral: true });
          const lines = [];
          for (let i = 0; i < rows.length; i++) {
            let name = rows[i].id;
            try { name = (await client.users.fetch(rows[i].id)).username; } catch (_) {}
            lines.push(`**#${i + 1}** ${name} — **${rows[i].total}**`);
          }
          return reply({
            embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Invite leaderboard').setDescription(lines.join('\n'))]
          });
        }

        if (action === 'reset_all') {
          if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
          if (data.inviteStats) data.inviteStats[gid] = {};
          if (data.invites) data.invites[gid] = {};
          if (data.invitedBy) data.invitedBy[gid] = {};
          if (data.inviteJoinAt) data.inviteJoinAt[gid] = {};
          if (data.falconInvites) data.falconInvites[gid] = {};
          saveData();
          return reply({ content: 'All invite stats for this server were **reset**.', ephemeral: true });
        }

        if (action === 'reset') {
          if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
          const u = interaction.options.getUser('user');
          if (!u) return reply({ content: 'Pick a user to reset.', ephemeral: true });
          if (data.inviteStats?.[gid]) delete data.inviteStats[gid][u.id];
          if (data.invites?.[gid]) delete data.invites[gid][u.id];
          if (data.falconInvites?.[gid]) delete data.falconInvites[gid][u.id];
          if (data.invitedBy?.[gid]) {
            for (const [mid, iid] of Object.entries(data.invitedBy[gid])) {
              if (iid === u.id) delete data.invitedBy[gid][mid];
            }
          }
          saveData();
          return reply({ content: `Invite stats for **${u.username}** were **reset**.`, ephemeral: true });
        }

        if (action === 'remove' || action === 'add' || action === 'bonus') {
          if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
          const u = interaction.options.getUser('user');
          if (!u) return reply({ content: 'Pick a user.', ephemeral: true });
          const s = ensureInviteStats(gid, u.id);
          if (action === 'remove') s.joins = Math.max(0, (s.joins || 0) - amount);
          if (action === 'add') s.joins = (s.joins || 0) + amount;
          if (action === 'bonus') s.bonus = (s.bonus || 0) + amount;
          if (!data.invites[gid]) data.invites[gid] = {};
          data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
          saveData();
          return reply({ embeds: [buildFalconInviteEmbed(u, gid)] });
        }

        // view
        return reply({ embeds: [buildFalconInviteEmbed(user, gid)] });
      }

      if (name === 'removeinvite') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const u = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount') || 1;
        const gid = interaction.guildId;
        const s = ensureInviteStats(gid, u.id);
        s.joins = Math.max(0, (s.joins || 0) - amount);
        if (!data.invites[gid]) data.invites[gid] = {};
        data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
        saveData();
        return reply({
          content: `Removed **${amount}** join(s) from **${u.username}**.`,
          embeds: [buildFalconInviteEmbed(u, gid)]
        });
      }

      if (name === 'leaderboard') {
        const kind = interaction.options.getString('type') || 'messages';
        const gid = interaction.guildId;
        if (kind === 'invites') {
          const stats = data.inviteStats?.[gid] || data.invites?.[gid] || {};
          const rows = Object.keys(stats)
            .map((id) => ({ id, ...getInviteBreakdown(gid, id) }))
            .filter((r) => r.total > 0 || r.joins > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 15);
          if (!rows.length) return reply({ content: 'No invite data yet.', ephemeral: true });
          const lines = [];
          for (let i = 0; i < rows.length; i++) {
            let name = rows[i].id;
            try { name = (await client.users.fetch(rows[i].id)).username; } catch (_) {}
            lines.push(`**#${i + 1}** ${name} — **${rows[i].total}**`);
          }
          return reply({
            embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Invite leaderboard').setDescription(lines.join('\n'))]
          });
        }
        const msgMap = data.messages?.[gid] || {};
        const rows = Object.entries(msgMap)
          .map(([id, n]) => ({ id, n: n || 0 }))
          .filter((r) => r.n > 0)
          .sort((a, b) => b.n - a.n)
          .slice(0, 15);
        if (!rows.length) return reply({ content: 'No message data yet.', ephemeral: true });
        const lines = [];
        for (let i = 0; i < rows.length; i++) {
          let name = rows[i].id;
          try { name = (await client.users.fetch(rows[i].id)).username; } catch (_) {}
          lines.push(`**#${i + 1}** ${name} — **${rows[i].n.toLocaleString()}**`);
        }
        return reply({
          embeds: [new EmbedBuilder().setColor(0xbe2c71).setTitle('Message leaderboard').setDescription(lines.join('\n'))]
        });
      }


      
      if (name === 'protection') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const action = interaction.options.getString('action') || 'status';
        if (action === 'automod_on') { saveProtection({ automod: true }); return reply({ content: 'Auto-mod **ON**' }); }
        if (action === 'automod_off') { saveProtection({ automod: false }); return reply({ content: 'Auto-mod **OFF**' }); }
        if (action === 'antinuke_on') { saveProtection({ antinuke: true }); return reply({ content: 'Anti-nuke **ON**' }); }
        if (action === 'antinuke_off') { saveProtection({ antinuke: false }); return reply({ content: 'Anti-nuke **OFF**' }); }
        const p = getProtection();
        return reply({
          embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('Flare Protection').setDescription(
            `Auto-mod **${p.automod ? 'ON' : 'OFF'}** · Anti-nuke **${p.antinuke ? 'ON' : 'OFF'}**\nLog: ${p.logChannelId ? `<#${p.logChannelId}>` : '—'}\nBad words: ${p.badWords.length}`
          )]
        });
      }
      if (name === 'si' || name === 'serverinfo') {
        const g = interaction.guild;
        const owner = await g.fetchOwner().catch(() => null);
        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xbe2c71)
              .setAuthor({ name: g.name, iconURL: g.iconURL({ size: 128 }) || undefined })
              .setTitle('Server information')
              .setThumbnail(g.iconURL({ size: 256 }))
              .addFields(
                { name: 'Owner', value: owner ? owner.user.username : '—', inline: true },
                { name: 'Members', value: `${g.memberCount}`, inline: true },
                { name: 'Channels', value: `${g.channels.cache.size}`, inline: true },
                { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
                { name: 'ID', value: g.id, inline: true }
              )
          ]
        });
      }
      if (name === 'm') {
        const u = interaction.options.getUser('user') || interaction.user;
        const n = data.messages?.[interaction.guildId]?.[u.id] || 0;
        return reply({ content: `**${u.username}** has **${n.toLocaleString()}** messages.` });
      }
      if (name === 'i') {
        const u = interaction.options.getUser('user') || interaction.user;
        return reply({ embeds: [buildFalconInviteEmbed(u, interaction.guildId)] });
      }
      if (name === 'rmi') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const u = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount') || 1;
        const gid = interaction.guildId;
        const s = ensureInviteStats(gid, u.id);
        s.joins = Math.max(0, (s.joins || 0) - amount);
        if (!data.invites[gid]) data.invites[gid] = {};
        data.invites[gid][u.id] = getInviteBreakdown(gid, u.id).total;
        saveData();
        return reply({ embeds: [buildFalconInviteEmbed(u, gid)] });
      }
      if (name === 'lock') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => {});
        return reply({ content: 'Channel locked.' });
      }
      if (name === 'unlock') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }).catch(() => {});
        return reply({ content: 'Channel unlocked.' });
      }
      if (name === 'slowmode') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const sec = interaction.options.getInteger('seconds', true);
        await interaction.channel.setRateLimitPerUser(sec).catch(() => {});
        return reply({ content: sec ? `Slowmode **${sec}s**` : 'Slowmode off.' });
      }
      if (name === 'purge') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const amount = interaction.options.getInteger('amount', true);
        const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
        return reply({ content: `Deleted **${deleted?.size || 0}** messages.`, ephemeral: true });
      }
      if (name === 'nick') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const u = interaction.options.getUser('user', true);
        const nick = interaction.options.getString('nickname');
        const mem = await interaction.guild.members.fetch(u.id).catch(() => null);
        if (!mem) return reply({ content: 'Member not found.', ephemeral: true });
        await mem.setNickname(nick || null).catch(() => null);
        return reply({ content: `Nickname updated for **${u.username}**.` });
      }
      if (name === 'role') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const act = interaction.options.getString('action', true);
        const u = interaction.options.getUser('user', true);
        const role = interaction.options.getRole('role', true);
        const mem = await interaction.guild.members.fetch(u.id).catch(() => null);
        if (!mem) return reply({ content: 'Member not found.', ephemeral: true });
        if (act === 'add') await mem.roles.add(role).catch(() => null);
        else await mem.roles.remove(role).catch(() => null);
        return reply({ content: `${act === 'add' ? 'Added' : 'Removed'} **${role.name}** ${act === 'add' ? 'to' : 'from'} **${u.username}**.` });
      }

      if (name === 'flare') {
        const action = interaction.options.getString('action') || 'balance';
        const target = interaction.options.getUser('user') || interaction.user;
        if (action === 'top') {
          const entries = Object.entries(data.coins || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
          const lines = entries.map(([id, c], i) => `**${i + 1}.** <@${id}> — **${c}**`);
          return reply({
            embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle('Flare top').setDescription(lines.join('\n') || 'Empty')],
            ephemeral: true
          });
        }
        if (action === 'daily') {
          const key = interaction.user.id;
          if (!data.daily) data.daily = {};
          const last = data.daily[key] || 0;
          if (Date.now() - last < 20 * 60 * 60 * 1000) {
            return reply({ content: 'Daily already claimed. Try again later.', ephemeral: true });
          }
          data.daily[key] = Date.now();
          addCoins(key, 50);
          return reply({ content: 'Daily claimed: **+50** coins.', ephemeral: true });
        }
        if (action === 'give') {
          const amt = interaction.options.getInteger('amount') || 0;
          const to = interaction.options.getUser('user');
          if (!to || amt < 1) return reply({ content: 'Need user + amount.', ephemeral: true });
          if (getCoins(interaction.user.id) < amt) return reply({ content: 'Not enough coins.', ephemeral: true });
          addCoins(interaction.user.id, -amt);
          addCoins(to.id, amt);
          return reply({ content: `Sent **${amt}** coins to **${to.tag}**.` });
        }
        return reply({
          content: `**${target.tag}** has **${getCoins(target.id)}** coins.`,
          ephemeral: true
        });
      }

      if (name === 'clear') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        setStock('mcfa', []);
        saveData();
        return reply({ content: 'MCFA pay stock cleared.', ephemeral: true });
      }

      if (name === 'genadd') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const product = resolveProductKey(interaction.options.getString('product'));
        if (!product || PRODUCT_STOCKS[product]?.type === 'method') {
          return reply({ content: 'Bad product.', ephemeral: true });
        }
        const lines = String(interaction.options.getString('lines') || '')
          .split(/[\n,]+/)
          .map((l) => l.trim())
          .filter(Boolean);
        const arr = getStock(product, 'gen');
        let added = 0;
        for (const a of lines) {
          if (!arr.includes(a)) { arr.push(a); added++; }
        }
        setStock(product, arr, 'gen');
        saveData();
        return reply({ content: `Added **${added}** to gen **${product}** (total ${arr.length}).`, ephemeral: true });
      }

      if (name === 'cstatus') {
        return reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle('Free gen status')
              .setDescription(`Set your status to:\n\`${FREE_STATUS_TEXT}\`\n\nThen use \`/fgen mcfa\``)
          ],
          ephemeral: true
        });
      }

      if (name === 'fgen' || name === 'pgen') {
        const member = interaction.member;
        const hasFree = member.roles.cache.has(FREE_GEN_ROLE_ID);
        const hasPaid = member.roles.cache.has(PAID_GEN_ROLE_ID);
        const isStaffUser = isStaff(member);
        if (name === 'pgen' && !interaction.options.getString('product')) {
          return reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xfee75c)
                .setTitle('Paid Gen')
                .setDescription(`**Price:** $3 USD\nOpen a ticket → pay → get paid role → \`/pgen mcfa\``)
            ],
            ephemeral: true
          });
        }
        if (!hasFree && !hasPaid && !isStaffUser) {
          return reply({ content: 'No gen access. Free status or paid role required.', ephemeral: true });
        }
        const product = resolveProductKey(interaction.options.getString('product') || 'mcfa') || 'mcfa';
        const meta = PRODUCT_STOCKS[product];
        if (!meta) return reply({ content: 'Unknown product.', ephemeral: true });
        const taken = await takeFromStock(product, 1, 'gen');
        if (!taken) return reply({ content: `**${meta.label}** gen stock empty.`, ephemeral: true });
        try {
          await interaction.user.send(`**${meta.label}**\n\`\`\`\n${taken[0]}\n\`\`\``);
        } catch (_) {
          const arr = getStock(product, 'gen');
          arr.unshift(taken[0]);
          setStock(product, arr, 'gen');
          saveData();
          return reply({ content: 'Could not DM you — open DMs and try again. Stock restored.', ephemeral: true });
        }
        return reply({ content: `✅ **${meta.label}** sent to your DMs.`, ephemeral: true });
      }

      if (name === 'pay') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.', ephemeral: true });
        const user = interaction.options.getUser('user');
        const productKey = resolveProductKey(interaction.options.getString('product') || 'mcfa') || 'mcfa';
        const amount = Math.min(50, Math.max(1, interaction.options.getInteger('amount') || 1));
        const meta = PRODUCT_STOCKS[productKey];
        if (!meta || meta.type === 'method') {
          const text = getMethodText(productKey);
          if (!text) return reply({ content: 'Product empty / unknown.', ephemeral: true });
          try {
            await user.send(`**${meta.label}**\n${text}`);
          } catch (_) {
            return reply({ content: 'Could not DM user.', ephemeral: true });
          }
          return reply({ content: `Sent method **${meta.label}** to **${user.tag}**.` });
        }
        const taken = await takeFromStock(productKey, amount, 'normal');
        if (!taken || !taken.length) return reply({ content: 'Stock empty.', ephemeral: true });
        try {
          await user.send(`**${meta.label}** ×${taken.length}\n\`\`\`\n${taken.join('\n')}\n\`\`\``);
        } catch (_) {
          const arr = getStock(productKey);
          arr.unshift(...taken);
          setStock(productKey, arr);
          saveData();
          return reply({ content: 'Could not DM user. Stock restored.', ephemeral: true });
        }
        return reply({ content: `Paid **${user.tag}** **${taken.length}× ${meta.label}**.` });
      }

      if (name === 'claim') {
        return reply({
          content: 'Use `$claim` inside your reward **ticket** channel for the full claim flow.',
          ephemeral: true
        });
      }

      if (name === 'staff') {
        const action = interaction.options.getString('action');
        if (action === 'open' || action === 'close') {
          if (!isCoOwnerOrAbove(interaction.member)) {
            return reply({ content: 'Owner / Co-Owner only.', ephemeral: true });
          }
          data.staffApplyOpen = action === 'open';
          saveData();
          return reply({ content: `Staff applications **${action === 'open' ? 'OPEN' : 'CLOSED'}**.` });
        }
        if (!data.staffApplyOpen) {
          return reply({ content: 'Staff applications are closed.', ephemeral: true });
        }
        return reply({
          content: `To apply, open a ticket and use \`-staff apply\` (full form in Discord).`,
          ephemeral: true
        });
      }

      if (name === 'format') {
        const account = interaction.options.getString('account') || '';
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+:.+$/.test(account);
        return reply({
          content: ok ? '✅ Looks like a valid `email:pass` format.' : '❌ Invalid format. Use `email:pass`.',
          ephemeral: true
        });
      }

      if (name === 'salary') {
        if (!isCoOwnerOrAbove(interaction.member) && interaction.user.id !== BIRTHDAY_USER_ID) {
          return reply({ content: 'Restricted.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const amount = Math.min(10, Math.max(1, interaction.options.getInteger('amount') || 1));
        const taken = await takeFromStock('mcfa', amount, 'normal');
        if (!taken || !taken.length) return reply({ content: 'MCFA stock empty.', ephemeral: true });
        try {
          await user.send(`**Staff Salary**\n\`\`\`\n${taken.join('\n')}\n\`\`\``);
        } catch (_) {
          const arr = getStock('mcfa');
          arr.unshift(...taken);
          setStock('mcfa', arr);
          saveData();
          return reply({ content: 'Could not DM user.', ephemeral: true });
        }
        return reply({ content: `Salary sent to **${user.tag}** (${taken.length} MCFA).` });
      }

      if (name === 'close' || name === 'leave') {
        return reply({
          content: `Use \`$${name}\` inside a TeamUp channel for this action.`,
          ephemeral: true
        });
      }

      if (name === 'teamup') {
        return reply({
          content: 'Use `-teamup @user1 @user2 …` in Discord to create a TeamUp channel (needs category setup).',
          ephemeral: true
        });
      }


      if (name === 'mute') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
        const user = interaction.options.getUser('user');
        const dur = interaction.options.getString('duration') || '1h';
        const reason = interaction.options.getString('reason') || 'No reason';
        const ms = parseDuration(dur);
        if (!ms) return reply({ content: 'Bad duration. Use 10m / 1h / 1d' });
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply({ content: 'Member not found.' });
        await member.timeout(ms, `${reason} | by ${interaction.user.tag}`);
        return reply({ content: `Timed out **${user.tag}** for **${dur}** — ${reason}` });
      }
      if (name === 'unmute') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return reply({ content: 'Member not found.' });
        await member.timeout(null, `Removed by ${interaction.user.tag}`);
        return reply({ content: `Timeout removed for **${user.tag}**` });
      }
      if (name === 'addstock') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
        const product = resolveProductKey(interaction.options.getString('product'));
        const linesRaw = interaction.options.getString('lines') || '';
        if (!product) return reply({ content: 'Unknown product.' });
        if (PRODUCT_STOCKS[product]?.type === 'method') {
          return reply({ content: 'That is a method — use `$' + product + ' set <text>`' });
        }
        const accounts = linesRaw.split(/[\n\s]+/).map(s => s.trim()).filter(Boolean);
        const arr = getStock(product, 'normal');
        let added = 0;
        for (const a of accounts) {
          if (!arr.includes(a)) { arr.push(a); added++; }
        }
        setStock(product, arr, 'normal');
        saveData();
        return reply({ content: `Pay stock **${product}** +${added} · total ${arr.length}` });
      }
      if (name === 'g3n') {
        const action = interaction.options.getString('action') || 'stock';
        if (action === 'add') {
          if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
          const product = resolveProductKey(interaction.options.getString('product'));
          const linesRaw = interaction.options.getString('lines') || '';
          if (!product) return reply({ content: '/g3n action:add product:mcfa lines:email:pass' });
          if (PRODUCT_STOCKS[product]?.type === 'method') {
            return reply({ content: 'Methods: use `$' + product + ' set`' });
          }
          const accounts = linesRaw.split(/[\n\s]+/).map(s => s.trim()).filter(Boolean);
          const arr = getStock(product, 'gen');
          let added = 0;
          for (const a of accounts) {
            if (!arr.includes(a)) { arr.push(a); added++; }
          }
          setStock(product, arr, 'gen');
          saveData();
          return reply({ content: `Gen stock **${product}** +${added} · total ${arr.length}` });
        }
        if (!canViewStock(interaction.member)) return reply({ content: 'Members / staff only.' });
        ensureStocks(data);
        const lines = Object.entries(PRODUCT_STOCKS)
          .filter(([, m]) => m.type !== 'method')
          .map(([key, meta]) => `${meta.emoji} **${meta.label}** gen \`${getStock(key, 'gen').length}\``);
        return reply({
          embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('🎁 GEN STOCK').setDescription(lines.join('\n') || 'Empty')]
        });
      }
      if (name === 'genclear') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
        const product = resolveProductKey(interaction.options.getString('product'));
        if (!product) return reply({ content: 'Unknown product' });
        const n = getStock(product, 'gen').length;
        setStock(product, [], 'gen');
        saveData();
        return reply({ content: `Cleared ${n} from gen **${product}**` });
      }
      if (name === 'hit') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
        return reply({ content: 'Use `-hit start` / `-hit stop` / `-hit add hypixel email:pass` in chat for the full hits system.' });
      }
      if (name === 'msg') {
        if (!isStaff(interaction.member)) return reply({ content: 'Staff only.' });
        return reply({ content: 'Use `-msg free` or `-msg paid` in a channel to post tutorial embeds.' });
      }
      if (name === 'memories') {
        if (!canUseBdayStory(interaction.user.id)) {
          return reply({ content: 'This is private.', ephemeral: true });
        }
        await reply({ content: 'Opening your memories…', ephemeral: true });
        await startBdayStory(interaction.channel, interaction.user);
        return;
      }
      if (name === 'birthday') {
        if (interaction.user.id !== BIRTHDAY_USER_ID && !isCoOwnerOrAbove(interaction.member)) {
          return reply({ content: 'Owner only.' });
        }
        return reply({ content: 'Use `-birthday gift @user` in a server channel.' });
      }

      if (name === 'daily') {
        if (!isHeadAdminOrAbove(interaction.member)) {
          return reply({ content: 'Head Admin+ only.', ephemeral: true });
        }
        const mode = interaction.options.getString('mode');
        const user = interaction.options.getUser('user');
        if (mode === 'pay' && user) {
          return reply({
            content: `Run \`-daily pay @${user.username}\` in a server channel for the full spin flow.`,
            ephemeral: true
          });
        }
        return reply({ content: 'Usage: `/daily mode:pay user:@someone` or `-daily @role N`', ephemeral: true });
      }

    }
  } catch (e) {
    console.error('interaction', e);
  }
});


// Anti-nuke: mass channel delete
client.on('channelDelete', async (channel) => {
  try {
    if (!getProtection().antinuke || !channel.guild) return;
    const logs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }).catch(() => null); // ChannelDelete
    const entry = logs?.entries?.first();
    if (!entry || Date.now() - entry.createdTimestamp > 10000) return;
    const executor = entry.executor;
    if (!executor || executor.bot || executor.id === channel.guild.ownerId) return;
    const member = await channel.guild.members.fetch(executor.id).catch(() => null);
    if (isProtectedStaff(member) && isCoOwnerOrAbove(member)) return;
    const protN = getProtection();
    const n = trackWindow(nukeTracker, `${executor.id}:chdel`, protN.nukeWindowMs);
    if (n >= protN.nukeActionLimit) {
      if (member) {
        await member.roles.set([], 'Anti-nuke: mass channel delete').catch(() => {});
        await member.timeout(MASS_PING_TIMEOUT_MS, 'Anti-nuke: mass channel delete').catch(() => {});
      }
      await protectionLog(
        channel.guild,
        'Anti-nuke · Channel delete',
        `**Executor:** ${executor.tag} (\`${executor.id}\`)\n**Count:** ${n} in window\n**Action:** roles stripped + timeout`
      );
    }
  } catch (e) {
    console.error('channelDelete nuke:', e.message);
  }
});

client.on('guildBanAdd', async (ban) => {
  try {
    if (!getProtection().antinuke) return;
    const logs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }).catch(() => null); // MemberBanAdd
    const entry = logs?.entries?.first();
    if (!entry || Date.now() - entry.createdTimestamp > 10000) return;
    const executor = entry.executor;
    if (!executor || executor.bot || executor.id === ban.guild.ownerId) return;
    const protN = getProtection();
    const n = trackWindow(nukeTracker, `${executor.id}:ban`, protN.nukeWindowMs);
    if (n >= protN.nukeActionLimit) {
      const member = await ban.guild.members.fetch(executor.id).catch(() => null);
      if (member && !isCoOwnerOrAbove(member)) {
        await member.roles.set([], 'Anti-nuke: mass ban').catch(() => {});
        await member.timeout(MASS_PING_TIMEOUT_MS, 'Anti-nuke: mass ban').catch(() => {});
      }
      await protectionLog(
        ban.guild,
        'Anti-nuke · Mass ban',
        `**Executor:** ${executor.tag}\n**Banned:** ${ban.user.tag}\n**Count:** ${n}`
      );
    }
  } catch (e) {
    console.error('guildBanAdd nuke:', e.message);
  }
});


(async () => {
  console.log('Boot: Discord connect starting…');
  console.log('Token chars:', TOKEN.length, '| prefix:', (TOKEN || '').slice(0, 5) || '(empty)');

  if (!TOKEN || TOKEN.length < 50) {
    console.error('No valid DISCORD_BOT_TOKEN. Set it on Render and redeploy.');
    return;
  }

  // REST check is informational only — never block gateway except hard 401
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: 'Bot ' + TOKEN }
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      console.error('Invalid token (401). Reset Bot token in Developer Portal, update Render, wait 2 min, deploy once.');
      return;
    }
    if (res.status === 429) {
      const wait = Math.min(Number(body.retry_after || 15), 60);
      console.warn('Rate limited (429). Waiting', wait, 'seconds…');
      await new Promise((r) => setTimeout(r, wait * 1000));
    } else if (res.ok) {
      console.log('Token OK —', body.username, '(' + body.id + ')');
    } else {
      console.warn('Token check HTTP', res.status, '— continuing to gateway…');
    }
  } catch (e) {
    console.warn('Token check failed:', e.message, '— continuing to gateway…');
  }

  client.on('error', (e) => console.error('Discord error:', e.message));
  client.on('shardError', (e) => console.error('Shard error:', e.message));
  client.on('warn', (m) => console.warn('Discord warn:', m));

  // Retry login up to 5 times with backoff (handles 429 / flaky network)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log('Gateway login attempt', attempt + '/5 …');
      await client.login(TOKEN);
      console.log('Discord ONLINE as', client.user && client.user.tag);
      return;
    } catch (e) {
      const msg = String((e && e.message) || e);
      console.error('Login failed:', msg);
      if (/invalid token|401/i.test(msg)) {
        console.error('Token rejected. Reset token in portal → update Render env → deploy once.');
        return;
      }
      const delay = attempt * 10;
      console.warn('Retry in', delay, 'seconds…');
      await new Promise((r) => setTimeout(r, delay * 1000));
    }
  }
  console.error('Could not connect after 5 attempts. Wait 15 minutes (Discord rate limit), then redeploy once only.');
})();
