"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { Star, Wine, Check } from "lucide-react";

// Phygital: гость сканирует QR на бутылке/столе → оценивает вкус и оставляет отзыв.
export default function QrRatePage({ params }) {
  const { productId } = use(params);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Анонимная сессия гостя
  function sessionId() {
    if (typeof window === "undefined") return null;
    let s = localStorage.getItem("raki_sid");
    if (!s) {
      s = crypto.randomUUID();
      localStorage.setItem("raki_sid", s);
    }
    return s;
  }

  async function submit() {
    if (!score) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, score, notes, sessionId: sessionId(), source: "qr" }),
      }).then((x) => x.json());
      if (r.ok) setDone(r);
      else setError("Не удалось сохранить оценку");
    } catch {
      setError("Ошибка сети");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="glass-tile p-7 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-border bg-ink-soft text-gold">
          <Wine size={26} strokeWidth={1.5} />
        </span>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Check size={24} />
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold text-cream">Спасибо за оценку!</h1>
            <p className="mt-2 text-sm text-cream/60">
              Средняя оценка: <span className="text-gold">{done.average}</span> ({done.count})
            </p>
          </motion.div>
        ) : (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold text-cream">Оцените ракию</h1>
            <p className="mt-1 text-sm text-cream/50">Ваше мнение — часть дегустации</p>

            <div className="mt-6 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setScore(n)}
                  className="p-1"
                  aria-label={`${n} звёзд`}
                >
                  <Star
                    size={34}
                    className={
                      n <= (hover || score) ? "fill-gold text-gold" : "text-ink-border"
                    }
                  />
                </button>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Заметки о вкусе (необязательно)"
              rows={3}
              className="mt-5 w-full resize-none rounded-xl border border-ink-border bg-ink-soft/60 p-3 text-sm text-cream placeholder-cream/30 outline-none focus:border-gold/50"
            />

            {error && <p className="mt-3 text-sm text-red">{error}</p>}

            <button
              disabled={!score || busy}
              onClick={submit}
              className="btn-gold mt-5 w-full justify-center disabled:opacity-40"
            >
              {busy ? "Отправляю…" : "Оценить"}
            </button>
          </>
        )}
        <p className="mt-5 text-xs text-cream/30">18+ · РакияКлуб.рф</p>
      </div>
    </main>
  );
}
