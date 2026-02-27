'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please double-check and try again.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message || 'Unable to create your account. Please try again.');
        return;
      }

      // Ensure the user can proceed immediately after signup.
      await supabase.auth.signInWithPassword({ email, password });

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Something went wrong while creating your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A1A86',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          padding: '2rem 1.75rem',
          boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            marginBottom: '1.75rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Image
            src="/dg-logo-dark.png"
            alt="Deposit Guard – rental deposit protection"
            width={400}
            height={130}
            priority
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#0F172A',
            }}
          >
            Create your account
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#64748B',
            }}
          >
            Set up Deposit Guard to document your rental&apos;s condition and protect your deposit from day one.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 0.9rem',
              borderRadius: '0.75rem',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              fontSize: '0.9rem',
              border: '1px solid #FECACA',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="email"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#008BFF';
                e.target.style.boxShadow = '0 0 0 1px rgba(0, 139, 255, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="password"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#008BFF';
                e.target.style.boxShadow = '0 0 0 1px rgba(0, 139, 255, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="confirmPassword"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#008BFF';
                e.target.style.boxShadow = '0 0 0 1px rgba(0, 139, 255, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              backgroundColor: loading ? '#60A5FA' : '#008BFF',
              color: '#ffffff',
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 12px 30px rgba(0, 139, 255, 0.45)',
              transition: 'background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(1px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 139, 255, 0.35)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 139, 255, 0.45)';
            }}
          >
            {loading ? 'Creating your account…' : 'Sign up'}
          </button>
        </form>

        <p
          style={{
            marginTop: '1.25rem',
            fontSize: '0.85rem',
            color: '#94A3B8',
            textAlign: 'center',
          }}
        >
          Already have an account?{' '}
          <a
            href="/login"
            style={{
              color: '#008BFF',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}

