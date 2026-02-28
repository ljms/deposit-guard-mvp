'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NewPropertyClient() {
  const router = useRouter();
  const supabase = createClient();

  const [reportType, setReportType] = useState<'check-in' | 'interim' | 'check-out' | ''>('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [propertyType, setPropertyType] = useState<'House' | 'Apartment' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!addressLine1.trim()) {
      setError('Address line 1 is required.');
      return;
    }

    if (!city.trim()) {
      setError('City is required.');
      return;
    }

    if (!postcode.trim()) {
      setError('Postcode is required.');
      return;
    }

    if (!reportType) {
      setError('Please select a report type.');
      return;
    }

    if (!propertyType) {
      setError('Please select a property type.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message || 'Unable to determine the current user.');
        setLoading(false);
        return;
      }

      if (!user) {
        router.push('/');
        return;
      }

      const { error: insertError } = await supabase.from('properties').insert({
        user_id: user.id,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        city: city.trim(),
        postcode: postcode.trim(),
        property_type: propertyType,
      });

      if (insertError) {
        setError(insertError.message || 'Unable to save your property. Please try again.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Something went wrong while saving your property. Please try again.');
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
        backgroundColor: '#0F172A',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          padding: '2rem 1.75rem 1.75rem',
          boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '1rem' }}>←</span>
            <span>Back to dashboard</span>
          </button>
        </div>

        <div>
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 600,
              marginBottom: '0.4rem',
              color: '#0F172A',
            }}
          >
            Create new report
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#64748B',
            }}
          >
            Select a report type and add your property details to get started.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginTop: '0.25rem',
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
              htmlFor="reportType"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Report type
            </label>
            <select
              id="reportType"
              required
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'check-in' | 'interim' | 'check-out')}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#0F172A',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="" disabled>
                Select report type
              </option>
              <option value="check-in">Check-In Report</option>
              <option value="interim">Interim Report</option>
              <option value="check-out">Check-Out Report</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="addressLine1"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Address line 1
            </label>
            <input
              id="addressLine1"
              type="text"
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                color: '#0F172A',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="addressLine2"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Address line 2 (optional)
            </label>
            <input
              id="addressLine2"
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                color: '#0F172A',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="city"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              City
            </label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                color: '#0F172A',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="postcode"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Postcode
            </label>
            <input
              id="postcode"
              type="text"
              required
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                color: '#0F172A',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="propertyType"
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Property type
            </label>
            <select
              id="propertyType"
              required
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as 'House' | 'Apartment')}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#0F172A',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2563EB';
                e.target.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="" disabled>
                Select a type
              </option>
              <option value="House">House</option>
              <option value="Apartment">Apartment</option>
            </select>
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
              backgroundColor: loading ? '#60A5FA' : '#2563EB',
              color: '#ffffff',
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 12px 30px rgba(37, 99, 235, 0.45)',
              transition: 'background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
            }}
          >
            {loading ? 'Saving property…' : 'Save property'}
          </button>
        </form>
      </div>
    </div>
  );
}

