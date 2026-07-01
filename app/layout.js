import "./globals.css";
import { Playfair_Display, Montserrat } from "next/font/google";

// Богатая типографика: Playfair Display (заголовки) + Montserrat (текст),
// обе с кириллицей.
const display = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://xn--80aaldqfdq.xn--p1ai"),
  title: {
    default: "РакияКлуб · Клуб любителей болгарской ракии",
    template: "%s · РакияКлуб",
  },
  description:
    "Премиальное сообщество ценителей болгарской ракии: дегустации, каталог редких серий, культура и гастропейринг.",
  keywords: ["ракия", "болгарская ракия", "клуб", "дегустация", "rakia"],
  openGraph: {
    title: "РакияКлуб · Клуб любителей болгарской ракии",
    description:
      "Дегустации, каталог редких серий, Telegram Mini App и культура болгарской ракии.",
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0b0b0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
