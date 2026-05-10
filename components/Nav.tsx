"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-ink-100">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <PaletteIcon />
          <span className="font-serif text-xl text-ink-900 tracking-tight leading-none">
            Color Story
          </span>
        </Link>

        <nav className="flex items-center gap-8">
          <NavLink href="/" active={pathname === "/"}>
            Explore
          </NavLink>
          <NavLink href="/gallery" active={pathname === "/gallery"}>
            Gallery
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`font-sans text-sm tracking-wide transition-colors duration-200 ${
        active
          ? "text-ink-900 border-b border-ink-900 pb-0.5"
          : "text-ink-500 hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}

function PaletteIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <circle cx="13" cy="13" r="12" stroke="#1A1714" strokeWidth="1.2" />
      <circle cx="9" cy="10" r="2" fill="#C4846A" />
      <circle cx="15" cy="8" r="1.5" fill="#A5694F" />
      <circle cx="18" cy="13" r="2" fill="#6B6358" />
      <circle cx="15" cy="18" r="1.5" fill="#DDD5C5" />
      <circle cx="9" cy="17" r="2" fill="#3D3830" />
      <circle cx="13" cy="20" r="1" fill="#C4846A" />
    </svg>
  );
}
