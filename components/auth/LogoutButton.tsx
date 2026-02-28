'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type LogoutButtonProps = {
  label?: string;
};

export function LogoutButton({ label = 'Log out' }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message || 'Unable to log you out. Please try again.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Something went wrong while logging you out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.4rem' }}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        style={{
          padding: '0.55rem 1.1rem',
          borderRadius: '9999px',
          border: '1px solid #CBD5E1',
          backgroundColor: '#ffffff',
          color: '#0F172A',
          fontSize: '0.9rem',
          fontWeight: 500,
          cursor: loading ? 'default' : 'pointer',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.borderColor = '#94A3B8';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {loading ? 'Signing out…' : label}
      </button>
      {error && (
        <span
          style={{
            fontSize: '0.78rem',
            color: '#B91C1C',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

