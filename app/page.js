import Link from "next/link";
import { Sparkles } from "lucide-react";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";
import HomeBento from "@/components/home/HomeBento";
import { listKinds } from "@/lib/catalog";
import { listUpcomingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [kinds, events] = await Promise.all([listKinds(), listUpcomingEvents()]);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 pb-20">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <Sparkles size={14} /> Современная культура болгарской ракии
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-cream sm:text-6xl">
            Премиальная ракия <br />
            <span className="text-gold-gradient">как живой ритуал</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/60">
            Дегустации, редкие выдержанные серии, вкусовые матрицы и гастропейринг.
            Клуб ценителей в Москве — оффлайн и в Telegram.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalog" className="btn-gold">
              Смотреть каталог
            </Link>
            <Link href="/raspisanie" className="btn-ghost">
              Ближайшие дегустации
            </Link>
          </div>
        </section>

        {/* Интерактивная Bento-сетка (данные из БД) */}
        <HomeBento kinds={kinds} events={events} />
      </main>

      <SiteFooter />
    </>
  );
}
