// src/components/food-scanner/BarcodeScanner.js
// Reusable barcode scanner view used inside FoodScannerScreen
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: W } = Dimensions.get('window');
const SCAN_BOX = W * 0.72;
const LIME = '#C8F135';

function ScanFrame({ active }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    p.start();
    l.start();
    return () => {
      p.stop();
      l.stop();
    };
  }, [active]);

  const scanLineY = lineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCAN_BOX - 4] });
  const c = active ? LIME : '#ffffff40';

  const Corner = ({ style }) => (
    <View style={[s.cornerWrap, style]}>
      <View style={[s.cornerH, { backgroundColor: c }]} />
      <View style={[s.cornerV, { backgroundColor: c }]} />
    </View>
  );

  return (
    <Animated.View style={[s.scanBox, { transform: [{ scale: pulse }] }]}>
      <Corner style={s.cTL} />
      <Corner style={[s.cTR, { transform: [{ scaleX: -1 }] }]} />
      <Corner style={[s.cBL, { transform: [{ scaleY: -1 }] }]} />
      <Corner style={[s.cBR, { transform: [{ scaleX: -1 }, { scaleY: -1 }] }]} />
      {active && <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />}
    </Animated.View>
  );
}

export default function BarcodeScanner({ onScanned, active = true, loading = false }) {
  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={active && !loading ? ({ data }) => onScanned?.(data) : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
      />
      <View style={s.overlay}>
        <View style={s.scanArea}>
          <ScanFrame active={active && !loading} />
          <View style={s.hint}>
            <Ionicons name="barcode-outline" size={16} color="#ffffff88" />
            <Text style={s.hintTxt}>Point at any product barcode</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanArea: { alignItems: 'center', gap: 20 },
  scanBox: { width: SCAN_BOX, height: SCAN_BOX, position: 'relative' },
  cornerWrap: { position: 'absolute', width: 30, height: 30 },
  cTL: { top: 0, left: 0 },
  cTR: { top: 0, right: 0 },
  cBL: { bottom: 0, left: 0 },
  cBR: { bottom: 0, right: 0 },
  cornerH: { position: 'absolute', top: 0, left: 0, width: 30, height: 3, borderRadius: 2 },
  cornerV: { position: 'absolute', top: 0, left: 0, width: 3, height: 30, borderRadius: 2 },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: LIME,
    borderRadius: 2,
    shadowColor: LIME,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintTxt: { color: '#ffffff88', fontSize: 13, fontWeight: '500' },
});
