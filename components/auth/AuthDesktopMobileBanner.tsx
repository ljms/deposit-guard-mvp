const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" } as const;

/** Desktop-only (lg+) message for auth right panel — parent must hide below 1024px. */
export function AuthDesktopMobileBanner() {
  return (
    <div
      className="flex max-w-[280px] flex-col items-center text-center"
      style={fontStyle}
    >
      <div
        className="relative mb-8 h-[140px] w-[80px] shrink-0 rounded-2xl border-2 border-[rgba(0,139,255,0.3)]"
        aria-hidden
      >
        <div className="absolute left-1/2 top-2 h-[3px] w-6 -translate-x-1/2 rounded-sm bg-[rgba(0,139,255,0.2)]" />
        <div className="absolute bottom-2 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border-[1.5px] border-[rgba(0,139,255,0.3)]" />
      </div>

      <h2 className="mb-3 text-[18px] font-medium leading-tight text-white">Grab your phone</h2>

      <p className="text-[13px] leading-[1.7] text-[rgba(255,255,255,0.45)]">
        Deposit Guard is built for mobile. Photos can only be taken using your device camera — they can&apos;t be
        uploaded from desktop.
      </p>

      <div className="mt-6 w-full border-t border-[rgba(255,255,255,0.06)] pt-6">
        <p className="text-[12px] leading-[1.6] text-[rgba(255,255,255,0.3)]">
          Sign up here and continue on your phone anytime.
        </p>
      </div>
    </div>
  );
}
