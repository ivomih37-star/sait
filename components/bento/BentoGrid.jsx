"use client";

import { motion } from "framer-motion";

/**
 * BentoGrid — модульная адаптивная сетка с появлением плиток по очереди.
 * Дочерние BentoTile сами задают свой размер через `span`.
 */
export default function BentoGrid({ children, className = "" }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
      }}
      className={`grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.97 },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className={`h-full ${child.props?.span || ""}`}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
