"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
 
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white w-full h-[60px] z-50 fixed right-0 left-0 top-0 border-b border-[#d6d6df] px-2 sm:px-6 flex items-center justify-between">
      {/* Mobile Hamburger */}
      <button
        className="md:hidden mr-2 p-2 rounded hover:bg-gray-100 focus:outline-none"
        aria-label="Open menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <svg
          width={24}
          height={24}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <line x1={4} y1={7} x2={20} y2={7} />
          <line x1={4} y1={12} x2={20} y2={12} />
          <line x1={4} y1={17} x2={20} y2={17} />
        </svg>
      </button>

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 flex-1 md:justify-start justify-center"
      >
        <Image
          src="/ilovexlsx.svg"
          alt="Logo"
          width={160}
          height={30}
          className="object-contain w-fit h-[30px]"
        />
      </Link>

      {/* Example Icon (Mobile Only) */}
      <div className="md:hidden ml-2 flex items-center">
        {/* Example: User Icon */}
        <button
          aria-label="Example icon"
          className="p-2 rounded hover:bg-gray-100"
        >
          <svg
            width={24}
            height={24}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx={12} cy={8} r={4} />
            <path d="M4 20c0-4 8-4 8-4s8 0 8 4" />
          </svg>
        </button>
      </div>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-4">
        <a href="#" className="text-sm font-semibold">
          Login
        </a>
        <a
          href="#"
          className="px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-sm font-semibold"
        >
          Sign Up
        </a>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className="absolute top-0 left-0 w-full h-auto bg-white shadow-lg flex flex-col p-6 gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <Image
                src="/ilovexlsx.svg"
                alt="Logo"
                width={160}
                height={30}
                className="object-contain w-fit h-[20px]"
              />
              <button
                className="self-end p-2 rounded hover:bg-gray-100"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <svg
                  width={24}
                  height={24}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <line x1={6} y1={6} x2={18} y2={18} />
                  <line x1={6} y1={18} x2={18} y2={6} />
                </svg>
              </button>
            </div>
            <a
              href="#"
              className="text-base font-semibold text-center bg-gray-100 rounded-lg py-2"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </a>
            <a
              href="#"
              className="px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-base font-semibold text-center"
              onClick={() => setMenuOpen(false)}
            >
              Sign Up
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
