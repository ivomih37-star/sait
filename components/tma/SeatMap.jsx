"use client";

import { motion } from "framer-motion";

/**
 * SeatMap — интерактивный выбор стола и места.
 * @param {Array} tables  [{id,label,seats:[{id,number,status}]}]
 */
export default function SeatMap({ tables, selectedSeat, onSelect }) {
  return (
    <div className="space-y-5">
      {tables.map((table) => (
        <div key={table.id}>
          <p className="mb-2 text-sm font-medium text-cream/70">{table.label}</p>
          <div className="flex flex-wrap gap-2">
            {table.seats.map((seat) => {
              const taken = seat.status !== "FREE";
              const active = selectedSeat === seat.id;
              return (
                <motion.button
                  key={seat.id}
                  type="button"
                  disabled={taken}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelect(seat.id)}
                  className={`h-11 w-11 rounded-xl border text-sm font-semibold transition-colors ${
                    taken
                      ? "cursor-not-allowed border-ink-border bg-ink-soft/40 text-cream/25"
                      : active
                        ? "border-gold bg-gold-gradient text-ink"
                        : "border-ink-border bg-ink-soft text-cream/80 hover:border-gold/60"
                  }`}
                  aria-pressed={active}
                >
                  {seat.number}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
