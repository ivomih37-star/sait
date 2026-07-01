import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink-border/60 bg-ink-soft/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-lg font-semibold text-cream">
            Ракия<span className="text-gold-gradient">Клуб</span>
          </p>
          <p className="mt-1 text-sm text-cream/50">
            Культура болгарской ракии. Москва · РакияКлуб.рф
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/60">
          <Link href="/catalog" className="hover:text-gold">Каталог</Link>
          <Link href="/raspisanie" className="hover:text-gold">Дегустации</Link>
          <Link href="/b2b/login" className="hover:text-gold">Для HoReCa</Link>
          <Link href="/tma" className="hover:text-gold">Mini App</Link>
        </nav>
      </div>
      <div className="border-t border-ink-border/40 py-4 text-center text-xs text-cream/40">
        18+. Употребление алкоголя вредит вашему здоровью.
      </div>
    </footer>
  );
}
