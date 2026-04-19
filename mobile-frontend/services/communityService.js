import * as FileSystemLegacy from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { AVATAR_BUCKET } from '../lib/avatar';

const POST_MEDIA_BUCKET = 'post-media';

function deriveHandle(name) {
  const base = String(name || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, '_');
  return `@${base || 'user'}`;
}

function resolvePostMediaUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(value);
  return data?.publicUrl
    ? `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    : null;
}

function resolveAuthorAvatarUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(value);
  return data?.publicUrl
    ? `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    : null;
}

async function resolveAuthorAvatarUrlWithFallback(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const publicUrl = resolveAuthorAvatarUrl(value);
  if (publicUrl) return publicUrl;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(value, 60 * 60 * 24 * 30);

  if (error) return null;

  return data?.signedUrl || null;
}

async function uploadPostImage(userId, asset) {
  if (!userId || !asset?.uri) return null;

  const mimeType = asset.mimeType || 'image/jpeg';
  const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${userId}/post-${Date.now()}.${extension}`;

  // Read and decode base64 into binary bytes; file:// -> blob can produce 0-byte uploads on RN.
  let base64 = asset.base64;
  if (!base64) {
    base64 = await FileSystemLegacy.readAsStringAsync(asset.uri, { encoding: 'base64' });
  }
  if (!base64 || !String(base64).trim()) {
    throw new Error('Selected image is empty. Please choose another image.');
  }
  const arrayBuffer = decode(base64);

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw error;
  return path;
}

export async function listCommunityPosts(currentUserId) {
  const { data, error } = await supabase
    .from('community_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  let rows = data;

  if (error) {
    const { data: directPosts, error: directError } = await supabase
      .from('posts')
      .select('id, user_id, content, media_urls, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (directError) {
      const detail = [error?.message, error?.details, directError?.message, directError?.details]
        .filter(Boolean)
        .join(' | ');
      throw new Error(detail || 'Could not fetch community posts from database.');
    }

    const authorIds = [...new Set((directPosts || []).map((p) => p.user_id).filter(Boolean))];
    let profileMap = new Map();

    if (authorIds.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      profileMap = new Map((profileRows || []).map((row) => [row.id, row]));
    }

    rows = (directPosts || []).map((p) => {
      const profile = profileMap.get(p.user_id);
      return {
        id: p.id,
        content: p.content,
        media_urls: p.media_urls,
        created_at: p.created_at,
        author_id: p.user_id,
        author_name: profile?.full_name || (p.user_id === currentUserId ? 'You' : 'User'),
        author_avatar: profile?.avatar_url || null,
      };
    });

  }

  const avatarUrlCache = new Map();

  const mapped = await Promise.all(
    (rows || []).map(async (row) => {
      const mediaPath = Array.isArray(row.media_urls) ? row.media_urls[0] : null;
      let authorAvatarUri = null;
      if (row.author_avatar) {
        if (avatarUrlCache.has(row.author_avatar)) {
          authorAvatarUri = avatarUrlCache.get(row.author_avatar);
        } else {
          authorAvatarUri = await resolveAuthorAvatarUrlWithFallback(row.author_avatar);
          avatarUrlCache.set(row.author_avatar, authorAvatarUri);
        }
      }

      return {
        id: row.id,
        authorId: row.author_id,
        author: row.author_name || 'User',
        handle: deriveHandle(row.author_name),
        status: row.content || '',
        imageUri: resolvePostMediaUrl(mediaPath),
        createdAt: row.created_at,
        mine: !!currentUserId && row.author_id === currentUserId,
        authorAvatarUri,
      };
    }),
  );

  return mapped;
}

export async function createCommunityPost({ userId, content, imageAsset }) {
  if (!userId) throw new Error('No authenticated user found.');

  const trimmedContent = (content || '').trim();
  if (!trimmedContent && !imageAsset) {
    throw new Error('Add text or a photo before posting.');
  }

  let mediaPath = null;
  if (imageAsset?.uri) {
    mediaPath = await uploadPostImage(userId, imageAsset);
  }

  const payload = {
    user_id: userId,
    content: trimmedContent || 'Shared a progress photo.',
    post_type: 'progress',
    media_urls: mediaPath ? [mediaPath] : null,
  };

  const { error } = await supabase.from('posts').insert(payload);
  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Insert into posts failed.');
  }
}
