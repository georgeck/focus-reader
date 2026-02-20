import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Check your inbox</h1>
      <p className="text-sm text-slate-600">
        We sent you a sign-in link. Open it to finish signing in.
      </p>
      <p className="text-sm text-slate-600">
        If the link expired, request another one from the login page.
      </p>
      <Link
        href="/login"
        className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Back to login
      </Link>
    </div>
  );
}
