"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ReportFlowModal } from "@/components/ReportFlowModal";
import PageWrapper from "@/components/PageWrapper";

const fadeScaleTransition = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
};

type Property = {
  id: string | number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  property_type?: string | null;
  move_in_date?: string | null;
};

type PropertiesClientProps = {
  properties: Property[];
  roomCounts: Record<string, number>;
};

function formatAddress(p: Property): string {
  const parts = [
    p.address_line1,
    p.address_line2,
    p.city,
    p.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

function formatMoveInDate(iso: string | null | undefined): string {
  if (!iso) return "Not specified";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PropertiesClient({ properties, roomCounts }: PropertiesClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openDeleteConfirmModal(property: Property, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setPropertyToDelete(property);
  }

  async function confirmDeleteProperty() {
    if (!propertyToDelete) return;
    const propertyId = propertyToDelete.id;
    setPropertyToDelete(null);
    setError(null);
    setDeletingId(propertyId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in to delete a property.");
        setDeletingId(null);
        return;
      }

      const { data: photos } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("property_id", propertyId)
        .eq("user_id", user.id);
      const photoPaths = (photos ?? []).map((p) => p.storage_path).filter(Boolean);
      if (photoPaths.length > 0) {
        await supabase.storage.from("photos").remove(photoPaths);
      }

      const { data: reports } = await supabase
        .from("reports")
        .select("storage_path")
        .eq("property_id", propertyId)
        .eq("user_id", user.id);
      const reportPaths = (reports ?? []).map((r) => r.storage_path).filter(Boolean);
      if (reportPaths.length > 0) {
        await supabase.storage.from("reports").remove(reportPaths);
      }

      await supabase
        .from("photos")
        .delete()
        .eq("property_id", propertyId)
        .eq("user_id", user.id);
      await supabase
        .from("reports")
        .delete()
        .eq("property_id", propertyId)
        .eq("user_id", user.id);
      await supabase.from("rooms").delete().eq("property_id", propertyId);

      const { error: deleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId)
        .eq("user_id", user.id);

      if (deleteError) {
        setError(deleteError.message ?? "Unable to delete property.");
        setDeletingId(null);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
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
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                Properties
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreatePropertyModal(true)}
            className="px-2 py-1.5 text-xs rounded-lg bg-[#008bff] text-white font-medium hover:bg-[#0077e6] transition-colors md:px-4 md:py-2 md:text-sm"
            style={{ ...fontStyle, color: "#ffffff" }}
          >
            ＋ Create New Property
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}

        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A] mb-2" style={fontStyle}>
              No properties yet
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6 max-w-[280px]" style={fontStyle}>
              Add your first property to start documenting your rental.
            </p>
            <button
              type="button"
              onClick={() => setShowCreatePropertyModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#008bff] text-white font-semibold text-base shadow-sm hover:bg-[#0077e6] transition-colors"
              style={{ ...fontStyle, color: "#ffffff" }}
            >
              <span className="text-xl leading-none">＋</span>
              Create New Property
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {properties.map((property) => (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="block relative rounded-xl bg-white border border-gray-200 shadow-sm p-5 transition-all hover:shadow-md hover:border-[#008bff]/40 hover:bg-gray-50/80 active:bg-gray-100/80"
              >
                <button
                  type="button"
                  onClick={(e) => openDeleteConfirmModal(property, e)}
                  disabled={deletingId === property.id}
                  className="absolute top-4 right-4 p-1.5 text-red-500 hover:bg-red-50 rounded-lg z-10"
                  aria-label="Delete"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>

                <div className="flex flex-col gap-4 pr-8">
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0" aria-hidden>📍</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                        Property Address
                      </p>
                      <p className="text-[#0F172A] font-medium" style={fontStyle}>
                        {formatAddress(property) || "Unnamed property"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0" aria-hidden>🏠</span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                        Property Type
                      </p>
                      <p className="text-[#0F172A] font-medium" style={fontStyle}>
                        {property.property_type ?? "Property"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0" aria-hidden>📅</span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5" style={fontStyle}>
                        Move-In Date
                      </p>
                      <p className="text-[#0F172A] font-medium" style={fontStyle}>
                        {formatMoveInDate(property.move_in_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Delete property confirmation modal */}
      <AnimatePresence>
        {propertyToDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !deletingId && setPropertyToDelete(null)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={fadeScaleTransition.initial}
              animate={fadeScaleTransition.animate}
              exit={fadeScaleTransition.exit}
              transition={fadeScaleTransition.transition}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-1" style={fontStyle}>
                Delete Property
              </h2>
              <p className="text-sm text-gray-500 mb-6" style={fontStyle}>
                Are you sure you want to delete this property? All associated reports and photos will also be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPropertyToDelete(null)}
                  disabled={!!deletingId}
                  className="shrink-0 py-2.5 px-5 rounded-lg font-medium text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ ...fontStyle, backgroundColor: "#008bff", color: "#ffffff" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProperty}
                  disabled={!!deletingId}
                  className="flex-1 min-w-0 py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                  style={{ ...fontStyle, color: "#ffffff" }}
                >
                  Yes, Delete Property
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReportFlowModal
        isOpen={showCreatePropertyModal}
        onClose={() => setShowCreatePropertyModal(false)}
        onComplete={() => {
          setShowCreatePropertyModal(false);
          router.refresh();
        }}
        onPropertyCreated={(propertyId) => {
          setShowCreatePropertyModal(false);
          router.refresh();
          router.push(`/properties/${propertyId}`);
        }}
        startAtCreateProperty
      />

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
          <Link href="/properties" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-xs font-medium" style={fontStyle}>Properties</span>
          </Link>
          <Link href="/settings" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400 hover:text-[#008bff]" style={{ WebkitTapHighlightColor: 'transparent' }}>
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
