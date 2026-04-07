/**
 * BodyQ — Homepage
 *
 * Architecture:
 * - NavBar and HeroSection load eagerly (above the fold, critical).
 * - All other sections are lazy-loaded with Next.js dynamic() + ssr:false
 *   to reduce the initial JS bundle and avoid hydration issues with
 *   scroll-triggered animations that rely on browser APIs.
 *
 * Section order (matching the spec):
 *  1. NavBar
 *  2. HeroSection
 *  3. StatsBar
 *  4. FeaturesSection
 *  5. WorkoutBrowser
 *  6. AIShowcase
 *  7. NutritionSection
 *  8. PlansSection
 *  9. TestimonialsSection
 * 10. CTABanner
 * 11. Footer
 */

import dynamic from 'next/dynamic';

// ── Eager: above-the-fold critical components ──
import NavBar from '@/components/sections/NavBar';
import HeroSection from '@/components/sections/HeroSection';

// ── Lazy: all below-the-fold sections ──
const StatsBar = dynamic(() => import('@/components/sections/StatsBar'), {
  ssr: false,
  loading: () => <SectionSkeleton height="160px" />,
});

const FeaturesSection = dynamic(() => import('@/components/sections/FeaturesSection'), {
  ssr: false,
  loading: () => <SectionSkeleton height="600px" />,
});

const WorkoutBrowser = dynamic(() => import('@/components/sections/WorkoutBrowser'), {
  ssr: false,
  loading: () => <SectionSkeleton height="600px" />,
});

const AIShowcase = dynamic(() => import('@/components/sections/AIShowcase'), {
  ssr: false,
  loading: () => <SectionSkeleton height="600px" />,
});

const NutritionSection = dynamic(() => import('@/components/sections/NutritionSection'), {
  ssr: false,
  loading: () => <SectionSkeleton height="600px" />,
});

const PlansSection = dynamic(() => import('@/components/sections/PlansSection'), {
  ssr: false,
  loading: () => <SectionSkeleton height="700px" />,
});

const TestimonialsSection = dynamic(() => import('@/components/sections/TestimonialsSection'), {
  ssr: false,
  loading: () => <SectionSkeleton height="400px" />,
});


const Footer = dynamic(() => import('@/components/sections/Footer'), {
  ssr: false,
  loading: () => <SectionSkeleton height="280px" />,
});

/* ----------------------------------------------------------
   SECTION SKELETON — placeholder during lazy load
   Keeps page height stable (prevents layout shift).
   ---------------------------------------------------------- */
function SectionSkeleton({ height }: { height: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height,
        background: 'var(--bq-deep)',
      }}
    />
  );
}

/* ----------------------------------------------------------
   PAGE
   ---------------------------------------------------------- */
export default function HomePage() {
  return (
    <>
      {/* 1. Navbar — eager, fixed overlay */}
      <NavBar />

      {/* 2. Hero — eager, above the fold */}
      <HeroSection />

      {/* 3-11. Lazy-loaded below-fold sections */}
      <StatsBar />
      <FeaturesSection />
      <WorkoutBrowser />
      <AIShowcase />
      <NutritionSection />
      <PlansSection />
      <TestimonialsSection />
      <Footer />
    </>
  );
}
