import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { createCommunityPost, listCommunityPosts } from '../../services/communityService';

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
  const [posts, setPosts] = useState([]);
  const [statusText, setStatusText] = useState('');
  const [pickedImageUri, setPickedImageUri] = useState(null);
  const [pickedImageAsset, setPickedImageAsset] = useState(null);
  const [posting, setPosting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const normalizeAvatarUri = (value) => {
    if (typeof value !== 'string') return null;
    const uri = value.trim();
    if (!uri || uri === 'null' || uri === 'undefined') return null;
    if (/^(https?:\/\/|file:\/\/|data:image\/)/i.test(uri)) return uri;
    return null;
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
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#C8F135" />
            <Text style={styles.messageBtnTxt}>Message</Text>
          </Pressable>
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
          <Pressable onPress={() => loadPosts(true)} style={styles.backBtn}>
            <Ionicons name="refresh" size={18} color="#C8F135" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Messages')} style={styles.backBtn}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#C8F135" />
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
  messageBtn: {
    marginTop: 10,
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
  emptyTxt: { color: '#8E85AE', textAlign: 'center', marginTop: 24 },
});
