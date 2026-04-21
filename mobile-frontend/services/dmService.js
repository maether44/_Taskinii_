import AsyncStorage from '@react-native-async-storage/async-storage';

const DM_STORE_KEY = 'bodyq_dm_store_v1';

async function readStore() {
  try {
    const raw = await AsyncStorage.getItem(DM_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeStore(store) {
  await AsyncStorage.setItem(DM_STORE_KEY, JSON.stringify(store));
}

function userBucket(store, ownerId) {
  if (!store[ownerId]) {
    store[ownerId] = { threads: [], messagesByThread: {} };
  }
  return store[ownerId];
}

function nowIso() {
  return new Date().toISOString();
}

export async function listThreads(ownerId) {
  const store = await readStore();
  const bucket = userBucket(store, ownerId);
  return [...bucket.threads].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

export async function ensureThread(ownerId, peer, options = {}) {
  const store = await readStore();
  const bucket = userBucket(store, ownerId);

  const safePeerId = peer?.id || peer?.handle || peer?.name || `peer-${Date.now()}`;
  const threadId = `thread-${ownerId}-${safePeerId}`;

  let thread = bucket.threads.find((t) => t.id === threadId);
  if (!thread) {
    thread = {
      id: threadId,
      peerId: safePeerId,
      peerName: peer?.name || 'Unknown user',
      peerHandle: peer?.handle || '@unknown',
      peerAvatarUri: peer?.avatarUri || null,
      lastMessage: options.initialPeerMessage || 'Say hi to start chatting.',
      updatedAt: nowIso(),
      unreadCount: options.initialPeerMessage ? 1 : 0,
    };

    bucket.threads.unshift(thread);
    bucket.messagesByThread[threadId] = [];

    if (options.initialPeerMessage) {
      bucket.messagesByThread[threadId].push({
        id: `msg-${Date.now()}-peer`,
        sender: 'them',
        text: options.initialPeerMessage,
        createdAt: nowIso(),
      });
    }

    await writeStore(store);
  } else if (peer?.avatarUri && thread.peerAvatarUri !== peer.avatarUri) {
    thread.peerAvatarUri = peer.avatarUri;
    await writeStore(store);
  }

  return thread;
}

export async function getThreadMessages(ownerId, threadId) {
  const store = await readStore();
  const bucket = userBucket(store, ownerId);
  const list = bucket.messagesByThread[threadId] || [];
  return [...list].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export async function sendThreadMessage(ownerId, threadId, text, sender = 'me') {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const store = await readStore();
  const bucket = userBucket(store, ownerId);
  const thread = bucket.threads.find((t) => t.id === threadId);
  if (!thread) return null;

  if (!bucket.messagesByThread[threadId]) {
    bucket.messagesByThread[threadId] = [];
  }

  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text: trimmed,
    createdAt: nowIso(),
  };

  bucket.messagesByThread[threadId].push(message);
  thread.lastMessage = trimmed;
  thread.updatedAt = message.createdAt;
  if (sender === 'them') thread.unreadCount = (thread.unreadCount || 0) + 1;

  bucket.threads.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  await writeStore(store);
  return message;
}

export async function markThreadRead(ownerId, threadId) {
  const store = await readStore();
  const bucket = userBucket(store, ownerId);
  const thread = bucket.threads.find((t) => t.id === threadId);
  if (!thread) return;
  thread.unreadCount = 0;
  await writeStore(store);
}
