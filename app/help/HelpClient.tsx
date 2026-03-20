"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Building2, HelpCircle } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";

type HelpClientProps = {
  initialEmail: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Getting Started",
    items: [
      {
        question: "What is Deposit Guard?",
        answer:
          "Deposit Guard helps UK renters document the condition of their rental property at move-in. You take timestamped photos of every room, and we generate a professional PDF report you can use as evidence if your landlord tries to make unfair deductions from your deposit.",
      },
      {
        question: "Do I need to download an app?",
        answer:
          "No. Deposit Guard works in your mobile browser — just go to app.depositguard.com and sign up.",
      },
      {
        question: "How do I create a report?",
        answer:
          "Tap 'Create New Report' from your dashboard, select or create a property, add your rooms, then walk through each room taking photos. When you're done, tap 'Complete Report' to pay and generate your PDF.",
      },
    ],
  },
  {
    title: "Taking Photos",
    items: [
      {
        question: "Why can't I upload photos from my gallery?",
        answer:
          "To ensure your evidence is genuine and timestamped, Deposit Guard only allows photos taken live through the app's camera. This prevents pre-staged or old photos from being used, which protects the integrity of your report.",
      },
      {
        question: "Why can't I take photos on my computer?",
        answer:
          "Photos must be taken on a mobile device so you can walk through the property and capture conditions in real time. Open your report on your phone to add photos.",
      },
      {
        question: "How many photos should I take?",
        answer:
          "As many as you need to thoroughly document each room. Photograph any existing damage, marks, stains, or wear — but also capture the general condition. Most reports include 20–40 photos.",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        question: "Can I edit my report after it's generated?",
        answer:
          "No. Once generated, your report is locked and cannot be changed. This is intentional — it ensures the evidence is tamper-proof and trustworthy in a dispute.",
      },
      {
        question: "How do I download my report?",
        answer:
          "Open any completed report from your dashboard and tap the Download button. You can also access it from the shareable report page.",
      },
      {
        question: "What happens to incomplete reports?",
        answer:
          "Incomplete, unpaid reports are automatically deleted after 7 days. You'll receive email reminders at 48 hours and 24 hours before deletion.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        question: "How much does a report cost?",
        answer:
          "Each report costs £10. You pay once when you're ready to generate it — there's no subscription.",
      },
      {
        question: "What am I paying for?",
        answer:
          "You're paying for the generation of a professional, timestamped, tamper-proof PDF condition report that you can use as evidence in a deposit dispute.",
      },
      {
        question: "Can I get a refund?",
        answer:
          "If you experience a technical issue that prevents your report from being generated after payment, contact us using the form below and we'll resolve it.",
      },
    ],
  },
  {
    title: "My Account",
    items: [
      {
        question: "How do I change my password?",
        answer:
          "Go to Settings from the bottom navigation bar, then tap 'Change Password'.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Go to Settings, then tap 'Delete Account'. This will permanently remove your account and all associated data.",
      },
    ],
  },
];

const SUBJECT_OPTIONS = [
  "Technical issue",
  "Payment issue",
  "Report problem",
  "Feature request",
  "Other",
] as const;

export function HelpClient({ initialEmail }: HelpClientProps) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState<(typeof SUBJECT_OPTIONS)[number]>(
    "Technical issue"
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const flattenedFaq = useMemo(
    () =>
      FAQ_CATEGORIES.flatMap((category) =>
        category.items.map((item, idx) => ({
          ...item,
          key: `${category.title}-${idx}`,
          category: category.title,
        }))
      ),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultMessage(null);
    setSending(true);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResultMessage({
          type: "error",
          text:
            typeof data.error === "string"
              ? data.error
              : "Unable to send your message. Please try again.",
        });
        return;
      }
      setMessage("");
      setResultMessage({
        type: "success",
        text: "Message sent! We'll get back to you as soon as possible.",
      });
    } catch {
      setResultMessage({
        type: "error",
        text: "Unable to send your message. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F8F8] flex flex-col pb-20">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="tap-feedback-touch active:opacity-75 p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-[#0F172A] bg-transparent border-none cursor-pointer"
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-[#0F172A]" style={fontStyle}>
                Help
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 max-w-[720px] mx-auto w-full flex flex-col gap-6">
          <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-[#0F172A] mb-4" style={fontStyle}>
              Frequently Asked Questions
            </h2>
            {FAQ_CATEGORIES.map((category) => (
              <div key={category.title} className="mb-5 last:mb-0">
                <h3 className="text-sm font-semibold text-[#414651] mb-2" style={fontStyle}>
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item) => {
                    const key = `${category.title}-${item.question}`;
                    const isOpen = openKey === key;
                    return (
                      <div key={key} className="rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenKey(isOpen ? null : key)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-white hover:bg-gray-50"
                          style={fontStyle}
                        >
                          <span className="text-sm font-medium text-[#0F172A]">{item.question}</span>
                          <svg
                            className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3">
                            <p className="text-sm text-gray-600" style={fontStyle}>
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-[#0F172A] mb-1" style={fontStyle}>
              Still need help?
            </h2>
            <p className="text-sm text-gray-500 mb-4" style={fontStyle}>
              Send us a message and we&apos;ll get back to you.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
                className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20"
                style={fontStyle}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20"
                style={fontStyle}
              />
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as (typeof SUBJECT_OPTIONS)[number])}
                className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20"
                style={fontStyle}
              >
                {SUBJECT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                  placeholder="Message"
                  required
                  rows={5}
                  className="w-full py-2.5 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] text-base outline-none focus:border-[#008BFF] focus:ring-2 focus:ring-[#008BFF]/20"
                  style={fontStyle}
                />
                <p className="text-xs text-gray-500 mt-1" style={fontStyle}>
                  {message.length}/1000
                </p>
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-lg bg-[#008bff] text-white font-medium text-base hover:bg-[#0077e6] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                style={{ ...fontStyle, color: "#ffffff" }}
              >
                {sending ? "Sending…" : "Send Message"}
              </button>
              {resultMessage && (
                <p
                  className={`text-sm ${resultMessage.type === "success" ? "text-green-600" : "text-red-600"}`}
                  style={fontStyle}
                >
                  {resultMessage.text}
                </p>
              )}
            </form>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 w-full lg:max-w-[1080px] lg:left-1/2 lg:-translate-x-1/2 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
          <div className="flex items-center justify-around max-w-[720px] mx-auto">
            <Link href="/dashboard" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400" style={{ WebkitTapHighlightColor: "transparent" }}>
              <Home size={24} />
              <span className="text-xs font-medium" style={fontStyle}>Home</span>
            </Link>
            <Link href="/properties" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400" style={{ WebkitTapHighlightColor: "transparent" }}>
              <Building2 size={24} />
              <span className="text-xs font-medium" style={fontStyle}>Properties</span>
            </Link>
            <Link href="/settings" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-gray-400" style={{ WebkitTapHighlightColor: "transparent" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              <span className="text-xs font-medium" style={fontStyle}>Settings</span>
            </Link>
            <Link href="/help" className="tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 text-[#008bff]" style={{ WebkitTapHighlightColor: "transparent" }}>
              <HelpCircle size={24} />
              <span className="text-xs font-medium" style={fontStyle}>Help</span>
            </Link>
          </div>
        </nav>
      </div>
    </PageWrapper>
  );
}
