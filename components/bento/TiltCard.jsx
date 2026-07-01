"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * TiltCard — плавный 3D-наклон + блик, следующий за курсором.
 * Дочерние элементы с классом `data-parallax` всплывают по оси Z (parallax).
 *
 * @param {number} intensity  максимальный угол наклона в градусах
 * @param {number} glare      непрозрачность золотого блика (0 — выкл.)
 */
export default function TiltCard({
  children,
  className = "",
  intensity = 10,
  glare = 0.15,
}) {
  const ref = useRef(null);

  // Нормализованная позиция курсора внутри карты: -0.5 … 0.5
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 150, damping: 18, mass: 0.4 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [intensity, -intensity]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-intensity, intensity]), spring);

  // Позиция блика следует за курсором
  const glareX = useTransform(px, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(py, [-0.5, 0.5], ["0%", "100%"]);

  function handleMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function reset() {
    px.set(0);
    py.set(0);
  }

  return (
    <div className={`group [perspective:1100px] ${className}`}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative h-full w-full will-change-transform"
      >
        {children}

        {/* Золотой блик-засветка, реагирующий на курсор */}
        {glare > 0 && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-bento opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]) =>
                  `radial-gradient(420px circle at ${gx} ${gy}, rgba(244,213,141,${glare}), transparent 45%)`
              ),
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
