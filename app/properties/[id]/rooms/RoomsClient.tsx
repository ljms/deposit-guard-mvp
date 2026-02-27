'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import * as exifr from 'exifr';
import { createClient } from '@/lib/supabase/client';

type RoomType =
  | 'Living Room'
  | 'Kitchen'
  | 'Bedroom'
  | 'Bathroom'
  | 'Ensuite'
  | 'Hallway'
  | 'Garden'
  | 'Balcony'
  | 'Terrace'
  | 'Storage'
  | 'Utility'
  | 'Custom';

type RoomRow = {
  id: string | number;
  room_type: RoomType;
  custom_name: string | null;
  display_name: string | null;
  property_id: string | number;
  created_at: string | null;
};

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  number_of_rooms: number;
};

type PhotoRow = {
  id: string | number;
  room_id: string | number;
  storage_path: string;
  note: string | null;
  taken_at: string | null;
};

type RoomsClientProps = {
  userId: string;
  property: Property;
  initialRooms: RoomRow[];
  totalPhotoCount: number;
};

const ROOM_TYPES: { label: string; value: RoomType }[] = [
  { label: 'Living Room', value: 'Living Room' },
  { label: 'Kitchen', value: 'Kitchen' },
  { label: 'Bedroom', value: 'Bedroom' },
  { label: 'Bathroom', value: 'Bathroom' },
  { label: 'Ensuite', value: 'Ensuite' },
  { label: 'Hallway', value: 'Hallway' },
  { label: 'Garden', value: 'Garden' },
  { label: 'Balcony', value: 'Balcony' },
  { label: 'Terrace', value: 'Terrace' },
  { label: 'Storage', value: 'Storage' },
  { label: 'Utility', value: 'Utility' },
  { label: 'Custom', value: 'Custom' },
];

export function RoomsClient({ userId, property, initialRooms, totalPhotoCount }: RoomsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [rooms, setRooms] = useState<RoomRow[]>(initialRooms);
  const [selectedType, setSelectedType] = useState<RoomType | null>(null);
  const [customName, setCustomName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingRooms, setIsEditingRooms] = useState(false);
  const [editRoomsValue, setEditRoomsValue] = useState(property.number_of_rooms ?? 1);
  const [savingRooms, setSavingRooms] = useState(false);

  const totalRooms = property.number_of_rooms ?? 0;
  const currentCount = rooms.length;
  const canContinue = totalRooms > 0 && currentCount === totalRooms;

  function buildGroupKey(room: { room_type: RoomType; custom_name: string | null }) {
    if (room.room_type === 'Custom') {
      return (room.custom_name || 'Custom').trim() || 'Custom';
    }
    return room.room_type;
  }

  async function renumberAndPersist(updatedRooms: RoomRow[]) {
    // Compute new display names grouped by type/custom name
    const groups: Record<string, RoomRow[]> = {};

    updatedRooms.forEach((room) => {
      const key = buildGroupKey(room);
      if (!groups[key]) groups[key] = [];
      groups[key].push(room);
    });

    const nextRooms: RoomRow[] = [];
    const updates: { id: RoomRow['id']; display_name: string }[] = [];

    Object.values(groups).forEach((group) => {
      // Sort by created_at then id for stable ordering
      const sorted = [...group].sort((a, b) => {
        if (a.created_at && b.created_at && a.created_at !== b.created_at) {
          return a.created_at < b.created_at ? -1 : 1;
        }
        return String(a.id).localeCompare(String(b.id));
      });

      const baseName = buildGroupKey(sorted[0]);
      if (sorted.length === 1) {
        const room = sorted[0];
        const newDisplay = baseName;
        nextRooms.push({ ...room, display_name: newDisplay });
        if (room.display_name !== newDisplay) {
          updates.push({ id: room.id, display_name: newDisplay });
        }
      } else {
        sorted.forEach((room, index) => {
          const newDisplay = `${baseName} ${index + 1}`;
          nextRooms.push({ ...room, display_name: newDisplay });
          if (room.display_name !== newDisplay) {
            updates.push({ id: room.id, display_name: newDisplay });
          }
        });
      }
    });

    setRooms(
      nextRooms.sort((a, b) => {
        if (a.created_at && b.created_at && a.created_at !== b.created_at) {
          return a.created_at < b.created_at ? -1 : 1;
        }
        return String(a.id).localeCompare(String(b.id));
      })
    );

    if (updates.length > 0) {
      // Persist display_name changes
      await Promise.all(
        updates.map((u) =>
          supabase.from('rooms').update({ display_name: u.display_name }).eq('id', u.id)
        )
      );
    }
  }

  async function handleAddRoom() {
    if (!selectedType) {
      setError('Please select a room type.');
      return;
    }

    const isCustom = selectedType === 'Custom';
    const trimmedCustom = customName.trim();

    if (isCustom && !trimmedCustom) {
      setError('Please enter a name for the custom room.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('rooms')
        .insert({
          property_id: property.id,
          user_id: userId,
          room_type: selectedType,
          custom_name: isCustom ? trimmedCustom : null,
          display_name: isCustom ? trimmedCustom : selectedType,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message || 'Unable to add room. Please try again.');
        setLoading(false);
        return;
      }

      const newRooms = [...rooms, data as RoomRow];
      await renumberAndPersist(newRooms);

      // Reset selection
      setSelectedType(null);
      setCustomName('');
      setIsAdding(false);
    } catch (err) {
      setError('Something went wrong while adding the room. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRoom(id: RoomRow['id']) {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase.from('rooms').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Unable to delete room. Please try again.');
        setLoading(false);
        return;
      }

      const remaining = rooms.filter((room) => room.id !== id);
      await renumberAndPersist(remaining);
    } catch (err) {
      setError('Something went wrong while deleting the room. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function startEditingRooms() {
    setEditRoomsValue(property.number_of_rooms ?? 1);
    setError(null);
    setIsEditingRooms(true);
  }

  async function handleSaveNumberOfRooms() {
    const value = Math.min(12, Math.max(1, Number(editRoomsValue)));
    if (value < rooms.length) {
      setError(
        'You have already added more rooms than this. Please delete some rooms first.'
      );
      return;
    }
    setSavingRooms(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('properties')
        .update({ number_of_rooms: value })
        .eq('id', property.id);
      if (updateError) {
        setError(updateError.message || 'Unable to update. Please try again.');
        return;
      }
      setIsEditingRooms(false);
      router.refresh();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSavingRooms(false);
    }
  }

  async function generateReport() {
    if (totalPhotoCount === 0) return;
    setReportGenerating(true);
    setError(null);
    try {
      const { data: photos } = await supabase
        .from('photos')
        .select('id, room_id, storage_path, note, taken_at')
        .eq('property_id', property.id)
        .order('taken_at', { ascending: true });

      if (!photos?.length) {
        setError('No photos found to include in the report.');
        setReportGenerating(false);
        return;
      }

      const photosWithData: { photo: PhotoRow; dataUrl: string; width: number; height: number }[] = [];
      for (const photo of photos as PhotoRow[]) {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrl(photo.storage_path, 3600);
        if (!signed?.signedUrl) continue;

        const res = await fetch(signed.signedUrl);
        const blob = await res.blob();

        // Read EXIF orientation to correct rotation
        let orientation = 1;
        try {
          const exifData: any = await exifr.parse(blob, { pick: ['Orientation'] });
          if (exifData?.Orientation) {
            orientation = exifData.Orientation;
          }
        } catch {
          // If EXIF read fails, fall back to default orientation
        }

        const objectUrl = URL.createObjectURL(blob);
        const img = new window.Image();
        img.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          continue;
        }

        // Set canvas size and transform based on EXIF orientation
        switch (orientation) {
          case 3: // 180°
            canvas.width = srcW;
            canvas.height = srcH;
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            break;
          case 6: // 90° CW
            canvas.width = srcH;
            canvas.height = srcW;
            ctx.translate(canvas.width, 0);
            ctx.rotate(Math.PI / 2);
            break;
          case 8: // 270° CW
            canvas.width = srcH;
            canvas.height = srcW;
            ctx.translate(0, canvas.height);
            ctx.rotate(-Math.PI / 2);
            break;
          default: // 1 or unknown
            canvas.width = srcW;
            canvas.height = srcH;
        }

        ctx.drawImage(img, 0, 0, srcW, srcH);
        URL.revokeObjectURL(objectUrl);

        const correctedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        photosWithData.push({
          photo,
          dataUrl: correctedDataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      const footerY = pageH - 12;

      function addFooter(pageNum: number) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Deposit Guard', margin, footerY);
        doc.text(`Page ${pageNum}`, pageW - margin, footerY, { align: 'right' });
      }

      const reportDate = new Date();
      const dateStr = reportDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = reportDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Deposit Guard', pageW / 2, 35, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Property Condition Report', pageW / 2, 48, { align: 'center' });
      doc.setFontSize(11);
      const addrLines = [
        property.address_line1,
        property.address_line2,
        [property.city, property.postcode].filter(Boolean).join(' '),
      ].filter(Boolean) as string[];
      let y = 65;
      addrLines.forEach((line) => {
        doc.text(line, pageW / 2, y, { align: 'center' });
        y += 7;
      });
      y += 5;
      doc.text(`Report generated: ${dateStr} at ${timeStr}`, pageW / 2, y, { align: 'center' });
      y += 12;
      doc.setFontSize(9);
      doc.text(
        `This report documents property condition as of ${dateStr}. Photos are timestamped for evidential purposes.`,
        pageW / 2,
        y,
        { maxWidth: contentW, align: 'center' }
      );
      addFooter(1);

      const imgMaxW = contentW;
      const imgMaxH = 140;

      rooms.forEach((room) => {
        const roomPhotos = photosWithData.filter((p) => String(p.photo.room_id) === String(room.id));
        if (roomPhotos.length === 0) return;

        doc.addPage();
        let roomY = margin + 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(room.display_name || buildGroupKey(room), margin, roomY);
        roomY += 12;

        for (const { photo, dataUrl, width, height } of roomPhotos) {
          const scale = Math.min(imgMaxW / width, imgMaxH / height, 1);
          const w = width * scale;
          const h = height * scale;
          if (roomY + h > footerY - 20) {
            addFooter(doc.getNumberOfPages());
            doc.addPage();
            roomY = margin;
          }
          doc.addImage(dataUrl, 'JPEG', margin, roomY, w, h);
          roomY += h + 4;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const takenAt = photo.taken_at
            ? new Date(photo.taken_at).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—';
          doc.text(`Taken: ${takenAt}`, margin, roomY);
          roomY += 6;
          if (photo.note && photo.note.trim()) {
            const noteLines = doc.splitTextToSize(photo.note.trim(), contentW);
            doc.text(noteLines, margin, roomY);
            roomY += noteLines.length * 5 + 8;
          } else {
            roomY += 6;
          }
        }

        addFooter(doc.getNumberOfPages());
      });

      const safeAddress = (property.address_line1 || 'Property').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').slice(0, 50);
      const dateForFile = reportDate.toISOString().slice(0, 10);
      doc.save(`DepositGuard_Report_${safeAddress}_${dateForFile}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  }

  const addressLines = [
    property.address_line1,
    property.address_line2,
    [property.city, property.postcode].filter(Boolean).join(' '),
  ].filter((line) => line && String(line).trim().length > 0) as string[];

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
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          padding: '1.5rem 1.5rem 1.75rem',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={{
            alignSelf: 'flex-start',
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

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.3rem',
            }}
          >
            <p
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                color: '#64748B',
                margin: 0,
              }}
            >
              Property
            </p>
            {!isEditingRooms && (
              <button
                type="button"
                onClick={startEditingRooms}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#ffffff',
                  color: '#64748B',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
            )}
          </div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.1rem',
            }}
          >
            {property.address_line1 || 'Unnamed property'}
          </h1>
          {addressLines.slice(1).map((line, idx) => (
            <p
              key={idx}
              style={{
                fontSize: '0.9rem',
                color: '#64748B',
              }}
            >
              {line}
            </p>
          ))}

          {isEditingRooms && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '0.9rem',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <label
                htmlFor="edit-number-of-rooms"
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#0F172A',
                }}
              >
                Number of rooms
              </label>
              <input
                id="edit-number-of-rooms"
                type="number"
                min={1}
                max={12}
                value={editRoomsValue}
                onChange={(e) =>
                  setEditRoomsValue(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                }
                style={{
                  width: '100%',
                  maxWidth: '6rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.95rem',
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
              {editRoomsValue < rooms.length && (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#B91C1C',
                    margin: 0,
                  }}
                >
                  You have already added more rooms than this. Please delete some rooms first.
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingRooms(false);
                    setError(null);
                  }}
                  disabled={savingRooms}
                  style={{
                    padding: '0.6rem 0.9rem',
                    borderRadius: '9999px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#ffffff',
                    color: '#0F172A',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNumberOfRooms}
                  disabled={savingRooms || editRoomsValue < rooms.length}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    backgroundColor:
                      savingRooms || editRoomsValue < rooms.length ? '#94A3B8' : '#2563EB',
                    color: '#ffffff',
                    cursor: savingRooms || editRoomsValue < rooms.length ? 'default' : 'pointer',
                    boxShadow:
                      savingRooms || editRoomsValue < rooms.length
                        ? 'none'
                        : '0 8px 22px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {savingRooms ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              fontSize: '0.9rem',
              color: '#64748B',
            }}
          >
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {currentCount} of {totalRooms}
            </span>{' '}
            rooms added
          </p>

          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
            }}
            disabled={loading}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '9999px',
              border: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              backgroundColor: '#2563EB',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(37, 99, 235, 0.35)',
            }}
          >
            Add Room
          </button>
        </div>

        {error && (
          <div
            style={{
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

        {isAdding && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.9rem',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <p
              style={{
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              Select a room type
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              {ROOM_TYPES.map((room) => {
                const isSelected = selectedType === room.value;
                return (
                  <button
                    key={room.value}
                    type="button"
                    onClick={() => setSelectedType(room.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '9999px',
                      border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : '#ffffff',
                      color: isSelected ? '#1D4ED8' : '#0F172A',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {room.label}
                  </button>
                );
              })}
            </div>

            {selectedType === 'Custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label
                  htmlFor="customRoom"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: '#0F172A',
                  }}
                >
                  Custom room name
                </label>
                <input
                  id="customRoom"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Study, Attic"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    color: '#0F172A',
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.6rem',
                marginTop: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setSelectedType(null);
                  setCustomName('');
                }}
                disabled={loading}
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRoom}
                disabled={loading}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  backgroundColor: '#2563EB',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 8px 22px rgba(37, 99, 235, 0.35)',
                }}
              >
                {loading ? 'Adding…' : 'Add room'}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {rooms.length === 0 ? (
            <p
              style={{
                fontSize: '0.9rem',
                color: '#94A3B8',
              }}
            >
              No rooms added yet.
            </p>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#ffffff',
                  gap: '0.75rem',
                }}
              >
                <Link
                  href={`/properties/${property.id}/rooms/${room.id}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      color: '#0F172A',
                    }}
                  >
                    {room.display_name || buildGroupKey(room)}
                  </p>
                  {room.room_type === 'Custom' && room.custom_name && (
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#94A3B8',
                      }}
                    >
                      Custom
                    </p>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(room.id)}
                  disabled={loading}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    border: '1px solid #FCA5A5',
                    backgroundColor: '#FEF2F2',
                    color: '#B91C1C',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {totalPhotoCount > 0 && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '1.25rem',
              borderRadius: '1rem',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <p
              style={{
                fontSize: '0.9rem',
                color: '#64748B',
                margin: 0,
              }}
            >
              Export a PDF report of all captured photos for this property.
            </p>
            <button
              type="button"
              onClick={generateReport}
              disabled={reportGenerating}
              style={{
                width: '100%',
                padding: '0.9rem 1rem',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                backgroundColor: reportGenerating ? '#94A3B8' : '#2563EB',
                color: '#ffffff',
                cursor: reportGenerating ? 'default' : 'pointer',
                boxShadow: reportGenerating ? 'none' : '0 14px 34px rgba(37, 99, 235, 0.45)',
              }}
            >
              {reportGenerating ? 'Generating report…' : 'Generate Report'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (canContinue) {
              router.push('/dashboard');
            }
          }}
          disabled={!canContinue}
          style={{
            marginTop: '0.75rem',
            width: '100%',
            padding: '0.9rem 1rem',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 600,
            backgroundColor: canContinue ? '#2563EB' : '#CBD5E1',
            color: canContinue ? '#ffffff' : '#64748B',
            cursor: canContinue ? 'pointer' : 'default',
            boxShadow: canContinue ? '0 14px 34px rgba(37, 99, 235, 0.45)' : 'none',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

