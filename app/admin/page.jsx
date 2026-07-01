"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X, Pencil, ShieldCheck, RefreshCw, ScanLine } from "lucide-react";

const STATUS_LABEL = {
  PENDING: "На модерации",
  APPROVED: "Одобрено",
  PUBLISHED: "Опубликовано",
  REJECTED: "Отклонено",
  FAILED: "Ошибка публикации",
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState({}); // id -> text
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("raki_admin_secret");
    if (s) {
      setSecret(s);
      setAuthed(true);
    }
  }, []);

  async function load(sec = secret) {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/content", {
        headers: { "x-admin-secret": sec },
      });
      if (r.status === 401) {
        setError("Неверный секрет");
        setAuthed(false);
        localStorage.removeItem("raki_admin_secret");
        return;
      }
      const data = await r.json();
      setItems(data.items || []);
      setAuthed(true);
      localStorage.setItem("raki_admin_secret", sec);
    } catch {
      setError("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function act(newsId, action, text) {
    await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ newsId, action, text }),
    });
    setEditing((e) => {
      const n = { ...e };
      delete n[newsId];
      return n;
    });
    load();
  }

  // Экран входа
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="glass-tile p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-border bg-ink-soft text-gold">
            <ShieldCheck size={22} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-cream">
            Модерация контента
          </h1>
          <p className="mt-2 text-sm text-cream/55">Введите админ-секрет (CRON_SECRET).</p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Секрет"
            className="mt-5 w-full rounded-xl border border-ink-border bg-ink-soft/60 px-4 py-3 text-sm text-cream outline-none focus:border-gold/50"
          />
          {error && <p className="mt-3 text-sm text-red">{error}</p>}
          <button onClick={() => load(secret)} className="btn-gold mt-4 w-full justify-center">
            Войти
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Админ · AI-контент</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-cream">Очередь публикаций</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/scan" className="btn-ghost">
            <ScanLine size={15} /> Сканер
          </Link>
          <button onClick={() => load()} className="btn-ghost">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Обновить
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-cream/40">Очередь пуста</p>
      )}

      <div className="mt-8 space-y-4">
        {items.map((it) => (
          <div key={it.id} className="glass-tile p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
                {STATUS_LABEL[it.status] || it.status}
              </span>
              <span className="text-xs text-cream/40">
                {new Date(it.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>

            <h3 className="mt-3 font-semibold text-cream">{it.sourceTitle}</h3>

            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-cream/40">Telegram</p>
                {editing[it.id] !== undefined ? (
                  <textarea
                    value={editing[it.id]}
                    onChange={(e) => setEditing((s) => ({ ...s, [it.id]: e.target.value }))}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-ink-border bg-ink-soft/60 p-3 text-cream outline-none focus:border-gold/50"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-cream/80">{it.contentInformal}</p>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-cream/40">Web / Facebook</p>
                <p className="whitespace-pre-wrap text-cream/60">{it.contentFormal}</p>
              </div>
              {it.failReason && <p className="text-xs text-red">Ошибка: {it.failReason}</p>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {editing[it.id] !== undefined ? (
                <button
                  onClick={() => act(it.id, "edit", editing[it.id])}
                  className="btn-gold"
                >
                  <Check size={15} /> Сохранить
                </button>
              ) : (
                <>
                  <button onClick={() => act(it.id, "approve")} className="btn-gold">
                    <Check size={15} /> Одобрить и опубликовать
                  </button>
                  <button
                    onClick={() => setEditing((s) => ({ ...s, [it.id]: it.contentInformal || "" }))}
                    className="btn-ghost"
                  >
                    <Pencil size={15} /> Править
                  </button>
                  <button
                    onClick={() => act(it.id, "reject")}
                    className="btn-ghost text-red/80 hover:text-red"
                  >
                    <X size={15} /> Отклонить
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
