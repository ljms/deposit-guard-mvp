'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogoutButton } from '@/components/auth/LogoutButton';

type Property = {
  id: string | number;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  is_locked?: boolean | null;
};

type ReportSummary = {
  property_id: string | number;
  storage_path: string;
  created_at: string | null;
};

type DashboardClientProps = {
  properties: Property[];
  reports: ReportSummary[];
};

const CONFIRM_MESSAGE =
  'Are you sure you want to delete this property? This will delete all rooms and photos associated with it. This cannot be undone.';

export function DashboardClient({ properties, reports }: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  async function handleDeleteProperty(property: Property, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(CONFIRM_MESSAGE)) return;
    setError(null);
    setDeletingId(property.id);
    try {
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);
      if (deleteError) {
        setError(deleteError.message || 'Unable to delete property. Please try again.');
        return;
      }
      router.refresh();
    } catch (err) {
      setError('Something went wrong while deleting the property. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadReport(
    property: Property,
    report: ReportSummary,
    e: React.MouseEvent
  ) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setDownloadingPath(report.storage_path);
    try {
      const { data, error: urlError } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.storage_path, 3600);
      if (urlError || !data?.signedUrl) {
        setError(urlError?.message || 'Failed to generate download link.');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Something went wrong while downloading the report. Please try again.');
    } finally {
      setDownloadingPath(null);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F1F5F9', // light grey SaaS-style background
        padding: '1.5rem 1.25rem 2.5rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          padding: '1.5rem 1.5rem 1.75rem',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Link
            href="/settings"
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#ffffff',
              color: '#64748B',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Settings
          </Link>
          <LogoutButton />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <Image
            src="/dg-logo-dark.png"
            alt="Deposit Guard – rental deposit protection"
            width={140}
            height={46}
            priority
          />
        </div>

        <div
          style={{
            marginTop: '0.75rem',
          }}
        >
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 600,
              marginBottom: '0.35rem',
              color: '#0F172A',
            }}
          >
            Your Properties
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#64748B',
            }}
          >
            Keep a clear, time-stamped record of each rental&apos;s condition so you&apos;re always
            prepared for deposit conversations.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
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

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {properties.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.75rem 1rem',
                borderRadius: '1rem',
                border: '1px dashed #CBD5E1',
                backgroundColor: '#F8FAFC',
                textAlign: 'center',
                gap: '0.4rem',
              }}
            >
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: '#0F172A',
                }}
              >
                No properties yet
              </p>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#64748B',
                  maxWidth: '18rem',
                }}
              >
                Add your first property to get started and begin documenting its condition in minutes.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.9rem',
              }}
            >
              {properties.map((property) => {
                const isLocked = Boolean(property.is_locked);
                const report = reports.find(
                  (r) => String(r.property_id) === String(property.id)
                );
                return (
                  <div
                    key={property.id}
                    style={{
                      padding: '0.9rem 1rem',
                      borderRadius: '0.9rem',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Link
                        href={`/properties/${property.id}/rooms`}
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <p
                          style={{
                            fontSize: '0.98rem',
                            fontWeight: 600,
                            color: '#0F172A',
                          }}
                        >
                          {property.address_line1 || 'Unnamed property'}
                        </p>
                        <p
                          style={{
                            fontSize: '0.88rem',
                            color: '#64748B',
                          }}
                        >
                          {[property.city, property.postcode].filter(Boolean).join(' • ')}
                        </p>
                      </Link>
                      {isLocked && (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Locked
                        </span>
                      )}
                    </div>
                    {report && (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadReport(property, report, e)}
                        disabled={downloadingPath === report.storage_path}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '9999px',
                          border: '1px solid #DBEAFE',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor:
                            downloadingPath === report.storage_path ? 'default' : 'pointer',
                        }}
                      >
                        {downloadingPath === report.storage_path
                          ? 'Downloading…'
                          : 'Download Report'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProperty(property, e)}
                      disabled={deletingId === property.id}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '9999px',
                        border: '1px solid #FCA5A5',
                        backgroundColor: '#FEF2F2',
                        color: '#B91C1C',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: deletingId === property.id ? 'default' : 'pointer',
                      }}
                    >
                      {deletingId === property.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Link
          href="/properties/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '0.75rem',
            width: '100%',
            padding: '0.9rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            backgroundColor: '#2563EB',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 14px 34px rgba(37, 99, 235, 0.45)',
            textDecoration: 'none',
            transition:
              'background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
          }}
        >
          Add Property
        </Link>
      </div>
    </div>
  );
}

