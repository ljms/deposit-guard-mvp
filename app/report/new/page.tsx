"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportNewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?newReport=1");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
      <div className="w-8 h-8 border-2 border-[#008bff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
