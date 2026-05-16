/**
 * db.js — IndexedDB layer for voice-orb-prototype
 * Stores: users, conversations, biometrics, recordings
 * Uses browser's full quota (~5GB on most browsers)
 * All crypto via browser SubtleCrypto — no backend needed for demo
 */

const DB_NAME    = 'VoiceOrbDB';
const DB_VERSION = 1;

let _db = null;

// ─── Open / Init ─────────────────────────────────────────────────────────────

export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const users = db.createObjectStore('users', { keyPath: 'id' });
        users.createIndex('username', 'username', { unique: true });
        users.createIndex('createdAt', 'createdAt');
      }

      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const conv = db.createObjectStore('conversations', {
          keyPath: 'id', autoIncrement: true,
        });
        conv.createIndex('userId',    'userId');
        conv.createIndex('timestamp', 'timestamp');
      }

      // Biometrics store
      if (!db.objectStoreNames.contains('biometrics')) {
        const bio = db.createObjectStore('biometrics', {
          keyPath: 'id', autoIncrement: true,
        });
        bio.createIndex('userId',    'userId');
        bio.createIndex('sessionId', 'sessionId', { unique: true });
        bio.createIndex('timestamp', 'timestamp');
      }

      // Recordings store (audio blobs + transcripts)
      if (!db.objectStoreNames.contains('recordings')) {
        const rec = db.createObjectStore('recordings', {
          keyPath: 'id', autoIncrement: true,
        });
        rec.createIndex('userId',    'userId');
        rec.createIndex('timestamp', 'timestamp');
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function wrap(req) {
  return new Promise((res, rej) => {
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  });
}

// ─── Password hashing (SubtleCrypto SHA-256) ─────────────────────────────────

export async function hashPassword(password, salt = null) {
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: s, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return {
    hash: Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join(''),
    salt: Array.from(s).map(b => b.toString(16).padStart(2,'0')).join(''),
  };
}

export async function verifyPassword(password, storedHash, storedSalt) {
  const saltBytes = new Uint8Array(storedSalt.match(/.{2}/g).map(b => parseInt(b, 16)));
  const { hash } = await hashPassword(password, saltBytes);
  return hash === storedHash;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser({ username, displayName, password }) {
  await openDB();
  const { hash, salt } = await hashPassword(password);
  const user = {
    id:           crypto.randomUUID(),
    username:     username.trim().toLowerCase(),
    displayName:  displayName.trim(),
    passwordHash: hash,
    passwordSalt: salt,
    createdAt:    Date.now(),
    voiceProfile: null,   // populated from biometric snapshots over time
    totalSessions: 0,
  };
  await wrap(tx('users', 'readwrite').add(user));
  // Return safe version (no hash/salt)
  const { passwordHash: _, passwordSalt: __, ...safeUser } = user;
  return safeUser;
}

export async function loginUser({ username, password }) {
  await openDB();
  const store = tx('users');
  const user  = await wrap(store.index('username').get(username.trim().toLowerCase()));
  if (!user) throw new Error('User not found');
  const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) throw new Error('Incorrect password');
  const { passwordHash: _, passwordSalt: __, ...safeUser } = user;
  return safeUser;
}

export async function getUser(id) {
  await openDB();
  const user = await wrap(tx('users').get(id));
  if (!user) return null;
  const { passwordHash: _, passwordSalt: __, ...safe } = user;
  return safe;
}

export async function hasAnyUser() {
  await openDB();
  const count = await wrap(tx('users').count());
  return count > 0;
}

export async function updateVoiceProfile(userId, rmsSnapshot) {
  await openDB();
  const store = tx('users', 'readwrite');
  const user  = await wrap(store.get(userId));
  if (!user) return;
  user.voiceProfile = rmsSnapshot;
  user.totalSessions += 1;
  await wrap(store.put(user));
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function saveConversation({ userId, transcript, response, durationMs }) {
  await openDB();
  return wrap(tx('conversations', 'readwrite').add({
    userId,
    transcript,
    response,
    durationMs,
    timestamp: Date.now(),
  }));
}

export async function getConversations(userId, limit = 50) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store   = tx('conversations');
    const idx     = store.index('userId');
    const results = [];
    const req     = idx.openCursor(IDBKeyRange.only(userId), 'prev');
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Biometrics ───────────────────────────────────────────────────────────────

export async function saveBiometric({ userId, sessionId, rmsHistory, durationMs }) {
  await openDB();
  return wrap(tx('biometrics', 'readwrite').add({
    userId, sessionId, rmsHistory, durationMs, timestamp: Date.now(),
  }));
}

export async function getBiometrics(userId, limit = 100) {
  await openDB();
  return new Promise((resolve, reject) => {
    const results = [];
    const req = tx('biometrics').index('userId').openCursor(IDBKeyRange.only(userId), 'prev');
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) { results.push(cursor.value); cursor.continue(); }
      else resolve(results);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Recordings ───────────────────────────────────────────────────────────────

export async function saveRecording({ userId, sessionId, audioBlob, transcript }) {
  await openDB();
  return wrap(tx('recordings', 'readwrite').add({
    userId, sessionId, audioBlob, transcript, timestamp: Date.now(),
  }));
}

export async function getRecordings(userId, limit = 20) {
  await openDB();
  return new Promise((resolve, reject) => {
    const results = [];
    const req = tx('recordings').index('userId').openCursor(IDBKeyRange.only(userId), 'prev');
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && results.length < limit) { results.push(cursor.value); cursor.continue(); }
      else resolve(results);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Session (localStorage) ───────────────────────────────────────────────────

export function saveSession(user) {
  localStorage.setItem('vob_session', JSON.stringify({ id: user.id, username: user.username, displayName: user.displayName }));
}

export function loadSession() {
  try { return JSON.parse(localStorage.getItem('vob_session')); } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem('vob_session');
}
