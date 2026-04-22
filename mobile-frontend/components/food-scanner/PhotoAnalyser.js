// src/components/food-scanner/PhotoAnalyser.js
// AI photo capture UI — used inside FoodScannerScreen
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { error as logError } from '../../lib/logger';

const PURPLE = '#7C5CFC';
const LIME = '#C8F135';

export default function PhotoAnalyser({ onCapture, onPickFromLibrary, loading = false }) {
  const cameraRef = useRef(null);

  const takePhoto = async () => {
    if (loading || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (photo?.base64) onCapture?.(photo.base64);
    } catch (err) {
      logError('PhotoAnalyser capture error:', err);
    }
  };

  return (
    <View style={s.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Corner guide */}
      <View style={s.frameOverlay}>
        <View style={[s.corner, s.tl]} />
        <View style={[s.corner, s.tr]} />
        <View style={[s.corner, s.bl]} />
        <View style={[s.corner, s.br]} />
        <Text style={s.frameLabel}>Frame your food</Text>
      </View>

      {/* Bottom controls */}
      <View style={s.controls}>
        {/* Library button */}
        <TouchableOpacity style={s.libBtn} onPress={onPickFromLibrary} disabled={loading}>
          <Ionicons name="images-outline" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Capture button */}
        <TouchableOpacity
          style={s.captureRing}
          onPress={takePhoto}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[PURPLE, '#9D85F5']} style={s.captureBtn}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="scan" size={26} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* AI badge */}
        <View style={s.aiBadge}>
          <Text style={s.aiBadgeTxt}>AI</Text>
        </View>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={s.loadingOverlay}>
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={LIME} />
            <Text style={s.loadingTxt}>AI is analysing your meal...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 28;
const BORDER = 3;
const FRAME = 240;

const s = StyleSheet.create({
  root: { flex: 1 },
  frameOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -(FRAME / 2),
    marginLeft: -(FRAME / 2),
    width: FRAME,
    height: FRAME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    borderColor: LIME,
    borderTopLeftRadius: 6,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: LIME,
    borderTopRightRadius: 6,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderColor: LIME,
    borderBottomLeftRadius: 6,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: LIME,
    borderBottomRightRadius: 6,
  },
  frameLabel: {
    color: '#ffffff88',
    fontSize: 12,
    fontWeight: '600',
    position: 'absolute',
    bottom: -28,
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  libBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: PURPLE + '55',
    backgroundColor: 'rgba(124,92,252,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LIME + '25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LIME + '44',
  },
  aiBadgeTxt: { color: LIME, fontSize: 12, fontWeight: '900' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(14,14,14,0.95)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: LIME + '22',
    minWidth: 200,
  },
  loadingTxt: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
