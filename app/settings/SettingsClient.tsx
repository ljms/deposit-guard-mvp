'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SettingsClientProps = {
  initialEmail: string;
  isAdmin: boolean;
};

const CARD_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '1rem',
  padding: '1.25rem 1.5rem',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  border: '1px solid #E2E8F0',
};

const INPUT_STYLE = {
  width: '100%' as const,
  padding: '0.75rem 0.9rem',
  borderRadius: '0.75rem',
  border: '1px solid #CBD5E1',
  fontSize: '0.95rem',
  outline: 'none' as const,
  color: '#0F172A',
};

const PRIMARY_BUTTON = {
  padding: '0.7rem 1.1rem',
  borderRadius: '9999px',
  border: 'none' as const,
  fontSize: '0.9rem',
  fontWeight: 600,
  backgroundColor: '#2563EB',
  color: '#ffffff',
  cursor: 'pointer' as const,
  boxShadow: '0 8px 22px rgba(37, 99, 235, 0.35)',
};

export function SettingsClient({ initialEmail, isAdmin }: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState(initialEmail);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const DELETE_CONFIRM =
    'Are you sure you want to delete your account? This will permanently delete all your properties, rooms and photos. This cannot be undone.';

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage(null);
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) {
        setEmailMessage({ type: 'error', text: error.message });
        return;
      }
      setEmailMessage({ type: 'success', text: 'Email updated successfully.' });
    } catch {
      setEmailMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage({ type: 'error', text: error.message });
        return;
      }
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm(DELETE_CONFIRM)) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.message || 'Failed to delete account. Please try again.');
        setDeleteLoading(false);
        return;
      }
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch {
      setDeleteError('Something went wrong. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F1F5F9',
        padding: '1.5rem 1.25rem 2.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#64748B',
            fontSize: '0.9rem',
            textDecoration: 'none',
            alignSelf: 'flex-start',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>←</span>
          <span>Back to dashboard</span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#0F172A',
              margin: 0,
            }}
          >
            Settings
          </h1>
          {isAdmin && (
            <Link
              href="/housekeeping"
              style={{
                fontSize: '0.85rem',
                color: '#64748B',
                textDecoration: 'none',
                padding: '0.35rem 0.7rem',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#ffffff',
              }}
            >
              Housekeeping
            </Link>
          )}
        </div>

        {/* Change Email */}
        <div style={CARD_STYLE}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.75rem',
            }}
          >
            Change Email
          </h2>
          <form onSubmit={handleUpdateEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={INPUT_STYLE}
              placeholder="Email address"
            />
            <button
              type="submit"
              disabled={emailLoading}
              style={{
                ...PRIMARY_BUTTON,
                alignSelf: 'flex-start',
                backgroundColor: emailLoading ? '#94A3B8' : '#2563EB',
                cursor: emailLoading ? 'default' : 'pointer',
              }}
            >
              {emailLoading ? 'Updating…' : 'Update Email'}
            </button>
            {emailMessage && (
              <p
                style={{
                  fontSize: '0.9rem',
                  margin: 0,
                  color: emailMessage.type === 'error' ? '#B91C1C' : '#15803D',
                }}
              >
                {emailMessage.text}
              </p>
            )}
          </form>
        </div>

        {/* Change Password */}
        <div style={CARD_STYLE}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.75rem',
            }}
          >
            Change Password
          </h2>
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              minLength={6}
              style={INPUT_STYLE}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={6}
              style={INPUT_STYLE}
            />
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                ...PRIMARY_BUTTON,
                alignSelf: 'flex-start',
                backgroundColor: passwordLoading ? '#94A3B8' : '#2563EB',
                cursor: passwordLoading ? 'default' : 'pointer',
              }}
            >
              {passwordLoading ? 'Updating…' : 'Update Password'}
            </button>
            {passwordMessage && (
              <p
                style={{
                  fontSize: '0.9rem',
                  margin: 0,
                  color: passwordMessage.type === 'error' ? '#B91C1C' : '#15803D',
                }}
              >
                {passwordMessage.text}
              </p>
            )}
          </form>
        </div>

        {/* Delete Account */}
        <div style={CARD_STYLE}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.5rem',
            }}
          >
            Delete Account
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#64748B',
              marginBottom: '1rem',
            }}
          >
            Permanently delete your account and all associated data.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            style={{
              padding: '0.7rem 1.1rem',
              borderRadius: '9999px',
              border: '1px solid #FCA5A5',
              backgroundColor: deleteLoading ? '#94A3B8' : '#FEF2F2',
              color: deleteLoading ? '#ffffff' : '#B91C1C',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: deleteLoading ? 'default' : 'pointer',
            }}
          >
            {deleteLoading ? 'Deleting…' : 'Delete Account'}
          </button>
          {deleteError && (
            <p
              style={{
                fontSize: '0.9rem',
                marginTop: '0.75rem',
                marginBottom: 0,
                color: '#B91C1C',
              }}
            >
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
