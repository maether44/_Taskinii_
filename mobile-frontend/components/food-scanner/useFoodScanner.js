/**
 * components/FoodScanner/useFoodScanner.js
 * Handles barcode scanning, AI photo analysis, photo library picking.
 */
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { analysePhotoWithAI, lookupBarcode } from '../../services/foodScannerApi';

export function useFoodScanner() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foodResult, setFoodResult] = useState(null);
  const [error, setError] = useState(null);
  const cooldown = useRef(null);

  const reset = useCallback(() => {
    if (cooldown.current) clearTimeout(cooldown.current);
    setScanning(false);
    setLoading(false);
    setFoodResult(null);
    setError(null);
  }, []);

  // Barcode
  const handleBarcode = useCallback(
    async (data) => {
      if (scanning || loading) return;
      setScanning(true);
      setError(null);
      setLoading(true);
      try {
        const result = await lookupBarcode(data);
        setFoodResult(result);
      } catch (e) {
        setError(e.message || 'Product not found — try AI Photo mode');
        cooldown.current = setTimeout(() => setScanning(false), 2500);
      } finally {
        setLoading(false);
      }
    },
    [scanning, loading],
  );

  // Camera photo
  const handlePhotoCapture = useCallback(
    async (base64) => {
      if (loading) return;
      setError(null);
      setLoading(true);
      try {
        const result = await analysePhotoWithAI(base64);
        setFoodResult(result);
      } catch (e) {
        setError(e.message || 'AI analysis failed — try again');
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  // Photo library
  const handlePhotoLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library access required');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!picked.canceled && picked.assets?.[0]?.base64) {
      await handlePhotoCapture(picked.assets[0].base64);
    }
  }, [handlePhotoCapture]);

  return {
    scanning,
    loading,
    foodResult,
    error,
    handleBarcode,
    handlePhotoCapture,
    handlePhotoLibrary,
    reset,
  };
}
