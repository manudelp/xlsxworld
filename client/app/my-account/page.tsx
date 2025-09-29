"use client";
import { useEffect, useState } from "react";
import { tokenStore } from "@/lib/auth";

type Me = { id: string; email: string; role: string };

export default function MePage() {
  const [data, setData] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) { setError("Not logged in"); return; }
    const url = new URL("/api/auth/me", process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000");
    fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).detail || r.statusText); return r.json(); })
      .then(setData).catch(e => setError(e.message || String(e)));
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">My account</h1>
      {error && <p className="text-red-700">{error}</p>}
      {data && <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
