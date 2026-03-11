import { ReportLayoutClient } from "@/components/ReportLayoutClient";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <ReportLayoutClient>{children}</ReportLayoutClient>;
}

