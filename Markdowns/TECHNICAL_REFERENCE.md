# BodyQ - Technical Reference Document

**Version:** 1.0  
**Date:** 2026-04-25  
**Branch:** `israa/merging`

---

## 1. Project Scope & Overview

BodyQ is a **full-stack AI-powered health and fitness platform** consisting of three application layers: a React Native mobile app (Expo), a Next.js web frontend (marketing site + admin dashboard), and a Supabase backend (PostgreSQL + Edge Functions). The platform offers AI-driven personal coaching via an assistant named **Alexi**, workout tracking with posture analysis, nutrition logging with camera-based food scanning, gamification through XP/levels/achievements, and an admin analytics dashboard.

**Target Users:** Fitness enthusiasts seeking AI-personalized coaching, nutrition tracking, and workout planning.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│  ┌─────────────────────┐        ┌─────────────────────────────┐  │
│  │  Mobile App (Expo)  │        │   Web Frontend (Next.js)    │  │
│  │  React Native 0.81  │        │   Next.js 14 (App Router)   │  │
│  │  5-tab navigation   │        │   Marketing + Admin Panel   │  │
│  │  20+ screens        │        │   TypeScript + Tailwind     │  │
│  └────────┬────────────┘        └────────────┬────────────────┘  │
│           │                                  │                   │
└───────────┼──────────────────────────────────┼───────────────────┘
            │         REST / RPC / Auth        │
            ▼                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Supabase    │  │   Edge       │  │    PostgreSQL 17       │  │
│  │  Auth (JWT)  │  │   Functions  │  │    Tables + RPC + RLS  │  │
│  │  Email/Pass  │  │   (Deno 2)   │  │    Triggers            │  │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘  │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Groq API  │  │  Google    │  │  GitHub    │
     │  Llama 3.3 │  │  Gemini   │  │  Exercise  │
     │  AI Coach  │  │  Food AI  │  │  DB (free) │
     └────────────┘  └────────────┘  └────────────┘
```

**Architecture Pattern:** Serverless BaaS (Backend-as-a-Service) with Supabase handling auth, database, and edge compute. No custom Express/Node server. 

Business logic split between Supabase Edge Functions (Deno), PostgreSQL RPC functions, and database triggers.

---

## 3. Complete Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Mobile Runtime** | Expo | 54.0.33 | React Native build/deploy toolchain |
| **Mobile Framework** | React Native | 0.81.5 | Cross-platform mobile UI |
| **Mobile UI** | React | 19.1.0 | Component rendering |
| **Web Framework** | Next.js | 14.2.30 | SSR/SSG web app with App Router |
| **Web UI** | React | 18.3.1 | Web component rendering |
| **Web Styling** | Tailwind CSS | 3.4.6 | Utility-first CSS |
| **Web Animations** | Framer Motion | 11.3.8 | Motion/transition library |
| **Web Animations** | GSAP | - | Advanced scroll/timeline animations |
| **Web Charts** | Recharts | 3.8.1 | Data visualization |
| **Language** | TypeScript | 5.5.3 | Type-safe JS (web frontend) |
| **Language** | JavaScript (ES6+) | - | Mobile frontend |
| **Database** | PostgreSQL | 17 | Primary data store |
| **BaaS** | Supabase | - | Auth, DB, Edge Functions, Storage, Realtime |
| **Edge Runtime** | Deno | 2 | Edge Function execution |
| **AI/LLM** | Groq API | - | LLM inference (coaching, plans, insights) |
| **AI Models** | Llama 3.3-70b-versatile | - | Main coaching & conversation model |
| **AI Models** | Llama 3.1-8b-instant | - | Fast plan generation & insights |
| **AI Vision** | Google Gemini | - | Food image recognition |
| **Navigation** | React Navigation | 7.x | Mobile navigation (stack + tabs) |
| **Forms** | React Hook Form | - | Form validation (web + mobile) |
| **State (Mobile)** | React Context API | - | Global state (Auth, Today, Milestone) |
| **Local Storage** | AsyncStorage | - | Mobile key-value persistence |
| **Animations (Mobile)** | react-native-reanimated | - | High-performance native animations |
| **Bottom Sheets** | @gorhom/bottom-sheet | - | Sliding panel UI |
| **Camera** | expo-camera | - | Barcode/photo food scanning |
| **Sensors** | expo-sensors | - | Pedometer (step tracking) |
| **Audio** | expo-av + expo-speech | - | TTS for Yara voice responses |
| **Notifications** | expo-notifications | - | Push notifications |
| **Icons** | Lucide, Ionicons, MaterialCommunityIcons | - | Vector icon sets |
| **Fonts** | Outfit, Inter (mobile); Syne, Inter (web) | - | Typography |
| **Auth Protocol** | JWT (Supabase Auth) | - | Session tokens, 1-hour expiry |
| **Security** | Row-Level Security (RLS) | - | Per-user data isolation |

---

## 4. Feature Inventory

### 4.1 Master Feature Table

| # |          Feature      |   Mobile Files   |     Web Files      | Backend Files | How It Works |
|---|-----------------------|------------------|--------------------|---------------|-------------|
| 1 | **User Authentication** | `auth/SignIn.js`, `auth/SignUp.js`, `context/AuthContext.js`, `services/authService.ts` | `app/login/`, `app/signup/`, `components/auth/LoginForm.tsx`, `components/auth/SignupForm.tsx`, `context/AuthContext.tsx`, `middleware.ts` | Supabase Auth (built-in) | Email/password signup via Supabase Auth. JWT tokens with 1-hour expiry. AuthContext listens to `onAuthStateChange` events. Middleware protects `/app/*` (authenticated) and `/dashboard/*` (admin role). Cookie-based sessions on web via `@supabase/ssr`. |
| 2 | **Onboarding Wizard** | `screens/OnBoardingGoal.js`, `components/onBoarding/FieldInput.js`, `components/onBoarding/SelectCard.js`, `components/onBoarding/PillButton.js` | `app/onboarding/` | `supabase/functions/onboarding-plan/index.ts`, `frontend/app/api/generate-plan/route.ts` | Multi-step form captures goal, gender, height, weight, experience, injuries, equipment, focus areas, sleep quality, stress level, diet preference. Submits to `onboarding-plan` Edge Function which calls Groq (Llama 3.1-8b) to generate a 7-day personalized training split with exercises, sets, reps, and coaching tips. Profile saved to `profiles` table. |
| 3 | **App Tour** | `components/onBoarding/AppTour.js`, `components/onBoarding/tourRefs.js`, `services/tourService.ts` | - | - | Interactive walkthrough highlighting key UI elements for first-time users. Tour refs attached to navigation and screen elements. State persisted via AsyncStorage. |
| 4 | **Home Dashboard** | `screens/Home.js`, `components/home/CalorieRingHero.js`, `components/home/TodayScheduleWidget.js`, `components/home/WaterTracker.js` | `app/app/page.tsx` | `dashboardService.js` → RPC `get_daily_dashboard_v5` | Aggregates daily stats: calorie ring (consumed vs target), water intake, step count, sleep hours, muscle fatigue heatmap, workout summary, motivational quote. `TodayContext` provides single source of truth for all daily data. |
| 5 | **Calorie & Macro Tracking** | `components/home/CalorieRingHero.js`, `components/shared/MacroBar.js`, `components/shared/RingProgress.js` | `components/app/shared/MacroBar.tsx`, `components/app/shared/StatRing.tsx` | `calorie_targets` table, `food_logs` + `foods` tables | SVG-based animated ring shows calories consumed vs daily target. MacroBar displays protein/carbs/fat breakdown as percentage bars. Targets stored in `calorie_targets` table; actual intake calculated from `food_logs` joined with `foods` nutritional data. |
| 6 | **Water Tracking** | `components/home/WaterTracker.js` | - | RPC `log_water_ml(user_id, delta, date)` | Users tap to add water increments (e.g., 250ml). Atomic RPC upserts into `daily_activity` table, returns new total. Target is 2000ml/day. Reaching target fires `yara_detect_activity_events` trigger creating a `water_target_hit` event. |
| 7 | **Step Counting** | `components/StepCounter.js`, `context/TodayContext.js` | - | RPC `increment_steps(user_id, delta, date)` | `expo-sensors` Pedometer API counts real-time steps. TodayContext batches and syncs to DB every 30 seconds via atomic `increment_steps` RPC to minimize network calls. Steps stored in `daily_activity`. |
| 8 | **Sleep Logging** | `screens/sleep/SleepLog.js` | - | RPC `log_sleep_data(user_id, hours, quality, date)` | Users log sleep duration and quality (1-5 scale). RPC upserts into `daily_activity`. Trigger `yara_detect_activity_events` checks for 2 consecutive nights <6h sleep and fires `sleep_low_streak_2day` warning event. |
| 9 | **Nutrition / Meal Logging** | `screens/Nutrition.js`, `screens/nutrition/MealLogger.js`, `screens/nutrition/FoodDetail.js`, `screens/nutrition/CustomMealBuilder.js`, `services/nutritionService.js` | `app/app/nutrition/` | `foods` table, `food_logs` table, `calorie_targets` table | Users log meals by searching the food database, scanning barcodes, or using the camera. Each log records `food_id`, `meal_type` (breakfast/lunch/dinner/snack), `quantity_grams`, and `consumed_at`. Joined queries calculate daily macro totals. Custom meals can be created and saved. |
| 10 | **Food Scanner (Barcode + AI Photo)** | `components/food-scanner/FoodScannerScreen.js`, `components/food-scanner/BarcodeScanner.js`, `components/food-scanner/PhotoAnalyser.js`, `components/food-scanner/FoodResultSheet.js`, `components/food-scanner/useFoodScanner.js`, `services/foodScannerApi.js` | - | - (client-side Gemini API call) | Two modes: (a) Barcode scan using `expo-camera` identifies product; (b) Photo analysis sends image to Google Gemini API for AI food recognition with health scoring. Results displayed in bottom sheet via `FoodResultSheet`. Fallback to local databases (`commonFoods.json`, `comprehensiveFoods.json`) if API fails. |
| 11 | **Workout Training Hub** | `screens/Training.js`, `screens/ExerciseList.js`, `screens/ExerciseInfo.js`, `services/exerciseService.ts` | `app/dashboard/content/workouts/` | `workout_plans` table | Browse exercises from GitHub free-exercise-db (with 3s timeout fallback to local `exercises.json`). Each exercise shows name, target muscles, equipment, form cues, and alternatives. Admin can manage workout plans via web dashboard. |
| 12 | **Active Workout Session** | `screens/workout/WorkoutActive.js`, `screens/workout/WorkoutSummary.js` | - | `workout_sessions` table, `muscle_fatigue` table, RPC `check_achievements` | Live workout timer tracks duration, exercises completed, and calories burned. On completion, session saved to `workout_sessions`, muscle fatigue percentages updated in `muscle_fatigue`, and `check_achievements` RPC evaluates milestone progress. DB trigger `yara_detect_workout_events` fires streak/event detection. |
| 13 | **Posture AI** | `screens/PostureAI.js` | - | `ai_sessions` table | Camera-based posture correction during exercises. AI analyzes body positioning and provides real-time feedback. Session metrics (duration, accuracy, errors) logged to `ai_sessions` for admin analytics. |
| 14 | **Muscle Fatigue Tracking** | Home screen fatigue display, `services/workoutService.ts` | - | `muscle_fatigue` table | Per-muscle fatigue percentages tracked after workouts. `EXERCISE_MUSCLES` mapping links exercises to affected muscles. `RECOVERY_MAP` provides smart recovery time suggestions. Visualized as heatmap on Home screen. |
| 15 | **Yara AI Coach (Text)** | `components/YaraAssistant.js`, `components/YaraToggle.js`, `services/aiAssistantService.js`, `services/groqAPI.ts`, `services/chatService.ts` | - | `supabase/functions/ai-assistant/index.ts`, `supabase/functions/ai-assistant/memory.ts` | Floating chat interface. User sends text query → Edge Function fetches user profile + 30-day summary (activity, nutrition, workouts, body metrics) + cross-session memory from `user_memory` + pending `yara_events`. Builds rich system prompt with all context. Groq (Llama 3.3-70b) generates personalized response. AI extracts: (a) new memory facts → stored in `user_memory`, (b) action commands (log water/food/workout) → executed atomically, (c) events consumed and marked. Response sanitized of internal commands before display. |
| 16 | **Yara AI Coach (Voice)** | `components/YaraAssistant.js` (voice mode), `expo-av`, `expo-speech` | - | `supabase/functions/ai-assistant/index.ts` (STT/TTS path) | Voice mode: audio recorded via `expo-av`, sent to Edge Function which uses Groq Whisper for speech-to-text transcription, processes query through same coaching pipeline, returns text response which is spoken back via `expo-speech` TTS. |
| 17 | **Yara Cross-Session Memory** | `components/YaraAssistant.js` | - | `supabase/functions/ai-assistant/memory.ts`, `user_memory` table, RPCs: `add_user_memory`, `get_user_memory`, `delete_user_memory` | AI extracts persistent facts from conversations (injuries, dietary preferences, schedule, goals, equipment, dislikes). Stored in `user_memory` with categories: injury, medical, diet, equipment, schedule, preference, dislike, goal, other. Facts limited to 240 chars. Memory injected into system prompt on each conversation for continuity. |
| 18 | **Yara Proactive Events** | `components/YaraAssistant.js` (event consumption) | - | `yara_events` table, triggers: `yara_detect_workout_events`, `yara_detect_activity_events`, `yara_detect_body_metrics_events`, RPCs: `get_pending_yara_events`, `consume_yara_events` | Database triggers fire on INSERT/UPDATE to `workout_sessions`, `daily_activity`, `body_metrics`. Detect: first workout of week, workout streaks (3/7/14/30 days), water target hit, sleep low streak (2 nights <6h), weight milestones. Events stored in `yara_events` with severity (info/celebrate/warning) and deduplication key. Yara consumes and surfaces events during next conversation. |
| 19 | **AI Insights Generation** | `screens/Insights.js`, `services/yaraInsightsService.js` | `app/app/insights/` | `supabase/functions/yara-insights/index.ts`, `supabase/functions/generate-user-insights/index.ts`, `user_insights` table, `ai_insights` table, RPC `get_insights_data` | Two pathways: (a) User-triggered: `yara-insights` Edge Function takes period + stats, Groq generates 4 insight cards tagged as Performance/Correlation/Optimization/Prediction/Recovery/Nutrition. (b) Admin batch: `generate-user-insights` fetches `get_insights_data` RPC for each user, generates personalized insights with icons/colors, stores in `user_insights`. Insights cached to prevent duplicate Groq calls. |
| 20 | **AI Training Plan Generation** | `services/aiPlanService.ts`, `services/groqAPI.ts` | `app/api/generate-plan/route.ts` | `supabase/functions/onboarding-plan/index.ts` | Two paths: (a) Onboarding: Edge Function pre-auth. (b) In-app: Next.js API route or direct Groq call. Both gather user profile + calorie targets, call Groq to generate 7-day training split with 5 exercises/day, including sets, reps, rest times, coaching tips, nutrition notes, recovery tips. JSON response parsed with error recovery. |
| 21 | **Gamification: XP & Levels** | `context/MilestoneContext.js` | - | `xp_log` table, `profiles.xp_current/xp_total/level`, RPCs: `award_xp`, `increment_xp`, `get_user_level_info` | XP awarded for: workouts, meals, streaks, achievements. `award_xp` RPC logs transaction to `xp_log`, increments `xp_current`/`xp_total` on profile, checks for level-up. Level formula: `50 * level * (level - 1)`. Sources tracked: workout, meal, streak, achievement. |
| 22 | **Gamification: Achievements** | `context/MilestoneContext.js`, `components/CelebrationOverlay.js`, `components/reports/CelebrationInterstitial.js` | - | `achievements` table, RPC `check_achievements`, `get_all_achievements` | Achievement catalog includes: first_workout, 10/50/100 workouts, 3/7/14/30-day streaks, weight goals. `check_achievements` called after workouts; evaluates milestones, creates records, awards XP. Celebration overlay with animation triggered on unlock. |
| 23 | **Gamification: Streaks** | `context/MilestoneContext.js`, `components/reports/MilestonePath.js` | `hooks/useStreaks.ts`, `components/app/shared/StreakBadge.tsx` | RPC `record_user_visit`, login streak tracking migration | `record_user_visit` RPC called on each app open; tracks consecutive active days. Streak milestones (3, 7, 14, 30 days) trigger `yara_events` and XP rewards. MilestonePath component visualizes streak progress. |
| 24 | **Schedule & Planning** | `screens/ScheduleScreen.js`, `store/scheduleStore.js` | - | - | Weekly workout/meal plan visualization. Schedule store uses pub/sub pattern with AsyncStorage persistence. Tracks exercise completion and daily schedule state. Yara can set schedule via conversation actions. |
| 25 | **Reports & Analytics (User)** | `screens/Insights.js`, `components/reports/ReportCard.js`, `components/reports/ReportViewer.js`, `services/reportService.js` | `app/app/insights/` | Various RPC summary functions | HTML-based report generation. Aggregates workout history, nutrition trends, body metrics, sleep patterns. ReportViewer renders full report. Insights screen shows charts, heatmaps, milestone tracking, AI coaching history. |
| 26 | **Profile Management** | `screens/Profile.js`, `screens/Editprofilescreen.js`, `services/profileService.ts` | `app/app/profile/` | `profiles` table | View/edit name, avatar, goal, activity level, height, weight, gender, assistant tone, experience, equipment, diet preference, sleep quality, stress level. Avatar stored as URI. |
| 27 | **Settings** | `screens/Settings.js`, `screens/settings/HelpCenter.js`, `screens/settings/ReportProblem.js`, `screens/settings/TermsPolicies.js`, `screens/settings/TrustCenter.js` | `app/dashboard/settings/` | `reports` table | Help center (FAQ), bug/feature reporting (stored in `reports` table with status workflow), terms & policies, trust center (privacy/security info). Notification preferences stored in AsyncStorage. |
| 28 | **Problem Reporting** | `screens/settings/ReportProblem.js` | `app/dashboard/support/`, `dashboard/support/actions.ts` | `reports` table, admin read policy | Users submit issue_type + subject + details. Stored with `open` status. Admins manage via dashboard with status workflow: open → in_progress → resolved. Admin-only read policy via RLS. |
| 29 | **Community & Messaging** | `screens/community/CommunityCenter.js`, `screens/community/MessagesInbox.js`, `screens/community/DMThread.js`, `services/communityService.js`, `services/dmService.js` | - | - | Social/community features with direct messaging. Thread-based conversations. |
| 30 | **Workout History** | `screens/Workouthistoryscreen.js`, `services/workoutService.ts` | - | `workout_sessions` table | Past workout logs with exercise details, duration, calories burned, posture score. Fetched via `fetchWorkoutHistory()`. |
| 31 | **Flappy Bird Game** | `screens/workout/FlappyBirdGame.js` | - | - | Gamified workout motivation mini-game. |
| 32 | **Custom Splash Screen** | `components/CustomSplashScreen.js` | - | - | Animated splash/loading screen on app launch. |
| 33 | **Event Bus** | `lib/eventBus.js` | - | - | Lightweight pub/sub for cross-screen communication. Events: `MEAL_LOGGED`, `WATER_LOGGED`, `SLEEP_LOGGED`, `WORKOUT_COMPLETED`, `ACHIEVEMENT_AWARDED`, `STREAK_MILESTONE`, `PROFILE_UPDATED`, `TARGETS_UPDATED`, `REFRESH_TODAY`. Decouples screens from direct state dependencies. |
| 34 | **Admin Dashboard** | - | `app/dashboard/`, `components/dashboard/Sidebar.tsx`, `components/dashboard/TopBar.tsx`, all `/dashboard/*` pages | `lib/supabase/queries/analytics.ts`, `queries/users.ts`, `queries/reports.ts`, `queries/support.ts`, `queries/ai.ts`, `queries/content.ts` | Full admin panel: KPI cards (total users, active today, MRR, AI sessions, churn rate), user growth trends (30-day), revenue breakdown by plan (Pro/Elite), AI session accuracy trends, error logs, problem reports management, user management, notification management, content management (workouts, nutrition, prompts), audit logs, real-time monitoring, version history, subscription management, user segmentation. Protected by middleware role check. |
| 35 | **Admin Analytics** | - | `app/dashboard/analytics/`, `components/dashboard/KPICard.tsx`, `AreaChartCard.tsx`, `BarChartCard.tsx`, `PieChartCard.tsx`, `SparkLine.tsx` | `lib/supabase/queries/analytics.ts` | KPI Summary, user growth trends, revenue breakdown, AI session accuracy, error rate tracking. Recharts-based visualizations. |
| 36 | **Marketing Website** | - | `app/page.tsx`, `components/sections/NavBar.tsx`, `HeroSection.tsx`, `StatsBar.tsx`, `FeaturesSection.tsx`, `WorkoutBrowser.tsx`, `AIShowcase.tsx`, `NutritionSection.tsx`, `PlansSection.tsx`, `TestimonialsSection.tsx`, `CTABanner.tsx`, `Footer.tsx` | - | Landing page with lazy-loaded sections: hero, stats bar, features showcase, workout browser, AI capabilities, nutrition section, pricing plans, testimonials, CTA, footer. Framer Motion + GSAP animations. Glassmorphism UI with phone mockups. |
| 37 | **Role-Based Access Control** | `context/AuthContext.js` (user role) | `middleware.ts`, `lib/supabase/server.ts` | `profiles.role` column, RLS policies | Three roles: `user`, `admin`, `super_admin`. Middleware intercepts routes: `/app/*` requires authenticated user, `/dashboard/*` requires admin/super_admin. All user tables have RLS policies enforcing `auth.uid() = user_id`. Edge Functions use service_role key for privileged operations. |
| 38 | **Batch Insight Generation** | - | - | `supabase/functions/generate-user-insights/index.ts` | Admin-triggered batch operation. Calls `generate-user-insights?all=true&adminKey=<secret>`. Iterates all users, fetches stats, generates AI insights, stores in `user_insights`. |
| 39 | **Notifications** | via `expo-notifications` | `app/dashboard/notifications/`, `lib/supabase/queries/notifications.ts` | - | Push notifications for hydration reminders, workout reminders, meal logging. Preferences stored in AsyncStorage. Admin can manage notifications via dashboard. |

---

## 5. Database Schema

### 5.1 Entity-Relationship Overview

```
auth.users (Supabase built-in)
    │
    ├─── profiles (1:1)
    │       ├── role, goal, activity_level, height_cm, weight_kg, gender
    │       ├── assistant_tone, experience, equipment, diet_pref
    │       ├── sleep_quality, stress_level
    │       └── xp_current, xp_total, level, last_active, last_xp_update
    │
    ├─── daily_activity (1:N per date)
    │       └── date, steps, water_ml, sleep_hours, sleep_quality, calories_burned
    │
    ├─── body_metrics (1:N)
    │       └── weight_kg, body_fat_pct, recorded_at
    │
    ├─── calorie_targets (1:1)
    │       └── calorie_target, protein_target, carbs_target, fat_target
    │
    ├─── food_logs (1:N) ──→ foods (N:1)
    │       └── food_id, consumed_at, meal_type, quantity_grams
    │
    ├─── workout_sessions (1:N)
    │       └── started_at, ended_at, calories_burned, notes, exercise_count, avg_posture_score
    │
    ├─── muscle_fatigue (1:N per muscle)
    │       └── muscle_name, fatigue_pct
    │
    ├─── workout_plans (1:N)
    │       └── name, description, category, difficulty, exercises (JSON), ai_adapted
    │
    ├─── achievements (1:N)
    │       └── achievement_id, name, description, icon, xp_reward, earned_at
    │
    ├─── xp_log (1:N)
    │       └── source (workout/meal/streak/achievement), amount, description
    │
    ├─── ai_insights (1:N)
    │       └── insight_type, message, source (yara/rag), is_read
    │
    ├─── user_insights (1:N)
    │       └── insight_type, message, icon, color
    │
    ├─── ai_sessions (1:N)
    │       └── type (posture), duration, accuracy, error
    │
    ├─── user_memory (1:N)
    │       └── category, fact (≤240 chars), last_used_at
    │
    ├─── yara_events (1:N)
    │       └── event_type, payload (JSON), severity, dedupe_key, consumed_at
    │
    ├─── reports (1:N)
    │       └── issue_type, subject, details, status
    │
    └─── subscriptions (1:N)
            └── plan, amount, status
```

### 5.2 Standalone Tables

| Table | Purpose |
|-------|---------|
| `foods` | Food nutritional database: name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source |

### 5.3 Key RPC Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `get_user_full_activity_summary(uuid)` | 30-day activity stats | avg_steps, avg_sleep_hours, avg_water_ml, max_steps, active_days |
| `get_user_nutrition_summary(uuid)` | 30-day nutrition stats + recent meals | Macro totals, meal breakdown |
| `get_user_workout_summary(uuid)` | Recent workout sessions | Session list with details |
| `get_user_body_metrics_history(uuid)` | Weight/body composition history | Time series of weight_kg, body_fat_pct |
| `get_user_ai_history(uuid)` | Recent AI coaching interactions | Session list |
| `log_water_ml(uuid, int, date)` | Atomic water increment | New daily total |
| `log_sleep_data(uuid, numeric, int, date)` | Upsert sleep entry | - |
| `increment_steps(uuid, int, date)` | Atomic step increment | - |
| `award_xp(uuid, int, text, text)` | Award XP + level check | - |
| `check_achievements(uuid)` | Evaluate milestone progress | New achievements |
| `get_user_level_info(uuid)` | Current level/XP state | level, xp_current, xp_total |
| `get_all_achievements(uuid)` | Earned achievements list | Achievement records |
| `add_user_memory(uuid, text, text)` | Store cross-session fact | - |
| `get_user_memory(uuid, int)` | Retrieve memory facts | Fact list |
| `delete_user_memory(uuid, uuid)` | Remove a memory | - |
| `get_pending_yara_events(uuid, int)` | Unconsumed proactive events | Event list |
| `consume_yara_events(uuid, uuid[])` | Mark events as surfaced | - |
| `get_insights_data(uuid, text)` | Stats for insight generation | Period-based metrics |
| `record_user_visit(uuid)` | Track login streak | - |

### 5.4 Database Triggers

| Trigger | Fires On | Detects |
|---------|----------|---------|
| `yara_detect_workout_events()` | `workout_sessions` INSERT/UPDATE | First workout of week, streak milestones (3/7/14/30 days) |
| `yara_detect_activity_events()` | `daily_activity` INSERT/UPDATE | Water target hit (2000ml), sleep low streak (2 nights <6h) |
| `yara_detect_body_metrics_events()` | `body_metrics` INSERT | Significant weight changes |

---

## 6. API Endpoints

### 6.1 Next.js API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/team` | Authenticated (admin) | List admin/super_admin users |
| POST | `/api/generate-plan` | Authenticated | Generate AI training plan via Groq |

### 6.2 Supabase Edge Functions

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/functions/v1/ai-assistant` | JWT Bearer | Yara AI coaching conversation (text + voice) |
| POST | `/functions/v1/onboarding-plan` | None (pre-auth) | Generate onboarding training plan |
| POST | `/functions/v1/yara-insights` | JWT Bearer | Generate 4 periodic insight cards |
| POST | `/functions/v1/generate-user-insights` | Admin key | Batch generate insights for all users |

### 6.3 External API Integrations

| API | Used In | Purpose |
|-----|---------|---------|
| Groq `/openai/v1/chat/completions` | ai-assistant, onboarding-plan, yara-insights, generate-user-insights, groqAPI.ts | LLM text generation |
| Groq `/openai/v1/audio/transcriptions` | ai-assistant (voice mode) | Whisper speech-to-text |
| Google Gemini | foodScannerApi.js | Food image recognition |
| GitHub free-exercise-db | exerciseService.ts | Exercise database with images |

---

## 7. Security Architecture

| Mechanism | Implementation |
|-----------|---------------|
| **Authentication** | Supabase Auth with email/password, JWT tokens (1h expiry), refresh token rotation |
| **Authorization** | Role-based (user/admin/super_admin) enforced by Next.js middleware and RLS |
| **Row-Level Security** | All 16+ user-owned tables protected: `auth.uid() = user_id` |
| **API Key Isolation** | Groq key in Edge Function secrets only; anon key on client; service_role never in bundles |
| **CORS** | Configured on all Edge Functions via shared `cors.ts` |
| **Input Validation** | JSON parsing, memory fact length check (≤240 chars), category enum validation |
| **Error Containment** | Trigger functions use exception handlers to prevent cascade failures |
| **Rate Limiting** | Auth: 2 emails/hr, 30 SMS/hr, 30 token refreshes/5min |
| **Privileged Operations** | `SECURITY DEFINER` functions for XP, achievements, memory (bypass RLS safely) |

---

## 8. State Management Architecture (Mobile)

| Store | Type | Scope | Persisted | Key Data |
|-------|------|-------|-----------|----------|
| **AuthContext** | React Context | Global | Supabase session (AsyncStorage) | user, isNewUser, profileAvatarUri, shouldShowTour |
| **TodayContext** | React Context | Global | DB (Supabase) | goals, foodLogs, waterMl, sleepHours, caloriesBurned, muscleFatigue, steps |
| **MilestoneContext** | React Context | Global | DB (Supabase) | currentStreak, unlocks, pendingCelebration |
| **scheduleStore** | Pub/Sub Store | Global | AsyncStorage | Exercise schedule, daily completion state |
| **eventBus** | Pub/Sub | Cross-screen | No | Transient events (MEAL_LOGGED, WORKOUT_COMPLETED, etc.) |
| **AsyncStorage keys** | Key-Value | Per-device | Yes | @yara_conversations, @yara_schedule, @yara_completion, notification prefs, tour state |

---

## 9. Migration History

| # | Migration | Date | Purpose |
|---|-----------|------|---------|
| 1 | `insights_rpc.sql` | 2026-03-28 | Initial insights data RPC |
| 2 | `insights_rpc_v2.sql` | 2026-04-02 | Insights RPC v2 improvements |
| 3 | `yara_backend.sql` | 2026-04-05 | Core Yara backend: ai_insights columns, user_insights table, 5 summary RPCs |
| 4 | `nutrition_rls.sql` | 2026-04-05 | RLS policies for nutrition data |
| 5 | `add_level_system.sql` | 2026-04-08 | XP/level/achievements system with award_xp, check_achievements, get_xp_for_level |
| 6-9 | `fix_achievements*.sql` | 2026-04-08 | Achievement fixes, first workout milestone, expanded catalog, deduplication |
| 10 | `add_increment_steps_rpc.sql` | 2026-04-10 | Atomic step increment function |
| 11 | `yara_user_memory.sql` | 2026-04-10 | User memory table + CRUD RPCs |
| 12 | `yara_proactive_events.sql` | 2026-04-11 | Events table, 3 detector triggers, consumption system |
| 13 | `login_streak_tracking.sql` | 2026-04-11 | Login streak via record_user_visit() |
| 14 | `create_reports_table.sql` | 2026-04-17 | In-app bug/feature reports |
| 15 | `log_water_sleep_rpcs.sql` | 2026-04-17 | Atomic water/sleep logging RPCs |
| 16 | `reports_admin_read_policy.sql` | 2026-04-17 | Admin-only report reading |
| 17 | `cleaner_achievements.sql` | 2026-04-19 | Achievement system cleanup |

---

## 10. Design System

### Mobile (React Native)

| Token | Value | Usage |
|-------|-------|-------|
| Brand Purple | `#7C5CFC` | Primary actions, highlights |
| Brand Lime | `#C8F135` | Accent, success states |
| Root Background | `#0F0B1E` | Screen backgrounds |
| Card Background | `#161230` | Card surfaces |
| Sheet Background | `#18152A` | Bottom sheets |
| Text Primary | `#FFFFFF` | Main text |
| Text Muted | `#6B5F8A` | Secondary text |
| Font Primary | Outfit (400/500/600/700) | Headings, body |
| Font Secondary | Inter (400/600) | Labels, captions |
| Hero Size | 42px | Large numbers |
| Body Size | 15px | Default text |

### Web (Next.js)

| Token | Value | Usage |
|-------|-------|-------|
| Colors | CSS custom properties | All colors via `var(--color-*)` |
| Font Primary | Syne | Headings |
| Font Secondary | Inter | Body text |
| Framework | Tailwind CSS | Utility classes |
| Effects | Glassmorphism, gradients | Card/section styling |

---

## 11. Areas of Strength

### 11.1 Architecture & Engineering

| Strength | Details |
|----------|---------|
| **Serverless-First Design** | No custom server to maintain. Supabase handles auth, DB, edge compute, and realtime. Reduces operational overhead to near-zero. |
| **Database-Level Business Logic** | Critical logic (streak detection, achievement checks, event creation) lives in PostgreSQL triggers and `SECURITY DEFINER` functions, ensuring consistency regardless of which client invokes it. |
| **Atomic RPC Operations** | Water, sleep, steps, and XP use atomic upsert RPCs rather than client-side read-modify-write, preventing race conditions and data inconsistency. |
| **Row-Level Security** | All 16+ user-owned tables enforce `auth.uid() = user_id`, providing defense-in-depth even if application code has authorization bugs. |
| **Event-Driven Proactive AI** | Three DB triggers automatically detect meaningful user events (streaks, targets, milestones) and queue them for Yara to surface contextually — no polling or cron jobs needed. |
| **Cross-Session AI Memory** | Yara remembers injuries, preferences, dislikes, and goals across conversations, creating a personalized coaching experience that improves over time. |
| **Batched Step Syncing** | Pedometer data synced every 30 seconds rather than per-step, dramatically reducing DB writes while maintaining near-real-time accuracy. |
| **Multi-Surface Consistency** | Same Supabase backend serves mobile app, web app, and admin dashboard. Schema and RPCs are the single source of truth. |
| **Comprehensive Feature Set** | End-to-end coverage: onboarding → training plans → workout tracking → nutrition logging → food scanning → AI coaching → insights → gamification → reporting. |
| **Graceful Degradation** | Food scanner falls back to local DB if Gemini API fails. Exercise service falls back to local JSON if GitHub is unreachable. AI assistant has fallback paths for JWT errors. |

### 11.2 Product & UX

| Strength | Details |
|----------|---------|
| **AI Integration Depth** | Three distinct AI systems (Groq for coaching, Gemini for food vision, Whisper for voice) working together rather than a single chatbot. |
| **Gamification System** | Full XP/level/achievement/streak system with celebration overlays, providing intrinsic motivation beyond task completion. |
| **Admin Dashboard** | Complete admin panel with KPIs, user management, content management, support workflow, analytics — not just a user-facing app. |
| **Consistent Design System** | Defined color palette, typography scale, and component library across both mobile and web platforms. |
| **Progressive Onboarding** | Multi-step wizard captures enough data for AI personalization, followed by app tour for feature discovery. |

---

## 12. Areas of Improvement

### 12.1 Critical

| Area | Issue | Recommendation |
|------|-------|----------------|
| **No Test Suite** | No unit, integration, or E2E tests found anywhere in the project. Only one test file exists (`ai-assistant/index_test.ts`) and it appears minimal. | Add Jest for mobile (with React Native Testing Library), Vitest for Next.js, and `pg_tap` or Deno test for Edge Functions. Prioritize testing: RPC functions, auth flows, AI response parsing. |
| **API Keys in Client Code** | Google Gemini API key is called directly from the mobile client (`foodScannerApi.js`), exposing it in the app bundle. | Proxy Gemini calls through a Supabase Edge Function so the key stays server-side. |
| **No CI/CD Pipeline** | No GitHub Actions, Vercel config, or any automated build/deploy/test pipeline. | Add CI with lint + type-check + test on PRs. Add CD for Supabase migrations and Edge Function deployment. |
| **Hardcoded Supabase URL** | Supabase project URL appears in multiple places including committed `.env.local` files. | Ensure `.env.local` is gitignored. Verify no service_role keys are committed. Use environment-specific configs for staging/production. |

### 12.2 High Priority

| Area | Issue | Recommendation |
|------|-------|----------------|
| **Mixed TypeScript/JavaScript** | Mobile frontend is JavaScript while web frontend is TypeScript. Services use `.ts` extension but many lack type annotations. | Migrate mobile to TypeScript incrementally. Add strict type definitions for API response shapes, RPC parameters, and database rows. |
| **No Error Monitoring** | No Sentry, LogRocket, or similar error tracking. AI session errors logged to DB but not alerted on. | Integrate Sentry for both mobile and web. Add alerting on AI session error rates. |
| **No Offline Mode** | App requires network connectivity for most features. Only exercise list and food database have local fallbacks. | Add offline queue for food logs, water, sleep, and workout sessions. Sync when connectivity resumes. |
| **No Data Validation Library** | Input validation is ad-hoc (length checks, manual type guards). No schema validation for API payloads. | Adopt Zod for runtime schema validation on all API boundaries (Edge Function inputs, RPC parameters, form submissions). |
| **Community Features Underdeveloped** | `CommunityCenter`, `MessagesInbox`, and `DMThread` screens exist but their backend support appears thin. | Either fully implement with Supabase Realtime for live messaging, or remove to reduce attack surface and maintenance burden. |
| **No Rate Limiting on Edge Functions** | Edge Functions have no request-level rate limiting beyond Supabase's default. A malicious user could exhaust Groq API quota. | Add per-user rate limiting (e.g., 20 AI requests/hour) either via Supabase middleware or a rate-limit table. |

### 12.3 Medium Priority

| Area | Issue | Recommendation |
|------|-------|----------------|
| **No Database Indexes Documentation** | Migrations create tables and RPCs but index strategy is unclear. Queries on `user_id + date` are frequent. | Audit and document composite indexes. Ensure `(user_id, date)` indexes exist on `daily_activity`, `food_logs`, `workout_sessions`. |
| **No API Versioning** | Edge Functions and RPCs have no version path. Breaking changes would affect all clients. | Add `/v1/` prefix to Edge Functions (already present) and maintain backward compatibility. Version RPC functions for breaking changes. |
| **Duplicate AI Service Files** | Both `groqAPI.ts` (direct Groq call from mobile) and `aiAssistantService.js` (via Edge Function) exist. Some AI logic duplicated. | Consolidate all AI calls through Edge Functions. Remove direct Groq calls from the mobile client to centralize prompt management and API key security. |
| **No Accessibility (a11y) Testing** | No `accessibilityLabel`, `accessibilityRole`, or screen reader testing evident. | Add accessibility labels to all interactive elements. Test with VoiceOver (iOS) and TalkBack (Android). |
| **WearApp Directory Empty** | `/WearApp/` exists but is empty — placeholder for future Wear OS integration. | Either implement or remove to avoid confusion. |
| **No Pagination on List Queries** | Queries like `get_user_memory`, `fetchWorkoutHistory` may return unbounded results as users accumulate data. | Add cursor-based or offset pagination to all list RPCs and service calls. |
| **Magic Numbers in Business Logic** | Water target (2000ml), sleep threshold (6h), memory limit (240 chars), step batch interval (30s) are hardcoded. | Extract to a constants/config file or DB-driven settings table for easier tuning. |
| **No Structured Logging** | `console.log` used throughout. No log levels, correlation IDs, or structured format. | Adopt a logger utility with levels (debug/info/warn/error) and request correlation IDs for Edge Functions. |

### 12.4 Low Priority / Polish

| Area | Issue | Recommendation |
|------|-------|----------------|
| **No Dark/Light Theme Toggle** | App is dark-theme only. | Low priority since fitness apps typically use dark themes, but consider a light mode option for accessibility. |
| **Bundle Identifier Placeholder** | `com.yourname.bodyq` in app.json suggests it hasn't been updated for production. | Update to production bundle ID before app store submission. |
| **No Deep Linking** | No URL scheme or universal links configured. | Add deep linking for notification tap handlers and web-to-app transitions. |
| **Font Loading Strategy** | Fonts loaded at app startup; no fallback font declared for the loading period. | Add system font fallback during async font loading to prevent invisible text flash. |
| **tmp/ Directory in Repo** | Debug scripts (`fix-console.js`, `check_sizes.js`) committed to repo. | Remove or gitignore the `tmp/` directory. |

---

## 13. File Structure Summary

```
BodyQ/
├── frontend/                          # Next.js Web Application
│   ├── app/                           # App Router pages
│   │   ├── api/                       # API routes (generate-plan, admin/team)
│   │   ├── app/                       # Authenticated user pages
│   │   ├── dashboard/                 # Admin panel (15+ sub-pages)
│   │   ├── login/                     # Login page
│   │   ├── signup/                    # Signup page
│   │   ├── onboarding/               # Onboarding wizard
│   │   └── page.tsx                   # Marketing homepage
│   ├── components/                    # React components
│   │   ├── app/shared/                # App-wide (StatRing, MacroBar, etc.)
│   │   ├── auth/                      # Auth forms
│   │   ├── dashboard/                 # Admin components (20+)
│   │   ├── sections/                  # Marketing sections (11)
│   │   └── ui/                        # Primitives (Button, GlassCard, etc.)
│   ├── context/                       # AuthContext
│   ├── hooks/                         # useAppData, useStreaks
│   ├── lib/supabase/                  # Supabase clients + query modules (8)
│   └── middleware.ts                  # Auth + role middleware
│
├── mobile-frontend/                   # Expo React Native App
│   ├── screens/                       # 20+ screens
│   │   ├── auth/                      # SignIn, SignUp
│   │   ├── nutrition/                 # MealLogger, FoodDetail, CustomMealBuilder
│   │   ├── workout/                   # WorkoutActive, WorkoutSummary, FlappyBirdGame
│   │   ├── sleep/                     # SleepLog
│   │   ├── community/                 # CommunityCenter, MessagesInbox, DMThread
│   │   ├── settings/                  # HelpCenter, ReportProblem, TermsPolicies, TrustCenter
│   │   ├── Home.js                    # Main dashboard
│   │   ├── Nutrition.js               # Nutrition hub
│   │   ├── Training.js                # Training hub
│   │   ├── Insights.js                # Insights/analytics
│   │   └── Profile.js                 # User profile
│   ├── components/                    # 25+ components
│   │   ├── home/                      # CalorieRingHero, WaterTracker, TodayScheduleWidget
│   │   ├── shared/                    # RingProgress, MacroBar, StatCard, Shimmer
│   │   ├── food-scanner/              # BarcodeScanner, PhotoAnalyser, FoodResultSheet
│   │   ├── reports/                   # ReportCard, ReportViewer, MilestonePath
│   │   ├── onBoarding/                # AppTour, FieldInput, SelectCard, PillButton
│   │   ├── register/                  # Input, Button
│   │   ├── YaraAssistant.js           # AI coach chat
│   │   └── YaraToggle.js              # AI toggle
│   ├── context/                       # AuthContext, TodayContext, MilestoneContext
│   ├── services/                      # 12+ service modules
│   ├── constants/                     # colors.js, typography.js
│   ├── lib/                           # eventBus.js, supabase client
│   ├── store/                         # scheduleStore.js
│   └── assets/                        # Images, fonts
│
├── supabase/                          # Supabase Configuration
│   ├── config.toml                    # Local dev config (ports, auth, storage)
│   ├── migrations/                    # 17 SQL migrations
│   └── functions/                     # 4 Edge Functions + shared CORS
│       ├── ai-assistant/              # Main Yara AI (index.ts + memory.ts)
│       ├── onboarding-plan/           # Training plan generator
│       ├── yara-insights/             # Insight card generator
│       ├── generate-user-insights/    # Batch insight generator
│       └── _shared/cors.ts            # Shared CORS headers
│
├── WearApp/                           # (Empty - future Wear OS)
├── tmp/                               # Debug scripts
└── README.md                          # Project overview
```

---

## 14. Environment Variables Reference

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend/.env.local | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend/.env.local | Public Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard (secret) | Admin database access |
| `GROQ_API_KEY` | Supabase Function Secrets | Groq LLM API key |
| `ADMIN_SECRET` | Supabase Function Secrets | Batch operation authorization |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile-frontend/.env | Mobile Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile-frontend/.env | Mobile Supabase anon key |
| `GEMINI_API_KEY` | mobile-frontend (client-side) | Google Gemini food scanner |

---

*End of Technical Reference*
