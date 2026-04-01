"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">500</h1>
      <p className="text-xl mb-6">Something went wrong.</p>
      <p className="text-sm text-muted mb-8 max-w-md">
        If this keeps happening, please tell us what you were doing so we can
        fix it.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#292931] text-white rounded-lg hover:opacity-90 transition"
      >
        Try Again
      </button>
      <Link
        href="/contact"
        className="px-6 py-3 border border-border rounded-lg hover:bg-surface-2 transition"
      >
        Report This Issue
      </Link>
      </div>
    </div>
  );
}
