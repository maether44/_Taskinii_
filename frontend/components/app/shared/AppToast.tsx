'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  duration?: number;
}

const COLORS = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#22C55E', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)',  text: '#EF4444', icon: '✕' },
  info:    { bg: 'rgba(124,92,252,0.12)', border: 'rgba(124,92,252,0.4)', text: '#7C5CFC', icon: 'ℹ' },
};

export default function AppToast({ message, type = 'info', onDismiss, duration = 3500 }: AppToastProps) {
  const c = COLORS[type];

  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          bottom: 88,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 12,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          minWidth: 220,
          maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ fontWeight: 700, color: c.text, fontSize: 15, flexShrink: 0 }}>{c.icon}</span>
        <span style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--bq-white)', lineHeight: 1.4 }}>{message}</span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bq-muted)', fontSize: 18, padding: '0 4px', flexShrink: 0, lineHeight: 1 }}
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
