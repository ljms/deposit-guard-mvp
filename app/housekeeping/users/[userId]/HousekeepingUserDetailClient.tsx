'use client';

import { useRouter } from "next/navigation";
import type { Property, UserSummary } from "./page";

type Props = {
  user: UserSummary;
  properties: Property[];
};

export function HousekeepingUserDetailClient({ user, properties }: Props) {
  const router = useRouter();
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F1F5F9",
        padding: "2rem 2.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.75rem",
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.9rem",
              color: "#64748B",
              textDecoration: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              font: "inherit",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>←</span>
            <span>Back to housekeeping</span>
          </button>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#0F172A",
                marginBottom: "0.15rem",
              }}
            >
              {user.email || "(no email)"}
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748B",
                margin: 0,
              }}
            >
              Joined{" "}
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </header>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #E2E8F0",
            padding: "1.25rem 1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#0F172A",
              marginTop: 0,
              marginBottom: "0.75rem",
            }}
          >
            Properties
          </h2>
          {properties.length === 0 ? (
            <p
              style={{
                fontSize: "0.9rem",
                color: "#64748B",
                margin: 0,
              }}
            >
              No properties found for this user.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {properties.map((property) => {
                const addressParts = [
                  property.address_line1,
                  property.address_line2,
                  property.city,
                  property.postcode,
                ].filter(Boolean);

                const address =
                  addressParts.join(", ") || "Untitled property";

                return (
                  <div
                    key={property.id}
                    style={{
                      borderRadius: "0.75rem",
                      border: "1px solid #E2E8F0",
                      padding: "0.9rem 1rem",
                      backgroundColor: "#F8FAFC",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 500,
                            color: "#0F172A",
                            marginBottom: "0.35rem",
                          }}
                        >
                          {address}
                        </p>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "#64748B",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {property.property_type || "Unknown type"} ·{" "}
                          {property.hasCompletedReport ? "Has completed report" : "No completed report"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "#94A3B8",
                            margin: 0,
                          }}
                        >
                          Created{" "}
                          {new Date(
                            property.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              "Are you sure you want to delete this property and all its data? This cannot be undone."
                            );
                            if (!confirmed) return;

                            try {
                              const res = await fetch(
                                `/api/housekeeping/users/${user.id}/properties/${property.id}/delete`,
                                { method: "POST" }
                              );
                              if (!res.ok) {
                                // eslint-disable-next-line no-alert
                                alert(
                                  "Failed to delete property. Please refresh and try again."
                                );
                                return;
                              }
                              window.location.reload();
                            } catch {
                              // eslint-disable-next-line no-alert
                              alert(
                                "Something went wrong while deleting the property."
                              );
                            }
                          }}
                          style={{
                            padding: "0.35rem 0.8rem",
                            borderRadius: "9999px",
                            border: "1px solid #FCA5A5",
                            backgroundColor: "#FEF2F2",
                            color: "#B91C1C",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          Delete property
                        </button>
                      </div>
                    </div>

                    {property.reports.length > 0 && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          paddingTop: "0.65rem",
                          borderTop: "1px solid #E2E8F0",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            color: "#0F172A",
                            marginBottom: "0.4rem",
                          }}
                        >
                          Reports
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.35rem",
                          }}
                        >
                          {property.reports.map((report) => (
                            <div
                              key={report.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "0.75rem",
                                fontSize: "0.85rem",
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    color: "#0F172A",
                                  }}
                                >
                                  {new Date(
                                    report.created_at
                                  ).toLocaleString()}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    color: "#64748B",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  {report.storage_path}
                                </p>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        `/api/housekeeping/reports/${report.id}/download`,
                                        { method: "POST" }
                                      );
                                      if (!res.ok) {
                                        // eslint-disable-next-line no-alert
                                        alert(
                                          "Failed to create download link."
                                        );
                                        return;
                                      }
                                      const data = await res.json();
                                      if (!data.signedUrl) {
                                        // eslint-disable-next-line no-alert
                                        alert(
                                          "Download link missing from response."
                                        );
                                        return;
                                      }
                                      window.open(
                                        data.signedUrl,
                                        "_blank",
                                        "noopener,noreferrer"
                                      );
                                    } catch {
                                      // eslint-disable-next-line no-alert
                                      alert(
                                        "Something went wrong while generating the download link."
                                      );
                                    }
                                  }}
                                  style={{
                                    padding: "0.3rem 0.7rem",
                                    borderRadius: "9999px",
                                    border: "1px solid #CBD5E1",
                                    backgroundColor: "#ffffff",
                                    color: "#0F172A",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  Download
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmed = window.confirm(
                                      "Are you sure you want to delete this report? This will also unlock the property so the user can regenerate."
                                    );
                                    if (!confirmed) return;

                                    try {
                                      const res = await fetch(
                                        `/api/housekeeping/reports/${report.id}/delete`,
                                        { method: "POST" }
                                      );
                                      if (!res.ok) {
                                        // eslint-disable-next-line no-alert
                                        alert(
                                          "Failed to delete report. Please refresh and try again."
                                        );
                                        return;
                                      }
                                      window.location.reload();
                                    } catch {
                                      // eslint-disable-next-line no-alert
                                      alert(
                                        "Something went wrong while deleting the report."
                                      );
                                    }
                                  }}
                                  style={{
                                    padding: "0.3rem 0.7rem",
                                    borderRadius: "9999px",
                                    border: "1px solid #FCA5A5",
                                    backgroundColor: "#FEF2F2",
                                    color: "#B91C1C",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

