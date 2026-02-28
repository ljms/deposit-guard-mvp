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
  property_type?: string | null;
  is_locked?: boolean | null;
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
  const [isLocked, setIsLocked] = useState(Boolean(property.is_locked));

  const currentCount = rooms.length;

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
    if (isLocked) return;

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
    if (isLocked) return;
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

      // Load cover and header logo assets
      async function loadAssetDataUrl(path: string): Promise<string | null> {
        try {
          const res = await fetch(path);
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      }

      const [coverDataUrl, logoDataUrl] = await Promise.all([
        loadAssetDataUrl('/Report_Cover.png'),
        loadAssetDataUrl('/dg-logo-dark.png'),
      ]);

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'normal');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      const footerY = pageH - 12;

      function addHeader() {
        const headerTop = margin;
        const logoWidth = 38; // mm
        const logoHeight = logoWidth * 0.3; // approximate aspect ratio

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        // Left: logo
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', margin, headerTop, logoWidth, logoHeight);
        }

        // Center: title
        doc.setTextColor(55, 65, 81); // #374151
        doc.text('Property Condition Report', pageW / 2, headerTop + 7, { align: 'center' });

        // Right: address line 1
        if (property.address_line1) {
          doc.setFontSize(11);
          doc.text(property.address_line1, pageW - margin, headerTop + 7, { align: 'right' });
        }

        // Divider
        const lineY = headerTop + 16;
        doc.setDrawColor(229, 231, 235); // #E5E7EB
        doc.setLineWidth(0.3);
        doc.line(margin, lineY, pageW - margin, lineY);

        return lineY;
      }

      function addFooter(pageNum: number) {
        const baseY = footerY;
        doc.setFont('helvetica', 'normal');

        // Report ID (bottom left)
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // #9CA3AF
        doc.text('Report ID', margin, baseY - 4);
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39); // #111827
        doc.text(String(property.id), margin, baseY);

        // Page number (bottom right)
        doc.setTextColor(55, 65, 81); // #374151
        doc.text(`Page ${pageNum}`, pageW - margin, baseY, { align: 'right' });
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

      // Cover page
      if (coverDataUrl) {
        doc.addImage(coverDataUrl, 'PNG', 0, 0, pageW, pageH);
      }

      // Summary page
      doc.addPage();
      const summaryHeaderBottom = addHeader();
      let y = summaryHeaderBottom + 12;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39); // #111827
      doc.text('Property Condition Report', margin, y);
      y += 6;

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += 10;

      const addressFull = [
        property.address_line1,
        property.address_line2,
        property.city,
        property.postcode,
      ]
        .filter(Boolean)
        .join(', ');

      const propertyType =
        (property as any).property_type ||
        ((property as any).propertyType as string | undefined) ||
        '—';

      const summaryDateStr = reportDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const summaryTimeStr = reportDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const reportGenerated = `${summaryDateStr}, ${summaryTimeStr} GMT`;

      const labelX = margin;
      const valueX = margin + 38;
      const rowGap = 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // grey labels

      function drawRow(label: string, value: string) {
        doc.text(label, labelX, y);
        doc.setTextColor(15, 23, 42);
        const wrapped = doc.splitTextToSize(value || '—', pageW - valueX - margin);
        doc.text(wrapped, valueX, y);
        y += Math.max(rowGap, wrapped.length * 4.5 + 2);
        doc.setTextColor(100, 116, 139);
      }

      drawRow('Address', addressFull);
      drawRow('Property Type', propertyType);
      drawRow('Report Generated', reportGenerated);
      drawRow('Total Rooms', String(rooms.length));
      drawRow('Total Photos', String(photos.length));

        addFooter(2);

        // Content pages: per-room
        const imgMaxW = 85;
        const imgMaxH = 70;

        rooms.forEach((room) => {
        const roomPhotos = photosWithData.filter((p) => String(p.photo.room_id) === String(room.id));
        if (roomPhotos.length === 0) return;

        doc.addPage();
        const headerBottom = addHeader();
        let gridY = headerBottom + 16 + 8; // 8mm gap below divider before room name

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39); // #111827
        doc.text(room.display_name || buildGroupKey(room), margin, gridY);
        gridY += 6 + 6; // 6mm gap below room name before first row

        const cols = 2;
        const gapX = 5;
        const rowHeight = imgMaxH + 36; // include metadata + extra vertical spacing

        roomPhotos.forEach(({ photo, dataUrl, width, height }, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);

          if (col === 0 && row > 0) {
            gridY += rowHeight;
            if (gridY + rowHeight > footerY - 10) {
              addFooter(doc.getNumberOfPages());
              doc.addPage();
              const hb = addHeader();
              gridY = hb + 16 + 8;
              doc.setFontSize(18);
              doc.setFont('Inter', 'bold');
              doc.setTextColor(17, 24, 39);
              doc.text(room.display_name || buildGroupKey(room), margin, gridY);
              gridY += 6 + 6;
            }
          }

          const cellWidth = imgMaxW;
          const x = margin + col * (cellWidth + gapX);
          const yTop = gridY;

          const scale = Math.min(cellWidth / width, imgMaxH / height, 1);
          const w = width * scale;
          const h = height * scale;
          const imgX = x + (cellWidth - w) / 2;

          doc.addImage(dataUrl, 'JPEG', imgX, yTop, w, h, undefined, 'FAST');

          let textY = yTop + h + 4;
          const totalInRoom = roomPhotos.length;
          doc.setFontSize(8); // ~8pt
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(156, 163, 175); // #9CA3AF
          doc.text(`Photo ${index + 1} of ${totalInRoom}`, x, textY);
          textY += 4;

          const takenAt = photo.taken_at
            ? new Date(photo.taken_at).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) + ' GMT'
            : '—';
          doc.setFontSize(9); // ~9pt
          doc.setTextColor(17, 24, 39); // #111827
          doc.text(takenAt, x, textY);
          textY += 5;

          if (photo.note && photo.note.trim()) {
            // 4mm gap above notes label
            textY += 4;
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175); // #9CA3AF
            doc.text('Notes', x, textY);
            textY += 4;

            doc.setFontSize(9);
            doc.setTextColor(17, 24, 39); // #111827
            const noteLines = doc.splitTextToSize(photo.note.trim(), cellWidth);
            doc.text(noteLines, x, textY);
          }
        });

        addFooter(doc.getNumberOfPages());
      });

      const timestamp = Date.now();
      const storagePath = `${userId}/${property.id}/${timestamp}.pdf`;
      const pdfBlob = doc.output('blob');

      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(storagePath, pdfBlob, { contentType: 'application/pdf' });
      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload report.');
      }

      const { error: insertError } = await supabase.from('reports').insert({
        property_id: property.id,
        user_id: userId,
        storage_path: storagePath,
        created_at: new Date().toISOString(),
      });
      if (insertError) {
        throw new Error(insertError.message || 'Failed to save report record.');
      }

      const { error: lockError } = await supabase
        .from('properties')
        .update({ is_locked: true })
        .eq('id', property.id);
      if (lockError) {
        throw new Error(lockError.message || 'Failed to lock property.');
      }

      setIsLocked(true);

      const safeAddress = (property.address_line1 || 'Property')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50);
      const dateForFile = reportDate.toISOString().slice(0, 10);
      doc.save(`DepositGuard_Report_${safeAddress}_${dateForFile}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  }

  async function downloadReport() {
    setReportGenerating(true);
    setError(null);
    try {
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('storage_path, created_at')
        .eq('property_id', property.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reportsError || !reports || reports.length === 0) {
        setError(reportsError?.message || 'No report found to download.');
        return;
      }

      const storagePath = reports[0].storage_path;
      const { data, error: urlError } = await supabase.storage
        .from('reports')
        .createSignedUrl(storagePath, 3600);
      if (urlError || !data?.signedUrl) {
        setError(urlError?.message || 'Failed to generate download link.');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError('Failed to download report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  }

  const addressLines = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
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

        {isLocked && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.9rem',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              fontSize: '0.9rem',
            }}
          >
            This report has been generated and is now locked. No further changes can be made.
          </div>
        )}

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
              {currentCount} rooms
            </span>
          </p>

          {!isLocked && (
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
          )}
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
                {!isLocked && (
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
                )}
              </div>
            ))
          )}
        </div>

        {(totalPhotoCount > 0 || isLocked) && (
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
              {isLocked
                ? 'Download the locked report for this property.'
                : 'Export a PDF report of all captured photos for this property.'}
            </p>
            <button
              type="button"
              onClick={isLocked ? downloadReport : generateReport}
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
              {reportGenerating
                ? isLocked
                  ? 'Downloading…'
                  : 'Generating report…'
                : isLocked
                  ? 'Download Report'
                  : 'Generate Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

