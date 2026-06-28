import Link from "next/link";
import { Wine, Star } from "lucide-react";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";
import TiltCard from "@/components/bento/TiltCard";
import { products, KIND_LABELS } from "@/lib/demo-data";

export const metadata = { title: "Каталог" };

export default function CatalogPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-12">
        <p className="eyebrow mb-3">Коллекция</p>
        <h1 className="text-4xl font-semibold text-cream sm:text-5xl">
          Каталог <span className="text-gold-gradient">ракии</span>
        </h1>
        <p className="mt-4 max-w-xl text-cream/60">
          Каждая бутылка — с интерактивной вкусовой матрицей и подбором гастросочетаний.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <TiltCard key={p.slug} intensity={7}>
              <Link
                href={`/catalog/${p.slug}`}
                className="glass-tile flex h-full flex-col p-5 transition-shadow duration-300 hover:shadow-glow"
              >
                <div className="flex items-center justify-between [transform:translateZ(30px)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-border bg-ink-soft text-gold">
                    <Wine size={20} strokeWidth={1.6} />
                  </span>
                  {p.isLimited && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                      <Star size={11} /> Лимитка
                    </span>
                  )}
                </div>

                <div className="mt-6 [transform:translateZ(20px)]">
                  <p className="text-xs uppercase tracking-wider text-cream/40">
                    {KIND_LABELS[p.kind]} · {p.abv}%
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-cream">{p.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-cream/55">{p.description}</p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="text-lg font-semibold text-gold">
                    {p.priceRetail.toLocaleString("ru-RU")} ₽
                  </span>
                  <span className="text-sm text-cream/50">{p.volumeMl} мл</span>
                </div>
              </Link>
            </TiltCard>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
