"use client";

import Link from "next/link";
import {
  Wine,
  CalendarDays,
  Smartphone,
  Building2,
  QrCode,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";
import BentoGrid from "@/components/bento/BentoGrid";
import BentoTile from "@/components/bento/BentoTile";
import { events, products, KIND_LABELS } from "@/lib/demo-data";

function fmtDate(iso) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function HomePage() {
  const kinds = [...new Set(products.map((p) => KIND_LABELS[p.kind]))];

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

        {/* Интерактивная Bento-сетка */}
        <BentoGrid>
          <BentoTile
            span="lg:col-span-2 lg:row-span-2"
            eyebrow="Коллекция"
            title="Каталог редких серий"
            subtitle="Виноградная, сливовая, абрикосовая, вишнёвая — с интерактивными вкусовыми профилями."
            icon={Wine}
            href="/catalog"
            accent
            reveal={
              <div className="flex flex-wrap gap-2">
                {kinds.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-ink-border bg-ink-soft px-3 py-1 text-xs text-cream/70"
                  >
                    {k}
                  </span>
                ))}
              </div>
            }
          />

          <BentoTile
            span="lg:col-span-2"
            eyebrow="События"
            title="Дегустации"
            subtitle="Выбор стола и места, мгновенная запись."
            icon={CalendarDays}
            href="/raspisanie"
            reveal={
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.slug} className="flex items-center justify-between text-sm">
                    <span className="text-cream/80">{e.title}</span>
                    <span className="text-gold">{fmtDate(e.startsAt)}</span>
                  </li>
                ))}
              </ul>
            }
          />

          <BentoTile
            eyebrow="Telegram"
            title="Mini App"
            subtitle="Календарь, билет с QR прямо в Telegram."
            icon={Smartphone}
            href="/tma"
          />

          <BentoTile
            eyebrow="HoReCa"
            title="B2B-портал"
            subtitle="Оптовые цены, бренд-киты, аллокации."
            icon={Building2}
            href="/b2b/login"
          />

          <BentoTile
            span="lg:col-span-2"
            eyebrow="Phygital"
            title="QR-сомелье"
            subtitle="Сканируй бутылку на дегустации — оцени вкус и оставь отзыв."
            icon={QrCode}
            href="/catalog"
          />

          <BentoTile
            span="lg:col-span-2"
            eyebrow="AI"
            title="Гастропейринг"
            subtitle="Подбор современных балканских сочетаний к каждой бутылке."
            icon={UtensilsCrossed}
            href="/catalog"
          />
        </BentoGrid>
      </main>

      <SiteFooter />
    </>
  );
}
