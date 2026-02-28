"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/");
    }, 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #018EFB 100%)",
      }}
    >
      {/* Hexagon pattern overlay - bottom half of screen */}
      <svg
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "50%",
          opacity: 0.15,
          pointerEvents: "none",
        }}
        viewBox="0 0 400 300"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <polygon points="50,10 90,35 90,85 50,110 10,85 10,35" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="130,10 170,35 170,85 130,110 90,85 90,35" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="210,10 250,35 250,85 210,110 170,85 170,35" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="290,10 330,35 330,85 290,110 250,85 250,35" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="370,10 410,35 410,85 370,110 330,85 330,35" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="90,85 130,110 130,160 90,185 50,160 50,110" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="170,85 210,110 210,160 170,185 130,160 130,110" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="250,85 290,110 290,160 250,185 210,160 210,110" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="330,85 370,110 370,160 330,185 290,160 290,110" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="50,160 90,185 90,235 50,260 10,235 10,185" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="130,160 170,185 170,235 130,260 90,235 90,185" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="210,160 250,185 250,235 210,260 170,235 170,185" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="290,160 330,185 330,235 290,260 250,235 250,185" fill="none" stroke="white" strokeWidth="1" />
        <polygon points="370,160 410,185 410,235 370,260 330,235 330,185" fill="none" stroke="white" strokeWidth="1" />
      </svg>

      {/* Decorative gradient blob (from Figma: opacity ~0.24) */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 643,
          height: 356,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(118,193,252,1) 82%)",
          opacity: 0.24,
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
        aria-hidden
      />

      {/* Logo centered vertically in the middle */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[375px] mx-auto px-4 relative z-10">
        <Image
          src="/dg-logo-dark.png"
          alt="Deposit Guard"
          width={211}
          height={69}
          priority
          className="object-contain"
        />
      </div>

      {/* Tagline + version near the bottom */}
      <div className="w-full max-w-[375px] mx-auto px-4 pb-14 relative z-10 flex flex-col items-center gap-2">
        <h1
          className="text-white text-center font-medium text-[26px] leading-[1.42]"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
        >
          Fair Claims. Guaranteed.
        </h1>
        <p
          className="text-[#DDDDDD] text-center text-[13px] font-normal leading-[2.77]"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
        >
          v.0.01
        </p>
      </div>
    </div>
  );
}
