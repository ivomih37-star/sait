/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // «Modern Bulgaria»: глубокий тёмный + золото/амбер
        ink: {
          DEFAULT: "#0b0b0d",
          soft: "#121216",
          card: "#16161c",
          border: "#26262e",
        },
        gold: {
          DEFAULT: "#d9a441",
          soft: "#f4d58d",
          deep: "#a9772c",
        },
        cream: "#ede6d6",
        // Семантические акценты (для состояний: ошибка/успех)
        red: { DEFAULT: "#d64a3b" },
        green: { DEFAULT: "#3fae6b" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Playfair Display", "serif"],
        sans: ["var(--font-sans)", "Montserrat", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #a9772c 0%, #d9a441 35%, #f4d58d 55%, #a9772c 100%)",
        "radial-spot":
          "radial-gradient(ellipse at top, rgba(217,164,65,0.12), transparent 60%)",
      },
      boxShadow: {
        tile: "0 10px 40px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(217,164,65,0.25), 0 20px 60px -20px rgba(217,164,65,0.25)",
      },
      borderRadius: {
        bento: "1.5rem",
      },
    },
  },
  plugins: [],
};
