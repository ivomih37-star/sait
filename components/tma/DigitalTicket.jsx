"use client";

import { motion } from "framer-motion";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

/** Цифровой билет с QR-кодом. */
export default function DigitalTicket({ ticket }) {
  if (!ticket) return null;
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ticket.event.startsAt));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-tile mx-auto max-w-sm p-6 text-center [transform-style:preserve-3d]"
    >
      <p className="eyebrow flex items-center justify-center gap-2">
        <Ticket size={14} /> Билет РакияКлуб
      </p>
      <h3 className="mt-2 font-display text-xl font-semibold text-cream">
        {ticket.event.title}
      </h3>

      {ticket.qr && (
        <img
          src={ticket.qr}
          alt="QR билета"
          className="mx-auto my-5 h-44 w-44 rounded-xl bg-white p-2"
        />
      )}

      <div className="space-y-1.5 text-sm text-cream/70">
        <p className="flex items-center justify-center gap-2">
          <CalendarDays size={14} className="text-gold" /> {date}
        </p>
        <p className="flex items-center justify-center gap-2">
          <MapPin size={14} className="text-gold" /> {ticket.event.venue}
        </p>
        {ticket.seat && (
          <p className="text-cream/80">
            {ticket.seat.table}, место {ticket.seat.number}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-gold/40 py-2 font-mono text-lg tracking-widest text-gold">
        {ticket.code}
      </div>
      <p className="mt-3 text-xs text-cream/40">Покажите QR на входе · 18+</p>
    </motion.div>
  );
}
