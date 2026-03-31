"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">500</h1>
      <p className="text-xl mb-6">Something went wrong.</p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#292931] text-white rounded-lg hover:opacity-90 transition"
      >
        Try Again
      </button>
    </div>
  );
}
