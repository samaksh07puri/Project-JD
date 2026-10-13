"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { History, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/lib/auth";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`z-30 transition-colors lg:sticky lg:top-0 ${
        scrolled ? "bg-white/70 backdrop-blur" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:h-24 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src={logo}
            alt="ResumeAid logo"
            width={128}
            height={128}
            className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
            priority
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-3">
          {loading ? (
            <span className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <div className="flex items-center gap-1.5">
              <Link href="/history" className="btn-secondary btn-sm" title="History">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn-secondary btn-sm"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
