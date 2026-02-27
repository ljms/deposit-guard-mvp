'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  createdAt: string | null;
  propertyCount: number;
  reportCount: number;
};

type HousekeepingClientProps = {
  totalUsers: number;
  totalProperties: number;
  totalReports: number;
  users: UserRow[];
};

export function HousekeepingClient({
  totalUsers,
  totalProperties,
  totalReports,
  users,
}: HousekeepingClientProps) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => u.email.toLowerCase().includes(term));
  }, [search, users]);

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
          <div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 600,
                color: "#0F172A",
                marginBottom: "0.25rem",
              }}
            >
              Housekeeping
            </h1>
            <p
              style={{
                fontSize: "0.95rem",
                color: "#64748B",
                margin: 0,
              }}
            >
              Admin overview of users, properties and reports.
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{
              fontSize: "0.9rem",
              color: "#64748B",
              textDecoration: "none",
            }}
          >
            ← Back to dashboard
          </Link>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            { label: "Total users", value: totalUsers },
            { label: "Total properties", value: totalProperties },
            { label: "Total reports", value: totalReports },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                border: "1px solid #E2E8F0",
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#94A3B8",
                  marginBottom: "0.4rem",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #E2E8F0",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.85rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#0F172A",
                margin: 0,
              }}
            >
              Users
            </h2>
            <input
              type="text"
              placeholder="Search by email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "240px",
                padding: "0.45rem 0.75rem",
                borderRadius: "9999px",
                border: "1px solid #CBD5E1",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  {["Email", "Sign up date", "Properties", "Reports", ""].map(
                    (heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "0.6rem 0.4rem",
                          fontWeight: 500,
                          color: "#64748B",
                        }}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: "1px solid #E2E8F0",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.65rem 0.4rem",
                        color: "#0F172A",
                      }}
                    >
                      <Link
                        href={`/housekeeping/users/${user.id}`}
                        style={{
                          color: "#2563EB",
                          textDecoration: "none",
                        }}
                      >
                        {user.email || "(no email)"}
                      </Link>
                    </td>
                    <td
                      style={{
                        padding: "0.65rem 0.4rem",
                        color: "#64748B",
                      }}
                    >
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.65rem 0.4rem",
                        color: "#0F172A",
                      }}
                    >
                      {user.propertyCount}
                    </td>
                    <td
                      style={{
                        padding: "0.65rem 0.4rem",
                        color: "#0F172A",
                      }}
                    >
                      {user.reportCount}
                    </td>
                    <td
                      style={{
                        padding: "0.65rem 0.4rem",
                        textAlign: "right",
                      }}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            "Are you sure you want to delete this user and all their data? This cannot be undone."
                          );
                          if (!confirmed) return;

                          try {
                            const res = await fetch(
                              `/api/housekeeping/users/${user.id}/delete`,
                              { method: "POST" }
                            );
                            if (!res.ok) {
                              // eslint-disable-next-line no-alert
                              alert(
                                "Failed to delete user. Please refresh and try again."
                              );
                              return;
                            }
                            // Optimistically remove from UI
                            window.location.reload();
                          } catch {
                            // eslint-disable-next-line no-alert
                            alert(
                              "Something went wrong while deleting the user."
                            );
                          }
                        }}
                        style={{
                          padding: "0.3rem 0.75rem",
                          borderRadius: "9999px",
                          border: "1px solid #FCA5A5",
                          backgroundColor: "#FEF2F2",
                          color: "#B91C1C",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Delete user
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

