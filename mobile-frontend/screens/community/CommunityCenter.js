import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Fontisto } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  createCommunityPost,
  createPostComment,
  listCommunityPosts,
  listPostComments,
  togglePostLike,
} from '../../services/communityService';
import { useUnreadMessageSummary } from '../../hooks/useNotification';


function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CommunityCenter({ navigation }) {
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessageSummary(user?.id);
  const [posts, setPosts] = useState([]);
  const [statusText, setStatusText] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState(null);
  const [pickedImageAsset, setPickedImageAsset] = useState(null);
  const [posting, setPosting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [likeUpdatingByPostId, setLikeUpdatingByPostId] = useState({});
  const [expandedCommentsByPostId, setExpandedCommentsByPostId] = useState({});
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentDraftByPostId, setCommentDraftByPostId] = useState({});
  const [commentsLoadingByPostId, setCommentsLoadingByPostId] = useState({});
  const [commentPostingByPostId, setCommentPostingByPostId] = useState({});

  const normalizeAvatarUri = (value) => {
    if (typeof value !== 'string') return null;
    const uri = value.trim();
    if (!uri || uri === 'null' || uri === 'undefined') return null;
    if (/^(https?:\/\/|file:\/\/|data:image\/)/i.test(uri)) return uri;
    return null;
  };

  const getCurrentUserDisplayName = () => {
    const fullName = user?.user_metadata?.full_name;
    if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();

    const name = user?.user_metadata?.name;
    if (typeof name === 'string' && name.trim()) return name.trim();

    const emailPrefix = user?.email?.split('@')?.[0];
    if (typeof emailPrefix === 'string' && emailPrefix.trim()) return emailPrefix.trim();

    return 'You';
  };

  const getCurrentUserAvatar = () => {
    const candidate =
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.avatar;
    return normalizeAvatarUri(candidate);
  };

  const loadPosts = async (mounted = true) => {
    setLoadingPosts(true);
    try {
      const saved = await listCommunityPosts(user?.id);
      if (mounted) {
        setPosts([...saved].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      }
    } catch (error) {
      if (mounted) {
        Alert.alert('Database connection issue', error?.message || 'Could not load posts from DB.');
      }
    } finally {
      if (mounted) setLoadingPosts(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadPosts(mounted);
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0] || null;
    setPickedImageAsset(asset);
    setPickedImageUri(asset?.uri || null);
  };

  const submitPost = async () => {
    if (posting) return;
    const trimmed = statusText.trim();
    if (!trimmed && !pickedImageUri) {
      Alert.alert('Write something', 'Add a status or attach a photo before posting.');
      return;
    }

    setPosting(true);
    try {
      await createCommunityPost({
        userId: user?.id,
        content: trimmed,
        imageAsset: pickedImageAsset || (pickedImageUri ? { uri: pickedImageUri } : null),
      });

      setStatusText('');
      setPickedImageUri(null);
      setPickedImageAsset(null);

      await loadPosts(true);
    } catch (error) {
      Alert.alert(
        'Post failed',
        error?.message || 'Could not publish your post. Please try again.',
      );
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to like posts.');
      return;
    }

    if (!postId || likeUpdatingByPostId[postId]) return;

    const current = posts.find((post) => post.id === postId);
    if (!current) return;

    const wasLiked = !!current.likedByMe;

    setLikeUpdatingByPostId((prev) => ({ ...prev, [postId]: true }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedByMe: !wasLiked,
              likesCount: Math.max(0, (post.likesCount || 0) + (wasLiked ? -1 : 1)),
            }
          : post,
      ),
    );

    try {
      await togglePostLike({ postId, userId: user.id, liked: wasLiked });
    } catch (error) {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likedByMe: wasLiked,
                likesCount: Math.max(0, (post.likesCount || 0) + (wasLiked ? 1 : -1)),
              }
            : post,
        ),
      );
      Alert.alert('Like failed', error?.message || 'Could not update like. Please try again.');
    } finally {
      setLikeUpdatingByPostId((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const loadCommentsForPost = async (postId, { force = false } = {}) => {
    if (!postId) return;
    if (!force && commentsByPostId[postId]) return;
    if (commentsLoadingByPostId[postId]) return;

    setCommentsLoadingByPostId((prev) => ({ ...prev, [postId]: true }));
    try {
      const items = await listPostComments({ postId });

      const authorFallbackById = new Map(
        posts
          .filter((post) => post?.authorId)
          .map((post) => [
            post.authorId,
            {
              author: post.author || 'User',
              handle: post.handle || '@user',
              authorAvatarUri: normalizeAvatarUri(post.authorAvatarUri),
            },
          ]),
      );

      const currentUserName = getCurrentUserDisplayName();
      const currentUserAvatar = getCurrentUserAvatar();

      const enrichedItems = (items || []).map((comment) => {
        const fallback = authorFallbackById.get(comment.authorId);
        const isCurrentUserComment = !!user?.id && comment.authorId === user.id;
        const hasGenericAuthor = !comment.author || comment.author === 'User';

        return {
          ...comment,
          author:
            (isCurrentUserComment ? currentUserName : null) ||
            (!hasGenericAuthor ? comment.author : null) ||
            fallback?.author ||
            'User',
          handle: comment.handle || fallback?.handle || '@user',
          authorAvatarUri:
            normalizeAvatarUri(comment.authorAvatarUri) ||
            (isCurrentUserComment ? currentUserAvatar : null) ||
            fallback?.authorAvatarUri ||
            null,
        };
      });

      setCommentsByPostId((prev) => ({ ...prev, [postId]: enrichedItems }));
    } catch (error) {
      Alert.alert(
        'Comments unavailable',
        error?.message || 'Could not load comments for this post.',
      );
    } finally {
      setCommentsLoadingByPostId((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleComments = async (postId) => {
    if (!postId) return;

    const isExpanded = !!expandedCommentsByPostId[postId];
    setExpandedCommentsByPostId((prev) => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded) {
      await loadCommentsForPost(postId, { force: true });
    }
  };

  const handleSubmitComment = async (postId) => {
    if (!postId) return;
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to comment on posts.');
      return;
    }
    if (commentPostingByPostId[postId]) return;

    const draft = (commentDraftByPostId[postId] || '').trim();
    if (!draft) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: optimisticId,
      postId,
      authorId: user.id,
      author: getCurrentUserDisplayName(),
      handle: '@you',
      content: draft,
      createdAt: new Date().toISOString(),
      authorAvatarUri: getCurrentUserAvatar(),
    };

    setCommentPostingByPostId((prev) => ({ ...prev, [postId]: true }));
    setCommentDraftByPostId((prev) => ({ ...prev, [postId]: '' }));
    setExpandedCommentsByPostId((prev) => ({ ...prev, [postId]: true }));
    setCommentsByPostId((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimisticComment],
    }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) + 1) }
          : post,
      ),
    );

    try {
      const createdComment = await createPostComment({
        postId,
        userId: user.id,
        content: draft,
        currentUserName: getCurrentUserDisplayName(),
        currentUserAvatar: getCurrentUserAvatar(),
      });

      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((comment) =>
          comment.id === optimisticId ? createdComment : comment,
        ),
      }));
    } catch (error) {
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((comment) => comment.id !== optimisticId),
      }));
      setCommentDraftByPostId((prev) => ({ ...prev, [postId]: draft }));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) - 1) }
            : post,
        ),
      );
      Alert.alert(
        'Comment failed',
        error?.message || 'Could not add your comment. Please try again.',
      );
    } finally {
      setCommentPostingByPostId((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleRefreshPress = async () => {
    const expandedPostIds = Object.entries(expandedCommentsByPostId)
      .filter(([, isExpanded]) => !!isExpanded)
      .map(([postId]) => postId);

    await loadPosts(true);

    // Drop cached comments so refresh always reflects latest DB values.
    setCommentsByPostId({});

    if (expandedPostIds.length) {
      await Promise.all(
        expandedPostIds.map((postId) => loadCommentsForPost(postId, { force: true })),
      );
    }
  };

  const renderPost = ({ item }) => {
    const normalizedAvatarUri = normalizeAvatarUri(item.authorAvatarUri);

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          {normalizedAvatarUri ? (
            <View style={styles.avatarFrame}>
              <Image
                source={{ uri: normalizedAvatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.avatarFrame}>
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={16} color="#C8F135" />
              </View>
            </View>
          )}
          <View>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.meta}>
              {item.handle} · {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {!!item.status && <Text style={styles.status}>{item.status}</Text>}

        {!!item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.postImage} resizeMode="cover" />
        )}

        <View style={styles.postActionsRow}>
          <View style={styles.postActionsLeft}>
            <Pressable
              style={[styles.likeBtn, item.likedByMe && styles.likeBtnActive]}
              onPress={() => handleToggleLike(item.id)}
              disabled={!!likeUpdatingByPostId[item.id]}
            >
              <Ionicons
                name={item.likedByMe ? 'heart' : 'heart-outline'}
                size={14}
                color={item.likedByMe ? '#130E25' : '#C8F135'}
              />
              <Text style={[styles.likeBtnTxt, item.likedByMe && styles.likeBtnTxtActive]}>
                {item.likesCount || 0}
              </Text>
            </Pressable>

            <Pressable
              style={styles.commentBtn}
              onPress={() => handleToggleComments(item.id)}
              disabled={!!commentsLoadingByPostId[item.id]}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#C8F135" />
              <Text style={styles.commentBtnTxt}>{item.commentsCount || 0}</Text>
            </Pressable>
          </View>

          {!item.mine && (
            <Pressable
              style={styles.messageBtn}
              onPress={() =>
                navigation.navigate('Messages', {
                  openPeer: {
                    id: item.authorId || item.handle,
                    name: item.author,
                    handle: item.handle,
                    avatarUri: item.authorAvatarUri || null,
                  },
                })
              }
            >
              <Fontisto name="paper-plane" size={14} color="#C8F135" />
              <Text style={styles.messageBtnTxt}>Message</Text>
            </Pressable>
          )}
        </View>

        {!!expandedCommentsByPostId[item.id] && (
          <View style={styles.commentsWrap}>
            {commentsLoadingByPostId[item.id] ? (
              <Text style={styles.commentsMeta}>Loading comments...</Text>
            ) : (commentsByPostId[item.id] || []).length ? (
              (commentsByPostId[item.id] || []).map((comment) => {
                const commentAvatarUri = normalizeAvatarUri(comment.authorAvatarUri);
                return (
                  <View key={comment.id} style={styles.commentRow}>
                    {commentAvatarUri ? (
                      <Image source={{ uri: commentAvatarUri }} style={styles.commentAvatarImage} />
                    ) : (
                      <View style={styles.commentAvatarFallback}>
                        <Ionicons name="person" size={10} color="#C8F135" />
                      </View>
                    )}

                    <View style={styles.commentBody}>
                      <Text style={styles.commentAuthor}>{comment.author}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.commentsMeta}>No comments yet. Be the first.</Text>
            )}

            <View style={styles.commentComposerRow}>
              <TextInput
                value={commentDraftByPostId[item.id] || ''}
                onChangeText={(value) =>
                  setCommentDraftByPostId((prev) => ({ ...prev, [item.id]: value }))
                }
                placeholder="Write a comment..."
                placeholderTextColor="#7A7393"
                style={styles.commentInput}
              />
              <Pressable
                style={styles.commentSendBtn}
                onPress={() => handleSubmitComment(item.id)}
                disabled={!!commentPostingByPostId[item.id]}
              >
                <Ionicons
                  name={commentPostingByPostId[item.id] ? 'time-outline' : 'send'}
                  size={13}
                  color="#130E25"
                />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Community</Text>
        <View style={styles.headerRightRow}>
          <Pressable onPress={() => navigation.navigate('Messages')} style={styles.backBtn}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#C8F135" />
            {unreadCount > 0 && (
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeTxt}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* POST CONTAINER */}

      <View style={styles.composer}>
        <Text style={styles.composerTitle}>Share your progress</Text>
        <TextInput
          value={statusText}
          onChangeText={setStatusText}
          placeholder="Today I completed..."
          placeholderTextColor="#7A7393"
          multiline
          style={styles.input}
        />

        {!!pickedImageUri && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: pickedImageUri }} style={styles.previewImage} />
            <Pressable
              style={styles.removeImageBtn}
              onPress={() => {
                setPickedImageUri(null);
                setPickedImageAsset(null);
              }}
            >
              <Ionicons name="close" size={14} color="#0F0B1E" />
            </Pressable>
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable style={styles.attachBtn} onPress={pickPhoto}>
            <Ionicons name="image-outline" size={16} color="#C8F135" />
            <Text style={styles.attachTxt}>Photo</Text>
          </Pressable>

          <Pressable style={styles.postBtn} onPress={submitPost}>
            <Text style={styles.postTxt}>{posting ? 'Posting...' : 'Post'}</Text>
          </Pressable>
        </View>
      </View>

      {/* FEED CONTAINER */}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        refreshing={loadingPosts}
        onRefresh={handleRefreshPress}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        ListEmptyComponent={
          !loadingPosts ? (
            <Text style={styles.emptyTxt}>No posts yet. Be the first to share.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0B1E', paddingTop: 52 },
  header: {
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A1530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerRightRow: { flexDirection: 'row', gap: 8 },
  composer: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    padding: 14,
  },
  composerTitle: { color: '#C8F135', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 80,
    color: '#fff',
    backgroundColor: '#0F0B1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#28223F',
  },
  previewWrap: { marginTop: 10, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: 160 },
  removeImageBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#120F22',
    borderColor: '#2B2449',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  attachTxt: { color: '#C8F135', fontWeight: '700' },
  postBtn: {
    backgroundColor: '#C8F135',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  postTxt: { color: '#130E25', fontWeight: '800' },
  feed: { padding: 16, paddingTop: 14, paddingBottom: 26, gap: 12 },
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#17112A',
    padding: 14,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 17,
    backgroundColor: '#C8F135',
    borderWidth: 2,
    borderColor: '#2A2346',
  },
  avatarFrame: {
    width: 36,
    height: 36,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2A2346',
  },
  avatarImage: { width: '100%', height: '100%' },
  author: { color: '#fff', fontSize: 14, fontWeight: '800' },
  meta: { color: '#9A91B9', fontSize: 11, marginTop: 1 },
  status: { color: '#EEEAF9', marginTop: 10, lineHeight: 20 },
  postImage: { width: '100%', height: 210, borderRadius: 12, marginTop: 10 },
  postActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2B2449',
    borderRadius: 10,
    backgroundColor: '#120F22',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 54,
    justifyContent: 'center',
  },
  likeBtnActive: {
    backgroundColor: '#C8F135',
    borderColor: '#C8F135',
  },
  likeBtnTxt: { color: '#C8F135', fontWeight: '700', fontSize: 12 },
  likeBtnTxtActive: { color: '#130E25' },
  commentBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2B2449',
    borderRadius: 10,
    backgroundColor: '#120F22',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 54,
    justifyContent: 'center',
  },
  commentBtnTxt: { color: '#C8F135', fontWeight: '700', fontSize: 12 },
  messageBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2B2449',
    borderRadius: 10,
    backgroundColor: '#120F22',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  messageBtnTxt: { color: '#C8F135', fontWeight: '700', fontSize: 12 },
  messageBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#FF4D4D',
    borderWidth: 1,
    borderColor: '#0F0B1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBadgeTxt: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  commentsWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2346',
    paddingTop: 10,
    gap: 8,
  },
  commentsMeta: { color: '#9A91B9', fontSize: 12 },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  commentAvatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2A2346',
  },
  commentAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#2A2346',
    backgroundColor: '#120F22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
    backgroundColor: '#120F22',
    borderWidth: 1,
    borderColor: '#2B2449',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentAuthor: { color: '#EEEAF9', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  commentText: { color: '#D6D0EA', fontSize: 12, lineHeight: 17 },
  commentComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  commentInput: {
    flex: 1,
    minHeight: 38,
    color: '#fff',
    backgroundColor: '#0F0B1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#28223F',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTxt: { color: '#8E85AE', textAlign: 'center', marginTop: 24 },
});
