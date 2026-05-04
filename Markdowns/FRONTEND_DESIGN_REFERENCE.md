# BodyQ Web Frontend - Design & Visual Theme Reference

**Scope:** `frontend/` directory (Next.js 14 web application)  
**Surfaces:** Marketing landing page, Authentication pages, Admin dashboard  
**Date:** 2026-04-25

---

## 1. Design Philosophy

BodyQ's web frontend follows a **dark-mode premium fitness tech** aesthetic. The visual language pairs deep black/purple backgrounds with electric lime accents, glassmorphism card surfaces, and bold uppercase typography. Every interactive element has micro-animations. The dashboard uses a data-dense layout with semantic color coding, while the marketing site favors cinematic scroll-driven reveals.

---

## 2. Configuration Files

### 2.1 Tailwind Config (`tailwind.config.ts`)

- **Content paths:** `./app/**/*.{js,ts,jsx,tsx,mdx}`, `./components/**/*.{js,ts,jsx,tsx,mdx}`
- **Custom breakpoint:** `xs: 480px` (added to Tailwind defaults)
- **Theme extensions:** Minimal — colors, typography, and animations are all delegated to CSS custom properties in `globals.css`
- **Plugins:** None

### 2.2 PostCSS (`postcss.config.js`)

- Tailwind CSS plugin
- Autoprefixer plugin

### 2.3 Next.js Config (`next.config.js`)

- React Strict Mode enabled
- Image format: WebP
- Redirect: `/signin` → `/login`

---

## 3. Color System

All colors are defined as CSS custom properties in `globals.css` on `:root`. Components reference them via `var(--token)`.

### 3.1 Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bq-black` | `#000000` | Page background |
| `--bq-deep` | `#0F0B1E` | Section backgrounds, sidebar |
| `--bq-purple` | `#7C5CFC` | Primary brand, active states, links |
| `--bq-purple-dark` | `#4A28D4` | Gradient endpoints, pressed states |
| `--bq-purple-15` | `rgba(124,92,252,0.15)` | Active nav item background |
| `--bq-purple-08` | `rgba(124,92,252,0.08)` | Glass card tint, selected table rows |
| `--bq-purple-35` | `rgba(124,92,252,0.35)` | Glow radials |
| `--bq-purple-dim` | `rgba(124,92,252,0.15)` | Muted purple backgrounds |
| `--bq-lime` | `#C8F135` | Primary CTA, accents, success highlights |
| `--bq-lime-hover` | `#D4FF4A` | Button hover state |
| `--bq-lime-bright` | `#D4FF4A` | Alias for hover lime |
| `--bq-lime-12` | `rgba(200,241,53,0.12)` | Subtle lime backgrounds |
| `--bq-lime-dim` | `rgba(200,241,53,0.12)` | Alias for lime-12 |
| `--bq-white` | `#FFFFFF` | Primary text, high-emphasis elements |

### 3.2 Text Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--bq-text-1` | `#FFFFFF` | Primary text (headings, values) |
| `--bq-text-2` | `rgba(255,255,255,0.65)` | Secondary text (descriptions, nav items) |
| `--bq-text-3` | `rgba(255,255,255,0.35)` | Tertiary text (timestamps, labels, muted) |

### 3.3 Surface Hierarchy (Elevation Layers)

| Token | Value | Elevation | Usage |
|-------|-------|-----------|-------|
| `--bq-bg` | `#000000` | 0 (ground) | HTML body, page background |
| `--bq-surface-1` | `#0F0B1E` | 1 | Sidebar, TopBar, table headers |
| `--bq-surface-2` | `#16102A` | 2 | Cards, KPI tiles, chart containers |
| `--bq-surface-3` | `#1E1735` | 3 | Interactive hover states, inputs |
| `--bq-surface-4` | `#261D40` | 4 | Highest elevation, dropdown menus |
| `--bq-surface` | `#0F0B1E` | Alias | Same as surface-1 |

### 3.4 Borders & Dividers

| Token | Value | Usage |
|-------|-------|-------|
| `--bq-border` | `rgba(255,255,255,0.06)` | Default subtle borders |
| `--bq-border-hover` | `rgba(124,92,252,0.40)` | Hover state borders |
| `--bq-border-active` | `#7C5CFC` | Focus/active borders |
| `--bq-border-lime` | `#C8F135` | Accent borders (featured plans) |
| `--bq-divider` | `rgba(255,255,255,0.06)` | Horizontal rule dividers |

### 3.5 Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bq-success` | `#22C55E` | Active status, positive delta, checkmarks |
| `--bq-warning` | `#F59E0B` | Inactive status, in-progress, caution |
| `--bq-danger` | `#EF4444` | Banned status, errors, destructive actions |
| `--bq-info` | `#38BDF8` | Trialing status, informational badges |
| `--bq-muted` | `#6B6280` | Disabled text, footnotes |

### 3.6 Chart Palette

| Token | Value |
|-------|-------|
| `--chart-purple` | `#7C5CFC` |
| `--chart-lime` | `#C8F135` |
| `--chart-blue` | `#38BDF8` |
| `--chart-green` | `#22C55E` |
| `--chart-amber` | `#F59E0B` |
| `--chart-red` | `#EF4444` |
| `--chart-teal` | `#2DD4BF` |

### 3.7 Pre-Built Gradients

| Token | Value | Usage |
|-------|-------|-------|
| `--bq-gradient-purple` | `linear-gradient(180deg, #7C5CFC 0%, #0F0B1E 100%)` | Hero overlays |
| `--bq-gradient-cta` | `linear-gradient(135deg, #7C5CFC 0%, #4A28D4 100%)` | CTA banner background |
| `--bq-glow-purple` | `radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.35) 0%, transparent 70%)` | Ambient top glow |

### 3.8 Shadcn Token Bridge

These map BodyQ tokens to the Shadcn UI convention for potential component library compatibility:

| Shadcn Token | Mapped Value |
|-------------|-------------|
| `--background` | `#000000` |
| `--foreground` | `#FFFFFF` |
| `--card` | `#16102A` |
| `--primary` | `#7C5CFC` |
| `--secondary` | `#1E1735` |
| `--accent` | `#C8F135` |
| `--destructive` | `#EF4444` |
| `--muted` | `#0F0B1E` |
| `--input` | `#1E1735` |
| `--ring` | `#7C5CFC` |
| `--radius` | `8px` |

---

## 4. Typography

### 4.1 Font Loading (`app/layout.tsx`)

| Font | Role | Weights | CSS Variable | Display | Preload |
|------|------|---------|-------------|---------|---------|
| **Syne** | Display / Headings | 400, 500, 600, 700, 800 | `--font-syne` | swap | true |
| **Inter** | Body / UI | 300, 400, 500, 600, 700 | `--font-inter` | swap | true |

Both variables are applied to the `<html>` element. Body default is Inter via `font-family: var(--font-inter), 'Inter', system-ui, sans-serif`.

### 4.2 Typography Scale

| Context | Font | Size | Weight | Letter-Spacing | Line-Height | Example |
|---------|------|------|--------|---------------|-------------|---------|
| Hero headline | Syne | `clamp(52px, 8vw, 88px)` | 800 | -0.02em | 0.95 | "TRAIN SMARTER" |
| Section heading | Syne | `clamp(36px, 5vw, 56px)` | 700 | -0.01em | 1.05 | "CHOOSE YOUR PLAN" |
| Auth page title | Syne | 28px | 700 | - | - | "Welcome back" |
| Page header (dashboard) | Syne | 28px | 700 | -0.01em | 1.15 | "Analytics" |
| Card title (marketing) | Syne | 20px | 700 | - | - | Feature card heading |
| KPI value | Syne | 36px | 700 | - | - | "12,482" |
| Pricing amount | Syne | 48px | 800 | -0.02em | 1 | "$29" |
| Body text | Inter | 15-16px | 400 | - | 1.6–1.65 | Paragraph text |
| Subline | Inter | 18px | 400 | - | 1.6 | Hero subtitle |
| Button label | Inter | 15px | 700 | 0.05em | - | "GET STARTED" |
| Table body | Inter | 14px | 400 | - | - | Data rows |
| Nav link | Inter | 13px | 500 | 0.08em | - | "FEATURES" |
| Eyebrow | Inter | 11px | 500 | 0.15em | - | "WHAT BODYQ DOES" |
| Table header | Inter | 12px | 500 | 0.08em | - | "STATUS" |
| Badge text | Inter | 11px | 500–700 | 0.04em | - | "PRO" |
| Timestamp | Inter | 11px | 400 | - | - | "2 min ago" |

### 4.3 Helper Classes

```css
.font-display {
  font-family: var(--font-syne), 'Syne', sans-serif;
}

.eyebrow {
  font-family: var(--font-inter), 'Inter', sans-serif;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--bq-lime);
}
```

---

## 5. Base Reset & Global Styles

### 5.1 Box Model

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

### 5.2 HTML & Body

```css
html {
  scroll-behavior: smooth;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--bq-black);
  color: var(--bq-white);
  font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
}
```

### 5.3 Focus Ring (Accessibility)

```css
:focus-visible {
  outline: 2px solid var(--bq-lime);
  outline-offset: 3px;
  border-radius: 4px;
}
```

### 5.4 Skip-to-Content Link

```css
.skip-to-content {
  position: fixed;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bq-lime);
  color: var(--bq-black);
  padding: 12px 24px;
  border-radius: 0 0 12px 12px;
  z-index: 9999;
  font-weight: 700;
  font-size: 14px;
  transition: top 200ms;
}
.skip-to-content:focus { top: 0; }
```

### 5.5 Scrollbar

**Global:**
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bq-deep); }
::-webkit-scrollbar-thumb { background: var(--bq-purple); border-radius: 999px; }
```

**Dashboard (`.dash-scroll` and `[data-dashboard]`):**
```css
.dash-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
.dash-scroll::-webkit-scrollbar-track { background: var(--bq-surface-1); }
.dash-scroll::-webkit-scrollbar-thumb { background: var(--bq-surface-3); border-radius: 999px; }
.dash-scroll::-webkit-scrollbar-thumb:hover { background: var(--bq-purple); }
```

---

## 6. Reusable CSS Utilities

### 6.1 Glass Card

```css
.glass-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(124, 92, 252, 0.08);
  border: 1px solid var(--bq-border);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}
```

### 6.2 Skeleton Loading

```css
.skeleton {
  background: linear-gradient(90deg,
    var(--bq-surface-2) 0%,
    var(--bq-surface-3) 50%,
    var(--bq-surface-2) 100%);
  background-size: 200% 100%;
  animation: bq-shimmer 1.5s linear infinite;
  border-radius: 8px;
}
```

### 6.3 Ambient Glow

```css
.bq-glow {
  position: relative;
  overflow: hidden;
}
.bq-glow::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 100%; height: 100%;
  background: radial-gradient(ellipse at 50% -20%,
    rgba(124,92,252,0.30) 0%, transparent 65%);
  pointer-events: none;
  z-index: 0;
}
.bq-glow > * { position: relative; z-index: 1; }
```

---

## 7. Keyframe Animations

| Animation | Duration | Behavior | Description |
|-----------|----------|----------|-------------|
| `float` | 3s | Infinite ease-in-out | 3D perspective float: `rotateY(-12deg) rotateX(4deg) translateY(0→-14px)`. Used by PhoneMockup. |
| `pulse-glow` | 2s | Infinite ease-in-out | Box-shadow oscillates `0 0 0px` → `0 0 30px rgba(200,241,53,0.5)`. CTA button idle glow. |
| `marquee-left` | Variable (40–45s) | Infinite linear | `translateX(0)` → `translateX(-50%)`. Testimonial scroll. |
| `marquee-right` | Variable (40s) | Infinite linear | `translateX(-50%)` → `translateX(0)`. Reverse testimonial scroll. |
| `mesh-drift` | 20s | Infinite ease | Background-position `0% 0%` → `100% 100%` → `0% 0%`. Hero ambient background. |
| `chevron-bounce` | 2s | Infinite ease-in-out | `translateY(0)` opacity 0.7 → `translateY(8px)` opacity 1. Hero scroll hint. |
| `particle-float-1` through `5` | 7–15s | Infinite, varying delays | Randomized translation paths. CTA banner floating particles. |
| `pill-enter` | - | Once | `opacity: 0; translateY(12px) scale(0.95)` → `opacity: 1; y: 0; scale: 1`. Stat pill entrance. |
| `bq-shimmer` | 1.5s | Infinite linear | `background-position: 200%` → `-200%`. Dashboard skeleton loading. |
| `shimmer` | - | Infinite linear | Legacy variant: `-600px 0` → `600px 0`. |
| `bq-pulse` | - | Infinite | `scale(1) opacity: 1` → `scale(1.5) opacity: 0.4`. Live pulse dot on notifications. |
| `toast-in` | 200ms | Once | `translateX(120%)` → `translateX(0)`. Toast slide-in from right. |
| `toast-out` | 200ms | Once | `translateX(0)` → `translateX(120%)`. Toast slide-out. |

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| `xs` | 480px | Custom (added in Tailwind config) |
| `sm` | 640px | 2-column grids, show left auth panel |
| `md` | 768px | Desktop nav links, hide hamburger |
| `lg` | 1024px | 3-column grids, side-by-side layouts |
| `xl` | 1280px | Max content width containers |
| `2xl` | 1536px | Wide screens |

**Patterns:**
- Mobile-first: defaults → `sm:` → `md:` → `lg:` → `xl:`
- Fluid typography: `clamp(min, vw, max)` for headings
- Grid scaling: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Show/hide: `hidden lg:block`, `lg:hidden`
- Layout shift: `flex-col lg:flex-row`

---

## 9. Component Visual Specifications

### 9.1 Root Layout (`app/layout.tsx`)

- `<html lang="en" suppressHydrationWarning>` with font variable classes
- `<body>` wrapped in `AuthProvider` context
- Skip-to-content accessibility link
- `<main id="main-content">` wrapper
- Metadata: title, description, keywords, Open Graph, Twitter card

---

### 9.2 Dashboard Components

#### Sidebar (`components/dashboard/Sidebar.tsx`)

| Property | Collapsed | Expanded |
|----------|-----------|----------|
| Width | 64px | 240px |
| Position | Fixed, left 0, top 0, height 100vh | Same |
| Background | `var(--bq-surface-1)` | Same |
| Border | 1px solid `var(--bq-border)` (right) | Same |
| Transition | `width 250ms ease-in-out` | Same |
| z-index | 100 | 100 |

**Logo:**
- Expanded: Syne 20px, weight 800, white text + 8px lime dot
- Collapsed: 32px square, gradient purple → darker purple, rounded 8px, centered "B"

**Nav Groups:**
- Group labels: 10px, weight 500, 0.1em letter-spacing, uppercase, `var(--bq-text-3)`

**Nav Items:**

| State | Background | Text Color | Border |
|-------|-----------|------------|--------|
| Default | transparent | `var(--bq-text-2)` | none |
| Hover | `var(--bq-surface-3)` | `var(--bq-text-2)` | none |
| Active | `var(--bq-purple-dim)` | white | `borderLeft: 3px solid var(--bq-purple)` |

- Padding: 9px 10px (expanded), 10px centered (collapsed)
- Border-radius: 8px
- Transition: 150ms ease
- Icons: Lucide, size 18, strokeWidth 1.5

**User Section:**
- 32px gradient avatar circle
- Name in white, role in uppercase 10px
- Logout hover: `color: var(--bq-danger)`, bg `rgba(239,68,68,0.08)`

---

#### TopBar (`components/dashboard/TopBar.tsx`)

- Height: 60px fixed
- Position: fixed, left offset matches sidebar width
- Background: `var(--bq-surface-1)`, border-bottom `var(--bq-border)`
- Transition: `left 250ms ease-in-out` (responds to sidebar collapse)
- Padding: 0 24px

**Breadcrumb:** 14px, inactive `var(--bq-text-3)` weight 400, active white weight 500, chevron separator

**Search Input:**
- 360px width, 36px height
- Background: `var(--bq-surface-3)`, border `var(--bq-border)`, radius 8px
- Focus: `borderColor: var(--bq-purple)`
- Placeholder: "Search users, plans, tickets..."
- Keyboard hint badge: "⌘K"

**Date Range Toggle (7d / 30d / 90d):**

| State | Background | Color | Weight |
|-------|-----------|-------|--------|
| Active | `var(--bq-purple-dim)` | white | 500 |
| Inactive | transparent | `var(--bq-text-3)` | 400 |

**Notification Bell:** Lime dot indicator 8x8px, positioned top-right

---

#### KPICard (`components/dashboard/KPICard.tsx`)

- Background: `var(--bq-surface-2)`, border `var(--bq-border)`, radius 12px, padding 20px 20px 14px
- Hover: `borderColor: var(--bq-border-hover)` transition 150ms
- Label: 11px, weight 500, 0.10em letter-spacing, uppercase, `var(--bq-text-3)`
- Value: Syne 36px, weight 700, `var(--bq-lime)` if highlighted else white
- Delta: trending icon + percentage (green = good, red = bad, with churn inversion)
- SparkLine: 48px height, animated
- **Count-up animation:** 800ms with cubic easing on IntersectionObserver visibility

---

#### DataTable (`components/dashboard/DataTable.tsx`)

**Header Row (sticky):**
- Position: sticky top 60px (below TopBar), z-index 2
- Background: `var(--bq-surface-1)`
- Font: 12px, weight 500, 0.08em letter-spacing, uppercase, `var(--bq-text-3)`
- Sortable: cursor pointer, chevron indicator

**Body Rows:**

| State | Background | Border |
|-------|-----------|--------|
| Default | transparent | top `1px solid var(--bq-border)` |
| Hover | `var(--bq-surface-3)` | same |
| Selected | `var(--bq-purple-08)` | left `2px solid var(--bq-purple)` |

- Padding: 12px 16px, font 14px
- Checkbox accent: `var(--bq-purple)`
- Transition: background 100ms

**Pagination:**
- Buttons: 30x30px, radius 6px
- Active: bg `var(--bq-purple)`, white text
- Inactive: transparent, `var(--bq-text-2)`, border `var(--bq-border)`
- Disabled: 40% opacity

---

#### StatusBadge (`components/dashboard/StatusBadge.tsx`)

Pill badge with colored dot indicator.

| Status | Background | Text Color | Border |
|--------|-----------|------------|--------|
| `active` | `rgba(34,197,94,0.15)` | `var(--bq-success)` | `rgba(34,197,94,0.30)` |
| `inactive` | `rgba(245,158,11,0.15)` | `var(--bq-warning)` | `rgba(245,158,11,0.30)` |
| `banned` | `rgba(239,68,68,0.15)` | `var(--bq-danger)` | `rgba(239,68,68,0.30)` |
| `trialing` | `rgba(56,189,248,0.15)` | `var(--bq-info)` | `rgba(56,189,248,0.30)` |
| `past_due` | danger colors | `var(--bq-danger)` | danger border |
| `cancelled` | `rgba(107,98,128,0.20)` | `var(--bq-text-3)` | `rgba(107,98,128,0.40)` |
| `open` / `scheduled` | info colors | `var(--bq-info)` | info border |
| `in_progress` | warning colors | `var(--bq-warning)` | warning border |
| `resolved` / `sent` | success colors | `var(--bq-success)` | success border |
| `draft` / `paused` | muted/warning | varies | varies |

Base: inline-flex, padding 3px 10px, radius 999px, 11px weight 500, gap 5px. Dot: 5x5px circle.

---

#### PlanBadge (`components/dashboard/PlanBadge.tsx`)

| Plan | Background | Text Color | Border |
|------|-----------|------------|--------|
| `free` | `rgba(107,98,128,0.20)` | `rgba(255,255,255,0.60)` | `rgba(107,98,128,0.40)` |
| `pro` | `rgba(124,92,252,0.20)` | `#A78EFF` | `rgba(124,92,252,0.40)` |
| `elite` | `rgba(200,241,53,0.12)` | `var(--bq-lime)` | `rgba(200,241,53,0.30)` |

Base: inline-block, padding 3px 10px, radius 999px, 11px weight 500, uppercase, 0.04em letter-spacing.

---

#### FilterBar (`components/dashboard/FilterBar.tsx`)

- Layout: flex, gap 10px, margin-bottom 20px, flex-wrap
- Search: flex 1 1 240px, max-width 340px, height 36px, bg `var(--bq-surface-3)`, border `var(--bq-border)`, radius 8px, focus border `var(--bq-purple)`
- Search icon: Lucide Search, size 14, `var(--bq-text-3)`, positioned left 10px
- Selects: same base styles, padding-right 28px for dropdown arrow

---

#### PageHeader (`components/dashboard/PageHeader.tsx`)

- Container: flex space-between, margin-bottom 28px, gap 16px, flex-wrap
- Title: Syne 28px, weight 700, white, line-height 1.15, letter-spacing -0.01em
- Description: Inter 14px, `var(--bq-text-2)`, margin-top 8px

---

#### EmptyState (`components/dashboard/EmptyState.tsx`)

- Container: flex column, center, padding 80px 24px, gap 16px, text-align center
- Icon box: 56x56px, radius 16px, bg `var(--bq-surface-3)`, color `var(--bq-text-3)`
- Title: Syne 15px, weight 700, white
- Description: 13px, `var(--bq-text-3)`, max-width 300px

---

#### ConfirmDialog (`components/dashboard/ConfirmDialog.tsx`)

- Overlay: fixed inset 0, bg `rgba(0,0,0,0.7)`, backdrop-filter `blur(4px)`, z-index 9000
- Dialog: centered, max-width 420px, bg `var(--bq-surface-1)`, border `var(--bq-border)`, radius 16px, padding 28px
- Entrance: Framer Motion scale 0.95→1, opacity 0→1, 200ms
- Danger icon: 40x40px, radius 10px, bg `rgba(239,68,68,0.12)`, AlertTriangle icon
- Title: Syne 16px, weight 700
- Cancel button: bg `var(--bq-surface-3)`, border `var(--bq-border)`, color `var(--bq-text-2)`
- Confirm button: danger red or purple, white text, weight 600, 13px

---

#### ToggleSwitch (`components/dashboard/ToggleSwitch.tsx`)

- Track: 44x24px, radius 999px
- Unchecked: bg `var(--bq-surface-3)`
- Checked: bg `var(--bq-purple)`
- Thumb: 16x16px white circle, absolute top 4px, transition 200ms ease
- Label: 13px, `var(--bq-text-2)`

---

#### UserDrawer (`components/dashboard/UserDrawer.tsx`)

- Overlay: fixed inset 0, bg `rgba(0,0,0,0.5)`, z-index 200
- Panel: fixed right 0, width 480px, bg `var(--bq-surface-1)`, border-left `var(--bq-border)`, z-index 201
- Entrance: Framer Motion x 480→0, 300ms cubic-bezier
- Avatar: 56x56px gradient circle, 22px weight 700 initials
- Info rows: label 12px uppercase `var(--bq-text-3)` / value 13px weight 500 white, divider border-bottom
- Action buttons: radius 8px, purple variant bg `var(--bq-purple-dim)`, danger variant bg `rgba(239,68,68,0.1)`

---

### 9.3 Chart Components

All chart components share a consistent container: bg `var(--bq-surface-2)`, border `var(--bq-border)`, radius 12px, padding 20px. Title: Inter 15px, weight 600, white.

#### AreaChartCard

- Height: 260px, full width
- Area fill: linear gradient from color at 25% opacity to transparent
- Grid: `stroke: var(--bq-border)`, dashed, no vertical lines
- Axes: 11px, `rgba(255,255,255,0.35)`, no axis lines
- Tooltip: bg `var(--bq-surface-2)`, border `rgba(124,92,252,0.3)`, radius 8px, 13px text

#### BarChartCard

- Same container as AreaChartCard
- Bar radius: `[4, 4, 0, 0]` (rounded top), maxBarSize 48
- Supports horizontal and vertical layouts

#### PieChartCard

- Donut chart: outerRadius 90, innerRadius 50, paddingAngle 2
- Legend: flex column below chart, 10x10px color swatch, 13px label, 13px weight 600 value

#### SparkLine

- Dimensions: 100% width, 48px height
- Line: monotone interpolation, strokeWidth 1.5, no dots
- Color: prop-driven, default `var(--chart-purple)`

#### ActivityFeed

- Event items: flex gap 12px, padding 12px 0, border-top between items
- Icon box: 30x30px, radius 8px, color-coded per event type
- Admin name: 13px weight 500 white
- Action text: 13px `var(--bq-text-2)`
- Resource link: 12px `var(--bq-purple)`
- Timestamp: 11px `var(--bq-text-3)`, no wrap

#### ReportsTable

- Uses DataTable component
- Issue type badge: purple bg/border, 12px weight 600
- Subject: truncated 70 chars, 13px weight 600 white
- Details: truncated 100 chars, 13px `var(--bq-muted)`

---

### 9.4 Marketing Section Components

#### NavBar (`components/sections/NavBar.tsx`)

- Fixed top, full width, height 72px, z-index 1000

| State | Background | Border | Backdrop |
|-------|-----------|--------|----------|
| Top (no scroll) | transparent | none | none |
| Scrolled (>80px) | `rgba(10,7,25,0.92)` | `1px solid rgba(124,92,252,0.3)` | `blur(20px)` |

- Transition: 300ms ease for both background and border-color
- Logo: Syne 22px weight 800 white + 8px lime dot
- Desktop nav links: 13px, weight 500, uppercase, 0.08em letter-spacing, white
  - Hover underline: 1.5px `var(--bq-lime)`, scaleX(0→1) from left, 200ms ease-out

**Mobile Hamburger:**
- 3 lines → animated to X on open (rotate 45deg, scaleX 0, rotate -45deg)
- Transition: 200ms ease

**Mobile Drawer:**
- Fixed inset 0, bg `rgba(10,7,25,0.98)`, backdrop blur 24px
- Transform: `translateX(100% → 0)`, 300ms cubic-bezier(0.4, 0, 0.2, 1)
- Links: Syne 32px weight 700 white, staggered entrance (50ms intervals)

---

#### HeroSection (`components/sections/HeroSection.tsx`)

- Min-height: 100vh, padding-top 72px (navbar height)

**Background Layers:**
1. Black base
2. Conic gradient with `mesh-drift` animation (20s, background-size 400%)
3. Purple radial glow: 900x700px ellipse, `rgba(124,92,252,0.45)`, positioned top -10%

**Content Layout:** flex-col lg:flex-row, max-width 1280px, padding 80px 24px, gap 64px

**Left Column (Text):**
- Eyebrow: `.eyebrow` class, Framer Motion y 16→0, 600ms
- Headline: clamp(52px, 8vw, 88px), weight 800, uppercase, staggered line animation (120ms between lines, blur 8px→0)
- Subline: 18px, 65% white, max-width 560px
- CTA: primary button with `idlePulse`, 16px padding, 18px 52px

**Right Column (lg:block only):**
- PhoneMockup: Framer Motion x 40→0, 800ms
- 3 floating stat pills (GlassCard, radius 999px): staggered entrance at 0.8s, 1.0s, 1.2s

**Scroll Hint:** chevron SVG at bottom 32px, lime stroke, `chevron-bounce` animation 2s

---

#### FeaturesSection (`components/sections/FeaturesSection.tsx`)

- Padding: 120px 24px
- Background: black + purple glow top-right (700x700px, 25% opacity)
- Grid: grid-cols-1 sm:2 lg:3, gap 24px, margin-top 80px
- Cards: GlassCard (hoverable), padding 32px, whileInView staggered (i * 0.1s delay)
  - Icon box: 48x48px, radius 12px, bg `rgba(200,241,53,0.08)`
  - Title: Syne 20px weight 700
  - Description: Inter 15px, 60% white, line-height 1.65

---

#### PlansSection (`components/sections/PlansSection.tsx`)

**Billing Toggle:**
- Labels: 14px weight 500, active white / inactive muted
- Switch: 52x28px, radius 999px, checked bg `var(--bq-lime)`, thumb 20x20px white
- Annual badge: lime bg/border pill, 11px weight 700

**Pricing Cards:**
- Grid: grid-cols-1 lg:3, gap 24px
- Pro card: `transform: scale(1.04)` (emphasized)
- Container: backdrop blur 20px, radius 24px, padding 36px 28px
  - Standard: bg `rgba(255,255,255,0.03)`, border `var(--bq-border)`
  - Pro (featured): bg `rgba(124,92,252,0.12)`, border `1.5px solid var(--bq-lime)`, glow shadow `0 0 40px rgba(200,241,53,0.08)`
- "MOST POPULAR" badge: absolute top -14px, bg lime, black text, radius 999px
- Plan name: Syne 24px weight 700
- Price: Syne 48px weight 800, lime color
- Feature list: checkmark circles (lime bg/border, SVG check), 14px 75% white
- CTA: primary button, full width, `idlePulse` on Pro only

---

#### WorkoutBrowser (`components/sections/WorkoutBrowser.tsx`)

**Desktop (lg:flex):**
- Tab list (30% width, sticky):
  - Active: bg `rgba(124,92,252,0.12)`, border-left `3px solid var(--bq-lime)`, color lime, radius `0 12px 12px 0`
  - Inactive: transparent, white, hover to lime
- Content panel (70%):
  - AnimatePresence with x -16→0 fade transition
  - Gradient card per category (custom gradient pairs), radius 24px, padding 56px 48px
  - Stats chips: lime bg/border pills, 12px uppercase

**Mobile (lg:hidden):**
- Accordion pattern with chevron rotation on open
- Open panel: radius `0 0 16px 16px`, border-top none

---

#### AIShowcase (`components/sections/AIShowcase.tsx`)

- Layout: flex-col lg:flex-row, gap 80px
- Left: text + bullet list with lime checkmark circles, Framer Motion x -80→0
- Right: PostureAnalysisUI (GlassCard 320px width, SVG skeletal diagram with 14 joint dots, scanline overlay, "Form Score: 94%" lime badge, live indicator with glowing dot)

---

#### NutritionSection (`components/sections/NutritionSection.tsx`)

- Layout: mirror of AIShowcase (text left, dashboard right)
- NutritionDashboard (GlassCard 320px): "On Track" badge, conic-gradient donut ring (carbs lime / protein purple / fat white), macro legend, meal list with kcal values, calorie progress bar (gradient fill `#7C5CFC` → `var(--bq-lime)`)

---

#### TestimonialsSection (`components/sections/TestimonialsSection.tsx`)

- Background: `var(--bq-deep)`, padding 120px 0
- Row 1: InfiniteMarquee left, speed 45, gap 20
- Row 2: InfiniteMarquee right, speed 40, gap 20
- Cards (GlassCard): 280px width, padding 20px, radius 18px
  - 5 lime stars, quote (13px, 3-line clamp), avatar (36px gradient circle), name (Syne 13px), country (11px muted)
- Edge fade: mask gradient transparent 0% → black 8% → black 92% → transparent 100%
- Pause on hover

---

#### CTABanner (`components/sections/CTABanner.tsx`)

- Background: `linear-gradient(135deg, #7C5CFC, #4A28D4)`, padding 120px 24px
- 10–15 floating particles: 3–6px white dots, 8–15% opacity, `particle-float` animations (7–15s)
- Content: max-width 760px, centered
- Headline: Syne clamp(36px, 6vw, 56px), weight 800, uppercase
- CTA: primary button with `idlePulse`

---

#### Footer (`components/sections/Footer.tsx`)

- Border-top: `1px solid var(--bq-lime)`
- Padding: 72px 24px 48px
- Grid: grid-cols-1 sm:2 lg:4, gap 48px
- Brand column: logo (Syne 22px + lime dot), tagline (14px muted, max-width 220px)
- Link columns: header 11px lime uppercase, links 14px muted → white on hover

---

### 9.5 UI Primitives

#### Button (`components/ui/Button.tsx`)

Base: inline-flex, radius 999px (pill), padding 16px 40px, Inter 15px weight 700, uppercase, 0.05em letter-spacing, transition 150ms ease-out. Renders as `<a>` if href, else `<button>`.

| Variant | Background | Color | Border | Hover | Special |
|---------|-----------|-------|--------|-------|---------|
| `primary` | `var(--bq-lime)` | `var(--bq-black)` | none | `scale(1.04)`, bg `var(--bq-lime-bright)` | `idlePulse`: after 3s idle, `pulse-glow` animation starts. Resets on any user interaction. |
| `secondary` | transparent | `var(--bq-white)` | `2px solid rgba(255,255,255,0.3)` | border lime, color lime, `scale(1.04)` | - |
| `ghost` | transparent | `var(--bq-lime)` | none | `scale(1.04)` | padding 8px 0, text-decoration underline, offset 3px |

Mouse down: `scale(0.97)` press effect on primary/secondary.

---

#### GlassCard (`components/ui/GlassCard.tsx`)

```
backdrop-filter: blur(20px)
background: rgba(124, 92, 252, 0.08)
border: 1px solid var(--bq-border)
border-radius: 20px
box-shadow: 0 24px 64px rgba(0,0,0,0.6)
```

**Hoverable variant:** `translateY(-8px)` + `box-shadow: 0 0 48px rgba(124,92,252,0.35)` on mouse enter, 200ms ease-out.

---

#### InfiniteMarquee (`components/ui/InfiniteMarquee.tsx`)

- Edge fade: CSS mask-image gradient (transparent 0% → black 8% → black 92% → transparent 100%)
- Content duplicated for seamless loop
- Animation: `marquee-left` or `marquee-right`, duration calculated from speed prop
- Pause on hover: `animationPlayState: paused`

---

#### PhoneMockup (`components/ui/PhoneMockup.tsx`)

- Animation: `float 3s ease-in-out infinite` (3D perspective)
- Chassis: 260x530px, gradient bg, radius 44px, border 2px purple 40%, triple box-shadow
- Dynamic Island: 80x24px black notch, radius 999px
- Screen: radius 32px, bg `#0a0818`
- Home indicator: 100x4px white 30%, radius 999px
- Default screen content: header, workout card (purple gradient), metrics grid (lime values), streak calendar (M–S), AI pill (purple-lime gradient)

---

#### SectionHeading (`components/ui/SectionHeading.tsx`)

- Eyebrow: `.eyebrow` class, Framer Motion y 16→0
- Headline: Syne clamp(36px, 5vw, 56px) weight 700, uppercase, Framer Motion y 32→0
- Subline: Inter 18px, 65% white, max-width 640px if centered, Framer Motion y 24→0
- Staggered delays: eyebrow 0ms → headline 100ms → subline 200ms

---

#### StatCounter (`components/ui/StatCounter.tsx`)

- Value: Syne clamp(40px, 6vw, 64px) weight 800, lime color
- Count-up: IntersectionObserver at 30% threshold, 1400ms, power2.out easing
- Label: Inter 14px, 50% white, uppercase, 0.08em letter-spacing

---

### 9.6 Auth Page Components

#### AuthPageShell (`components/auth/AuthPageShell.tsx`)

- Full viewport height, black bg

**Left Panel (lg: only):**
- 48% width, gradient bg (deep purple tones), border-right purple 20%
- 2 animated orbs: top-left purple (600px), bottom-right lime (400px)
- Logo: Syne 24px weight 800 + lime dot
- Tagline: Syne clamp(36px, 3.5vw, 52px) weight 800, uppercase, "MOVE BETTER." in lime
- Description: 16px 55% white, max-width 400px
- Framer Motion: y 24→0, 700ms ease-out

**Right Panel:**
- Flex center, padding 40px 24px
- Mobile logo (lg:hidden): Syne 20px weight 800
- Form card: max-width 420px, Framer Motion y 24→0, 550ms delay 50ms
- Heading: Syne 28px weight 700 + subtitle Inter 15px muted

---

#### LoginForm / SignupForm

**Input Fields:**
- Height: auto, bg `rgba(255,255,255,0.05)`, border `rgba(255,255,255,0.12)`, radius 12px, padding 14px 16px
- Font: Inter 15px white
- Focus: `borderColor: var(--bq-purple)`, blur: reset
- Label: Inter, white, above input

**Error Alert:**
- bg `rgba(252,92,92,0.1)`, border `rgba(252,92,92,0.35)`, radius 12px, 14px red text

**Links:** 13px muted, hover lime, 150ms transition

**Email Confirmation (signup):**
- 48px mailbox emoji, Syne 24px heading, message with bold email, primary button "Go to Sign In"

---

### 9.7 App Shared Components

#### InsightCard

- Container: bg `var(--bq-surface-2)`, border `var(--bq-border)`, **left accent border** 3px solid `${typeColor}`, radius 12px, padding 16px 18px

| Type | Accent Color |
|------|-------------|
| nutrition | `#C8F135` (lime) |
| workout | `#7C5CFC` (purple) |
| recovery | `#38BDF8` (blue) |
| sleep | `#A78BFA` (lighter purple) |
| motivation | `#F59E0B` (amber) |
| general | 40% white |

---

#### MacroBar

- Label: 13px weight 500 white, value: 12px muted "{consumed}g / {target}g"
- Track: 6px height, radius 99px, bg `rgba(255,255,255,0.08)`
- Fill: percentage width, prop color, radius 99px, `transition: width 500ms ease`

---

#### StatRing (Circular Progress)

- SVG with background circle (`rgba(255,255,255,0.08)`) and progress circle (prop color)
- strokeLinecap: round, `transition: stroke-dasharray 600ms ease`
- Center: percentage text Inter 11–14px weight 700
- Label below: 12px weight 600 white
- Sublabel: 11px muted

---

#### AppToast

- Fixed bottom 88px, centered, z-index 9999
- Framer Motion: scale/opacity entrance
- Backdrop blur 16px, radius 12px, shadow `0 8px 32px rgba(0,0,0,0.4)`
- Auto-dismiss: 3500ms

| Type | Background | Border | Icon |
|------|-----------|--------|------|
| success | `rgba(34,197,94,0.12)` | `rgba(34,197,94,0.4)` | `✓` green |
| error | `rgba(239,68,68,0.12)` | `rgba(239,68,68,0.4)` | `✕` red |
| info | `rgba(124,92,252,0.12)` | `rgba(124,92,252,0.4)` | `ℹ` purple |

---

## 10. Icon System

**Primary library:** Lucide React (all icons size 18, strokeWidth 1.5 unless noted)

**Navigation icons:** LayoutDashboard, BarChart2, Activity, Users, CreditCard, Filter, Dumbbell, Leaf, Cpu, Zap, Bell, Smartphone, Settings, Shield, MessageSquare, LogOut

**UI icons:** Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Mail, Globe, Calendar, AlertTriangle, Inbox, TrendingUp, TrendingDown

**Emoji fallbacks (decorative):** 🔥 (streak), 💪 (strength), 🥗 (nutrition), 🧘 (recovery), 😴 (sleep), ⚡ (energy/AI), 📬 (email), 👤 (profile)

---

## 11. Motion & Interaction Patterns

### 11.1 Framer Motion Conventions

| Pattern | Config | Usage |
|---------|--------|-------|
| Scroll reveal | `whileInView`, `viewport: { once: true, amount: 0.3 }` | Section headings, feature cards, pricing |
| Fade-up | `initial: { opacity: 0, y: 24 }` → `animate: { opacity: 1, y: 0 }` | Most content blocks |
| Staggered | `delay: index * 0.1` or `0.12` | Card grids, bullet lists |
| Slide-in | `x: 80 → 0` or `x: -80 → 0` | Side-by-side showcase sections |
| Blur-in | `filter: blur(8px) → blur(0px)` | Hero headline lines |
| Scale entrance | `scale: 0.95 → 1` | Dialogs, CTA banner |
| Drawer slide | `x: 480 → 0` | UserDrawer panel |
| Tab switch | `AnimatePresence` + `exit/enter` opacity + x offset | WorkoutBrowser content |

**Common easing:** `easeOut` for most, `cubic-bezier(0.22, 1, 0.36, 1)` for bouncy slide-ins

### 11.2 CSS-Only Interactions

| Interaction | Properties | Duration |
|-------------|-----------|----------|
| Button press | `transform: scale(0.97)` on mousedown | Instant |
| Button hover | `transform: scale(1.04)` | 150ms ease-out |
| Nav link underline | `scaleX(0 → 1)` transform-origin left | 200ms ease-out |
| Card hover (GlassCard) | `translateY(-8px)` + purple glow shadow | 200ms ease-out |
| KPI card hover | `borderColor: var(--bq-border-hover)` | 150ms |
| Table row hover | `background: var(--bq-surface-3)` | 100ms |
| Sidebar collapse | `width: 240px → 64px` | 250ms ease-in-out |
| TopBar shift | `left` tracks sidebar width | 250ms ease-in-out |

---

## 12. Spacing & Layout Constants

| Token | Value | Usage |
|-------|-------|-------|
| Max content width | 1280px | Section containers |
| Section padding (vertical) | 120px | Marketing sections |
| Section padding (horizontal) | 24px | All sections |
| Card padding (dashboard) | 20px | KPI, chart cards |
| Card padding (marketing) | 32px | Feature cards |
| Card border-radius (dashboard) | 12px | KPI, charts, tables |
| Card border-radius (marketing) | 20–24px | Glass cards, pricing |
| Button border-radius | 999px | All buttons (pill shape) |
| Badge border-radius | 999px | Status, plan badges |
| Input border-radius | 8–12px | Search, form fields |
| Sidebar width (expanded) | 240px | Dashboard sidebar |
| Sidebar width (collapsed) | 64px | Dashboard sidebar |
| TopBar height | 60px | Dashboard top bar |
| NavBar height | 72px | Marketing navbar |
| Gap (card grid) | 24px | Feature, pricing grids |
| Gap (nav items) | 40px | Desktop nav links |

---

## 13. Shadow System

| Level | Value | Usage |
|-------|-------|-------|
| Card default | `0 24px 64px rgba(0,0,0,0.6)` | Glass cards |
| Featured card | `0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(200,241,53,0.08)` | Pro pricing card |
| Phone mockup | `0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,92,252,0.2), inset 0 1px 0 rgba(255,255,255,0.08)` | PhoneMockup chassis |
| Card hover glow | `0 0 48px rgba(124,92,252,0.35), 0 24px 64px rgba(0,0,0,0.6)` | GlassCard hover |
| Toast | `0 8px 32px rgba(0,0,0,0.4)` | AppToast |
| Live dot glow | `0 0 8px var(--bq-lime)` | Live indicators |

---

## 14. Accessibility Features

| Feature | Implementation |
|---------|---------------|
| Skip-to-content | Fixed link at top, visible on focus, lime bg/black text |
| Focus rings | `2px solid var(--bq-lime)`, offset 3px, radius 4px |
| Reduced motion | All animations/transitions → 0.01ms, scroll-behavior auto |
| ARIA labels | `aria-label` on stat counters, `aria-hidden` on decorative elements |
| Semantic HTML | `<nav>`, `<main>`, `<section>`, `role="alert"` on error messages |
| Color contrast | Primary text white on dark (#000/#0F0B1E) — well above WCAG AA |
| Keyboard navigation | Tab order, visible focus states, skip link |

---

*End of Design Reference*
