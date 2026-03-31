import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#292931] text-white rounded-lg hover:opacity-90 transition"
      >
        Go Home
      </Link>
    </div>
  );
}
