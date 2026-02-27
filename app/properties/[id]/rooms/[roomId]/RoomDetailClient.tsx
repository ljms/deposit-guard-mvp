'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
};

type Room = {
  id: string | number;
  display_name: string | null;
  room_type: string;
  custom_name: string | null;
  property_id: string | number;
};

type Photo = {
  id: string | number;
  storage_path: string;
  note: string | null;
  taken_at: string | null;
};

type RoomDetailClientProps = {
  userId: string;
  property: Property;
  room: Room;
  initialPhotos: Photo[];
  isLocked: boolean;
};

const CARD_STYLE = {
  backgroundColor: '#ffffff',
  borderRadius: '1rem',
  padding: '1rem 1.25rem',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  border: '1px solid #E2E8F0',
};

const PRIMARY_BUTTON_STYLE = {
  padding: '0.85rem 1.25rem',
  borderRadius: '9999px',
  border: 'none' as const,
  fontSize: '0.95rem',
  fontWeight: 600,
  backgroundColor: '#2563EB',
  color: '#ffffff',
  cursor: 'pointer' as const,
  boxShadow: '0 12px 30px rgba(37, 99, 235, 0.45)',
};

export function RoomDetailClient({
  userId,
  property,
  room,
  initialPhotos,
  isLocked,
}: RoomDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'preview' | 'note'>('idle');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomName = room.display_name || room.custom_name || room.room_type || 'Room';
  const addressLines = [
    property.address_line1,
    property.address_line2,
    [property.city, property.postcode].filter(Boolean).join(' '),
  ].filter((line) => line && String(line).trim().length > 0) as string[];

  // Load signed URLs for photos (storage is typically private)
  useEffect(() => {
    const loadUrls = async () => {
      const map: Record<string, string> = {};
      for (const p of photos) {
        const { data } = await supabase.storage
          .from('photos')
          .createSignedUrl(p.storage_path, 60 * 60);
        if (data?.signedUrl) map[String(p.id)] = data.signedUrl;
      }
      setPhotoUrls(map);
    };
    loadUrls();
  }, [photos]);

  function openCamera() {
    if (isLocked) return;
    setError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPreviewFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    setStep('preview');
    e.target.value = '';
  }

  function retake() {
    if (isLocked) return;
    setPreviewFile(null);
    setPreviewDataUrl(null);
    setStep('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function usePhoto() {
    setStep('note');
    setNote('');
  }

  async function savePhoto() {
    if (isLocked) return;
    if (!previewFile) return;
    setLoading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const storagePath = `${userId}/${property.id}/${room.id}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, previewFile, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        setError(uploadError.message || 'Failed to upload photo.');
        setLoading(false);
        return;
      }

      const takenAt = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from('photos')
        .insert({
          room_id: room.id,
          property_id: property.id,
          user_id: userId,
          storage_path: storagePath,
          note: note.trim() || null,
          taken_at: takenAt,
        })
        .select('id, storage_path, note, taken_at')
        .single();

      if (insertError) {
        setError(insertError.message || 'Failed to save photo record.');
        setLoading(false);
        return;
      }

      setPhotos((prev) => [inserted as Photo, ...prev]);
      retake();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function deletePhoto(photo: Photo) {
    if (isLocked) return;
    setLoading(true);
    setError(null);
    try {
      await supabase.storage.from('photos').remove([photo.storage_path]);
      const { error: deleteError } = await supabase.from('photos').delete().eq('id', photo.id);
      if (deleteError) {
        setError(deleteError.message || 'Failed to delete photo.');
        setLoading(false);
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const roomsPath = `/properties/${property.id}/rooms`;

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
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <Link
          href={roomsPath}
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
          <span>Back to rooms</span>
        </Link>

        {isLocked && (
          <div
            style={{
              ...CARD_STYLE,
              backgroundColor: '#EFF6FF',
              borderColor: '#BFDBFE',
              color: '#1D4ED8',
              padding: '0.75rem 1rem',
            }}
          >
            This property is locked. No further photos can be added.
          </div>
        )}

        <div style={CARD_STYLE}>
          <p
            style={{
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              color: '#64748B',
              marginBottom: '0.35rem',
            }}
          >
            {photos.length} photo{photos.length !== 1 ? 's' : ''} captured
          </p>
          <h1
            style={{
              fontSize: '1.35rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.25rem',
            }}
          >
            {roomName}
          </h1>
          {addressLines.slice(0, 2).map((line, i) => (
            <p
              key={i}
              style={{ fontSize: '0.9rem', color: '#64748B', marginTop: i === 0 ? 0 : '0.15rem' }}
            >
              {line}
            </p>
          ))}
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

        {step === 'idle' && !isLocked && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-hidden
            />
            <button
              type="button"
              onClick={openCamera}
              disabled={loading}
              style={{
                ...PRIMARY_BUTTON_STYLE,
                width: '100%',
                padding: '1rem 1.25rem',
                fontSize: '1rem',
              }}
            >
              Take Photo
            </button>
          </>
        )}

        {step === 'preview' && previewDataUrl && !isLocked && (
          <div style={CARD_STYLE}>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0F172A', marginBottom: '0.75rem' }}>
              Preview
            </p>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4/3',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                backgroundColor: '#0F172A',
                marginBottom: '1rem',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDataUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={retake}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Retake
              </button>
              <button
                type="button"
                onClick={usePhoto}
                style={{
                  flex: 1,
                  ...PRIMARY_BUTTON_STYLE,
                }}
              >
                Use Photo
              </button>
            </div>
          </div>
        )}

        {step === 'note' && !isLocked && (
          <div style={CARD_STYLE}>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0F172A', marginBottom: '0.5rem' }}>
              Add an optional note
            </p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="e.g. Scratch on wall near door"
              maxLength={500}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                color: '#0F172A',
                marginBottom: '0.5rem',
              }}
            />
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '1rem' }}>
              {note.length}/500
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={retake}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePhoto}
                disabled={loading}
                style={{
                  flex: 1,
                  ...PRIMARY_BUTTON_STYLE,
                  backgroundColor: loading ? '#94A3B8' : '#2563EB',
                }}
              >
                {loading ? 'Saving…' : 'Save Photo'}
              </button>
            </div>
          </div>
        )}

        <div>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.75rem',
            }}
          >
            Photos
          </h2>
          {photos.length === 0 ? (
            <div
              style={{
                ...CARD_STYLE,
                textAlign: 'center',
                padding: '2rem',
                color: '#64748B',
                fontSize: '0.95rem',
              }}
            >
              No photos yet. Tap &quot;Take Photo&quot; to capture the room condition.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    ...CARD_STYLE,
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      backgroundColor: '#E2E8F0',
                    }}
                  >
                    {photoUrls[String(photo.id)] ? (
                      <Image
                        src={photoUrls[String(photo.id)]}
                        alt=""
                        fill
                        sizes="140px"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                          fontSize: '0.8rem',
                        }}
                      >
                        Loading…
                      </div>
                    )}
                  </div>
                  {photo.note && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#475569',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}
                    >
                      {photo.note}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo)}
                    disabled={loading}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '9999px',
                      border: '1px solid #FCA5A5',
                      backgroundColor: '#FEF2F2',
                      color: '#B91C1C',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
