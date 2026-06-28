"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import TiltCard from "./TiltCard";

/**
 * BentoTile — плитка Bento-сетки с 3D-наклоном и контентным раскрытием.
 * При наведении вторичный слой (`reveal`) плавно проявляется снизу,
 * а основной контент слегка «всплывает» (parallax по Z).
 *
 * @param {React.ElementType} icon   иконка Lucide
 * @param {React.ReactNode}   reveal вторичный слой (даты, быстрые действия)
 * @param {string}            href   ссылка-назначение
 * @param {string}            span   tailwind-классы размера плитки в сетке
 */
export default function BentoTile({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  reveal,
  href = "#",
  span = "",
  accent = false,
  children,
}) {
  const [hover, setHover] = useState(false);

  return (
    <TiltCard className={span} intensity={8}>
      <Link
        href={href}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`glass-tile flex h-full flex-col justify-between p-6 transition-shadow duration-300 hover:shadow-glow ${
          accent ? "ring-gold" : ""
        }`}
      >
        {/* Декоративная золотая дымка в углу */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl"
        />

        {/* Верх: иконка + стрелка перехода */}
        <div className="relative flex items-start justify-between [transform:translateZ(40px)]">
          {Icon && (
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-border bg-ink-soft text-gold">
              <Icon size={20} strokeWidth={1.6} />
            </span>
          )}
          <motion.span
            animate={{ x: hover ? 2 : 0, y: hover ? -2 : 0, opacity: hover ? 1 : 0.45 }}
            className="text-gold"
          >
            <ArrowUpRight size={20} />
          </motion.span>
        </div>

        {/* Основной контент */}
        <div className="relative mt-8 [transform:translateZ(28px)]">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h3 className="text-2xl font-semibold leading-tight text-cream">{title}</h3>
          {subtitle && <p className="mt-2 text-sm text-cream/60">{subtitle}</p>}
          {children}

          {/* Вторичный слой: проявляется при наведении */}
          <AnimatePresence>
            {reveal && hover && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 border-t border-ink-border pt-4">{reveal}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>
    </TiltCard>
  );
}
