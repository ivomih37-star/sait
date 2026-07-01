"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Sparkles } from "lucide-react";

/**
 * GastroPairing — интерактивный AI-виджет подбора сочетаний.
 * Пользователь раскрывает рекомендации; они появляются с анимацией,
 * сила сочетания визуализируется баром.
 * @param {Array} pairings [{dish, emoji, score, description?}]
 */
export default function GastroPairing({ pairings = [], productName }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="glass-tile p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2">
          <UtensilsCrossed size={14} /> AI-гастропейринг
        </p>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold"
        >
          <Sparkles size={12} /> {revealed ? "Скрыть" : "Подобрать пары"}
        </button>
      </div>

      {!revealed && (
        <p className="mt-3 text-sm text-cream/55">
          Современные балканские и фьюжн-сочетания для «{productName}».
        </p>
      )}

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 overflow-hidden"
          >
            {pairings.map((p, i) => (
              <motion.div
                key={p.dish}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-2xl border border-ink-border bg-ink-soft/50 p-3"
              >
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm text-cream/85">{p.dish}</p>
                  {p.description && (
                    <p className="text-xs text-cream/45">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-border">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.score}%` }}
                      transition={{ delay: i * 0.08 + 0.1, duration: 0.6 }}
                      className="h-full rounded-full bg-gold-gradient"
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-gold">{p.score}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
