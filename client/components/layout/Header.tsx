"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  const label = user?.display_name?.trim() || user?.email || "Account";

  return (
    <header
      className="w-full h-[60px] z-50 fixed right-0 left-0 top-0 px-2 sm:px-6 flex items-center justify-between gap-4"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Link href="/" className="flex items-center gap-2 h-[30px]">
        <h2 className="text-xl font-semibold flex items-center gap-1">
          XLSX
          <Image
            src="/icon.svg"
            alt="World Icon"
            width={32}
            height={32}
            style={{ display: "inline", verticalAlign: "middle" }}
          />
          World
        </h2>
      </Link>

      <div className="flex items-center gap-2" ref={menuRef}>
        {isLoading ? (
          <div className="h-9 w-24" />
        ) : isAuthenticated ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--foreground)",
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <UserRound className="h-4 w-4" />
              <span className="max-w-[180px] truncate">{label}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-md border p-1 shadow-lg"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-2)",
                }}
                role="menu"
              >
                <Link
                  href="/my-account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                  style={{ color: "var(--foreground)" }}
                >
                  <UserRound className="h-4 w-4" />
                  My account
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-black/5"
                  style={{ color: "var(--foreground)" }}
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
