import type { Metadata } from 'next';
import { Syne, Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

/* ----------------------------------------------------------
   FONT LOADING
   Both fonts are preloaded with display: swap for zero FOUT.
   CSS variables are set on <html> and consumed via globals.css.
   ---------------------------------------------------------- */
const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-syne',
  preload: true,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

/* ----------------------------------------------------------
   METADATA
   ---------------------------------------------------------- */
export const metadata: Metadata = {
  title: 'BodyQ — Train Smarter. Move Better. Live Longer.',
  description:
    'BodyQ is your AI-powered personal coach. Real-time posture analysis, personalized workout plans, and smart nutrition guidance — all in one platform.',
  keywords: [
    'AI fitness',
    'personal trainer',
    'posture analysis',
    'workout plans',
    'nutrition AI',
    'BodyQ',
  ],
  openGraph: {
    title: 'BodyQ — AI-Powered Fitness Coach',
    description:
      'Real-time posture analysis. Personalized plans. Intelligent coaching. BodyQ is the future of fitness.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BodyQ — Train Smarter. Move Better. Live Longer.',
    description: 'AI-powered personal coaching for everyone.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/* ----------------------------------------------------------
   ROOT LAYOUT
   ---------------------------------------------------------- */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Skip-to-content for keyboard accessibility */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <AuthProvider>
          <main id="main-content">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
