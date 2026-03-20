'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from "lucide-react";
import { createClient } from '@/lib/supabase/client';

const MOBILE_USER_AGENT_RE =
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i;

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: 'easeInOut' as const },
};

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
  report_id: string;
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
  reportId: string;
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
  reportId,
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
  const [step, setStep] = useState<'idle' | 'preview'>('idle');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(MOBILE_USER_AGENT_RE.test(navigator.userAgent));
  }, []);

  const roomName = room.display_name || room.custom_name || room.room_type || 'Room';
  const addressLines = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
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
    if (!isMobileDevice) return;
    setError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isLocked) return;
    if (!isMobileDevice) return;
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setNote('');
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
          report_id: reportId,
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
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#64748B',
            fontSize: '0.9rem',
            textDecoration: 'none',
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>←</span>
          <span>Back to rooms</span>
        </button>

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

        {!isLocked && (
          <>
            {isMobileDevice ? (
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
            ) : (
              <div style={CARD_STYLE}>
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-md px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-amber-800">
                    Photos can only be taken from a mobile device. Open this report on your phone to add photos.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <AnimatePresence>
          {step === 'preview' && previewDataUrl && !isLocked && (
            <motion.div
              key="photo-preview-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 50,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  overflowY: 'auto',
                }}
                onClick={(e) => e.target === e.currentTarget && retake()}
              >
                <motion.div
                  {...fadeScaleTransition}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: '420px',
                    maxHeight: '100%',
                    minHeight: 'min(500px, 85vh)',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      flex: '1 1 auto',
                      minHeight: 0,
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      backgroundColor: '#111',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewDataUrl}
                      alt="Preview"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        maxHeight: '60vh',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 500))}
                    placeholder="Add a note about this photo (optional)"
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '0.75rem',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '-0.5rem 0 0', padding: 0 }}>
                    {note.length}/500
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={retake}
                      style={{
                        flex: 1,
                        padding: '0.85rem 1rem',
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
                      onClick={savePhoto}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '0.85rem 1rem',
                        borderRadius: '9999px',
                        border: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        backgroundColor: loading ? '#94A3B8' : '#008bff',
                        color: '#ffffff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Saving…' : 'Save Photo'}
                    </button>
                  </div>
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
              {isMobileDevice
                ? 'No photos yet. Tap "Take Photo" to capture the room condition.'
                : 'No photos yet.'}
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
                      paddingBottom: '100%',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      backgroundColor: '#E2E8F0',
                    }}
                  >
                    {photoUrls[String(photo.id)] ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <Image
                          src={photoUrls[String(photo.id)]}
                          alt=""
                          fill
                          sizes="140px"
                          style={{ objectFit: 'cover', objectPosition: 'center' }}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
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
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => deletePhoto(photo)}
                        disabled={loading}
                        className="absolute top-1 right-1.5 w-4 h-4 flex items-center justify-center bg-white/40 rounded border-0 text-sm cursor-pointer"
                        aria-label="Delete photo"
                      >
                        <span
                          style={{ color: '#ef4444', textShadow: '0 0 2px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          X
                        </span>
                      </button>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
