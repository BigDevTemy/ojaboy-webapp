import Link from "next/link";
import { Menu } from "lucide-react";
import { HeaderAuthActions } from "@/components/HeaderAuthActions";
import Logo from "./Logo";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Market Prices", href: "/market-prices" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "About Us", href: "/about-us" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
];

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/88 shadow-[0_10px_35px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Logo />

        <nav className="hidden items-center gap-9 text-sm font-bold text-black lg:flex">
          {navItems.map((item) => (
            <Link className="relative py-2 transition hover:text-[#f10606]" href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <HeaderAuthActions />
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-black/10 bg-white/80 lg:hidden" aria-label="Open menu">
          <Menu size={22} strokeWidth={2.4} />
        </button>
      </div>
    </header>
  );
}
