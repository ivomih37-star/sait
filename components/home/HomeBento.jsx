"use client";

import {
  Wine,
  CalendarDays,
  Smartphone,
  Building2,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import BentoGrid from "@/components/bento/BentoGrid";
import BentoTile from "@/components/bento/BentoTile";

function fmtDate(iso) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * HomeBento — интерактивная Bento-сетка главной (клиентский остров).
 * @param {string[]} kinds   виды ракии (лейблы) из БД
 * @param {Array}    events  ближайшие дегустации [{title, startsAt}]
 */
export default function HomeBento({ kinds = [], events = [] }) {
  return (
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
          kinds.length ? (
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
          ) : null
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
          events.length ? (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id || e.title} className="flex items-center justify-between text-sm">
                  <span className="text-cream/80">{e.title}</span>
                  <span className="text-gold">{fmtDate(e.startsAt)}</span>
                </li>
              ))}
            </ul>
          ) : null
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
  );
}
