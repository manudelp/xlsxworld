"use client";
import { useState } from "react";
import { tokenStore } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const url = new URL("/api/auth/login", process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000");
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);
      const res = await fetch(url.toString(), { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      const data = await res.json();
      tokenStore.set(data.access_token);
      setOk(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="px-4 py-2 bg-black text-white" type="submit">Login</button>
      </form>
      {ok && <p className="text-green-700 mt-3">Logged in</p>}
      {error && <p className="text-red-700 mt-3">{error}</p>}
    </div>
  );
}
