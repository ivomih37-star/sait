import Link from "next/link";

export const metadata = {
  title: "Расписание встреч · Клуб любителей болгарской ракии · Москва",
  description:
    "Календарь дегустаций и встреч Клуба любителей болгарской ракии в Москве: даты, темы, форматы. Записывайтесь заранее.",
};

const NAV = [
  { href: "/#o-rakii", label: "О ракии" },
  { href: "/#klub", label: "О клубе" },
  { href: "/raspisanie/", label: "Расписание" },
  { href: "/#vstupit", label: "Как вступить" },
  { href: "/#kontakty", label: "Контакты" },
];

// status: "open" — запись открыта, "soon" — скоро, "done" — прошла
const SCHEDULE = [
  {
    date: "24 июля 2026",
    day: "Пятница",
    time: "19:00",
    icon: "🥃",
    title: "Первая дегустация: знакомство с видами ракии",
    text: "Пробуем 5 образцов — от гроздовы до редкой фруктовой. Болгарское мезе, карты дегустации, знакомство клуба.",
    place: "Москва · адрес в чате участникам",
    status: "open",
  },
  {
    date: "14 августа 2026",
    day: "Пятница",
    time: "19:00",
    icon: "🍇",
    title: "Виноградная ракия: гроздова и мускатова",
    text: "Сравниваем виноградные ракии разных регионов. Чем гроздова отличается от граппы и чачи.",
    place: "Москва · адрес в чате участникам",
    status: "soon",
  },
  {
    date: "11 сентября 2026",
    day: "Пятница",
    time: "19:00",
    icon: "🍑",
    title: "Косточковые: сливова, кайсиева, вишнева",
    text: "Фруктовая линейка — самые ароматные ракии. Подбираем закуски под каждый вкус.",
    place: "Москва · адрес в чате участникам",
    status: "soon",
  },
  {
    date: "Конец сентября 2026",
    day: "Суббота",
    time: "18:00",
    icon: "🎉",
    title: "Большое застолье (раз в квартал)",
    text: "Болгарский стол, музыка и гости. Формат, в котором клуб знакомится поближе.",
    place: "Москва · площадка уточняется",
    status: "soon",
  },
];

const STATUS = {
  open: { label: "Запись открыта", cls: "is-open" },
  soon: { label: "Скоро", cls: "is-soon" },
  done: { label: "Прошла", cls: "is-done" },
};

export default function Schedule() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            <span className="logo-mark">🇧🇬</span>
            <span className="logo-text">
              Ракия&nbsp;Клуб
              <small>Москва</small>
            </span>
          </Link>
          <nav className="nav">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/#vstupit" className="btn btn-sm">
            Вступить
          </Link>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="container">
            <p className="eyebrow">Наздраве! · Календарь клуба</p>
            <h1>Расписание встреч</h1>
            <p className="section-lead">
              Собираемся в Москве дважды в месяц: тематические дегустации и
              большие застолья. Точные адреса и детали участники получают в
              чате клуба. Места ограничены — записывайтесь заранее.
            </p>

            <div className="schedule">
              {SCHEDULE.map((m) => {
                const st = STATUS[m.status];
                return (
                  <article key={m.title} className="schedule-item">
                    <div className="schedule-date">
                      <span className="schedule-icon" aria-hidden="true">
                        {m.icon}
                      </span>
                      <strong>{m.date}</strong>
                      <span className="schedule-dow">
                        {m.day} · {m.time}
                      </span>
                    </div>
                    <div className="schedule-body">
                      <div className="schedule-head">
                        <h3>{m.title}</h3>
                        <span className={`schedule-status ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p>{m.text}</p>
                      <p className="schedule-place">📍 {m.place}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="schedule-cta">
              <p>
                Хотите попасть на ближайшую встречу? Напишите нам — пришлём
                детали и забронируем место.
              </p>
              <div className="hero-actions">
                <a
                  href="https://t.me/raki_club_chat"
                  className="btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 Записаться в чате
                </a>
                <Link href="/#vstupit" className="btn btn-ghost">
                  Как вступить в клуб
                </Link>
              </div>
            </div>

            <p className="note schedule-note">
              Даты и темы могут меняться — актуальное всегда в чате клуба.
              Участие строго 18+.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>
            © {new Date().getFullYear()} Клуб любителей болгарской ракии ·
            Москва
          </p>
          <p className="footer-note">
            Употребление алкоголя вредит вашему здоровью. Сайт для лиц 18+.
          </p>
        </div>
      </footer>
    </>
  );
}
