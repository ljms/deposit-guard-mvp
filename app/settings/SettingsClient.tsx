'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PageWrapper from '@/components/PageWrapper';

type SettingsClientProps = {
  initialEmail: string;
  isAdmin: boolean;
};

const fontStyle = { fontFamily: 'var(--font-poppins), Poppins, sans-serif' };
const inputClass =
  'w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20';

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
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

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

  async function handleLogOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function openDeleteAccountModal() {
    setDeleteError(null);
    setDeletePassword('');
    setShowDeleteAccountModal(true);
  }

  async function confirmDeleteAccount() {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: initialEmail,
        password: deletePassword,
      });
      if (signInError) {
        setDeleteError('Incorrect password. Please try again.');
        setDeleteLoading(false);
        return;
      }
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.message || 'Failed to delete account. Please try again.');
        setDeleteLoading(false);
        return;
      }
      setShowDeleteAccountModal(false);
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
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-20">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Back to dashboard"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                Settings
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full flex flex-col gap-6">
          {/* Change Email */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-[#0F172A] mb-4" style={fontStyle}>
              Change Email
            </h2>
            <form onSubmit={handleUpdateEmail} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                style={fontStyle}
                placeholder="Email address"
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-3 rounded-lg bg-[#008bff] text-white font-medium text-base hover:bg-[#0077e6] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                style={{ ...fontStyle, color: '#ffffff' }}
              >
                {emailLoading ? 'Updating…' : 'Update Email'}
              </button>
              {emailMessage && (
                <p
                  className={`text-sm ${emailMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
                  style={fontStyle}
                >
                  {emailMessage.text}
                </p>
              )}
            </form>
          </div>

          {/* Change Password */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-[#0F172A] mb-4" style={fontStyle}>
              Change Password
            </h2>
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                minLength={6}
                className={inputClass}
                style={fontStyle}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
                className={inputClass}
                style={fontStyle}
              />
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 rounded-lg bg-[#008bff] text-white font-medium text-base hover:bg-[#0077e6] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                style={{ ...fontStyle, color: '#ffffff' }}
              >
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </button>
              {passwordMessage && (
                <p
                  className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
                  style={fontStyle}
                >
                  {passwordMessage.text}
                </p>
              )}
            </form>
          </div>

          {/* Log Out */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-[#0F172A] mb-2" style={fontStyle}>
              Log Out
            </h2>
            <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
              Sign out of your account on this device.
            </p>
            <button
              type="button"
              onClick={handleLogOut}
              className="w-full py-3 rounded-lg border border-gray-200 text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors"
              style={fontStyle}
            >
              Log Out
            </button>
          </div>

          {/* Delete Account */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-[#0F172A] mb-2" style={fontStyle}>
              Delete Account
            </h2>
            <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
              Permanently delete your account and all associated data.
            </p>
            <button
              type="button"
              onClick={openDeleteAccountModal}
              disabled={deleteLoading}
              className="w-full py-3 rounded-lg bg-red-500 text-white font-medium text-base hover:bg-red-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              style={{ ...fontStyle, color: '#ffffff' }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete Account'}
            </button>
            {deleteError && (
              <p className="text-sm text-red-600 mt-3" style={fontStyle}>
                {deleteError}
              </p>
            )}
          </div>
        </main>

        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-[#0F172A] mb-3" style={fontStyle}>
                Delete Account
              </h2>
              <p className="text-sm text-[#414651] mb-4" style={fontStyle}>
                Are you sure you want to delete your account? This action cannot be undone and will permanently delete:
              </p>
              <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-100">
                <ul className="list-disc list-inside text-sm text-red-600 space-y-1.5" style={fontStyle}>
                  <li>All your personal data</li>
                  <li>Your saved preferences</li>
                  <li>Access to all services</li>
                </ul>
              </div>
              <label className="block mb-4">
                <span className="text-sm font-medium text-[#0F172A] mb-1.5 block" style={fontStyle}>
                  Enter your password to confirm
                </span>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    if (deleteError) setDeleteError(null);
                  }}
                  placeholder="Password"
                  className={inputClass}
                  style={fontStyle}
                  autoComplete="current-password"
                />
              </label>
              {deleteError && (
                <p className="text-sm text-red-600 mb-4" style={fontStyle}>
                  {deleteError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="flex-[1] py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-[#008bff] hover:bg-[#0077e6] transition-colors"
                  style={{ ...fontStyle, color: '#ffffff' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAccount}
                  disabled={deleteLoading || !deletePassword.trim()}
                  className="flex-[2] py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  style={{ ...fontStyle, color: '#ffffff' }}
                >
                  {deleteLoading ? 'Deleting…' : 'Delete my Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 w-full lg:max-w-[1080px] lg:left-1/2 lg:-translate-x-1/2 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
          <div className="flex justify-around max-w-[720px] mx-auto">
            <Link href="/dashboard" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="text-xs font-medium" style={fontStyle}>Home</span>
            </Link>
            <Link href="/properties" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-xs font-medium" style={fontStyle}>Properties</span>
            </Link>
            <Link href="/settings" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              <span className="text-xs font-medium" style={fontStyle}>Settings</span>
            </Link>
            <button type="button" className="active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-xs font-medium" style={fontStyle}>Help</span>
            </button>
          </div>
        </nav>
      </div>
    </PageWrapper>
  );
}
