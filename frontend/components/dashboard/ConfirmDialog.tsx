'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
interface ConfirmDialogProps { open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; }
export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel, danger = true }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={onCancel}
        >
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              {danger && <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={20} color="var(--bq-danger)" /></div>}
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontSize: 16, fontWeight: 700, color: 'var(--bq-white)', marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--bq-text-2)', lineHeight: 1.55 }}>{description}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={{ padding: '8px 18px', background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)', borderRadius: 8, color: 'var(--bq-text-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Cancel</button>
              <button onClick={onConfirm} style={{ padding: '8px 18px', background: danger ? 'var(--bq-danger)' : 'var(--bq-purple)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
