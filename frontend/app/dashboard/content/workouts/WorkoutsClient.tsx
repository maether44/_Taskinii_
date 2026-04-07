'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import PageHeader from '@/components/dashboard/PageHeader';
import ConfirmDialog from '@/components/dashboard/ConfirmDialog';
import ToggleSwitch from '@/components/dashboard/ToggleSwitch';
import EmptyState from '@/components/dashboard/EmptyState';
import { WorkoutPlan } from '@/lib/supabase/queries/content';
import { saveWorkoutPlan, removeWorkoutPlan } from './actions';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#eab308',
  advanced: '#ef4444',
};

const CATEGORIES = ['Strength', 'Cardio', 'HIIT', 'Flexibility', 'Yoga', 'Mixed'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bq-surface-3)', border: '1px solid var(--bq-border)',
  borderRadius: 8, padding: '10px 14px',
  fontFamily: 'var(--font-inter)', fontSize: 14,
  color: 'var(--bq-text-1)', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-inter)',
  fontSize: 12, fontWeight: 600, color: 'var(--bq-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
};

interface Props { plans: WorkoutPlan[]; }

type FormState = Partial<WorkoutPlan>;

export default function WorkoutsClient({ plans: initial }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '', description: '', category: 'Strength',
    difficulty: 'Beginner', ai_adapted: false, exercises: [],
  });

  function openAdd() {
    setEditPlan(null);
    setForm({ name: '', description: '', category: 'Strength', difficulty: 'Beginner', ai_adapted: false, exercises: [] });
    setModalOpen(true);
  }

  function openEdit(plan: WorkoutPlan) {
    setEditPlan(plan);
    setForm({ ...plan });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveWorkoutPlan(editPlan?.id ? { ...form, id: editPlan.id } : form);
      router.refresh();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeWorkoutPlan(deleteTarget.id);
    setPlans((p) => p.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
    router.refresh();
  }

  const AddButton = (
    <button
      onClick={openAdd}
      style={{
        background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
        padding: '9px 18px', fontFamily: 'var(--font-inter)', fontSize: 13,
        fontWeight: 600, color: '#fff', cursor: 'pointer',
      }}
    >
      + Add Plan
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Workout Plans"
        description="Manage AI-generated and admin-curated workout plans"
        action={AddButton}
      />

      {plans.length === 0 ? (
        <EmptyState
          title="No workout plans yet"
          description="Create your first workout plan to get started."
          action={<button onClick={openAdd} style={{ background: 'var(--bq-purple)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontFamily: 'var(--font-inter)', fontSize: 13, cursor: 'pointer' }}>Add Plan</button>}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)',
                borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 15, color: 'var(--bq-text-1)', margin: 0, lineHeight: 1.3 }}>
                  {plan.name}
                </p>
                {plan.ai_adapted && (
                  <span style={{
                    background: 'rgba(200,241,53,0.12)', color: 'var(--bq-lime)',
                    border: '1px solid rgba(200,241,53,0.3)',
                    borderRadius: 6, padding: '2px 8px', fontSize: 11,
                    fontFamily: 'var(--font-inter)', fontWeight: 600, flexShrink: 0,
                  }}>AI</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(124,92,252,0.15)', color: 'var(--bq-purple)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 12,
                  fontFamily: 'var(--font-inter)', fontWeight: 500,
                }}>{plan.category}</span>
                <span style={{
                  background: `${DIFFICULTY_COLORS[plan.difficulty?.toLowerCase()] ?? '#888'}22`,
                  color: DIFFICULTY_COLORS[plan.difficulty?.toLowerCase()] ?? 'var(--bq-muted)',
                  borderRadius: 6, padding: '3px 10px', fontSize: 12,
                  fontFamily: 'var(--font-inter)', fontWeight: 500,
                }}>{plan.difficulty}</span>
              </div>

              {plan.description && (
                <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--bq-muted)', margin: 0, lineHeight: 1.5 }}>
                  {plan.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>
                  {(plan.exercises as unknown[]).length} exercises · {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openEdit(plan)}
                    style={{
                      background: 'none', border: '1px solid var(--bq-border)', borderRadius: 6,
                      padding: '5px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                      color: 'var(--bq-text-2)', cursor: 'pointer',
                    }}
                  >Edit</button>
                  <button
                    onClick={() => setDeleteTarget(plan)}
                    style={{
                      background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                      padding: '5px 12px', fontFamily: 'var(--font-inter)', fontSize: 12,
                      color: '#ef4444', cursor: 'pointer',
                    }}
                  >Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: 520, zIndex: 101,
                background: 'var(--bq-surface-1)', border: '1px solid var(--bq-border)',
                borderRadius: 16, padding: 28, maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 18, color: 'var(--bq-text-1)', marginBottom: 24 }}>
                {editPlan ? 'Edit Plan' : 'New Workout Plan'}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Plan Name</label>
                  <input style={inputStyle} value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., Full Body Strength" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                    value={form.description ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description..."
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={form.category ?? 'Strength'} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Difficulty</label>
                    <select style={inputStyle} value={form.difficulty ?? 'Beginner'} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                      {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 600, color: 'var(--bq-text-1)', marginBottom: 2 }}>AI Adapted</p>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--bq-muted)' }}>Enable AI personalization for this plan</p>
                  </div>
                  <ToggleSwitch
                    checked={form.ai_adapted ?? false}
                    onChange={(v) => setForm((f) => ({ ...f, ai_adapted: v }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'none', border: '1px solid var(--bq-border)', borderRadius: 8,
                    padding: '10px 20px', fontFamily: 'var(--font-inter)', fontSize: 13,
                    color: 'var(--bq-text-2)', cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name}
                  style={{
                    background: 'var(--bq-purple)', border: 'none', borderRadius: 8,
                    padding: '10px 24px', fontFamily: 'var(--font-inter)', fontSize: 13,
                    fontWeight: 600, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving || !form.name ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save Plan'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workout Plan"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger={true}
      />
    </div>
  );
}
