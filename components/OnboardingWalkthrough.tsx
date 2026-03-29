"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const fontClass = "font-[family-name:var(--font-poppins),Poppins,sans-serif]";

const SLIDES = [
  {
    image: "/onboarding-1.png",
    heading: "Protect your deposit",
    body: "When disputes happen, landlords have evidence and tenants don't. Deposit Guard gives you the proof you need to get your full deposit back.",
  },
  {
    image: "/onboarding-2.png",
    heading: "How it works",
    body: "Walk through your property, photograph each room, and add notes. We'll turn it into a timestamped PDF report — your evidence if there's ever a dispute.",
  },
  {
    image: "/onboarding-3.png",
    heading: "Best practices",
    body: "Photograph everything, be thorough, and capture all important details for a complete report.",
  },
] as const;

async function markWalkthroughComplete() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "no_user" as const };
  const { error } = await supabase
    .from("profiles")
    .update({ has_seen_onboarding: true })
    .eq("id", user.id);
  if (error) return { ok: false as const, reason: "db" as const, error };
  return { ok: true as const };
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export function OnboardingWalkthrough() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);
  /** 1 = forward, -1 = back (for slide transition). */
  const [direction, setDirection] = useState(1);

  const goNext = useCallback(() => {
    setDirection(1);
    setPage((p) => Math.min(SLIDES.length - 1, p + 1));
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const finish = useCallback(async () => {
    setFinishing(true);
    const result = await markWalkthroughComplete();
    if (!result.ok) {
      setFinishing(false);
      if (result.reason === "no_user") router.replace("/login");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }, [router]);

  const onDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      if (offset.x < -72 || velocity.x < -420) {
        if (page < SLIDES.length - 1) goNext();
      } else if (offset.x > 72 || velocity.x > 420) {
        if (page > 0) goPrev();
      }
    },
    [page, goNext, goPrev]
  );

  const isLast = page === SLIDES.length - 1;
  const slide = SLIDES[page];

  return (
    <div className={`relative flex min-h-[100dvh] flex-col bg-[#f0f4ff] ${fontClass}`}>
      <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          className="text-[0.95rem] !font-medium !text-[#008bff] font-[family-name:var(--font-poppins),Poppins,sans-serif] hover:underline disabled:opacity-50"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-8 pt-14">
        <div className="relative mx-auto min-h-0 w-full max-w-lg flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={page}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              className="flex h-full flex-col items-center px-1"
            >
              <div className="relative mt-2 aspect-square w-full max-w-[16rem] shrink-0">
                <Image
                  src={slide.image}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 16rem"
                  priority={page === 0}
                />
              </div>
              <h1 className="mt-8 text-center text-[1.35rem] font-bold leading-tight text-[#010827] md:text-[1.5rem]">
                {slide.heading}
              </h1>
              <p className="mt-4 max-w-[20rem] text-center text-[0.95rem] leading-relaxed text-[#6B7280]">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mx-auto mt-auto w-full max-w-lg shrink-0 px-1">
          <button
            type="button"
            disabled={finishing}
            onClick={() => {
              if (isLast) void finish();
              else goNext();
            }}
            className="w-full rounded-full bg-[#008bff] py-3.5 text-[1rem] font-semibold !font-[family-name:var(--font-poppins),Poppins,sans-serif] !text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {finishing ? "…" : isLast ? "Get started" : "Continue"}
          </button>

          <div className="mt-5 flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => {
                  if (i === page) return;
                  setDirection(i > page ? 1 : -1);
                  setPage(i);
                }}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === page ? "bg-[#008bff]" : "bg-black/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
