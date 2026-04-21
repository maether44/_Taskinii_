import { documentDirectory } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const FileSystem = FileSystemLegacy;

const AVATAR_BUCKET = "profile-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 30;
const AVATAR_CACHE_DIR = `${documentDirectory}avatars/`;
const AVATAR_STORAGE_KEY = "@profile_avatar_local_map";

export function isRemoteAvatarUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function getAvatarExtension(value) {
  const match = String(value).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1] || "img";
}

function getAvatarCachePath(value) {
  const safeName = encodeURIComponent(String(value));
  return `${AVATAR_CACHE_DIR}${safeName}.${getAvatarExtension(value)}`;
}

async function ensureAvatarDir() {
  try {
    await FileSystem.makeDirectoryAsync(AVATAR_CACHE_DIR, { intermediates: true });
  } catch {
    // Directory may already exist
  }
}

async function getExistingLocalAvatar(value) {
  try {
    const localUri = getAvatarCachePath(value);
    const info = await FileSystem.getInfoAsync(localUri);
    return info.exists ? localUri : null;
  } catch {
    return null;
  }
}

async function readAvatarMap() {
  const raw = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function writeAvatarMap(map) {
  await AsyncStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));
}

async function getRemoteAvatarUrl(value) {
  if (!value) return null;
  if (String(value).startsWith("file://")) return value;
  if (isRemoteAvatarUrl(value)) return value;

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(value);

  if (publicData?.publicUrl) {
    return `${publicData.publicUrl}${publicData.publicUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(value, SIGNED_URL_TTL);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function resolveAvatarUrl(value) {
  if (!value) return null;
  if (String(value).startsWith("file://")) return value;

  try {
    await ensureAvatarDir();
  } catch {}

  const existingLocal = await getExistingLocalAvatar(value).catch(() => null);
  if (existingLocal) return existingLocal;

  const remoteUrl = await getRemoteAvatarUrl(value);
  if (!remoteUrl) return null;

  try {
    await ensureAvatarDir();
    const localUri = getAvatarCachePath(value);
    await FileSystem.downloadAsync(remoteUrl, localUri);
    return localUri;
  } catch {
    return remoteUrl;
  }
}

export function buildAvatarPath(userId, extension = "jpg") {
  return `${userId}/avatar-${Date.now()}.${extension}`;
}

export async function cacheAvatarLocally(sourceUri, storagePath) {
  if (!sourceUri || !storagePath) return sourceUri;

  await ensureAvatarDir();

  const destination = getAvatarCachePath(storagePath);
  try {
    const existing = await FileSystem.getInfoAsync(destination);
    if (existing.exists) {
      await FileSystem.deleteAsync(destination, { idempotent: true });
    }
  } catch {
    // File doesn't exist, continue
  }

  try {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destination,
    });
  } catch (err) {
    console.warn("[Avatar] cacheAvatarLocally copy failed:", err?.message);
    return sourceUri;
  }

  return destination;
}

export async function saveLocalAvatarForUser(userId, dataUri) {
  if (!userId || !dataUri) return;
  const map = await readAvatarMap();
  map[userId] = dataUri;
  await writeAvatarMap(map);
}

export async function getLocalAvatarForUser(userId) {
  if (!userId) return null;
  const map = await readAvatarMap();
  return map[userId] || null;
}

export { AVATAR_BUCKET };
