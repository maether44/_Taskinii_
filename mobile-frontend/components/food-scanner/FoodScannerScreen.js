import { Ionicons } from "@expo/vector-icons";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNutrition } from "../../hooks/useNutrition";
import { useProfile } from "../../hooks/useProfile";
import FoodResultSheet from "./FoodResultSheet";
import { useFoodScanner } from "./useFoodScanner";

const { width: W } = Dimensions.get("window");
const SCAN_BOX = W * 0.72;
const PURPLE = "#7C5CFC";
const LIME = "#C8F135";

function ScanFrame({ active }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const pulseAnim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.03, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    const line = Animated.loop(Animated.sequence([
      Animated.timing(lineAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(lineAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ]));
    pulseAnim.start();
    line.start();
    return () => {
      pulseAnim.stop();
      line.stop();
    };
  }, [active, lineAnim, pulse]);

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
      {active && <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />}
    </Animated.View>
  );
}

function ModeToggle({ mode, onChange }) {
  const slide = useRef(new Animated.Value(mode === "barcode" ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(slide, {
      toValue: mode === "barcode" ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [mode, slide]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 116] });

  return (
    <View style={s.toggleWrap}>
      <Animated.View style={[s.toggleSlider, { transform: [{ translateX }] }]} />
      {["barcode", "photo"].map((item) => (
        <TouchableOpacity key={item} style={s.toggleBtn} onPress={() => onChange(item)} activeOpacity={0.8}>
          <Ionicons
            name={item === "barcode" ? "barcode-outline" : "camera-outline"}
            size={15}
            color={mode === item ? "#0D0D0D" : "#ffffff88"}
          />
          <Text style={[s.toggleTxt, { color: mode === item ? "#0D0D0D" : "#ffffff88" }]}>
            {item === "barcode" ? "Barcode" : "AI Photo"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ActionCard({ icon, title, subtitle, active, onPress }) {
  return (
    <TouchableOpacity style={[s.actionCard, active && s.actionCardActive]} onPress={onPress} activeOpacity={0.88}>
      <View style={[s.actionIcon, active && s.actionIconActive]}>
        <Ionicons name={icon} size={18} color={active ? "#0D0D0D" : "#fff"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function FoodScannerScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params = {} } = route;
  const {
    currentCalories = 0,
    currentProtein = 0,
    currentCarbs = 0,
    currentFat = 0,
    goalCalories = 2000,
    goalProtein = 150,
    goalCarbs = 250,
    goalFat = 65,
    mealType = "snack",
  } = params;

  const [mode, setMode] = useState("barcode");
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedMeal, setSelectedMeal] = useState(mealType);
  const [quantity, setQuantity] = useState(100);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef(null);

  const { logScannedFood } = useNutrition();
  const { profile } = useProfile();
  const { scanning, foodResult, error, loading, handleBarcode, handlePhotoCapture, handlePhotoLibrary, reset } = useFoodScanner();
  const goalType = profile?.goal ?? "general_health";

  useEffect(() => {
    if (foodResult) {
      Vibration.vibrate(40);
      setQuantity(Math.max(1, Number(foodResult.servingSize) || 100));
      if (mealType) setSelectedMeal(mealType);
    }
  }, [foodResult, mealType]);

  const onBarcodeScanned = useCallback(({ data }) => {
    if (!scanning && !loading && mode === "barcode") handleBarcode(data);
  }, [scanning, loading, mode, handleBarcode]);

  const onCapture = async () => {
    if (mode !== "photo" || loading || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (photo?.base64) handlePhotoCapture(photo.base64);
    } catch {
      // Camera errors already surface through loading state and retry path.
    }
  };

  const dismissResult = () => {
    reset();
    setSaving(false);
    setQuantity(100);
  };

  const handleLog = async () => {
    if (!foodResult || saving) return;
    setSaving(true);
    const success = await logScannedFood({
      mealType: selectedMeal,
      foodName: foodResult.name || "Unknown",
      brand: foodResult.brand || "",
      calories: foodResult.calories || 0,
      protein: foodResult.protein || 0,
      carbs: foodResult.carbs || 0,
      fat: foodResult.fat || 0,
      fiber: foodResult.fiber || 0,
      quantity,
      barcode: foodResult.barcode || null,
    });
    setSaving(false);
    if (success) navigation.goBack();
  };

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <View style={[s.root, s.centered]}>
        <StatusBar barStyle="light-content" />
        <View style={s.permCard}>
          <Ionicons name="camera-outline" size={40} color={LIME} />
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permSub}>BodyQ uses your camera to scan barcodes and analyze meal photos.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnTxt}>Grant access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={s.root}>
      <StatusBar barStyle="light-content" />

      {!foodResult && (
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={mode === "barcode" ? onBarcodeScanned : undefined}
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"] }}
          />

          <LinearGradient
            colors={["rgba(0,0,0,0.65)", "transparent", "transparent", "rgba(0,0,0,0.88)"]}
            locations={[0, 0.22, 0.60, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[s.header, { paddingTop: Math.max(insets.top + 8, Platform.OS === "ios" ? 58 : 38) }]}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={s.headerTitle}>Scan food</Text>
              <Text style={s.headerSub}>
                {mode === "barcode" ? `Adding to ${selectedMeal}` : "Use AI to estimate this meal"}
              </Text>
            </View>
            <TouchableOpacity style={s.iconBtn} onPress={handlePhotoLibrary} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={s.scanArea}>
            <ScanFrame active={mode === "barcode" && !loading} />
            <Text style={s.scanHint}>
              {mode === "barcode"
                ? "Line up the barcode inside the frame"
                : "Take a clear top-down photo of the full meal"}
            </Text>
          </View>

          {loading && (
            <View style={s.loadingOverlay}>
              <View style={s.loadingCard}>
                <ActivityIndicator size="large" color={LIME} />
                <Text style={s.loadingTxt}>
                  {mode === "barcode" ? "Looking up nutrition..." : "Alexi is estimating this meal..."}
                </Text>
              </View>
            </View>
          )}

          {error && !loading && (
            <View style={s.errorWrap}>
              <View style={s.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            </View>
          )}

          <View style={[s.controls, { paddingBottom: Math.max(insets.bottom + 18, Platform.OS === "ios" ? 46 : 30) }]}>
            <ModeToggle mode={mode} onChange={(nextMode) => { reset(); setMode(nextMode); }} />
            <View style={s.actionGrid}>
              <ActionCard
                icon="barcode-outline"
                title="Scan barcode"
                subtitle="Best for packaged products and labels"
                active={mode === "barcode"}
                onPress={() => {
                  reset();
                  setMode("barcode");
                }}
              />
              <ActionCard
                icon="sparkles-outline"
                title="AI meal scan"
                subtitle="Use camera or gallery to estimate a plated meal"
                active={mode === "photo"}
                onPress={() => {
                  reset();
                  setMode("photo");
                }}
              />
            </View>
            {mode === "photo" && (
              <View style={s.photoActions}>
                <TouchableOpacity style={s.photoLibraryBtn} onPress={handlePhotoLibrary} activeOpacity={0.85}>
                  <Ionicons name="images-outline" size={18} color="#fff" />
                  <Text style={s.photoLibraryTxt}>Choose from gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.captureRing} onPress={onCapture} activeOpacity={0.85}>
                  <LinearGradient colors={[PURPLE, "#9D85F5"]} style={s.captureBtn}>
                    <Ionicons name="camera" size={25} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={s.photoHint}>Take a meal photo or import one for AI analysis.</Text>
              </View>
            )}
          </View>
        </>
      )}

      {foodResult && (
        <View style={[StyleSheet.absoluteFill, s.resultWrap, { paddingTop: insets.top + 8 }]}>
          <FoodResultSheet
            result={{
              ...foodResult,
              currentCalories,
              currentProtein,
              currentCarbs,
              currentFat,
              goalCalories,
              goalProtein,
              goalCarbs,
              goalFat,
              goalType,
            }}
            selectedMeal={selectedMeal}
            onMealChange={setSelectedMeal}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onLog={handleLog}
            onBack={dismissResult}
            saving={saving}
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "#ffffff75", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 5 },
  scanHint: { color: "#ffffff88", fontSize: 13, marginTop: 28 },
  scanBox: { width: SCAN_BOX, height: SCAN_BOX, position: "relative" },
  cornerWrap: { position: "absolute", width: 30, height: 30 },
  cTL: { top: 0, left: 0 },
  cTR: { top: 0, right: 0 },
  cBL: { bottom: 0, left: 0 },
  cBR: { bottom: 0, right: 0 },
  cornerH: { position: "absolute", top: 0, left: 0, width: 30, height: 3, borderRadius: 2 },
  cornerV: { position: "absolute", top: 0, left: 0, width: 3, height: 30, borderRadius: 2 },
  scanLine: {
    position: "absolute",
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
  controls: { paddingHorizontal: 24, alignItems: "center", gap: 18, zIndex: 10 },
  actionGrid: { width: "100%", gap: 10 },
  actionCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionCardActive: {
    backgroundColor: "rgba(124,92,252,0.22)",
    borderColor: "rgba(200,241,53,0.36)",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconActive: {
    backgroundColor: LIME,
  },
  actionTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  actionSubtitle: { color: "#ffffff75", fontSize: 12, lineHeight: 17, marginTop: 2 },
  toggleWrap: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.11)", borderRadius: 32, padding: 4, width: 244, position: "relative" },
  toggleSlider: { position: "absolute", top: 4, left: 4, width: 116, height: 36, backgroundColor: LIME, borderRadius: 28 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 36, zIndex: 1 },
  toggleTxt: { fontSize: 13, fontWeight: "700" },
  photoActions: { width: "100%", alignItems: "center", gap: 12 },
  photoLibraryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  photoLibraryTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  captureRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: `${PURPLE}44`,
    backgroundColor: "rgba(124,92,252,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  photoHint: { color: "#ffffff88", fontSize: 12, textAlign: "center" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: "center", justifyContent: "center" },
  loadingCard: {
    backgroundColor: "rgba(14,14,14,0.92)",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: `${LIME}22`,
    minWidth: 220,
  },
  loadingTxt: { color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center" },
  errorWrap: { position: "absolute", bottom: 160, left: 24, right: 24, zIndex: 15, alignItems: "center" },
  errorCard: {
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FF6B6B33",
  },
  errorTxt: { color: "#FF6B6B", fontSize: 13, fontWeight: "600", textAlign: "center", flex: 1 },
  permCard: {
    backgroundColor: "#141414",
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 32,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#ffffff0A",
  },
  permTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 4 },
  permSub: { color: "#ffffff66", fontSize: 13, textAlign: "center", lineHeight: 20 },
  permBtn: { backgroundColor: LIME, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  permBtnTxt: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
  resultWrap: { backgroundColor: "#0F0B1E" },
});
