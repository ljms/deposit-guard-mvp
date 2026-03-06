export default function PublicReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-screen min-w-screen relative left-1/2 -ml-[50vw]">
      {children}
    </div>
  );
}
