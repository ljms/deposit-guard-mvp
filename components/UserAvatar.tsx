"use client";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_CLASS = { sm: "h-8 w-8", md: "h-12 w-12" } as const;
const PIXELS = { sm: 32, md: 48 } as const;

export type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size: keyof typeof SIZE_CLASS;
  /** Sidebar: initials on brand circle. Dashboard: gray circle with emoji when no photo. */
  fallbackVariant: "initials" | "emoji";
};

export function UserAvatar({ name, avatarUrl, size, fallbackVariant }: UserAvatarProps) {
  const dim = SIZE_CLASS[size];
  const px = PIXELS[size];
  const url =
    typeof avatarUrl === "string" && avatarUrl.trim() !== "" ? avatarUrl.trim() : null;

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Google URL + referrerPolicy
      <img
        src={url}
        alt=""
        width={px}
        height={px}
        referrerPolicy="no-referrer"
        className={`${dim} shrink-0 rounded-full object-cover`}
        aria-hidden
      />
    );
  }

  if (fallbackVariant === "emoji") {
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200`}
        aria-hidden
      >
        <span className="text-lg text-gray-500">👤</span>
      </div>
    );
  }

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-[#1a1a86] text-[11px] font-medium text-white`}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}
