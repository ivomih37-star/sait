"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Download, Package, FileText, LogOut } from "lucide-react";
import { products, KIND_LABELS } from "@/lib/demo-data";

// Бренд-киты и техлисты (на проде — реальные файлы из download-центра).
const BRAND_KITS = [
  { name: "Логотипы и гайдлайн (ZIP)", icon: Download, href: "#" },
  { name: "Тех-карты дегустации (PDF)", icon: FileText, href: "#" },
  { name: "Фото бутылок в высоком разрешении", icon: Download, href: "#" },
];

// Опт-цена для демо ≈ 65% от розницы (на проде — поле priceWholesale из БД).
const wholesale = (retail) => Math.round((retail * 0.65) / 10) * 10;

export default function B2bDashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [qty, setQty] = useState({});
  const [sent, setSent] = useState({});

  useEffect(() => {
    const s = localStorage.getItem("raki_b2b_session");
    if (!s) router.replace("/b2b/login");
    else setSession(s);
  }, [router]);

  async function requestAllocation(productId) {
    const quantity = Number(qty[productId] || 0);
    if (!quantity) return;
    const r = await fetch("/api/b2b/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session}` },
      body: JSON.stringify({ productId, quantity }),
    }).then((x) => x.json());
    setSent((prev) => ({ ...prev, [productId]: r.ok ? "ok" : r.reason || "err" }));
  }

  function logout() {
    localStorage.removeItem("raki_b2b_session");
    router.replace("/b2b/login");
  }

  if (!session) return null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Building2 size={14} /> B2B-кабинет
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-cream">Партнёрам HoReCa</h1>
        </div>
        <button onClick={logout} className="btn-ghost">
          <LogOut size={15} /> Выйти
        </button>
      </div>

      {/* Download-центр */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-cream">Бренд-киты и материалы</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {BRAND_KITS.map((k) => (
            <a
              key={k.name}
              href={k.href}
              className="glass-tile flex items-center gap-3 p-4 text-sm text-cream/80 transition-shadow hover:shadow-glow"
            >
              <k.icon size={18} className="text-gold" /> {k.name}
            </a>
          ))}
        </div>
      </section>

      {/* Опт-прайс + заявки на аллокацию */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-cream">
          Опт-прайс и аллокация редких серий
        </h2>
        <div className="overflow-hidden rounded-bento border border-ink-border">
          <table className="w-full text-sm">
            <thead className="bg-ink-soft/60 text-left text-xs uppercase tracking-wider text-cream/40">
              <tr>
                <th className="px-4 py-3">Продукт</th>
                <th className="px-4 py-3">Розница</th>
                <th className="px-4 py-3 text-gold">Опт</th>
                <th className="px-4 py-3">Заявка</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const fakeId = p.slug; // в проде — p.id
                return (
                  <tr key={p.slug} className="border-t border-ink-border/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-cream">{p.name}</div>
                      <div className="text-xs text-cream/40">
                        {KIND_LABELS[p.kind]}
                        {p.isLimited ? " · лимитка" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cream/60">
                      {p.priceRetail.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-3 font-semibold text-gold">
                      {wholesale(p.priceRetail).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-3">
                      {sent[fakeId] === "ok" ? (
                        <span className="text-xs text-gold">Заявка принята</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder="шт"
                            value={qty[fakeId] || ""}
                            onChange={(e) => setQty((q) => ({ ...q, [fakeId]: e.target.value }))}
                            className="w-16 rounded-lg border border-ink-border bg-ink-soft/60 px-2 py-1.5 text-cream outline-none focus:border-gold/50"
                          />
                          <button
                            onClick={() => requestAllocation(fakeId)}
                            className="rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/25"
                          >
                            <Package size={13} className="mr-1 inline" /> Запросить
                          </button>
                        </div>
                      )}
                      {sent[fakeId] && sent[fakeId] !== "ok" && (
                        <span className="block text-xs text-red">
                          {sent[fakeId] === "profile_not_approved"
                            ? "Профиль на модерации"
                            : "Ошибка"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-cream/40">
          Цены и наличие лимитированных серий — конфиденциально, только для партнёров.
        </p>
      </section>
    </main>
  );
}
