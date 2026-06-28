import Link from "next/link";
import { GlassWater } from "lucide-react";

const NAV = [
  { href: "/catalog", label: "Каталог" },
  { href: "/raspisanie", label: "Дегустации" },
  { href: "/b2b/login", label: "B2B" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-border/60 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-gradient text-ink">
            <GlassWater size={18} strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-cream">
            Ракия<span className="text-gold-gradient">Клуб</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-cream/70 transition-colors hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/tma" className="btn-gold">
          Вступить в клуб
        </Link>
      </div>
    </header>
  );
}
