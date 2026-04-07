import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors are handled via CSS custom properties in globals.css.
      // Only extend spacing/sizing utilities here.
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};

export default config;
