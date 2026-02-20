export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
