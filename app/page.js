import Link from "next/link";

const NAV = [
  { href: "#o-rakii", label: "О ракии" },
  { href: "#klub", label: "О клубе" },
  { href: "/raspisanie/", label: "Расписание" },
  { href: "#vstupit", label: "Как вступить" },
  { href: "#pravila", label: "Правила" },
  { href: "#kontakty", label: "Контакты" },
];

const FEATURES = [
  {
    icon: "🥃",
    title: "Дегустации",
    text: "Сравниваем сливовую, виноградную, абрикосовую и айвовую ракию из разных регионов Болгарии — от Тракии до Дуная.",
  },
  {
    icon: "📚",
    title: "Культура и история",
    text: "Разбираем традиции перегонки, ракийную закуску (шопский салат, лютеница) и роль ракии в болгарском застолье.",
  },
  {
    icon: "🤝",
    title: "Сообщество",
    text: "Тёплая компания единомышленников в Москве: новые знакомства, обмен находками и совместные поездки.",
  },
  {
    icon: "🎓",
    title: "Мастер-классы",
    text: "Приглашаем экспертов и сомелье, учимся правильно подавать, охлаждать и дегустировать ракию.",
  },
];

const KINDS = [
  {
    icon: "🍇",
    name: "Гроздова",
    desc: "Виноградная ракия — самая распространённая, близкая родственница граппы и чачи.",
    raw: "Виноград",
    abv: "40°",
    taste: "Сухая, с лёгкой терпкостью и виноградным ароматом.",
    serve: "Охлаждённой, 12–16 °C, с шопским салатом.",
  },
  {
    icon: "🍑",
    name: "Сливова",
    desc: "Из слив — самая узнаваемая и «домашняя» болгарская ракия.",
    raw: "Слива",
    abv: "40–45°",
    taste: "Мягкая, чуть сладковатая, с косточковой ноткой.",
    serve: "Комнатной температуры или слегка охлаждённой.",
  },
  {
    icon: "🍊",
    name: "Кайсиева",
    desc: "Абрикосовая — ароматная и мягкая, легко влюбляет новичков.",
    raw: "Абрикос",
    abv: "40°",
    taste: "Выраженный фруктовый аромат, нежный вкус.",
    serve: "Хорошо охлаждённой, как аперитив.",
  },
  {
    icon: "🍐",
    name: "Дюлева",
    desc: "Айвовая — редкая и тонкая, для ценителей.",
    raw: "Айва",
    abv: "40°",
    taste: "Деликатная, с медово-цветочным послевкусием.",
    serve: "Слегка охлаждённой, маленькими глотками.",
  },
  {
    icon: "🍒",
    name: "Вишнева",
    desc: "Вишнёвая ракия — насыщенная, с характерной кислинкой.",
    raw: "Вишня",
    abv: "40°",
    taste: "Яркая, ягодная, с приятной горчинкой косточки.",
    serve: "Охлаждённой, к десертам и сырам.",
  },
  {
    icon: "🍯",
    name: "Мускатова",
    desc: "Из мускатного винограда — самая ароматная виноградная ракия.",
    raw: "Мускатный виноград",
    abv: "40°",
    taste: "Цветочно-медовый аромат, мягкий вкус.",
    serve: "Охлаждённой, как дижестив после застолья.",
  },
];

const MEETINGS = [
  {
    when: "Каждая 2-я пятница месяца",
    title: "Тематическая дегустация",
    text: "Знакомимся с одним видом ракии или регионом. 4–6 образцов, закуски, обсуждение.",
  },
  {
    when: "Раз в квартал",
    title: "Большое застолье",
    text: "Болгарский стол, музыка и гости. Формат, в котором клуб знакомится поближе.",
  },
  {
    when: "По сезону",
    title: "Выездные события",
    text: "Поездки на ярмарки, тематические ужины в ресторанах балканской кухни.",
  },
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="logo">
            <span className="logo-mark">🇧🇬</span>
            <span className="logo-text">
              Ракия&nbsp;Клуб
              <small>Москва</small>
            </span>
          </a>
          <nav className="nav">
            {NAV.map((item) =>
              item.href.startsWith("/") ? (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              )
            )}
          </nav>
          <a href="#vstupit" className="btn btn-sm">
            Вступить
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-inner">
            <p className="eyebrow">Наздраве! · Клуб ценителей</p>
            <h1>
              Клуб любителей
              <br />
              болгарской ракии
            </h1>
            <p className="lead">
              Сообщество в Москве для тех, кто любит ракию не просто как
              напиток, а как часть болгарской культуры. Дегустируем, изучаем
              традиции и собираемся в хорошей компании.
            </p>
            <div className="hero-actions">
              <a href="#vstupit" className="btn">
                Присоединиться к клубу
              </a>
              <Link href="/raspisanie/" className="btn btn-ghost">
                Расписание встреч
              </Link>
            </div>
            <ul className="hero-stats">
              <li>
                <strong>2×</strong>
                <span>встречи в месяц</span>
              </li>
              <li>
                <strong>10+</strong>
                <span>видов ракии</span>
              </li>
              <li>
                <strong>18+</strong>
                <span>осознанно и в меру</span>
              </li>
            </ul>
          </div>
        </section>

        <section id="o-rakii" className="section">
          <div className="container">
            <h2>Что такое ракия</h2>
            <p className="section-lead">
              Ракия — традиционный балканский крепкий напиток двойной перегонки
              из фруктов. В Болгарии её настаивают веками: каждая семья и каждый
              регион хранит свой рецепт. Крепость обычно 40°, а у домашней
              «лютой» бывает и выше.
            </p>
            <div className="cards kinds">
              {KINDS.map((k) => (
                <article key={k.name} className="card kind">
                  <div className="kind-head">
                    <span className="kind-icon" aria-hidden="true">
                      {k.icon}
                    </span>
                    <h3>{k.name}</h3>
                    <span className="kind-abv">{k.abv}</span>
                  </div>
                  <p>{k.desc}</p>
                  <dl className="kind-meta">
                    <div>
                      <dt>Сырьё</dt>
                      <dd>{k.raw}</dd>
                    </div>
                    <div>
                      <dt>Вкус</dt>
                      <dd>{k.taste}</dd>
                    </div>
                    <div>
                      <dt>Как пить</dt>
                      <dd>{k.serve}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="klub" className="section section-alt">
          <div className="container">
            <h2>Чем мы занимаемся</h2>
            <p className="section-lead">
              Клуб — это не про «выпить», а про вкус, традиции и общение.
              Вот что вас ждёт.
            </p>
            <div className="features">
              {FEATURES.map((f) => (
                <article key={f.title} className="feature">
                  <div className="feature-icon" aria-hidden="true">
                    {f.icon}
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="vstrechi" className="section">
          <div className="container">
            <h2>Формат встреч</h2>
            <p className="section-lead">
              Собираемся в Москве на уютных площадках. Точные адреса и даты
              участники получают в чате клуба.
            </p>
            <div className="timeline">
              {MEETINGS.map((m) => (
                <article key={m.title} className="timeline-item">
                  <span className="timeline-when">{m.when}</span>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </article>
              ))}
            </div>
            <div className="hero-actions">
              <Link href="/raspisanie/" className="btn">
                Смотреть расписание встреч
              </Link>
            </div>
          </div>
        </section>

        <section id="vstupit" className="section section-alt">
          <div className="container join">
            <div className="join-text">
              <h2>Как вступить</h2>
              <p className="section-lead">
                Членство бесплатное — участники скидываются только на образцы и
                закуски на конкретной встрече. Чтобы попасть в клуб:
              </p>
              <ol className="steps">
                <li>Вступайте в наш чат в Telegram и представьтесь.</li>
                <li>Расскажите пару слов о себе — мы небольшое сообщество.</li>
                <li>Следите за анонсами встреч в канале клуба.</li>
              </ol>
              <div className="hero-actions">
                <a
                  href="https://t.me/raki_club_chat"
                  className="btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 Вступить в чат
                </a>
                <a
                  href="https://t.me/raki_club_msk"
                  className="btn btn-ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📢 Наш канал
                </a>
              </div>
            </div>
            <aside className="join-card">
              <h3>Кому подойдёт клуб</h3>
              <ul className="checklist">
                <li>Любите Балканы и хотите узнать ракию глубже</li>
                <li>Цените культуру напитка, а не количество</li>
                <li>Ищете тёплую компанию в Москве</li>
                <li>Готовы соблюдать правила клуба</li>
              </ul>
              <p className="note">Участие строго 18+.</p>
            </aside>
          </div>
        </section>

        <section id="pravila" className="section">
          <div className="container">
            <h2>Правила клуба</h2>
            <div className="cards">
              <article className="card">
                <h3>Осознанно</h3>
                <p>
                  Мы за культуру, а не за злоупотребление. Пьём в меру, цель
                  встречи — вкус и общение.
                </p>
              </article>
              <article className="card">
                <h3>Уважение</h3>
                <p>
                  Дружелюбная атмосфера без споров на острые темы. Каждый гость
                  важен.
                </p>
              </article>
              <article className="card">
                <h3>Безопасность</h3>
                <p>
                  За руль после встречи — нет. Заранее планируйте, как
                  добраться домой.
                </p>
              </article>
              <article className="card">
                <h3>18+</h3>
                <p>
                  Участие только для совершеннолетних. Мы можем попросить
                  подтвердить возраст.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="kontakty" className="section section-alt">
          <div className="container contacts">
            <div>
              <h2>Контакты</h2>
              <p className="section-lead">
                Есть вопрос или хотите присоединиться? Напишите — будем рады.
              </p>
            </div>
            <ul className="contact-list">
              <li>
                <span>Telegram-чат</span>
                <a
                  href="https://t.me/raki_club_chat"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @raki_club_chat
                </a>
              </li>
              <li>
                <span>Telegram-канал</span>
                <a
                  href="https://t.me/raki_club_msk"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @raki_club_msk
                </a>
              </li>
              <li>
                <span>Почта</span>
                <a href="mailto:im@kvistrade.ru">im@kvistrade.ru</a>
              </li>
              <li>
                <span>Город</span>
                <span>Москва</span>
              </li>
            </ul>
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
