const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_DIR = path.join(__dirname, '..', '.local');
const STORE_PATH = path.join(STORE_DIR, 'ai-fallback-store.json');

function ensureStoreDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function defaultStore() {
  return {
    chatHistory: {},
    aiProfiles: {},
    explicitProfiles: {},
    skillGaps: {},
  };
}

function readStore() {
  try {
    ensureStoreDir();
    if (!fs.existsSync(STORE_PATH)) {
      return defaultStore();
    }

    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return defaultStore();
    }

    return {
      chatHistory:
        parsed.chatHistory && typeof parsed.chatHistory === 'object' ? parsed.chatHistory : {},
      aiProfiles:
        parsed.aiProfiles && typeof parsed.aiProfiles === 'object' ? parsed.aiProfiles : {},
      explicitProfiles:
        parsed.explicitProfiles && typeof parsed.explicitProfiles === 'object'
          ? parsed.explicitProfiles
          : {},
      skillGaps:
        parsed.skillGaps && typeof parsed.skillGaps === 'object'
          ? parsed.skillGaps
          : {},
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(store) {
  ensureStoreDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function getChatHistory(userId) {
  const store = readStore();
  const history = store.chatHistory[userId];
  return Array.isArray(history) ? history : [];
}

function appendChatMessage(userId, message) {
  const store = readStore();
  const entry = {
    id: message.id || crypto.randomUUID(),
    role: String(message.role || 'assistant'),
    message: String(message.message || ''),
    created_at: message.created_at || new Date().toISOString(),
  };

  const history = Array.isArray(store.chatHistory[userId]) ? store.chatHistory[userId] : [];
  history.push(entry);
  store.chatHistory[userId] = history;
  writeStore(store);
  return entry;
}

function getAiProfile(userId) {
  const store = readStore();
  const profile = store.aiProfiles[userId];
  return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
}

function setAiProfile(userId, profileJson) {
  const store = readStore();
  const normalized =
    profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
      ? profileJson
      : {};
  store.aiProfiles[userId] = normalized;
  writeStore(store);
  return normalized;
}

function getExplicitProfile(userId) {
  const store = readStore();
  const profile = store.explicitProfiles[userId];
  return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
}

function setExplicitProfile(userId, profileJson) {
  const store = readStore();
  const normalized =
    profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
      ? profileJson
      : {};
  store.explicitProfiles[userId] = normalized;
  writeStore(store);
  return normalized;
}

function getSkillGaps(userId) {
  const store = readStore();
  const gaps = store.skillGaps[userId];
  return Array.isArray(gaps) ? gaps : [];
}

function setSkillGaps(userId, gaps) {
  const store = readStore();
  const normalized = Array.isArray(gaps) ? gaps : [];
  store.skillGaps[userId] = normalized;
  writeStore(store);
  return normalized;
}

module.exports = {
  getChatHistory,
  appendChatMessage,
  getAiProfile,
  setAiProfile,
  getExplicitProfile,
  setExplicitProfile,
  getSkillGaps,
  setSkillGaps,
};
