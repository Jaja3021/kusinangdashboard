import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-brand-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
