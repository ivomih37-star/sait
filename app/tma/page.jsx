"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, MapPin, Users, Loader2 } from "lucide-react";
import SeatMap from "@/components/tma/SeatMap";
import DigitalTicket from "@/components/tma/DigitalTicket";

function getInitData() {
  if (typeof window === "undefined") return "";
  return window.Telegram?.WebApp?.initData || "";
}

export default function TmaPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [active, setActive] = useState(null); // выбранное событие
  const [seat, setSeat] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Инициализация: валидация initData и загрузка событий
  async function init() {
    try {
      const initData = getInitData();
      if (initData) {
        const r = await fetch("/api/tma/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        }).then((x) => x.json());
        if (r.ok) setUser(r.user);
      }
      const ev = await fetch("/api/tma/events").then((x) => x.json());
      if (ev.ok) setEvents(ev.events);
    } catch (e) {
      setError("Не удалось загрузить данные");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
    init();
  }, []);

  async function register() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/tma/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: getInitData(), eventId: active.id, seatId: seat }),
      }).then((x) => x.json());
      if (!r.ok) {
        setError(r.reason === "auth" ? "Откройте через Telegram" : "Место занято, выберите другое");
        return;
      }
      const t = await fetch(`/api/tma/ticket?code=${r.ticketCode}`).then((x) => x.json());
      if (t.ok) setTicket(t.ticket);
    } catch (e) {
      setError("Ошибка записи");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <main className="mx-auto min-h-screen max-w-md px-4 py-6">
        <header className="mb-6">
          <p className="eyebrow">Telegram Mini App</p>
          <h1 className="font-display text-2xl font-semibold text-cream">
            Запись на дегустацию
          </h1>
          {user && <p className="mt-1 text-sm text-cream/50">Привет, {user.name || "гость"} 👋</p>}
        </header>

        {!ready && (
          <div className="flex justify-center py-20 text-gold">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-cream">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Готовый билет */}
          {ticket ? (
            <motion.div key="ticket" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <DigitalTicket ticket={ticket} />
              <button
                onClick={() => {
                  setTicket(null);
                  setActive(null);
                  setSeat(null);
                }}
                className="btn-ghost mt-6 w-full justify-center"
              >
                Записаться ещё
              </button>
            </motion.div>
          ) : active ? (
            /* Выбор места */
            <motion.div key="seats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button onClick={() => setActive(null)} className="mb-4 text-sm text-cream/60">
                ← К списку
              </button>
              <h2 className="mb-1 text-lg font-semibold text-cream">{active.title}</h2>
              <p className="mb-5 text-sm text-cream/50">Выберите место</p>
              <SeatMap tables={active.tables} selectedSeat={seat} onSelect={setSeat} />
              <button
                disabled={busy || (active.tables.length > 0 && !seat)}
                onClick={register}
                className="btn-gold mt-6 w-full justify-center disabled:opacity-40"
              >
                {busy ? "Записываю…" : `Записаться · ${active.priceRub} ₽`}
              </button>
            </motion.div>
          ) : (
            /* Список событий */
            ready && (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {events.length === 0 && (
                  <p className="py-10 text-center text-cream/40">Пока нет открытых дегустаций</p>
                )}
                {events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setActive(e)}
                    className="glass-tile block w-full p-4 text-left transition-shadow hover:shadow-glow"
                  >
                    <h3 className="font-semibold text-cream">{e.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream/55">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {new Intl.DateTimeFormat("ru-RU", {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(e.startsAt))}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {e.venue}
                      </span>
                      <span className="flex items-center gap-1 text-gold">
                        <Users size={12} /> {e.seatsFree} мест
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
