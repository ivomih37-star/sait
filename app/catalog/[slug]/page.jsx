import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";
import FlavourRadar from "@/components/charts/FlavourRadar";
import GastroPairing from "@/components/pairing/GastroPairing";
import { getProduct, averageProfile } from "@/lib/catalog";
import { KIND_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const product = await getProduct(params.slug);
  return { title: product ? product.name : "Каталог" };
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const baseline = await averageProfile();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm text-cream/60 transition-colors hover:text-gold"
        >
          <ArrowLeft size={16} /> В каталог
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Левая колонка — описание и пейринги */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-cream/40">
                {KIND_LABELS[product.kind]} · {product.abv}% · {product.volumeMl} мл
              </span>
              {product.isLimited && (
                <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold">
                  <Star size={11} /> Лимитированная серия
                </span>
              )}
            </div>

            <h1 className="mt-3 text-4xl font-semibold text-cream sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-cream/50">
              {[product.producer, product.region, product.year].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-5 text-lg leading-relaxed text-cream/70">
              {product.description}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <span className="text-3xl font-semibold text-gold">
                {product.priceRetail?.toLocaleString("ru-RU")} ₽
              </span>
              <Link href="/tma" className="btn-gold">
                Попробовать на дегустации
              </Link>
            </div>

            {/* AI-гастропейринг (интерактивный виджет) */}
            <div className="mt-10">
              <GastroPairing pairings={product.pairings} productName={product.name} />
            </div>
          </div>

          {/* Правая колонка — интерактивный Radar / Flavour Matrix */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <FlavourRadar
              profile={product.profile || {}}
              baseline={baseline}
              name={product.name}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
