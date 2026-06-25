import "./globals.css";

export const metadata = {
  title: "Клуб любителей болгарской ракии · Москва",
  description:
    "Сообщество ценителей болгарской ракии в Москве: дегустации, встречи, культура и традиции. Присоединяйтесь к клубу.",
  keywords: [
    "ракия",
    "болгарская ракия",
    "клуб",
    "Москва",
    "дегустация",
    "ракия Москва",
  ],
  openGraph: {
    title: "Клуб любителей болгарской ракии · Москва",
    description:
      "Сообщество ценителей болгарской ракии в Москве: дегустации, встречи, культура и традиции.",
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#00966e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
