# BodyQ - Academic Technical Presentation

**Duration:** 20-25 minutes + Q&A  
**Format:** Slide-based technical presentation with system demonstration  
**Audience:** Academic panel / faculty evaluators  
**Scope:** Technical design, implementation methodology, and engineering decisions

---

## SLIDE 1 — Title & Team Introduction (30 sec)

**Title:** BodyQ: Design and Implementation of an AI-Augmented Health and Fitness Platform with Cross-Session Contextual Coaching

**Subtitle:** A Full-Stack Information Systems Capstone Project

**Visuals:** Clean academic slide, university branding, project logo, team member names and roles

### Speech Sample

> "Good morning. We are presenting BodyQ, a full-stack health and fitness platform that integrates large language model capabilities with event-driven database architecture to deliver personalized, context-aware coaching. Our project explores how modern serverless infrastructure, combined with advances in generative AI, can be applied to the domain of personal health management. Over the next twenty minutes, we will walk you through the problem formulation, our system architecture, key implementation decisions and the trade-offs behind them, a live demonstration, and our reflections on what we learned."

---

## SLIDE 2 — Problem Formulation & Motivation (1.5 min)

**Content:**
- **Domain context:** The global fitness app market is projected to reach $30B+ by 2030, yet user retention remains a persistent challenge — studies report 75%+ abandonment within 30 days
- **Core research question:** How can we design a health tracking system that maintains contextual awareness across user sessions and delivers proactive, personalized coaching without requiring a dedicated backend server?
- **Identified gaps in existing solutions:**
  1. **Fragmented data silos** — users manage separate applications for workouts, nutrition, sleep, and step counting, with no unified data model
  2. **Stateless interaction models** — most fitness apps treat each session independently; the system has no persistent understanding of the user's history, constraints, or preferences
  3. **Reactive-only engagement** — conventional apps log data passively but lack mechanisms to detect meaningful patterns and initiate coaching proactively
  4. **Generic recommendations** — plans and advice are either fully static or require manual professional input to personalize

**Visuals:** Diagram illustrating the fragmented app landscape vs. the unified approach

### Speech Sample

> "To motivate our project, we began by examining a fundamental tension in the fitness technology space. Despite the proliferation of health and fitness applications, user retention rates remain remarkably low. Research consistently shows that over seventy-five percent of users abandon fitness apps within the first month.
>
> We identified four structural gaps in existing solutions that contribute to this problem. First, users are forced to manage fragmented data across multiple applications — one for workouts, another for nutrition, a third for sleep tracking — with no unified view of their health. Second, most systems are stateless: they treat each user session independently, with no persistent memory of past interactions, preferences, or constraints. Third, these applications are fundamentally reactive — they log data when the user provides it, but they do not detect meaningful patterns or initiate engagement on their own. And fourth, the recommendations they offer are either entirely generic or require costly human professional involvement.
>
> This led us to our central design question: can we build a system that maintains contextual awareness across sessions, operates on a unified data model, and delivers proactive coaching — all within the constraints of a serverless architecture and without requiring a dedicated backend server?"

---

## SLIDE 3 — Project Objectives & Scope (1 min)

**Content:**
- **Primary objectives:**
  1. Design and implement a unified health data model encompassing workouts, nutrition, sleep, hydration, body metrics, and posture assessment
  2. Integrate large language model (LLM) capabilities with persistent user memory to enable context-aware conversational coaching
  3. Implement an event-driven architecture using database triggers for proactive pattern detection without polling or cron-based scheduling
  4. Deliver a cross-platform solution: mobile client (iOS/Android), administrative web dashboard, and public-facing marketing site — sharing a single backend
- **Explicit non-goals:** This is not a clinical or medical application; no diagnostic claims are made. The AI coach provides informational guidance only

**Visuals:** Objectives mapped to system components

### Speech Sample

> "We defined four primary objectives for this project. First, to design a unified health data model that consolidates workouts, nutrition, sleep, hydration, body metrics, and posture assessment into a single, coherent schema. Second, to integrate large language model capabilities with a persistent memory system, enabling the AI coach to maintain contextual awareness across sessions — meaning it remembers what you told it yesterday and uses that to inform today's advice. Third, to implement an event-driven architecture using database-level triggers that detect meaningful user patterns — such as streak milestones or goal achievements — automatically, without requiring any polling or scheduled jobs. And fourth, to deliver all of this as a cross-platform system: a React Native mobile app, an administrative web dashboard, and a marketing landing page, all sharing a single Supabase backend.
>
> It is important to note what this project is not. BodyQ is not a clinical or medical application. We make no diagnostic claims. The AI coach provides informational guidance, not medical advice."

---

## SLIDE 4 — System Architecture & Design Rationale (2 min)

**Content:**
- **Architectural pattern:** Three-tier serverless architecture with Backend-as-a-Service (BaaS)
- **Tier breakdown:**
  - **Presentation tier:** React Native (Expo 54) for mobile; Next.js 14 (App Router) for web
  - **Logic tier:** Supabase Edge Functions (Deno 2 runtime) for AI orchestration; PostgreSQL stored procedures (RPC functions) for business logic
  - **Data tier:** PostgreSQL 17 with Row-Level Security, managed by Supabase
- **External service integrations:**
  - Groq API (Llama 3.3-70b) — primary LLM for coaching and plan generation
  - Google Gemini — multimodal vision model for food image recognition
  - Whisper STT — speech-to-text for voice interaction
- **Key architectural decision: Why Supabase over a traditional Express/Node backend?**
  - Eliminates server provisioning and maintenance overhead
  - Built-in authentication with JWT lifecycle management
  - Row-Level Security enforced at the database engine level, not application middleware
  - Realtime subscriptions via WebSocket without custom implementation
  - Edge Functions provide serverless compute for AI API orchestration while keeping API keys server-side
- **Key architectural decision: Why business logic in PostgreSQL?**
  - RPC functions (e.g., `log_water_ml`, `increment_steps`, `award_xp`) guarantee atomicity regardless of which client calls them
  - Database triggers enable event-driven behavior without additional infrastructure
  - Eliminates read-modify-write race conditions inherent in client-side logic

**Visuals:** Three-tier architecture diagram with labeled data flows

### Speech Sample

> "Our system follows a three-tier serverless architecture built on the Backend-as-a-Service model. Let me walk through each tier and explain the design rationale behind our choices.
>
> The presentation tier consists of two clients. The mobile application is built with React Native using Expo SDK 54, targeting both iOS and Android from a single codebase. The web application — which serves both as an administrative dashboard and a marketing site — is built with Next.js 14 using the App Router.
>
> For the logic and data tiers, we made a deliberate decision to use Supabase rather than building a traditional Express or Node.js backend. This decision warrants explanation because it fundamentally shapes our architecture. Supabase gives us PostgreSQL 17 as our database with Row-Level Security enforced at the engine level — not in application middleware where it can be bypassed. It provides built-in authentication with JWT lifecycle management, realtime WebSocket subscriptions, and Edge Functions running on Deno 2 for serverless compute. This eliminates an entire category of infrastructure we would otherwise need to provision and maintain.
>
> A second decision that is equally important: we placed our core business logic inside PostgreSQL itself, as stored procedures — what Supabase exposes as RPC functions. Operations like logging water intake, incrementing steps, or awarding experience points are atomic database transactions. This means that regardless of whether the mobile app or the web dashboard initiates the operation, the behavior and guarantees are identical. It also eliminates read-modify-write race conditions that would be inherent if this logic lived on the client side.
>
> For AI capabilities, we integrate three external services. Groq's API provides access to the Llama 3.3-70b model, which serves as the primary language model for our AI coach. Google Gemini handles multimodal food image recognition. And Whisper provides speech-to-text for voice-based interaction. All API keys are stored as Edge Function secrets and never exposed to client bundles."

---

## SLIDE 5 — Technology Stack (1 min)

**Content:**

| Layer | Technologies | Rationale |
|-------|-------------|-----------|
| Mobile | Expo 54, React Native 0.81, React 19, React Navigation 7 | Cross-platform from single codebase; Expo managed workflow simplifies native module access |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts | Server-side rendering for SEO (marketing), client-side interactivity for dashboard |
| Backend | Supabase, PostgreSQL 17, Deno 2 Edge Functions | Serverless BaaS; SQL-level security; zero-config realtime |
| AI/ML | Groq (Llama 3.3-70b, Llama 3.1-8b), Google Gemini, Whisper STT | Inference-optimized hosting (Groq); multimodal vision (Gemini); on-device STT |
| Device APIs | expo-camera, expo-sensors (pedometer), expo-av, expo-haptics | Hardware access for posture analysis, step counting, voice input, tactile feedback |
| State Management | React Context, custom event bus, AsyncStorage | Lightweight state layer without Redux overhead; pub/sub for cross-screen sync |

**Visuals:** Layered technology stack diagram

### Speech Sample

> "This slide summarizes our technology stack across six layers. Rather than reading through each entry, I want to highlight the reasoning behind a few key choices.
>
> On the mobile side, we chose Expo's managed workflow because it provides a unified abstraction over native device APIs — camera, pedometer, audio recording, haptic feedback — without requiring us to eject and manage native build configurations. This allowed us to iterate rapidly while still accessing hardware capabilities essential to our feature set.
>
> For the web tier, Next.js 14 with the App Router gave us flexibility: server-side rendering for the marketing pages where SEO matters, and client-side interactivity for the admin dashboard where responsiveness matters. TypeScript is used exclusively on the web side; the mobile codebase is currently JavaScript, which we discuss later as an area for improvement.
>
> For state management on mobile, we deliberately avoided heavier solutions like Redux in favor of React Context combined with a custom event bus. The event bus implements a publish-subscribe pattern that decouples screens from direct dependencies — when a water log is recorded, the event bus notifies the home dashboard, the nutrition screen, and the AI coach context without any of those screens needing to know about each other."

---

## SLIDE 6 — Database Design & Data Model (1.5 min)

**Content:**
- **Schema overview:** 18+ tables, all foreign-keyed to `auth.users` with CASCADE delete
- **Key entities and relationships:**
  - `profiles` — extended user data (goals, metrics, preferences) linked 1:1 to auth
  - `training_plans` / `plan_days` / `plan_exercises` — hierarchical plan structure generated by AI
  - `workout_sessions` / `session_exercises` — actual logged workout data
  - `food_entries` / `custom_meals` — nutrition tracking with macro breakdown
  - `daily_water` / `daily_steps` / `sleep_entries` — daily metric aggregation
  - `user_memory` — persistent facts for AI context (category-based, capped at 240 chars per fact)
  - `ai_events` — proactive coaching events generated by database triggers
  - `user_achievements` / `user_xp` — gamification state
- **Design principles applied:**
  1. **Referential integrity** — all FK constraints with CASCADE, no orphan records
  2. **Atomic operations** — 20+ RPC functions encapsulate all write logic; no raw INSERT/UPDATE from clients
  3. **Row-Level Security** — every user-facing table enforces `auth.uid() = user_id` at the engine level
  4. **Schema evolution** — 17 migrations tracking incremental changes over 4 weeks of development
- **Simplified ER diagram** showing the core entity relationships

### Speech Sample

> "Our data model consists of eighteen tables organized around the central `auth.users` identity provided by Supabase. Every user-facing table includes a `user_id` foreign key with CASCADE delete, ensuring that when a user account is removed, all associated data is cleaned up automatically — no orphan records.
>
> I want to highlight three design principles that guided our schema decisions. First, we enforce referential integrity rigorously through foreign key constraints. The training plan structure, for example, is hierarchical: a `training_plans` table references `plan_days`, which in turn references `plan_exercises`. Deleting a plan cascades cleanly through the entire hierarchy.
>
> Second, all write operations are encapsulated in PostgreSQL RPC functions. The mobile and web clients never issue raw INSERT or UPDATE statements against user tables. Instead, they call named functions like `log_water_ml` or `increment_steps`. This guarantees atomicity — if a water log needs to both insert a record and update a daily aggregate, either both succeed or neither does. It also gives us a single place to enforce business rules, regardless of which client initiates the operation.
>
> Third, Row-Level Security is enabled on every user-facing table. Each policy enforces `auth.uid() = user_id`, meaning the database engine itself prevents any authenticated user from reading or modifying another user's data. This is not application-level middleware that could be bypassed — it is enforced at the query execution layer within PostgreSQL.
>
> Over the course of development, we tracked schema evolution through seventeen sequential migrations, allowing us to audit exactly how the data model changed over four weeks of iterative development."

---

## SLIDE 7 — AI Subsystem: Yara Conversational Coach (2 min)

**Content:**
- **System overview:** Yara is a conversational AI coach that combines LLM generation with structured user context retrieval
- **Context injection pipeline (per-request):**
  1. User sends a message (text or voice via Whisper STT)
  2. Edge Function retrieves structured context via Supabase RPCs:
     - User profile (goals, metrics, experience level, injuries, dietary preferences)
     - 30-day activity summary (workout frequency, nutrition averages, sleep patterns)
     - Cross-session memory facts (from `user_memory` table)
     - Recent AI events (streaks, achievements, milestones)
  3. Context is serialized into a structured system prompt
  4. System prompt + user message sent to Groq API (Llama 3.3-70b)
  5. Response parsed and returned; any detected action intents are executed (e.g., logging water)
- **Cross-session memory architecture:**
  - `user_memory` table stores discrete facts with category labels (dietary, medical, preference, schedule)
  - Facts are injected into every system prompt, giving the LLM persistent awareness
  - Memory extraction: when a user states a personal fact ("I'm allergic to peanuts"), the system prompt instructs the LLM to output a structured memory-save command alongside its response
  - Memory is capped at 240 characters per fact to keep prompt size bounded
- **Action execution:** The AI can perform write operations (log water, log food, start workout) by outputting structured action commands that the Edge Function interprets and executes via RPC
- **Proactive event detection (database triggers):**
  - Three PostgreSQL triggers monitor data changes in real-time
  - Examples: consecutive-day workout streak detected, daily calorie target met, body weight goal achieved
  - Triggers insert records into `ai_events` table, which are surfaced through the Yara interface

### Speech Sample

> "The AI subsystem — which we branded as 'Yara' — is architecturally more than a wrapper around a language model API. It is a context-aware pipeline that retrieves structured user data, injects it into the LLM prompt, and can execute actions on behalf of the user.
>
> Let me walk through the request lifecycle. When a user sends a message — whether typed or spoken via Whisper speech-to-text — the request arrives at a Supabase Edge Function. Before forwarding anything to the language model, the function performs a series of RPC calls to retrieve the user's current context. This includes their profile data — goals, physical metrics, experience level, known injuries, dietary preferences. It includes a thirty-day activity summary: how often they have worked out, their average nutritional intake, their sleep patterns. It includes their cross-session memory facts, which are persistent pieces of information the user has shared in previous conversations. And it includes recent AI events — streak milestones, achievement unlocks, or target completions detected by our database triggers.
>
> All of this context is serialized into a structured system prompt that accompanies the user's actual message when it is sent to the Groq API, which hosts the Llama 3.3 seventy-billion-parameter model. This means that when a user asks 'What should I eat today?', the model has access to their dietary preferences, their allergies, their calorie targets, and what they have already eaten — not because it remembered from a previous call, but because we explicitly retrieve and inject that context every time.
>
> The cross-session memory system deserves specific attention. The `user_memory` table stores discrete factual statements — 'allergic to peanuts', 'prefers morning workouts', 'recovering from knee surgery' — each tagged with a category label and capped at two hundred forty characters. These facts persist across sessions and are included in every system prompt. When a user states a personal fact during conversation, the system prompt instructs the LLM to output a structured memory-save command alongside its natural language response. The Edge Function parses this command and writes the fact to the database.
>
> Yara can also execute actions. If a user says 'log five hundred milliliters of water,' the LLM outputs a structured action command that the Edge Function interprets and executes via the appropriate RPC function — the same `log_water_ml` function that the mobile UI uses. This ensures consistency.
>
> Finally, the proactive dimension. Three PostgreSQL triggers monitor data changes in real-time. When a user completes their seventh consecutive day of workouts, the trigger fires, detects the streak, and inserts a coaching event into the `ai_events` table. This event is surfaced through the Yara interface without any polling or scheduled jobs — it is purely event-driven, executed at the database level."

---

## SLIDE 8 — Food Recognition & Nutrition Tracking (1 min)

**Content:**
- **Dual-mode food scanning:**
  1. **Barcode scanning** — expo-camera reads UPC/EAN codes, matched against a local food database
  2. **AI photo recognition** — image captured and sent to Google Gemini multimodal model, which returns estimated food items and macronutrient values
- **Nutrition data model:** Each `food_entry` records: food name, calories, protein, carbohydrates, fat, meal type (breakfast/lunch/dinner/snack), timestamp
- **Custom meal builder:** Users can create reusable meal templates with pre-defined macro values
- **Daily aggregation:** Total macros computed via RPC and displayed as progress bars against user-defined targets
- **Challenges encountered:**
  - AI photo recognition accuracy varies significantly with image quality, lighting, and food presentation
  - Portion estimation from images remains an open problem — we rely on user correction

### Speech Sample

> "Nutrition tracking presented an interesting technical challenge. We implemented a dual-mode food scanning system. The first mode uses the device camera to read barcodes — UPC and EAN formats — and matches them against a local food database. This provides reliable identification for packaged foods.
>
> The second mode addresses unpackaged foods — a plate of rice, a salad, a home-cooked meal. Here we capture an image through the camera and send it to Google's Gemini multimodal model, which analyzes the image and returns estimated food items with approximate macronutrient values. This is where we encountered the inherent limitations of current vision models for food recognition. Accuracy varies significantly with image quality, lighting conditions, and how the food is presented. Portion estimation from a single photograph remains an open research problem. Our approach is to use the AI estimate as a starting point and allow the user to correct values before saving. We considered this an acceptable trade-off for a non-clinical application.
>
> Each food entry is stored with its macronutrient breakdown and meal type. Daily totals are computed via an RPC function and displayed as progress bars against the user's targets."

---

## SLIDE 9 — Posture Analysis & Workout System (1.5 min)

**Content:**
- **Exercise database:** Sourced from an open-source GitHub exercise database; each exercise includes name, target muscles, equipment required, and instructional images
- **Workout session tracking:** Users log exercises with sets, reps, and weight; sessions are timestamped and stored in `workout_sessions` / `session_exercises`
- **Posture analysis pipeline:**
  1. Device camera captures user image during exercise
  2. Image processed for body landmark detection
  3. Joint angles computed and compared against reference form
  4. Feedback provided: posture score, specific corrections
- **Muscle fatigue model:** After each workout, targeted muscle groups receive fatigue percentage values that decay over time, informing recovery recommendations
- **Post-workout automation (event-driven):**
  - Achievement checks execute automatically
  - Muscle fatigue percentages update
  - Streak detection triggers fire
  - XP is awarded atomically

### Speech Sample

> "The workout subsystem integrates exercise tracking with computer vision-based posture analysis. Our exercise database is sourced from an open-source repository and includes metadata on target muscles, required equipment, and instructional imagery.
>
> During an active workout session, users log their exercises with sets, repetitions, and weight. The posture analysis feature uses the device camera to capture the user's form, processes the image for body landmark detection, computes joint angles, and compares them against reference values for the given exercise. The system then provides a posture score and specific correction feedback.
>
> An aspect of the workout system I want to emphasize is what happens automatically after a session completes. This is where our event-driven architecture becomes visible. When the workout record is written, database triggers fire to check for achievement conditions — for example, whether this is the user's tenth, fiftieth, or hundredth workout. Muscle fatigue percentages are updated for the targeted muscle groups. The streak detection trigger evaluates whether the user has maintained consecutive training days. And experience points are awarded through the `award_xp` RPC function, which also checks for level-up thresholds. All of this happens atomically within the database transaction — the client simply writes the workout record and subscribes to the results."

---

## SLIDE 10 — Event-Driven Architecture & Gamification (1.5 min)

**Content:**
- **Database trigger design:**
  - Triggers fire on INSERT to workout, nutrition, and body metric tables
  - Each trigger function is wrapped in an exception handler to prevent cascade failures
  - Triggers insert into `ai_events` with event type, metadata, and timestamp
  - Events are consumed by the mobile client and surfaced through the Yara interface and celebration overlays
- **Gamification model:**
  - **XP system:** Sources include workouts, meal logging, streak maintenance, achievement unlocks
  - **Level progression:** Quadratic formula: `threshold = 50 * level * (level - 1)`
  - **Achievement catalog:** Milestone-based (first workout, streak milestones, cumulative targets)
  - **Streak tracking:** Consecutive-day detection via trigger comparing current date to last logged date
- **Why gamification matters (academic framing):**
  - Self-Determination Theory: gamification elements address competence (XP/levels) and autonomy (choice of goals)
  - Operant conditioning: variable-ratio reinforcement through unpredictable milestone timing
  - Directly targets the retention problem identified in our problem formulation
- **Implementation detail:** `SECURITY DEFINER` functions are used for XP and achievement operations because they need to write to tables the user doesn't have direct INSERT access to — this is a controlled privilege escalation pattern

### Speech Sample

> "I want to spend a moment on our event-driven architecture because it represents one of the more technically interesting decisions in our system.
>
> Traditional fitness applications that want to detect user milestones — a workout streak, a calorie target being met, a body weight goal reached — typically rely on polling: a scheduled job runs periodically, queries the database, and checks conditions. This approach has latency, adds infrastructure complexity, and wastes resources when no events have occurred.
>
> Our approach eliminates polling entirely. We use PostgreSQL triggers that fire on data insertion. When a new workout session is recorded, a trigger function executes within the same transaction. It compares the workout date to the user's last logged workout date. If they are consecutive calendar days, the streak counter increments. If the streak reaches a milestone threshold — seven days, thirty days, and so on — an event record is inserted into the `ai_events` table. This event is then surfaced to the user through the Yara interface or a celebration overlay.
>
> Every trigger function is wrapped in an exception handler. This is a critical safety measure: if the streak detection logic encounters an error, it must not cause the workout INSERT itself to fail. The user's data integrity takes priority over the gamification layer.
>
> On the gamification model itself: we implemented an XP and leveling system with a quadratic progression formula — the threshold for each level is fifty times the level times level minus one. This creates an increasing difficulty curve that mirrors what motivational psychology literature describes as optimal challenge. We also implemented an achievement catalog with milestone-based unlocks.
>
> From an academic perspective, these gamification elements are grounded in Self-Determination Theory. The XP and leveling system addresses the need for competence — a sense of growing mastery. The choice of goals and training modalities addresses autonomy. And the streak system creates a social contract with oneself that addresses relatedness in a single-user context. These are not cosmetic features — they directly target the retention problem we identified in our problem formulation.
>
> One implementation detail worth noting: the `award_xp` and achievement-granting functions use PostgreSQL's `SECURITY DEFINER` execution context. This means they run with the privileges of the function owner, not the calling user. This is necessary because users should not have direct INSERT access to the XP or achievement tables — that would allow manipulation. Instead, the system awards these through controlled, auditable function calls. This is a standard pattern for controlled privilege escalation in PostgreSQL."

---

## SLIDE 11 — AI-Generated Insights & Reporting (1 min)

**Content:**
- **Insight generation pipeline:**
  1. User's 30-day statistics retrieved via aggregation RPCs
  2. Data formatted into a structured prompt
  3. Sent to Groq API with instructions to generate four insight categories:
     - Performance trends, Correlations (e.g., sleep vs. workout quality), Optimization suggestions, Recovery assessment
  4. Results parsed, categorized, and displayed as color-coded insight cards
  5. Cached to prevent redundant API calls on repeated views
- **Report generation:** Structured HTML reports compiling workout history, nutrition trends, body metric progression, and AI commentary
- **Batch processing:** Edge Function endpoint allows administrative batch generation of insights across all users
- **Correlation detection example:** If sleep quality has declined over two weeks and workout completion rate has dropped correspondingly, the insight engine identifies and reports this correlation

### Speech Sample

> "The insights subsystem demonstrates an applied use of LLM capabilities beyond conversational interaction. Rather than asking the user to query the AI, the system proactively generates analytical insights from their accumulated data.
>
> The pipeline works as follows: we retrieve the user's thirty-day activity statistics through aggregation RPC functions — workout frequency, average calorie intake, sleep duration trends, hydration consistency. This data is formatted into a structured prompt and sent to the Groq API with instructions to produce four categories of insight: performance trends, cross-domain correlations, optimization suggestions, and recovery assessment.
>
> The correlation detection is particularly valuable. If a user's sleep quality has declined over the past two weeks and their workout completion rate has dropped correspondingly, the model identifies this relationship and presents it explicitly. This transforms raw data points into actionable understanding.
>
> Generated insights are cached to prevent redundant API calls when the user revisits the screen. We also implemented an administrative batch endpoint that can generate insights for all users — this would be relevant in a production deployment scenario."

---

## SLIDE 12 — Administrative Web Dashboard (1.5 min)

**Content:**
- **Architecture:** Next.js 14 App Router with role-based middleware routing
- **Access control:** Three-tier role model — `user`, `admin`, `super_admin`; middleware checks role on every navigation; RLS also enforces access at the database level (defense in depth)
- **Dashboard features:**
  - KPI cards with sparkline visualizations and period-over-period deltas
  - User management with sortable/filterable data tables and detail drawers
  - Support ticket workflow (open -> in_progress -> resolved)
  - Content management for workout plans and nutritional content
  - Analytics charts: user growth (area), engagement distribution (bar), AI usage trends (line)
- **Design system:** Glassmorphism aesthetic, dark theme, component library built on Tailwind CSS with Framer Motion animations
- **Technical detail:** Middleware + RLS = layered defense — even if middleware is bypassed (e.g., direct API call), RLS prevents unauthorized data access

### Speech Sample

> "The administrative dashboard is a Next.js web application that provides operational oversight of the platform. I want to focus on the access control model because it illustrates a defense-in-depth principle.
>
> We implement a three-tier role model: regular users, administrators, and super administrators. Access control is enforced at two independent layers. First, Next.js middleware intercepts every navigation request and checks the authenticated user's role. If a regular user attempts to access the dashboard path, they are redirected. Second, even if the middleware were somehow bypassed — for example, through a direct API call — Row-Level Security at the database level independently prevents unauthorized data access. Both layers must pass. This is a defense-in-depth pattern: neither layer relies on the other being intact.
>
> The dashboard itself provides KPI cards showing key platform metrics — total users, daily active users, AI session counts — with sparkline charts and period-over-period change deltas. An analytics section visualizes user growth, engagement distribution, and AI usage trends using Recharts. User management includes sortable, filterable data tables with detail drawers for individual user inspection. And a support ticket system tracks reported issues through a three-stage workflow."

---

## SLIDE 13 — Security Architecture (1.5 min)

**Content:**

| Layer | Mechanism | Design Rationale |
|-------|-----------|-----------------|
| Authentication | Supabase Auth, JWT tokens, 1-hour expiry, refresh token rotation | Short-lived tokens limit exposure window; rotation prevents replay attacks |
| Authorization | Role-based (user/admin/super_admin), Next.js middleware guards | Separation of concerns: roles are data-driven, enforcement is declarative |
| Data Isolation | Row-Level Security on all 16+ user tables (`auth.uid() = user_id`) | Database-engine enforcement cannot be bypassed by application bugs |
| API Key Protection | Groq/Gemini keys stored as Edge Function secrets, never in client bundles | Client-side key exposure would allow direct, unmetered API access |
| Privilege Escalation | `SECURITY DEFINER` functions for XP/achievements/memory writes | Controlled: users invoke the function but cannot execute arbitrary writes |
| Input Validation | Memory facts capped at 240 chars, category enum constraints | Bounds prompt injection surface area; prevents unbounded prompt growth |
| Error Containment | Trigger functions catch exceptions; failures do not cascade | Gamification failures must not corrupt health data integrity |
| Rate Limiting | Auth: 2 emails/hr, 30 token refreshes/5min | Prevents brute-force and token-farming attacks |

### Speech Sample

> "Security in BodyQ is not a feature added at the end — it is an architectural property that emerges from our design decisions. Let me walk through the layers.
>
> Authentication is handled by Supabase Auth, which issues JWT tokens with a one-hour expiry and implements refresh token rotation. The short expiry window limits the damage if a token is compromised, and rotation ensures that a stolen refresh token can only be used once.
>
> For data isolation, Row-Level Security is enabled on every user-facing table. The policy is consistent: `auth.uid()` must equal the row's `user_id` for any SELECT, INSERT, UPDATE, or DELETE operation. This is enforced by the PostgreSQL query engine itself — it is not middleware that application code could accidentally bypass. Even if our application code contained a bug that constructed an incorrect query, the database would still prevent cross-user data access.
>
> API keys for our AI services — Groq and Google Gemini — are stored as Edge Function secrets. They exist only in the server-side runtime environment and are never included in client-side JavaScript bundles. If they were exposed client-side, anyone could make direct, unmetered API calls at our expense.
>
> The `SECURITY DEFINER` pattern we use for gamification operations represents a controlled privilege escalation. Users cannot directly INSERT into the XP or achievement tables — the RLS policies prevent it. But they can call the `award_xp` function, which runs with the function owner's elevated privileges. This creates an auditable, constrained pathway for privileged operations.
>
> For input validation, we cap memory facts at two hundred forty characters and enforce category constraints via enum types. This bounds the surface area for potential prompt injection and prevents unbounded growth of the system prompt.
>
> Finally, all database trigger functions include exception handling. If the gamification trigger encounters an error while checking for achievements, it catches the exception and allows the original data operation to complete. A failure in the gamification layer must never corrupt the user's health data."

---

## SLIDE 14 — Live System Demonstration (3-4 min)

**Demonstration sequence (screen recording or live device):**

**Part A: Onboarding and AI Plan Generation**
1. Register a new account — show Supabase Auth flow
2. Complete onboarding wizard: goal selection, physical metrics, experience level, injuries, dietary preferences
3. Observe AI-generated 7-day training plan — explain that every onboarding answer feeds into the LLM prompt

**Part B: Daily Tracking**
1. Home dashboard — calorie ring, water tracker, step counter, muscle fatigue heatmap
2. Log water (tap interaction) — explain the atomic RPC executing server-side
3. Food scanner — demonstrate barcode scan and/or AI photo recognition
4. Show macro breakdown aggregation

**Part C: AI Coach (Yara)**
1. Open Yara chat interface
2. Ask a contextual question: "What should I eat for dinner?" — observe the response referencing the user's actual dietary data
3. Ask Yara to execute an action: "Log 500ml of water" — observe the dashboard update
4. Demonstrate memory: tell Yara "I'm allergic to shellfish" — start a new session — ask about meal suggestions — observe the allergy is remembered

**Part D: Admin Dashboard**
1. Switch to web browser — log in as super_admin
2. Show KPI cards, user management table, analytics charts
3. Demonstrate role-based access control

### Speech Sample (to narrate during demo)

> "Let me now demonstrate the system in operation. I will walk through four scenarios that illustrate the technical concepts we have discussed.
>
> First, the onboarding flow. I am registering a new account — this goes through Supabase Auth, which creates a JWT and establishes the session. The onboarding wizard collects structured information: my fitness goal, physical measurements, experience level, any injuries, and dietary preferences. Each of these inputs becomes a parameter in the system prompt sent to the Groq API. When I submit, the Edge Function constructs the prompt with all my inputs and requests a seven-day training plan. You can see the generated plan is specific to the profile I created — a different set of inputs would produce a meaningfully different plan.
>
> Now let me show daily tracking. The home dashboard aggregates today's data from multiple tables into a single view. When I tap to log water, the client calls the `log_water_ml` RPC function — this is the atomic operation we discussed. It both creates the log entry and updates the daily aggregate in a single transaction.
>
> For food scanning, I will use the camera to photograph this food item. The image is sent to Google Gemini, which returns its best estimate of the food and its macronutrient content. You can see here the estimate — I can adjust the values before saving if they are not accurate.
>
> Now, the AI coach. I will ask Yara 'What should I eat for dinner?' Notice that the response references my actual calorie intake for today, my dietary preferences from onboarding, and my protein target — this is the context injection pipeline in action. Now I will ask Yara to 'log five hundred milliliters of water.' You can see the water tracker on the dashboard has updated — Yara executed the same `log_water_ml` RPC function that the UI button uses.
>
> For the memory demonstration: I am telling Yara 'I am allergic to shellfish.' The system extracts this as a memory fact and stores it. Now I close this conversation and open a new one. I ask 'What are some good protein sources for dinner?' Notice the response explicitly excludes shellfish and mentions my allergy — this fact was retrieved from the `user_memory` table and injected into the new session's system prompt.
>
> Finally, the admin dashboard. I am logging in with a super_admin account. The middleware detects the role and routes to the dashboard. You can see the KPI cards, user management table, and analytics visualizations. If I were to attempt this URL with a regular user account, the middleware would redirect me — and even if I bypassed the middleware, the RLS policies would return empty result sets."

---

## SLIDE 15 — Engineering Challenges & Solutions (1.5 min)

**Content:**

| Challenge | Analysis | Solution Approach |
|-----------|----------|-------------------|
| LLM output consistency | Language models produce non-deterministic output; JSON structure cannot be guaranteed | Structured system prompts with explicit format instructions; fallback parsing with regex extraction; graceful degradation on parse failure |
| Step counter battery impact | Per-step database writes would drain battery and overwhelm the network layer | Batched synchronization: pedometer readings accumulated locally, synced every 30 seconds via single RPC call |
| Cross-screen state synchronization | Multiple screens display overlapping data (e.g., water count on home and nutrition screens); direct coupling creates maintenance burden | Event bus pattern: screens subscribe to named events; data mutations publish events; no screen-to-screen dependencies |
| Proactive coaching without cron infrastructure | Serverless architecture precludes traditional scheduled jobs | Database triggers fire synchronously on data changes — zero polling, zero additional infrastructure |
| AI context window management | Injecting full user history would exceed token limits and increase latency/cost | Aggregated summaries (30-day stats) instead of raw data; memory facts capped at 240 chars; selective context retrieval |
| Food recognition accuracy | Vision model estimates vary with image quality and food presentation | Dual-mode approach (barcode + AI photo); user correction before save; treated as assistive, not authoritative |
| Concurrent data access | Multiple clients (mobile + web) could write simultaneously | All mutations through atomic RPC functions; no client-side read-modify-write patterns |

### Speech Sample

> "Every system of this complexity encounters engineering challenges that require deliberate design decisions. I want to discuss three that are particularly instructive.
>
> The first is LLM output consistency. Language models are fundamentally non-deterministic — even with the same prompt, the output format can vary between calls. When we ask the model to generate a training plan, we need structured data — exercise names, sets, repetitions — not just prose. Our solution is a multi-layer parsing strategy. The system prompt includes explicit format instructions with examples. If the model's output parses correctly as JSON, we use it directly. If not, we apply regex-based extraction to salvage structured data from partially formatted responses. And if that also fails, we degrade gracefully with an error message rather than presenting corrupted data to the user. This is an inherent limitation of current LLM technology that any production system must account for.
>
> The second is step counter battery management. The naive approach — writing each pedometer reading to the database as it occurs — would generate hundreds of network requests per hour and drain the device battery rapidly. Our solution is batched synchronization. Pedometer readings from the device sensor accumulate in local memory and are flushed to the database every thirty seconds via a single RPC call. This reduces network overhead by roughly two orders of magnitude while introducing at most a thirty-second data staleness window, which is acceptable for step-count data.
>
> The third is cross-screen state synchronization. Our mobile app has multiple screens that display overlapping data — the home dashboard shows today's water count, the nutrition screen shows it too, and the AI coach needs it for context. Directly coupling these screens — where one screen calls a method on another to trigger a refresh — creates a fragile dependency graph. Instead, we implemented a publish-subscribe event bus. When any screen logs water, it publishes a 'water_updated' event. Any screen that displays water data subscribes to that event and refreshes independently. The screens have no knowledge of each other. This is a standard decoupling pattern, but its value becomes very apparent when you have twenty-plus screens with overlapping data concerns."

---

## SLIDE 16 — Limitations & Areas for Improvement (1 min)

**Content:**

| Category | Current Limitation | Proposed Improvement |
|----------|-------------------|---------------------|
| Testing | No automated test suite; all testing has been manual | Unit tests (Jest/Vitest), integration tests against test database, end-to-end tests for critical paths |
| Type Safety | Mobile codebase is JavaScript; runtime type errors possible | Incremental TypeScript migration with strict compiler options |
| CI/CD | No automated pipeline; manual deployment | GitHub Actions: lint, type-check, test, build, deploy |
| Offline Support | App requires network connectivity for all operations | Local queue for data mutations; sync-on-reconnect with conflict resolution |
| Error Monitoring | No production error tracking | Sentry integration for crash reporting and performance monitoring |
| AI Robustness | Single LLM provider (Groq); no fallback on API failure | Multi-provider fallback chain; local model option for basic operations |
| Accessibility | Limited accessibility audit | WCAG compliance review; screen reader testing; semantic markup |

### Speech Sample

> "Intellectual honesty requires acknowledging what we did not accomplish and where the system falls short of production readiness.
>
> The most significant gap is the absence of an automated test suite. All testing during development was manual. For a system of this complexity — with database triggers, RPC functions, AI integrations, and cross-screen state management — this represents a real risk. A production-quality version would require unit tests for individual components, integration tests running against a test database to verify RPC behavior, and end-to-end tests for critical user paths.
>
> Second, the mobile codebase is written in JavaScript rather than TypeScript. The web dashboard uses TypeScript with strict compiler options, but the mobile application does not. This means an entire category of type-related bugs — passing the wrong data shape to a function, accessing a property that does not exist — can only be caught at runtime rather than compile time. An incremental TypeScript migration would substantially improve code reliability.
>
> Third, we have no CI/CD pipeline. Deployments are manual. In a professional context, this would be automated through GitHub Actions or a similar system to enforce linting, type checking, testing, and deployment as a validated pipeline.
>
> And fourth, offline support. The application currently requires network connectivity for all operations. A production fitness app must handle the reality that users exercise in locations with poor connectivity. This would require a local mutation queue with sync-on-reconnect logic and conflict resolution — a non-trivial addition to the architecture."

---

## SLIDE 17 — Project Metrics & Quantitative Summary (30 sec)

**Content:**

| Metric | Value |
|--------|-------|
| Mobile screens | 20+ |
| Reusable components | 70+ |
| Database tables | 18+ |
| RPC functions | 20+ |
| Edge Functions | 4 |
| Database migrations | 17 |
| AI models integrated | 3 (Llama 3.3-70b, Llama 3.1-8b, Gemini) |
| Technologies integrated | 30+ |
| Features delivered | 39 |
| Development period | ~4 weeks |
| Codebase | JavaScript (mobile), TypeScript (web), SQL (database), Deno (edge) |

### Speech Sample

> "To put the scope of this project in quantitative terms: the system comprises over twenty mobile screens, seventy reusable components, eighteen database tables, twenty-plus RPC functions, four Edge Functions, and seventeen database migrations. We integrated three AI models and over thirty distinct technologies across four programming languages. Thirty-nine features were delivered over approximately four weeks of development. These numbers reflect the breadth of the system, though as we discussed, depth in areas like testing and type safety remains an area for improvement."

---

## SLIDE 18 — Conclusions & Key Contributions (1 min)

**Content:**
- **Contribution 1: Context-aware AI coaching** — Demonstrated that persistent user memory combined with structured context injection enables meaningfully personalized LLM interactions, without fine-tuning or training custom models
- **Contribution 2: Event-driven proactive engagement** — Showed that PostgreSQL triggers can replace polling-based and cron-based architectures for real-time pattern detection in serverless environments
- **Contribution 3: Full-stack serverless delivery** — Validated that a complex, multi-client application (mobile + web + admin) can be built on a BaaS foundation (Supabase) without any custom server infrastructure
- **Contribution 4: Unified health data model** — Designed and implemented a schema that consolidates fragmented health domains into a single, integrity-enforced data model with security guarantees at the database level
- **Closing reflection:** The project demonstrates that modern serverless infrastructure and large language models, when combined with careful architectural design, can produce systems that were impractical for small teams to build even two years ago

### Speech Sample

> "To conclude, I want to articulate what we believe are the key contributions of this project.
>
> First, we demonstrated that context-aware AI coaching is achievable without fine-tuning or training custom models. By combining a persistent memory system with structured context injection into an off-the-shelf language model, we achieved personalized interactions that maintain awareness across sessions. The model does not learn — we bring the context to it on every call. This is an important architectural pattern because it avoids the cost, complexity, and data requirements of model training while still delivering meaningful personalization.
>
> Second, we showed that PostgreSQL database triggers can serve as a complete replacement for polling-based and cron-based architectures when it comes to real-time pattern detection. In a serverless environment where we have no persistent process to run scheduled jobs, triggers give us event-driven behavior with zero additional infrastructure.
>
> Third, we validated that a system of this complexity — a mobile application, an administrative web dashboard, a marketing site, and four AI integrations — can be delivered on a Backend-as-a-Service foundation without writing or maintaining a single line of custom server code. Every server-side operation is either a Supabase-managed service or an Edge Function.
>
> And fourth, we designed a unified data model that consolidates workouts, nutrition, sleep, hydration, body metrics, posture, and AI memory into a single schema with referential integrity and database-level security.
>
> As a closing reflection: this project would have been impractical for a small team to build even two years ago. The convergence of serverless infrastructure, managed database services, and accessible large language model APIs has dramatically lowered the barrier to building intelligent, full-stack applications. We believe this trend will continue, and projects like BodyQ illustrate both the capabilities and the limitations of building on this foundation today.
>
> Thank you. We welcome your questions."

---

## SLIDE 19 — Q&A

- Open the floor for questions
- Have the mobile app and web dashboard ready for live exploration
- Keep the architecture diagram accessible for reference during discussion

---

## Presentation Preparation Notes

### Time Budget

| Section | Slides | Time |
|---------|--------|------|
| Introduction, Problem, Objectives | 1-3 | 3 min |
| Architecture, Tech Stack, Database | 4-6 | 4.5 min |
| AI Subsystem, Food, Workout, Events | 7-10 | 6 min |
| Insights, Admin, Security | 11-13 | 4 min |
| Live Demonstration | 14 | 3-4 min |
| Challenges, Limitations, Metrics, Conclusion | 15-18 | 4 min |
| Q&A | 19 | Remaining |

### Demo Preparation Checklist

- [ ] Pre-create a demo user account with 7+ days of historical data (food logs, workouts, water, sleep)
- [ ] Ensure the user has an active streak, earned achievements, and pending Yara events
- [ ] Pre-seed `user_memory` with 3-4 facts (e.g., "allergic to peanuts", "prefers morning workouts", "knee injury")
- [ ] Test Groq API connectivity — have a fallback screen recording if API is unreachable
- [ ] Test Gemini food scanner — have a food item with barcode ready
- [ ] Log into the admin dashboard as super_admin before the presentation
- [ ] Prepare a backup screen recording of the full demo flow
- [ ] Test projector/screen mirroring setup with mobile device

### Anticipated Q&A Topics

| Topic | Preparation |
|-------|-------------|
| "How do you handle prompt injection?" | Memory facts are length-capped and category-constrained; system prompt is server-side only; user input is treated as untrusted within the prompt structure |
| "What happens when the AI API is down?" | Currently a graceful error message; discuss the fallback chain as future work |
| "Why not use a vector database for memory?" | Current fact-based approach is simpler and sufficient for our scale; vector embeddings would be appropriate for semantic search over larger memory stores |
| "How do you evaluate AI response quality?" | Manual evaluation during development; no automated evaluation framework — this is an acknowledged gap |
| "Why PostgreSQL triggers instead of application-level events?" | Triggers guarantee execution regardless of which client initiates the write; application-level events could be skipped if a client has a bug |
| "How would this scale?" | Supabase manages connection pooling and can scale PostgreSQL; Edge Functions are stateless and horizontally scalable; the current bottleneck would be AI API rate limits |
| "What about GDPR/data privacy?" | CASCADE delete ensures complete data removal; RLS prevents cross-user access; would need a data export endpoint and explicit consent flows for production compliance |

### Narrative Structure

```
Problem Formulation (why does this matter?)
  -> Objectives (what specifically are we addressing?)
    -> Architecture (how is the system designed?)
      -> Technical Depth (AI, database, security, events)
        -> Demonstration (see the system in operation)
          -> Reflection (challenges, limitations, what we learned)
            -> Contributions (what does this project demonstrate?)
```

The presentation follows an academic structure: motivate the problem, state objectives, describe methodology (architecture and implementation), present results (demonstration), and conclude with evaluation and contributions. The live demo is positioned after the technical explanation so the audience understands what they are seeing and can evaluate the implementation against the design claims.
