const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// Garante que o diretório de dados existe
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'membros.db');
const db = new DatabaseSync(dbPath);

// Inicializa o banco de dados
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_channel_id TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      profile_image_url TEXT,
      email TEXT,
      phone TEXT,
      tier_id TEXT,
      tier_name TEXT,
      tier_level INTEGER DEFAULT 1,
      member_since TEXT,
      is_active INTEGER DEFAULT 1,
      last_verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_channel_id TEXT NOT NULL,
      license_key TEXT NOT NULL,
      product_name TEXT DEFAULT 'DLuzMobilador Pro — Clube de Membros',
      status TEXT DEFAULT 'active', -- active, revoked, expired
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      revoked_at TEXT,
      FOREIGN KEY(youtube_channel_id) REFERENCES members(youtube_channel_id)
    );

    CREATE TABLE IF NOT EXISTS sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_time TEXT DEFAULT CURRENT_TIMESTAMP,
      members_found INTEGER DEFAULT 0,
      status TEXT,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS configs (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initDatabase();

// Métodos de Membro
function upsertMember(member) {
  const stmt = db.prepare(`
    INSERT INTO members (
      youtube_channel_id, display_name, profile_image_url, email,
      tier_id, tier_name, tier_level, member_since, is_active, last_verified_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT(youtube_channel_id) DO UPDATE SET
      display_name = excluded.display_name,
      profile_image_url = coalesce(excluded.profile_image_url, members.profile_image_url),
      email = coalesce(excluded.email, members.email),
      tier_id = excluded.tier_id,
      tier_name = excluded.tier_name,
      tier_level = excluded.tier_level,
      member_since = coalesce(excluded.member_since, members.member_since),
      is_active = excluded.is_active,
      last_verified_at = datetime('now')
  `);

  stmt.run(
    member.youtube_channel_id,
    member.display_name,
    member.profile_image_url || '',
    member.email || '',
    member.tier_id || '',
    member.tier_name || 'Membro do Canal',
    member.tier_level || 1,
    member.member_since || new Date().toISOString(),
    member.is_active !== undefined ? member.is_active : 1
  );

  return getMemberByChannelId(member.youtube_channel_id);
}

function getMemberByChannelId(channelId) {
  const stmt = db.prepare(`SELECT * FROM members WHERE youtube_channel_id = ?`);
  return stmt.get(channelId);
}

function updateMemberPhone(channelId, phone) {
  const stmt = db.prepare(`UPDATE members SET phone = ? WHERE youtube_channel_id = ?`);
  return stmt.run(phone, channelId);
}

function setMemberActiveStatus(channelId, isActive) {
  const stmt = db.prepare(`UPDATE members SET is_active = ?, last_verified_at = datetime('now') WHERE youtube_channel_id = ?`);
  return stmt.run(isActive ? 1 : 0, channelId);
}

function getAllActiveMembers() {
  const stmt = db.prepare(`SELECT * FROM members WHERE is_active = 1`);
  return stmt.all();
}

function getAllMembers() {
  const stmt = db.prepare(`
    SELECT m.*, l.license_key, l.status as license_status, l.assigned_at
    FROM members m
    LEFT JOIN licenses l ON m.youtube_channel_id = l.youtube_channel_id AND l.status = 'active'
    ORDER BY m.id DESC
  `);
  return stmt.all();
}

// Métodos de Licença
function getLicenseByChannelId(channelId) {
  const stmt = db.prepare(`SELECT * FROM licenses WHERE youtube_channel_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`);
  return stmt.get(channelId);
}

function saveLicense(channelId, licenseKey, productName = 'DLuzMobilador Pro — Clube de Membros') {
  const stmt = db.prepare(`
    INSERT INTO licenses (youtube_channel_id, license_key, product_name, status, assigned_at)
    VALUES (?, ?, ?, 'active', datetime('now'))
  `);
  return stmt.run(channelId, licenseKey, productName);
}

function revokeLicense(channelId) {
  const stmt = db.prepare(`
    UPDATE licenses 
    SET status = 'revoked', revoked_at = datetime('now') 
    WHERE youtube_channel_id = ? AND status = 'active'
  `);
  return stmt.run(channelId);
}

// Métodos de Sincronização & Logs
function logSync(membersFound, status, details) {
  const stmt = db.prepare(`
    INSERT INTO sync_history (members_found, status, details)
    VALUES (?, ?, ?)
  `);
  return stmt.run(membersFound, status, details);
}

function getConfig(key) {
  const stmt = db.prepare(`SELECT value FROM configs WHERE key = ?`);
  const row = stmt.get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  const stmt = db.prepare(`
    INSERT INTO configs (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);
  return stmt.run(key, value);
}

module.exports = {
  db,
  upsertMember,
  getMemberByChannelId,
  updateMemberPhone,
  setMemberActiveStatus,
  getAllActiveMembers,
  getAllMembers,
  getLicenseByChannelId,
  saveLicense,
  revokeLicense,
  logSync,
  getConfig,
  setConfig
};
