"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Loader2 } from "lucide-react";

// Вход в B2B-портал по magic-link (без пароля).
export default function B2bLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | verifying
  const [devLink, setDevLink] = useState(null);
  const [error, setError] = useState(null);

  // Если в URL есть token — проверяем и заходим
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    setStatus("verifying");
    fetch("/api/b2b/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token }),
    })
      .then((x) => x.json())
      .then((r) => {
        if (r.ok) {
          localStorage.setItem("raki_b2b_session", r.session);
          router.replace("/b2b/dashboard");
        } else {
          setError("Ссылка недействительна или устарела");
          setStatus("idle");
        }
      })
      .catch(() => {
        setError("Ошибка проверки");
        setStatus("idle");
      });
  }, [router]);

  async function requestLink(e) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const r = await fetch("/api/b2b/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      }).then((x) => x.json());
      if (r.ok) {
        setStatus("sent");
        if (r.devLink) setDevLink(r.devLink);
      } else {
        setError("Проверьте email");
        setStatus("idle");
      }
    } catch {
      setError("Ошибка сети");
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="glass-tile p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-border bg-ink-soft text-gold">
          <Building2 size={22} />
        </span>
        <p className="eyebrow mt-5">B2B-портал · HoReCa</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-cream">
          Вход для партнёров
        </h1>
        <p className="mt-2 text-sm text-cream/55">
          Опт-цены, бренд-киты и аллокации редких серий — для ресторанов, баров и магазинов.
        </p>

        {status === "verifying" ? (
          <div className="flex justify-center py-8 text-gold">
            <Loader2 className="animate-spin" />
          </div>
        ) : status === "sent" ? (
          <div className="mt-6 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-cream">
            Ссылка для входа отправлена на <b>{email}</b>. Проверьте почту.
            {devLink && (
              <a href={devLink} className="mt-2 block break-all text-xs text-gold underline">
                DEV-ссылка: {devLink}
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={requestLink} className="mt-6">
            <label className="flex items-center gap-2 rounded-xl border border-ink-border bg-ink-soft/60 px-3">
              <Mail size={16} className="text-cream/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.ru"
                className="w-full bg-transparent py-3 text-sm text-cream placeholder-cream/30 outline-none"
              />
            </label>
            {error && <p className="mt-3 text-sm text-red">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn-gold mt-4 w-full justify-center disabled:opacity-40"
            >
              {status === "sending" ? "Отправляю…" : "Получить ссылку для входа"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
