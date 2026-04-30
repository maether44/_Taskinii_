import { useState, useRef, useCallback } from "react";
import { View, Text, Image, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { BASE_IMG } from "../services/exerciseService";

const C = {
  card:   "#161230",
  border: "#1E1A35",
  text:   "#FFFFFF",
  sub:    "#6B5F8A",
  accent: "#9D85F5",
  purple: "#7C5CFC",
  lime:   "#C8F135",
  dark:   "#0F0B1E",
  red:    "#FF3B30",
};

// ─── Supabase-hosted MP4 URLs ─────────────────────────────────────────────────
const FORM_VIDEOS = {
  'squat':          'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/squat.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3Mvc3F1YXQubXA0IiwiaWF0IjoxNzc3NTUzNDcxLCJleHAiOjE4MDkwODk0NzF9.ZL634qE8W1TX5SOXXDXKpvD0KU06RqS4xtNODgebiEo',
  'shoulder press': 'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/shoulderpress.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3Mvc2hvdWxkZXJwcmVzcy5tcDQiLCJpYXQiOjE3Nzc1NTI4MzEsImV4cCI6MTgwOTA4ODgzMX0.ectT5MhAxv--O7G2n5fBgwYtvcJBcZQ9uQpgsCnvDsk',
  'push-up':        'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/pushup.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvcHVzaHVwLm1wNCIsImlhdCI6MTc3NzU1Mjg1MCwiZXhwIjoxODA5MDg4ODUwfQ.58Uy_L1sWp7hRz3VgePZtv3YoIAICJT7n5HyP5deMN4',
  'push up':        'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/pushup.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvcHVzaHVwLm1wNCIsImlhdCI6MTc3NzU1Mjg1MCwiZXhwIjoxODA5MDg4ODUwfQ.58Uy_L1sWp7hRz3VgePZtv3YoIAICJT7n5HyP5deMN4',
  'pushup':         'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/pushup.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvcHVzaHVwLm1wNCIsImlhdCI6MTc3NzU1Mjg1MCwiZXhwIjoxODA5MDg4ODUwfQ.58Uy_L1sWp7hRz3VgePZtv3YoIAICJT7n5HyP5deMN4',
  'plank':          'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/plank.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvcGxhbmsubXA0IiwiaWF0IjoxNzc3NTUyODczLCJleHAiOjE4MDkwODg4NzN9.7f9776-bxWvUZQRDru7-BNy8ZV8W-SnEQ13OwCGNNmc',
  'lunge':          'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/lunge.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvbHVuZ2UubXA0IiwiaWF0IjoxNzc3NTUzNDgyLCJleHAiOjE4MDkwODk0ODJ9.4pAc03frziYb10e6gWvXGP7hwUYF776OVk0rp3z3cNQ',
  'deadlift':       'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/deadlift.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvZGVhZGxpZnQubXA0IiwiaWF0IjoxNzc3NTUyOTEwLCJleHAiOjE4MDkwODg5MTB9.IhUhOaLa3q0Vpf70Z4S89DeVuF88BRZ3XxyVASAAZr0',
  'bicep curl':     'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/bicepcurl.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvYmljZXBjdXJsLm1wNCIsImlhdCI6MTc3NzU1MjkyNSwiZXhwIjoxODA5MDg4OTI1fQ.Iz5dHFHzK-sICBf2_UIkyl5irCuHfE5jLDBiOo6rHhQ',
  'biceps curl':    'https://pxupvxhjrpemthzntrwe.supabase.co/storage/v1/object/sign/exercise-videos/bicepcurl.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZTc5MTMzMC1iMmY1LTQwNzQtYTJhNy05ZWY0MjY2NDZkZGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3MvYmljZXBjdXJsLm1wNCIsImlhdCI6MTc3NzU1MjkyNSwiZXhwIjoxODA5MDg4OTI1fQ.Iz5dHFHzK-sICBf2_UIkyl5irCuHfE5jLDBiOo6rHhQ',
};

const getFormVideoUrl = (name = '') => {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(FORM_VIDEOS)) {
    if (lower.includes(key)) return url;
  }
  return null;
};

// ─── Inline Video Player component ───────────────────────────────────────────
function FormVideoPlayer({ url }) {
  const player = useVideoPlayer(url, p => {
    p.loop = true;
    p.muted = true;
  });
  const [playing, setPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
    setPlaying(v => !v);
  }, [playing, player]);

  return (
    <View style={v.wrap}>
      <VideoView
        player={player}
        style={v.video}
        contentFit="cover"
        nativeControls={false}
      />
      {/* Play/Pause overlay */}
      <Pressable style={v.overlay} onPress={togglePlay}>
        {!playing && (
          <View style={v.playBtn}>
            <Ionicons name="play" size={30} color="#fff" />
          </View>
        )}
        {playing && (
          <View style={v.pauseHint}>
            <Ionicons name="pause" size={16} color="#fff" />
            <Text style={v.pauseTxt}>Tap to pause</Text>
          </View>
        )}
      </Pressable>
      {/* Form label */}
      <View style={v.label}>
        <Text style={v.labelTxt}>✅ Proper Form</Text>
      </View>
    </View>
  );
}

const v = StyleSheet.create({
  wrap:      { borderRadius: 12, overflow: 'hidden', height: 500, backgroundColor: '#000' },
  video:     { width: '100%', height: '100%' },
  overlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playBtn:   { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  pauseHint: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  pauseTxt:  { color: '#fff', fontSize: 11, fontWeight: '600' },
  label:     { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  labelTxt:  { color: '#fff', fontSize: 11, fontWeight: '700' },
});

// ─── Main ExerciseCard ────────────────────────────────────────────────────────
export default function ExerciseCard({ navigation, exercise, personalBest }) {
  const imagePath      = exercise.images?.[0];
  const primaryMuscles = exercise.primaryMuscles?.join(", ") || "N/A";
  const videoUrl       = getFormVideoUrl(exercise.name);

  const [showVideo, setShowVideo] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handlePosturePress = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    navigation.navigate("PostureAI", { exercise });
  };

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={s.name}>{exercise.name}</Text>
            {personalBest?.isNew && (
              <View style={s.pbBadge}>
                <Ionicons name="trophy" size={10} color="#000" />
                <Text style={s.pbBadgeTxt}>PB {personalBest.score}%</Text>
              </View>
            )}
            {personalBest && !personalBest.isNew && personalBest.score >= 85 && (
              <View style={[s.pbBadge, s.pbBadgeOld]}>
                <Text style={[s.pbBadgeTxt, { color: C.lime }]}>Best {personalBest.score}%</Text>
              </View>
            )}
          </View>
          <Text style={s.meta}>
            {exercise.level} · {exercise.category} · {exercise.equipment}
          </Text>
        </View>

        {/* AI Form badge */}
        {videoUrl && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable style={s.postureBadge} onPress={handlePosturePress}>
              <Text style={s.postureIcon}>🤖</Text>
              <Text style={s.postureTxt}>AI Form</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Description */}
      {!!exercise.instructions && (
        <>
          <Text style={s.description} numberOfLines={2}>
            {Array.isArray(exercise.instructions)
              ? exercise.instructions[0]
              : exercise.instructions}
          </Text>
          <Pressable
            onPress={() => navigation.navigate("ExerciseInfo", { exercise })}
            style={s.seeMoreBtn}
          >
            <Text style={s.seeMoreText}>See More</Text>
          </Pressable>
        </>
      )}

      <Text style={s.muscles}>Muscles: {primaryMuscles}</Text>

      {/* Video / Image section */}
      {videoUrl ? (
        <View style={s.mediaSection}>
          {/* Toggle */}
          <View style={s.mediaHeader}>
            <Text style={s.mediaHeaderTxt}>
              {showVideo ? '🎬 Form Video' : '🖼️ Exercise Image'}
            </Text>
            <Pressable style={s.toggleBtn} onPress={() => setShowVideo(v => !v)}>
              <Ionicons
                name={showVideo ? "image-outline" : "play-circle-outline"}
                size={13} color={C.accent}
              />
              <Text style={s.toggleTxt}>{showVideo ? 'Show Image' : 'Watch Form'}</Text>
            </Pressable>
          </View>

          {showVideo
            ? <FormVideoPlayer url={videoUrl} />
            : !!imagePath && (
                <Image
                  source={{ uri: BASE_IMG + imagePath }}
                  style={s.image}
                  resizeMode="cover"
                />
              )
          }
        </View>
      ) : (
        !!imagePath && (
          <Image
            source={{ uri: BASE_IMG + imagePath }}
            style={s.image}
            resizeMode="cover"
          />
        )
      )}

      
    </View>
  );
}

const s = StyleSheet.create({
  card:        { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  cardHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  name:        { color: C.text, fontSize: 18, fontWeight: "700" },
  meta:        { color: C.sub, fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  pbBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.lime, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  pbBadgeOld:  { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.lime },
  pbBadgeTxt:  { fontSize: 10, fontWeight: '800', color: '#000' },
  postureBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.purple + '22', borderRadius: 10, borderWidth: 1, borderColor: C.purple + '55', paddingHorizontal: 8, paddingVertical: 5 },
  postureIcon: { fontSize: 12 },
  postureTxt:  { color: C.accent, fontSize: 11, fontWeight: '700' },
  description: { color: "#C9C2DF", fontSize: 14, lineHeight: 20, marginTop: 2 },
  seeMoreBtn:  { alignSelf: "flex-start", marginTop: 6, paddingVertical: 4 },
  seeMoreText: { color: C.accent, fontSize: 13, fontWeight: "600" },
  muscles:     { color: C.accent, fontSize: 12, marginTop: 8, marginBottom: 10 },
  mediaSection:   { gap: 8, marginBottom: 4 },
  mediaHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mediaHeaderTxt: { color: C.text, fontSize: 12, fontWeight: '700' },
  toggleBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.dark, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 5 },
  toggleTxt:   { color: C.accent, fontSize: 11, fontWeight: '700' },
  image:       { width: "100%", height: 170, borderRadius: 12, backgroundColor: C.border },
  postureCtaBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: 12, backgroundColor: C.purple + '14', borderRadius: 12, borderWidth: 1, borderColor: C.purple + '33' },
  postureCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postureCtaIcon: { fontSize: 20 },
  postureCtaTitle:{ color: C.text, fontSize: 13, fontWeight: '700' },
  postureCtaSub:  { color: C.sub, fontSize: 11, marginTop: 1 },
});