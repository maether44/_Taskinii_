import * as FileSystemLegacy from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { AVATAR_BUCKET } from '../lib/avatar';
import { getProfilesByIds } from './profileService';

const POST_MEDIA_BUCKET = 'post-media';

function deriveHandle(name) {
  const trimmed = String(name || 'user').trim();
  if (!trimmed) return '@user';
  
  // Extract first word and limit length, preserving Unicode characters
  const base = trimmed
    .split(/\s+/)[0]  // Get first word
    .substring(0, 15) // Limit to 15 chars
    .toLowerCase();
  
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
        author_name: profile?.full_name ,
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
      const count = likeCountByPostId.get(likeRow.post_id) || 0;
      likeCountByPostId.set(likeRow.post_id, count + 1);
      if (currentUserId && likeRow.user_id === currentUserId) {
        likedPostIds.add(likeRow.post_id);
      }
    });

    (commentRows || []).forEach((commentRow) => {
      const count = commentCountByPostId.get(commentRow.post_id) || 0;
      commentCountByPostId.set(commentRow.post_id, count + 1);
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

  return mapped;
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
    // Use the profile service to fetch user profiles in batch
    profileMap = await getProfilesByIds(authorIds);

    const missingAuthorIds = authorIds.filter((id) => !profileMap.has(id));
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

      // // One more pass: fetch any still-missing profiles directly from profiles table
      // const stillMissingIds = missingAuthorIds.filter((id) => !feedAuthorMap.has(id));
      // if (stillMissingIds.length) {
      //   const { data: retryProfileRows } = await supabase
      //     .from('profiles')
      //     .select('id, full_name, avatar_url')
      //     .in('id', stillMissingIds);

      //   (retryProfileRows || []).forEach((row) => {
      //     if (!feedAuthorMap.has(row.id)) {
      //       feedAuthorMap.set(row.id, {
      //         full_name: row.full_name || null,
      //         avatar_url: row.avatar_url || null,
      //       });
      //     }
      //   });
      // }
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
          authorAvatarUri = await resolveAuthorAvatarUrlWithFallback(profile.avatar_url);
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
    ? await resolveAuthorAvatarUrlWithFallback(authorAvatarValue)
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
