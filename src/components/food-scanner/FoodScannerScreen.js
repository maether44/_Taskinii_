/**
 * components/FoodScanner/FoodScannerScreen.js
 * Works with App.js navigate() system — no React Navigation needed.
 * Logs scanned food to Supabase via useNutrition hook.
 */
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useNutrition } from '../../hooks/useNutrition';
import { useProfile } from '../../hooks/useProfile';
import FoodResultSheet from "./FoodResultSheet";
import { useFoodScanner } from "./useFoodScanner";

const { width: W } = Dimensions.get("window");
const SCAN_BOX = W * 0.72;
const PURPLE = "#7C5CFC";
const LIME = "#C8F135";

// ─── Animated scan frame corners ─────────────────────────────────────────────
function ScanFrame({ active }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])).start();
    }
  }, [active]);

  const scanLineY = lineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCAN_BOX - 4] });
  const c = active ? LIME : "#ffffff40";

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
      <Corner style={[s.cBR, { transform: [{ scale: -1 }] }]} />
      {active && (
        <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />
      )}
    </Animated.View>
  );
}

// ─── Barcode / Photo toggle ───────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  const slide = useRef(new Animated.Value(mode === "barcode" ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: mode === "barcode" ? 0 : 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, [mode]);
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 116] });

  return (
    <View style={s.toggleWrap}>
      <Animated.View style={[s.toggleSlider, { transform: [{ translateX }] }]} />
      {["barcode", "photo"].map(m => (
        <TouchableOpacity key={m} style={s.toggleBtn} onPress={() => onChange(m)} activeOpacity={0.8}>
          <Ionicons
            name={m === "barcode" ? "barcode-outline" : "camera-outline"}
            size={15}
            color={mode === m ? "#0D0D0D" : "#ffffff88"}
          />
          <Text style={[s.toggleTxt, { color: mode === m ? "#0D0D0D" : "#ffffff88" }]}>
            {m === "barcode" ? "Barcode" : "AI Photo"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FoodScannerScreen({
  onClose,
  onLogged,
  currentCalories = 0, currentProtein = 0, currentCarbs = 0, currentFat = 0,
  goalCalories = 2000, goalProtein = 150, goalCarbs = 250, goalFat = 65,
}) {
  const [mode, setMode] = useState("barcode");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const snapPoints = ["55%", "92%"];

  const { logScannedFood } = useNutrition();
  const { profile } = useProfile();
  const { scanning, foodResult, error, loading, handleBarcode, handlePhotoCapture, handlePhotoLibrary, reset } = useFoodScanner();
  const goalType = profile?.goal ?? "general_health";

  useEffect(() => {
    if (foodResult) { Vibration.vibrate(40); bottomSheetRef.current?.snapToIndex(0); }
  }, [foodResult]);

  const onBarcodeScanned = useCallback(({ data }) => {
    if (!scanning && !loading && mode === "barcode") handleBarcode(data);
  }, [scanning, loading, mode]);

  const onCapture = async () => {
    if (mode !== "photo" || loading) return;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, base64: true });
      if (photo?.base64) handlePhotoCapture(photo.base64);
    } catch { }
  };

  const onDismiss = () => { reset(); bottomSheetRef.current?.close(); };
  const onRetry = () => { reset(); };

  const handleLog = async (mealType = "snack") => {
    if (!foodResult) return;
    const success = await logScannedFood({
      mealType,
      foodName: foodResult.name,
      brand: foodResult.brand || "",
      calories: foodResult.calories,
      protein: foodResult.protein,
      carbs: foodResult.carbs,
      fat: foodResult.fat,
      fiber: foodResult.fiber || 0,
      quantity: foodResult.servingSize,
      barcode: foodResult.barcode || null,
    });
    if (success) { onLogged && onLogged(); }
  };

  // Permission screens
  if (!permission) return <View style={s.root} />;
  if (!permission.granted) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar barStyle="light-content" />
        <View style={s.permCard}>
          <Ionicons name="camera-outline" size={40} color={LIME} />
          <Text style={s.permTitle}>Camera Access Needed</Text>
          <Text style={s.permSub}>BodyQ needs your camera to scan barcodes and analyse food photos.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnTxt}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={mode === "barcode" ? onBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"] }}
      />

      {/* Dark vignette */}
      <LinearGradient
        colors={["rgba(0,0,0,0.65)", "transparent", "transparent", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.22, 0.60, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>Scan Food</Text>
          <Text style={s.headerSub}>
            {mode === "barcode" ? "Point at a barcode" : "Frame your food clearly"}
          </Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={handlePhotoLibrary} activeOpacity={0.8}>
          <Ionicons name="images-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Scan frame */}
      <View style={s.scanArea}>
        <ScanFrame active={mode === "barcode" && !loading} />
      </View>

      {/* Loading */}
      {loading && (
        <View style={s.loadingOverlay}>
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={LIME} />
            <Text style={s.loadingTxt}>
              {mode === "barcode" ? "Looking up product..." : "AI is analysing your meal..."}
            </Text>
          </View>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={s.errorWrap}>
          <View style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={s.controls}>
        <ModeToggle mode={mode} onChange={(m) => { reset(); setMode(m); }} />
        {mode === "photo" && (
          <TouchableOpacity style={s.captureRing} onPress={onCapture} activeOpacity={0.85}>
            <LinearGradient colors={[PURPLE, "#9D85F5"]} style={s.captureBtn}>
              <Ionicons name="scan" size={26} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Result bottom sheet */}
      {foodResult && (
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          onClose={onDismiss}
          backgroundStyle={s.sheetBg}
          handleIndicatorStyle={s.sheetHandle}
        >
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 48 }}>
            <FoodResultSheet
              result={{
                ...foodResult,
                currentCalories, currentProtein, currentCarbs, currentFat,
                goalCalories, goalProtein, goalCarbs, goalFat,
                goalType,
              }}
              onLog={handleLog}
              onDismiss={onDismiss}
              onRetry={onRetry}
            />
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Platform.OS === "ios" ? 58 : 38, paddingHorizontal: 20, zIndex: 10 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "#ffffff66", fontSize: 12, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center" },
  scanArea: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 5 },
  scanBox: { width: SCAN_BOX, height: SCAN_BOX, position: "relative" },
  cornerWrap: { position: "absolute", width: 30, height: 30 },
  cTL: { top: 0, left: 0 }, cTR: { top: 0, right: 0 }, cBL: { bottom: 0, left: 0 }, cBR: { bottom: 0, right: 0 },
  cornerH: { position: "absolute", top: 0, left: 0, width: 30, height: 3, borderRadius: 2 },
  cornerV: { position: "absolute", top: 0, left: 0, width: 3, height: 30, borderRadius: 2 },
  scanLine: { position: "absolute", left: 4, right: 4, height: 2, backgroundColor: LIME, borderRadius: 2, shadowColor: LIME, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  controls: { paddingBottom: Platform.OS === "ios" ? 46 : 30, paddingHorizontal: 24, alignItems: "center", gap: 18, zIndex: 10 },
  toggleWrap: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.11)", borderRadius: 32, padding: 4, width: 244, position: "relative" },
  toggleSlider: { position: "absolute", top: 4, left: 4, width: 116, height: 36, backgroundColor: LIME, borderRadius: 28 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 36, zIndex: 1 },
  toggleTxt: { fontSize: 13, fontWeight: "700" },
  captureRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: PURPLE + "44", backgroundColor: "rgba(124,92,252,0.10)", alignItems: "center", justifyContent: "center" },
  captureBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: "center", justifyContent: "center" },
  loadingCard: { backgroundColor: "rgba(14,14,14,0.92)", borderRadius: 20, padding: 28, alignItems: "center", gap: 14, borderWidth: 1, borderColor: LIME + "22", minWidth: 200 },
  loadingTxt: { color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" },
  errorWrap: { position: "absolute", bottom: 160, left: 24, right: 24, zIndex: 15, alignItems: "center" },
  errorCard: { backgroundColor: "rgba(255,107,107,0.15)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#FF6B6B33" },
  errorTxt: { color: "#FF6B6B", fontSize: 13, fontWeight: "600" },
  permCard: { backgroundColor: "#141414", borderRadius: 24, padding: 32, marginHorizontal: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#ffffff0A" },
  permTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 4 },
  permSub: { color: "#ffffff66", fontSize: 13, textAlign: "center", lineHeight: 20 },
  permBtn: { backgroundColor: LIME, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  permBtnTxt: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
  sheetBg: { backgroundColor: "#0F0B1E", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: "#ffffff25", width: 40 },
});