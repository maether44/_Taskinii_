import React, { useState, useRef, useCallback } from 'react';
import { User, Camera, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageContainer, Card, Button, Input } from '../components/ui';

const PHOTO_SIZE_MIN = 80;
const PHOTO_SIZE_MAX = 200;
const PHOTO_SIZE_DEFAULT = 120;

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [photoSize, setPhotoSize] = useState(PHOTO_SIZE_DEFAULT);
  const [form, setForm] = useState(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    gender: user?.gender ?? '',
    age: user?.age ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
    weightKg: user?.weightKg ?? '',
    heightCm: user?.heightCm ?? '',
    fitnessGoals: user?.fitnessGoals ?? '',
    activityLevel: user?.activityLevel ?? '',
    healthPreferences: user?.healthPreferences ?? '',
  }));

  const profilePhotoUrl = user?.profilePhotoUrl ?? null;

  const handlePhotoChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateProfile({ profilePhotoUrl: reader.result });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [updateProfile]
  );

  const handleSave = () => {
    const payload = {
      ...form,
      name: `${form.firstName} ${form.lastName}`.trim(),
      weightKg: form.weightKg === '' ? undefined : Number(form.weightKg),
      heightCm: form.heightCm === '' ? undefined : Number(form.heightCm),
      age: form.age === '' ? undefined : Number(form.age),
    };
    updateProfile(payload);
    setIsEditing(false);
  };

  const handleCancel = () => {
    syncFormFromUser();
    setIsEditing(false);
  };

  const syncFormFromUser = () => {
    setForm({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      gender: user?.gender ?? '',
      age: user?.age ?? '',
      dateOfBirth: user?.dateOfBirth ?? '',
      weightKg: user?.weightKg ?? '',
      heightCm: user?.heightCm ?? '',
      fitnessGoals: user?.fitnessGoals ?? '',
      activityLevel: user?.activityLevel ?? '',
      healthPreferences: user?.healthPreferences ?? '',
    });
  };

  const handleStartEditing = () => {
    syncFormFromUser();
    setIsEditing(true);
  };

  if (!user) return null;

  return (
    <PageContainer style={{ paddingTop: '1rem' }}>
      {/* Page title - hidden visually but keep for structure; we use custom header below */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
          Profile
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', margin: 0 }}>
          Your account and fitness preferences.
        </p>
      </header>

      {/* Top section: photo + name + Edit Profile button */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2.5rem',
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '1 1 auto' }}>
          {/* Profile photo with upload + resize */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: photoSize,
                height: photoSize,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, var(--color-primary), var(--color-accent-light))',
                flexShrink: 0,
                position: 'relative',
                border: '3px solid rgba(255,255,255,0.15)',
              }}
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  <User size={photoSize * 0.5} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="outline"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Upload size={14} />
                  Upload
                </span>
              </Button>
              <Button
                variant="outline"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => cameraInputRef.current?.click()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Camera size={14} />
                  Take photo
                </span>
              </Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: 140 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Size</span>
              <input
                type="range"
                min={PHOTO_SIZE_MIN}
                max={PHOTO_SIZE_MAX}
                value={photoSize}
                onChange={(e) => setPhotoSize(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: 'var(--color-accent-lime)',
                }}
              />
            </div>
          </div>

          {/* First name + Last name */}
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800,
                color: 'white',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {user.firstName} {user.lastName}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem', marginBottom: 0 }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Edit Profile button - top-right, aligned with name */}
        <div style={{ flexShrink: 0 }}>
          {!isEditing ? (
            <Button variant="primary" onClick={handleStartEditing}>
              Edit Profile
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="primary" onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <Card title="Personal information" style={{ marginBottom: '1.5rem' }}>
        {!isEditing ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Row label="First name" value={user.firstName} />
            <Row label="Last name" value={user.lastName} />
            <Row label="Email" value={user.email} />
            <Row label="Gender" value={user.gender} />
            <Row label="Age" value={String(user.age)} />
            <Row label="Date of birth" value={user.dateOfBirth} />
          </div>
        ) : (
          <>
            <Input label="First name" value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
            <Input label="Last name" value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
            <Input label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <Input label="Gender" value={form.gender} onChange={(v) => setForm((f) => ({ ...f, gender: v }))} />
            <Input label="Age" value={String(form.age)} onChange={(v) => setForm((f) => ({ ...f, age: v }))} />
            <Input label="Date of birth" value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} />
          </>
        )}
      </Card>

      {/* Physical Metrics */}
      <Card title="Physical metrics" style={{ marginBottom: '1.5rem' }}>
        {!isEditing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            <MetricBlock label="Weight" value={`${user.weightKg ?? 75} kg`} />
            <MetricBlock label="Height" value={`${user.heightCm ?? 185} cm`} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            <Input
              label="Weight (kg)"
              value={form.weightKg === undefined || form.weightKg === null ? '' : String(form.weightKg)}
              onChange={(v) => setForm((f) => ({ ...f, weightKg: v }))}
            />
            <Input
              label="Height (cm)"
              value={form.heightCm === undefined || form.heightCm === null ? '' : String(form.heightCm)}
              onChange={(v) => setForm((f) => ({ ...f, heightCm: v }))}
            />
          </div>
        )}
      </Card>

      <Card title="Fitness goals" style={{ marginBottom: '1.5rem' }}>
        {!isEditing ? (
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>{user.fitnessGoals}</p>
        ) : (
          <Input
            value={form.fitnessGoals}
            onChange={(v) => setForm((f) => ({ ...f, fitnessGoals: v }))}
            placeholder="e.g. Build muscle, improve endurance"
          />
        )}
      </Card>

      <Card title="Activity level" style={{ marginBottom: '1.5rem' }}>
        {!isEditing ? (
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>{user.activityLevel}</p>
        ) : (
          <Input
            value={form.activityLevel}
            onChange={(v) => setForm((f) => ({ ...f, activityLevel: v }))}
            placeholder="e.g. Beginner, Intermediate"
          />
        )}
      </Card>

      <Card title="Health preferences">
        {!isEditing ? (
          <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>{user.healthPreferences}</p>
        ) : (
          <Input
            value={form.healthPreferences}
            onChange={(v) => setForm((f) => ({ ...f, healthPreferences: v }))}
            placeholder="e.g. Track macros, weekly reports"
          />
        )}
      </Card>
    </PageContainer>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function MetricBlock({ label, value }) {
  return (
    <div
      style={{
        padding: '1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-lime)' }}>{value}</div>
    </div>
  );
}