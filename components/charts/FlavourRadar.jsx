"use client";

import { useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { FLAVOUR_AXES } from "@/lib/constants";

/**
 * FlavourRadar — интерактивный spider-chart вкусового профиля ракии.
 * Анимированное появление; переключатель сравнения с базовым (средним)
 * профилем каталога.
 *
 * @param {object} profile   профиль выбранной бутылки {intensity, tannins, ...}
 * @param {object} baseline  базовый/средний профиль для сравнения
 * @param {string} name      название бутылки (легенда)
 */
export default function FlavourRadar({ profile, baseline, name = "Профиль" }) {
  const [compare, setCompare] = useState(false);
  const [active, setActive] = useState(null);

  const data = useMemo(
    () =>
      FLAVOUR_AXES.map((axis) => ({
        axis: axis.label,
        value: profile?.[axis.key] ?? 0,
        baseline: baseline?.[axis.key] ?? 0,
      })),
    [profile, baseline]
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="glass-tile p-5"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Flavour Matrix</p>
        {baseline && (
          <button
            type="button"
            onClick={() => setCompare((v) => !v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              compare
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-border text-cream/60 hover:text-gold"
            }`}
            aria-pressed={compare}
          >
            {compare ? "Скрыть средний" : "Сравнить со средним"}
          </button>
        )}
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%" onMouseMove={() => {}}>
            <defs>
              <linearGradient id="goldFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f4d58d" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#a9772c" stopOpacity={0.35} />
              </linearGradient>
            </defs>

            <PolarGrid stroke="#2a2a32" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#cfc6b4", fontSize: 12 }}
              onMouseEnter={(_, idx) => setActive(idx)}
              onMouseLeave={() => setActive(null)}
            />
            <PolarRadiusAxis
              domain={[0, 10]}
              tickCount={6}
              tick={{ fill: "#6b6357", fontSize: 10 }}
              axisLine={false}
            />

            {/* Базовый/средний профиль (под основным) */}
            {compare && baseline && (
              <Radar
                name="Средний по каталогу"
                dataKey="baseline"
                stroke="#6b6357"
                strokeDasharray="4 4"
                fill="#6b6357"
                fillOpacity={0.12}
                isAnimationActive
                animationDuration={700}
              />
            )}

            {/* Профиль выбранной бутылки */}
            <Radar
              name={name}
              dataKey="value"
              stroke="#d9a441"
              strokeWidth={2}
              fill="url(#goldFill)"
              fillOpacity={0.55}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />

            <Tooltip
              cursor={{ stroke: "#d9a441", strokeOpacity: 0.3 }}
              contentStyle={{
                background: "#16161c",
                border: "1px solid #26262e",
                borderRadius: 12,
                color: "#ede6d6",
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Числовая раскладка осей с подсветкой активной */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {FLAVOUR_AXES.map((axis, idx) => (
          <div
            key={axis.key}
            className={`rounded-xl border px-2 py-2 transition-colors ${
              active === idx
                ? "border-gold/60 bg-gold/10"
                : "border-ink-border bg-ink-soft/50"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-cream/50">
              {axis.label}
            </div>
            <div className="text-lg font-semibold text-gold">{profile?.[axis.key] ?? 0}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
