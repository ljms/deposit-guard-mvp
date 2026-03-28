export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative ml-[calc(50%-50vw)] w-screen max-w-none shrink-0">
      {children}
    </div>
  );
}
