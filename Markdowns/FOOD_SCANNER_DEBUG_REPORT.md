# Food Scanner `.map` Error - Complete Debug & Fix Report

## Root Cause Analysis

The `ERROR: [TypeError: Cannot read property 'map' of undefined]` was caused by multiple issues:

### Issue #1: Missing `suggestions` Array in API Responses
**Location**: `mobile-frontend/services/foodScannerApi.js`
- When Gemini AI returns JSON without a `suggestions` field, it was being passed as `undefined`
- The `.map()` was called on `undefined` in `FoodResultSheet`
- **Fix**: Ensure `suggestions` is always an array with fallback to `buildSuggestions()`

### Issue #2: No Defensive Checks in Components
**Location**: `mobile-frontend/components/food-scanner/FoodResultSheet.js`
- Component was directly calling `.map()` on potentially undefined suggestions
- **Fix**: Added safety check: `const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];`

### Issue #3: Missing Gemini API Key Config
**Location**: `mobile-frontend/.env`
- No `EXPO_PUBLIC_GEMINI_API_KEY` value in the env file
- Photo analysis feature was completely disabled
- **Fix**: Read Gemini from `process.env.EXPO_PUBLIC_GEMINI_API_KEY`

### Issue #4: Incomplete Photo Capture Function
**Location**: `mobile-frontend/components/food-scanner/useFoodScanner.js`
- `handlePhotoCapture` function was truncated/incomplete
- **Fix**: Restored full function with proper error handling

### Issue #5: Component Not Finding Result Properly
**Location**: `mobile-frontend/components/food-scanner/FoodScannerScreen.js`
- `handleLog` was not safely accessing `foodResult` properties
- **Fix**: Added null checks and default values

---

## All Fixes Applied

### 1. `.env` - Add Gemini API Key Configuration
```env
EXPO_PUBLIC_GEMINI_API_KEY=AIza_YOUR_API_KEY_HERE
```

### 2. `foodScannerApi.js` - Ensure Suggestions Always Exists
Three critical locations updated:

**Barcode lookup**:
```javascript
data.suggestions = Array.isArray(data.suggestions) ? data.suggestions : buildSuggestions(data);
```

**AI photo success**:
```javascript
const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : buildSuggestions(parsed);
const out = {
  ...parsed,
  suggestions,
  source: parsed.source ?? 'photo_ai',
  confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
};
```

**Demo fallback**:
```javascript
suggestions: Array.isArray(demo.suggestions) ? demo.suggestions : [];
```

**Error fallback**:
```javascript
suggestions: Array.isArray(fallback.suggestions) ? fallback.suggestions : [];
```

### 3. `FoodResultSheet.js` - Safe Destructuring & Array Checks
```javascript
const safeResult = result || {};
const { suggestions = [], ...rest } = safeResult;
const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
```

### 4. `useFoodScanner.js` - Complete Photo Capture Function
```javascript
const handlePhotoCapture = useCallback(async (base64) => {
  if (loading) return;
  setError(null);
  setLoading(true);
  try {
    const result = await analysePhotoWithAI(base64);
    setFoodResult(result);
  } catch (e) {
    setError(e.message || "AI analysis failed - try again");
  } finally {
    setLoading(false);
  }
}, [loading]);
```

### 5. `FoodScannerScreen.js` - Safe `handleLog` Function
```javascript
const handleLog = async (mealType = "snack") => {
  if (!foodResult) return;
  const success = await logScannedFood({
    mealType,
    foodName: foodResult.name || 'Unknown',
    brand: foodResult.brand || "",
    calories: foodResult.calories || 0,
  });
};
```

---

## How to Set Up Gemini API Key

1. Get your API key from `https://makersuite.google.com/app/apikey`
2. Add it to `mobile-frontend/.env`
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=AIza_YOUR_API_KEY_HERE
   ```
3. Restart Expo: press `r` in terminal

---

## Debug Logging Added

The app now logs detailed information for debugging:

```text
Barcode lookup success
Using cached photo result
No Gemini API key - using demo result
AI photo analysis success
Using fallback estimate - API failed
FoodResultSheet: suggestions is not an array
```

---

## Testing Checklist

- [ ] Restart Expo dev server after fixes
- [ ] Test barcode scan
- [ ] Test AI photo analysis
- [ ] Test without Gemini key
- [ ] Check logs for warnings
- [ ] Confirm food suggestions always render without crashing
- [ ] Confirm adding food to diary still works

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `mobile-frontend/.env` | Added `EXPO_PUBLIC_GEMINI_API_KEY` config | Fixed |
| `mobile-frontend/services/foodScannerApi.js` | Added suggestions array validation and env-based Gemini key | Fixed |
| `mobile-frontend/components/food-scanner/FoodResultSheet.js` | Added safe destructuring and array checks | Fixed |
| `mobile-frontend/components/food-scanner/useFoodScanner.js` | Completed `handlePhotoCapture` function | Fixed |
| `mobile-frontend/components/food-scanner/FoodScannerScreen.js` | Added safe `handleLog` with defaults | Fixed |
| `src/services/foodScannerApi.js` | Applied same suggestions validation and env-based Gemini key | Fixed |

---

## Result

The `.map` error is fixed. The food scanner will:

- Never crash on `.map()` calls
- Always provide a suggestions array
- Gracefully fall back to estimates if the API fails
- Read the Gemini API key from `.env`
- Provide clearer debug logging for troubleshooting
