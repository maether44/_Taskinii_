import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Fontisto, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useUnreadMessageSummary } from '../../hooks/useNotification';
import {
  createCommunityPost,
  createPostComment,
  deleteCommunityPost,
  deletePostComment,
  listCommunityPosts,
  listPostComments,
  togglePostLike,
  updateCommunityPost,
  updatePostComment,
} from '../../services/communityService';

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CommunityCenter({ navigation }) {
  const { user, profileAvatarUri } = useAuth();
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
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostDraft, setEditingPostDraft] = useState('');
  const [savingPostId, setSavingPostId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState('');
  const [savingCommentId, setSavingCommentId] = useState(null);
  const { unreadCount } = useUnreadMessageSummary(user?.id);

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
      profileAvatarUri ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.avatar;
    return normalizeAvatarUri(candidate);
  };

  const loadPosts = useCallback(
    async (mounted = true) => {
      setLoadingPosts(true);
      try {
        const saved = await listCommunityPosts(user?.id);
        if (mounted) {
          setPosts([...saved].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
        }
      } catch (error) {
        if (mounted) {
          Alert.alert(
            'Database connection issue',
            error?.message || 'Could not load posts from DB.',
          );
        }
      } finally {
        if (mounted) setLoadingPosts(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    let mounted = true;
    loadPosts(mounted);
    return () => {
      mounted = false;
    };
  }, [loadPosts]);

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
      base64: true,
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

  const startEditingPost = (post) => {
    setEditingPostId(post.id);
    setEditingPostDraft(post.status || '');
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditingPostDraft('');
  };

  const handleSavePost = async (postId) => {
    if (!postId || !user?.id || savingPostId === postId) return;

    const trimmed = editingPostDraft.trim();
    if (!trimmed) {
      Alert.alert('Post cannot be empty', 'Write something before saving your post.');
      return;
    }

    setSavingPostId(postId);
    try {
      const updated = await updateCommunityPost({
        postId,
        userId: user.id,
        content: trimmed,
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: updated.content,
              }
            : post,
        ),
      );
      cancelEditingPost();
    } catch (error) {
      Alert.alert('Edit failed', error?.message || 'Could not update your post.');
    } finally {
      setSavingPostId(null);
    }
  };

  const handleDeletePost = (postId) => {
    if (!postId || !user?.id) return;

    Alert.alert('Delete post?', 'This will permanently remove your post and its comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityPost({ postId, userId: user.id });
            setPosts((prev) => prev.filter((post) => post.id !== postId));
            setCommentsByPostId((prev) => {
              const next = { ...prev };
              delete next[postId];
              return next;
            });
            setExpandedCommentsByPostId((prev) => {
              const next = { ...prev };
              delete next[postId];
              return next;
            });
            if (editingPostId === postId) {
              cancelEditingPost();
            }
          } catch (error) {
            Alert.alert('Delete failed', error?.message || 'Could not delete your post.');
          }
        },
      },
    ]);
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

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentDraft(comment.content || '');
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentDraft('');
  };

  const handleSaveComment = async (postId, commentId) => {
    if (!postId || !commentId || !user?.id || savingCommentId === commentId) return;

    const trimmed = editingCommentDraft.trim();
    if (!trimmed) {
      Alert.alert('Comment cannot be empty', 'Write something before saving your comment.');
      return;
    }

    setSavingCommentId(commentId);
    try {
      const updated = await updatePostComment({
        commentId,
        userId: user.id,
        content: trimmed,
      });

      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                content: updated.content,
              }
            : comment,
        ),
      }));
      cancelEditingComment();
    } catch (error) {
      Alert.alert('Edit failed', error?.message || 'Could not update your comment.');
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = (postId, commentId) => {
    if (!postId || !commentId || !user?.id) return;

    Alert.alert('Delete comment?', 'This will permanently remove your comment.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePostComment({ commentId, userId: user.id });
            setCommentsByPostId((prev) => ({
              ...prev,
              [postId]: (prev[postId] || []).filter((comment) => comment.id !== commentId),
            }));
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId
                  ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) - 1) }
                  : post,
              ),
            );
            if (editingCommentId === commentId) {
              cancelEditingComment();
            }
          } catch (error) {
            Alert.alert('Delete failed', error?.message || 'Could not delete your comment.');
          }
        },
      },
    ]);
  };

  const handleRefreshPress = async () => {
    const expandedPostIds = Object.entries(expandedCommentsByPostId)
      .filter(([, isExpanded]) => !!isExpanded)
      .map(([postId]) => postId);

    await loadPosts(true);
    setCommentsByPostId({});

    if (expandedPostIds.length) {
      await Promise.all(
        expandedPostIds.map((postId) => loadCommentsForPost(postId, { force: true })),
      );
    }
  };

  const renderPost = ({ item }) => {
    const normalizedAvatarUri = normalizeAvatarUri(item.authorAvatarUri);
    const isEditingPost = editingPostId === item.id;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderMain}>
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

            <View style={styles.postHeaderText}>
              <Text style={styles.author}>{item.author}</Text>
              <Text style={styles.meta}>
                {item.handle} · {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>

          {item.mine ? (
            <View style={styles.ownerActions}>
              <Pressable style={styles.ownerActionBtn} onPress={() => startEditingPost(item)}>
                <Text style={styles.ownerActionTxt}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.ownerActionBtn, styles.ownerDeleteBtn]}
                onPress={() => handleDeletePost(item.id)}
              >
                <Text style={[styles.ownerActionTxt, styles.ownerDeleteTxt]}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {isEditingPost ? (
          <View style={styles.inlineEditor}>
            <TextInput
              value={editingPostDraft}
              onChangeText={setEditingPostDraft}
              placeholder="Edit your post..."
              placeholderTextColor="#7A7393"
              multiline
              style={styles.inlineEditorInput}
            />
            <View style={styles.inlineEditorActions}>
              <Pressable style={styles.inlineSecondaryBtn} onPress={cancelEditingPost}>
                <Text style={styles.inlineSecondaryTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.inlinePrimaryBtn}
                onPress={() => handleSavePost(item.id)}
                disabled={savingPostId === item.id}
              >
                <Text style={styles.inlinePrimaryTxt}>
                  {savingPostId === item.id ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : !!item.status ? (
          <Text style={styles.status}>{item.status}</Text>
        ) : null}
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
                const isEditingComment = editingCommentId === comment.id;
                const isCommentOwner = comment.authorId === user?.id;
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
                      <View style={styles.commentHeaderRow}>
                        <View style={styles.commentHeaderText}>
                          <Text style={styles.commentAuthor}>{comment.author}</Text>
                          <Text style={styles.commentMeta}>{formatDate(comment.createdAt)}</Text>
                        </View>
                        {isCommentOwner ? (
                          <View style={styles.commentOwnerActions}>
                            <Pressable
                              style={styles.commentOwnerBtn}
                              onPress={() => startEditingComment(comment)}
                            >
                              <Text style={styles.commentOwnerTxt}>Edit</Text>
                            </Pressable>
                            <Pressable
                              style={styles.commentOwnerBtn}
                              onPress={() => handleDeleteComment(item.id, comment.id)}
                            >
                              <Text style={[styles.commentOwnerTxt, styles.ownerDeleteTxt]}>
                                Delete
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>

                      {isEditingComment ? (
                        <View style={styles.commentInlineEditor}>
                          <TextInput
                            value={editingCommentDraft}
                            onChangeText={setEditingCommentDraft}
                            placeholder="Edit your comment..."
                            placeholderTextColor="#7A7393"
                            multiline
                            style={styles.commentInlineInput}
                          />
                          <View style={styles.inlineEditorActions}>
                            <Pressable
                              style={styles.inlineSecondaryBtn}
                              onPress={cancelEditingComment}
                            >
                              <Text style={styles.inlineSecondaryTxt}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              style={styles.inlinePrimaryBtn}
                              onPress={() => handleSaveComment(item.id, comment.id)}
                              disabled={savingCommentId === comment.id}
                            >
                              <Text style={styles.inlinePrimaryTxt}>
                                {savingCommentId === comment.id ? 'Saving...' : 'Save'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.commentText}>{comment.content}</Text>
                      )}
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
        <Pressable onPress={() => navigation.navigate('Messages')} style={styles.backBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#C8F135" />
          {unreadCount > 0 && (
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

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

          <Pressable style={styles.postBtn} onPress={submitPost} disabled={posting}>
            <Text style={styles.postTxt}>{posting ? 'Posting...' : 'Post'}</Text>
          </Pressable>
        </View>
      </View>

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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  postHeaderMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  postHeaderText: { flex: 1 },
  avatarFrame: {
    width: 36,
    height: 36,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2A2346',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    backgroundColor: '#120F22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  author: { color: '#fff', fontSize: 14, fontWeight: '800' },
  meta: { color: '#9A91B9', fontSize: 11, marginTop: 1 },
  ownerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2B2449',
    backgroundColor: '#120F22',
  },
  ownerActionTxt: { color: '#C8F135', fontSize: 11, fontWeight: '800' },
  ownerDeleteBtn: { borderColor: '#4A2740' },
  ownerDeleteTxt: { color: '#FF8EA2' },
  status: { color: '#EEEAF9', marginTop: 10, lineHeight: 20 },
  inlineEditor: { marginTop: 10, gap: 8 },
  inlineEditorInput: {
    minHeight: 74,
    color: '#fff',
    backgroundColor: '#0F0B1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#28223F',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  inlineEditorActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  inlineSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2B2449',
    backgroundColor: '#120F22',
  },
  inlineSecondaryTxt: { color: '#CFCBE4', fontSize: 12, fontWeight: '700' },
  inlinePrimaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#C8F135',
  },
  inlinePrimaryTxt: { color: '#130E25', fontSize: 12, fontWeight: '800' },
  postImage: { width: '100%', height: 210, borderRadius: 12, marginTop: 10 },
  postActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeBtn: {
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
  likeBtnActive: { backgroundColor: '#C8F135', borderColor: '#C8F135' },
  likeBtnTxt: { color: '#C8F135', fontWeight: '700', fontSize: 12 },
  likeBtnTxtActive: { color: '#130E25' },
  commentBtn: {
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
  commentsWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2346',
    paddingTop: 10,
    gap: 8,
  },
  commentsMeta: { color: '#9A91B9', fontSize: 12 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
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
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentHeaderText: { flex: 1 },
  commentAuthor: { color: '#EEEAF9', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  commentMeta: { color: '#8E85AE', fontSize: 10, marginBottom: 4 },
  commentOwnerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentOwnerBtn: { paddingVertical: 2 },
  commentOwnerTxt: { color: '#C8F135', fontSize: 10, fontWeight: '800' },
  commentInlineEditor: { gap: 8 },
  commentInlineInput: {
    minHeight: 58,
    color: '#fff',
    backgroundColor: '#0F0B1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#28223F',
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  commentText: { color: '#D6D0EA', fontSize: 12, lineHeight: 17 },
  commentComposerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
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
  communityBadge: {
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
  communityBadgeTxt: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  emptyTxt: { color: '#8E85AE', textAlign: 'center', marginTop: 24 },
});
