import * as FileSystemLegacy from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { resolveAvatarUrl } from '../lib/avatar';

const POST_MEDIA_BUCKET = 'post-media';
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function deriveHandle(name) {
  const base = String(name || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, '')
    .replace(/\s+/g, '_');
  return `@${base || 'user'}`;
}

function normalizeStorageUri(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|file:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  return trimmed;
}

function resolvePublicStorageUrl(bucket, value) {
  const normalized = normalizeStorageUri(value);
  if (!normalized) return null;
  if (/^(https?:\/\/|file:\/\/|data:image\/)/i.test(normalized)) return normalized;

  const { data } = supabase.storage.from(bucket).getPublicUrl(normalized);
  return data?.publicUrl
    ? `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    : null;
}

async function resolveAuthorAvatarUri(value) {
  const normalized = normalizeStorageUri(value);
  if (!normalized) return null;

  try {
    return await resolveAvatarUrl(normalized);
  } catch {
    return null;
  }
}

function decodeBase64ToBytes(base64) {
  const clean = String(base64 || '').replace(/[^A-Za-z0-9+/=]/g, '');
  if (!clean) return new Uint8Array();

  let bufferLength = clean.length * 0.75;
  if (clean.endsWith('==')) bufferLength -= 2;
  else if (clean.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let offset = 0;

  for (let index = 0; index < clean.length; index += 4) {
    const a = BASE64_CHARS.indexOf(clean[index]);
    const b = BASE64_CHARS.indexOf(clean[index + 1]);
    const c = clean[index + 2] === '=' ? 0 : BASE64_CHARS.indexOf(clean[index + 2]);
    const d = clean[index + 3] === '=' ? 0 : BASE64_CHARS.indexOf(clean[index + 3]);

    const chunk = (a << 18) | (b << 12) | (c << 6) | d;

    bytes[offset++] = (chunk >> 16) & 0xff;
    if (clean[index + 2] !== '=') {
      bytes[offset++] = (chunk >> 8) & 0xff;
    }
    if (clean[index + 3] !== '=') {
      bytes[offset++] = chunk & 0xff;
    }
  }

  return bytes;
}

async function uploadPostImage(userId, asset) {
  if (!userId || !asset?.uri) return null;

  const mimeType = asset.mimeType || 'image/jpeg';
  const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${userId}/post-${Date.now()}.${extension}`;

  let base64 = asset.base64;
  if (!base64) {
    base64 = await FileSystemLegacy.readAsStringAsync(asset.uri, { encoding: 'base64' });
  }
  if (!base64 || !String(base64).trim()) {
    throw new Error('Selected image is empty. Please choose another image.');
  }

  const bytes = decodeBase64ToBytes(base64);
  if (!bytes.length) {
    throw new Error('Selected image could not be decoded. Please choose another image.');
  }

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: false });

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

    const authorIds = [...new Set((directPosts || []).map((post) => post.user_id).filter(Boolean))];
    let profileMap = new Map();

    if (authorIds.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      profileMap = new Map((profileRows || []).map((row) => [row.id, row]));
    }

    rows = (directPosts || []).map((post) => {
      const profile = profileMap.get(post.user_id);
      return {
        id: post.id,
        content: post.content,
        media_urls: post.media_urls,
        created_at: post.created_at,
        author_id: post.user_id,
        author_name: profile?.full_name || (post.user_id === currentUserId ? 'You' : 'User'),
        author_avatar: profile?.avatar_url || null,
      };
    });
  }

  const postIds = (rows || []).map((row) => row.id).filter(Boolean);
  const likeCountByPostId = new Map();
  const commentCountByPostId = new Map();
  const likedPostIds = new Set();

  if (postIds.length) {
    const [{ data: likeRows, error: likesError }, { data: commentRows, error: commentsError }] =
      await Promise.all([
        supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
      ]);

    if (likesError) {
      const detail = [likesError?.message, likesError?.details].filter(Boolean).join(' | ');
      throw new Error(detail || 'Could not fetch likes for community posts.');
    }

    if (commentsError) {
      const detail = [commentsError?.message, commentsError?.details].filter(Boolean).join(' | ');
      throw new Error(detail || 'Could not fetch comments for community posts.');
    }

    (likeRows || []).forEach((likeRow) => {
      likeCountByPostId.set(
        likeRow.post_id,
        Number(likeCountByPostId.get(likeRow.post_id) || 0) + 1,
      );
      if (currentUserId && likeRow.user_id === currentUserId) {
        likedPostIds.add(likeRow.post_id);
      }
    });

    (commentRows || []).forEach((commentRow) => {
      commentCountByPostId.set(
        commentRow.post_id,
        Number(commentCountByPostId.get(commentRow.post_id) || 0) + 1,
      );
    });
  }

  const avatarUrlCache = new Map();

  return Promise.all(
    (rows || []).map(async (row) => {
      const mediaPath = Array.isArray(row.media_urls) ? row.media_urls[0] : null;
      let authorAvatarUri = null;

      if (row.author_avatar) {
        if (avatarUrlCache.has(row.author_avatar)) {
          authorAvatarUri = avatarUrlCache.get(row.author_avatar);
        } else {
          authorAvatarUri = await resolveAuthorAvatarUri(row.author_avatar);
          avatarUrlCache.set(row.author_avatar, authorAvatarUri);
        }
      }

      return {
        id: row.id,
        authorId: row.author_id,
        author: row.author_name || 'User',
        handle: deriveHandle(row.author_name),
        status: row.content || '',
        imageUri: resolvePublicStorageUrl(POST_MEDIA_BUCKET, mediaPath),
        createdAt: row.created_at,
        likesCount: Number.isFinite(Number(row.likes_count))
          ? Number(row.likes_count)
          : likeCountByPostId.get(row.id) || 0,
        commentsCount: Number.isFinite(Number(row.comments_count))
          ? Number(row.comments_count)
          : commentCountByPostId.get(row.id) || 0,
        likedByMe: likedPostIds.has(row.id),
        mine: !!currentUserId && row.author_id === currentUserId,
        authorAvatarUri,
      };
    }),
  );
}

export async function togglePostLike({ postId, userId, liked }) {
  if (!postId) throw new Error('Post id is required to like a post.');
  if (!userId) throw new Error('User id is required to like a post.');

  if (liked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
      throw new Error(detail || 'Could not remove like from post.');
    }
    return;
  }

  const { error } = await supabase.from('post_likes').insert({
    post_id: postId,
    user_id: userId,
  });

  if (error && error.code !== '23505') {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not like post.');
  }
}

export async function listPostComments({ postId, limit = 50 }) {
  if (!postId) throw new Error('Post id is required to fetch comments.');

  const { data: commentRows, error: commentsError } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (commentsError) {
    const detail = [commentsError?.message, commentsError?.details].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not fetch comments.');
  }

  const authorIds = [...new Set((commentRows || []).map((row) => row.user_id).filter(Boolean))];
  let profileMap = new Map();
  let feedAuthorMap = new Map();

  if (authorIds.length) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', authorIds);

    if (profileError) {
      const detail = [profileError?.message, profileError?.details].filter(Boolean).join(' | ');
      throw new Error(detail || 'Could not load comment author profiles.');
    }

    profileMap = new Map((profileRows || []).map((row) => [row.id, row]));

    const missingAuthorIds = authorIds.filter((authorId) => !profileMap.has(authorId));
    if (missingAuthorIds.length) {
      const { data: feedRows } = await supabase
        .from('community_feed')
        .select('author_id, author_name, author_avatar')
        .in('author_id', missingAuthorIds)
        .limit(500);

      (feedRows || []).forEach((row) => {
        if (!row?.author_id) return;

        const existing = feedAuthorMap.get(row.author_id);
        if (!existing) {
          feedAuthorMap.set(row.author_id, {
            full_name: row.author_name || null,
            avatar_url: row.author_avatar || null,
          });
          return;
        }

        if (!existing.full_name && row.author_name) {
          existing.full_name = row.author_name;
        }
        if (!existing.avatar_url && row.author_avatar) {
          existing.avatar_url = row.author_avatar;
        }
      });
    }
  }

  const avatarUrlCache = new Map();

  return Promise.all(
    (commentRows || []).map(async (row) => {
      const profile = profileMap.get(row.user_id) || feedAuthorMap.get(row.user_id);
      let authorAvatarUri = null;

      if (profile?.avatar_url) {
        if (avatarUrlCache.has(profile.avatar_url)) {
          authorAvatarUri = avatarUrlCache.get(profile.avatar_url);
        } else {
          authorAvatarUri = await resolveAuthorAvatarUri(profile.avatar_url);
          avatarUrlCache.set(profile.avatar_url, authorAvatarUri);
        }
      }

      return {
        id: row.id,
        postId: row.post_id,
        authorId: row.user_id,
        author: profile?.full_name || 'User',
        handle: deriveHandle(profile?.full_name),
        content: row.content || '',
        createdAt: row.created_at,
        authorAvatarUri,
      };
    }),
  );
}

export async function createPostComment({
  postId,
  userId,
  content,
  currentUserName,
  currentUserAvatar,
}) {
  if (!postId) throw new Error('Post id is required to comment.');
  if (!userId) throw new Error('User id is required to comment.');

  const trimmedContent = (content || '').trim();
  if (!trimmedContent) throw new Error('Comment cannot be empty.');

  const { data: inserted, error: insertError } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: trimmedContent,
    })
    .select('id, post_id, user_id, content, created_at')
    .single();

  if (insertError) {
    const detail = [insertError?.message, insertError?.details, insertError?.hint]
      .filter(Boolean)
      .join(' | ');
    throw new Error(detail || 'Could not add comment.');
  }

  let authorName = currentUserName || 'You';
  let authorAvatarValue = currentUserAvatar || null;

  if (!currentUserName || !currentUserAvatar) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    authorName = currentUserName || profile?.full_name || 'You';
    authorAvatarValue = currentUserAvatar || profile?.avatar_url || null;
  }

  const authorAvatarUri = authorAvatarValue
    ? await resolveAuthorAvatarUri(authorAvatarValue)
    : null;

  return {
    id: inserted.id,
    postId: inserted.post_id,
    authorId: inserted.user_id,
    author: authorName,
    handle: deriveHandle(authorName),
    content: inserted.content || '',
    createdAt: inserted.created_at,
    authorAvatarUri,
  };
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

  const { error } = await supabase.from('posts').insert({
    user_id: userId,
    content: trimmedContent || 'Shared a progress photo.',
    post_type: 'progress',
    media_urls: mediaPath ? [mediaPath] : null,
  });

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Insert into posts failed.');
  }
}

export async function updateCommunityPost({ postId, userId, content }) {
  if (!postId) throw new Error('Post id is required to edit a post.');
  if (!userId) throw new Error('User id is required to edit a post.');

  const trimmedContent = (content || '').trim();
  if (!trimmedContent) throw new Error('Post cannot be empty.');

  const { data, error } = await supabase
    .from('posts')
    .update({ content: trimmedContent })
    .eq('id', postId)
    .eq('user_id', userId)
    .select('id, content, updated_at')
    .single();

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not update post.');
  }

  return {
    id: data.id,
    content: data.content || '',
    updatedAt: data.updated_at || null,
  };
}

export async function deleteCommunityPost({ postId, userId }) {
  if (!postId) throw new Error('Post id is required to delete a post.');
  if (!userId) throw new Error('User id is required to delete a post.');

  const { data: existing, error: fetchError } = await supabase
    .from('posts')
    .select('media_urls')
    .eq('id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    const detail = [fetchError?.message, fetchError?.details, fetchError?.hint]
      .filter(Boolean)
      .join(' | ');
    throw new Error(detail || 'Could not verify post before deleting.');
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId);

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not delete post.');
  }

  const mediaPaths = Array.isArray(existing?.media_urls)
    ? existing.media_urls.map((value) => normalizeStorageUri(value)).filter(Boolean)
    : [];

  if (mediaPaths.length) {
    await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .remove(mediaPaths)
      .catch(() => null);
  }
}

export async function updatePostComment({ commentId, userId, content }) {
  if (!commentId) throw new Error('Comment id is required to edit a comment.');
  if (!userId) throw new Error('User id is required to edit a comment.');

  const trimmedContent = (content || '').trim();
  if (!trimmedContent) throw new Error('Comment cannot be empty.');

  const { data, error } = await supabase
    .from('post_comments')
    .update({ content: trimmedContent })
    .eq('id', commentId)
    .eq('user_id', userId)
    .select('id, content')
    .single();

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not update comment.');
  }

  return {
    id: data.id,
    content: data.content || '',
  };
}

export async function deletePostComment({ commentId, userId }) {
  if (!commentId) throw new Error('Comment id is required to delete a comment.');
  if (!userId) throw new Error('User id is required to delete a comment.');

  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) {
    const detail = [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ');
    throw new Error(detail || 'Could not delete comment.');
  }
}
