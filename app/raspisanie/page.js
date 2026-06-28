import Link from "next/link";
import { CalendarDays, MapPin, Users, ArrowUpRight } from "lucide-react";
import SiteHeader from "@/components/ui/SiteHeader";
import SiteFooter from "@/components/ui/SiteFooter";
import { events } from "@/lib/demo-data";

export const metadata = {
  title: "Дегустации",
  description:
    "Календарь дегустаций Клуба любителей болгарской ракии: даты, темы, выбор места и мгновенная запись.",
};

function fmt(iso) {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d),
    day: new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(d),
    time: new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

export default function SchedulePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-12">
        <p className="eyebrow mb-3 flex items-center gap-2">
          <CalendarDays size={14} /> Календарь
        </p>
        <h1 className="text-4xl font-semibold text-cream sm:text-5xl">
          Ближайшие <span className="text-gold-gradient">дегустации</span>
        </h1>
        <p className="mt-4 max-w-xl text-cream/60">
          Выбор стола и места, мгновенная запись и цифровой билет с QR — в Telegram Mini App.
        </p>

        <div className="mt-10 space-y-4">
          {events.map((e) => {
            const t = fmt(e.startsAt);
            return (
              <Link
                key={e.slug}
                href="/tma"
                className="glass-tile group flex flex-col gap-5 p-6 transition-shadow hover:shadow-glow sm:flex-row sm:items-center"
              >
                {/* Дата-блок */}
                <div className="flex w-full shrink-0 items-center gap-4 sm:w-40 sm:flex-col sm:items-start">
                  <div className="text-3xl font-semibold text-gold">{t.date}</div>
                  <div className="text-sm capitalize text-cream/50">
                    {t.day}, {t.time}
                  </div>
                </div>

                <div className="hidden h-16 w-px bg-ink-border sm:block" />

                {/* Контент */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-cream">{e.title}</h3>
                    <ArrowUpRight
                      size={20}
                      className="shrink-0 text-gold opacity-40 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-cream/55">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} /> {e.venue}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={14} /> осталось {e.seatsLeft} мест
                    </span>
                    <span className="font-medium text-gold">
                      {e.priceRub.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
