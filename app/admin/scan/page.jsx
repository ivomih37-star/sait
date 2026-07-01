"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScanLine, Camera, Check, AlertTriangle, X, ArrowLeft } from "lucide-react";

// Извлекаем токен/код из отсканированной строки (URL билета или код RAKI-XXXX)
function parseScanned(raw) {
  try {
    const u = new URL(raw);
    const t = u.searchParams.get("verify") || u.searchParams.get("t");
    if (t) return { token: t };
  } catch {
    /* не URL */
  }
  if (/^RAKI-[0-9A-Z]+$/i.test(raw.trim())) return { code: raw.trim().toUpperCase() };
  return { token: raw.trim() };
}

export default function ScanPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [camErr, setCamErr] = useState(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const scanningRef = useRef(false);
  const streamRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem("raki_admin_secret");
    if (s) {
      setSecret(s);
      setAuthed(true);
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkin(payload) {
    setBusy(true);
    try {
      const r = await fetch("/api/tickets/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify(payload),
      }).then((x) => x.json());
      setResult(r);
    } catch {
      setResult({ ok: false, reason: "network" });
    } finally {
      setBusy(false);
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    setScanning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setCamErr(null);
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setCamErr("Сканер QR не поддерживается этим браузером — введите код вручную.");
      return;
    }
    try {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      scanningRef.current = true;
      setScanning(true);
      const tick = async () => {
        if (!scanningRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length) {
            stopCamera();
            await checkin(parseScanned(codes[0].rawValue));
            return;
          }
        } catch {
          /* кадр без кода */
        }
        requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setCamErr("Нет доступа к камере: " + e.message);
      stopCamera();
    }
  }

  // Вход по секрету
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="glass-tile p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-border bg-ink-soft text-gold">
            <ScanLine size={22} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-cream">Контроль билетов</h1>
          <p className="mt-2 text-sm text-cream/55">Введите админ-секрет.</p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Секрет"
            className="mt-5 w-full rounded-xl border border-ink-border bg-ink-soft/60 px-4 py-3 text-sm text-cream outline-none focus:border-gold/50"
          />
          <button
            onClick={() => {
              if (!secret) return;
              localStorage.setItem("raki_admin_secret", secret);
              setAuthed(true);
            }}
            className="btn-gold mt-4 w-full justify-center"
          >
            Войти
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cream/60 hover:text-gold">
        <ArrowLeft size={16} /> В админку
      </Link>

      <p className="eyebrow mt-5 flex items-center gap-2">
        <ScanLine size={14} /> Контроль на входе
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-cream">Сканер билетов</h1>

      {/* Камера */}
      <div className="mt-6">
        <video
          ref={videoRef}
          className={`w-full rounded-bento border border-ink-border bg-black ${scanning ? "block" : "hidden"}`}
          muted
          playsInline
        />
        {scanning ? (
          <button onClick={stopCamera} className="btn-ghost mt-3 w-full justify-center">
            <X size={15} /> Остановить камеру
          </button>
        ) : (
          <button onClick={startCamera} className="btn-gold w-full justify-center">
            <Camera size={16} /> Сканировать камерой
          </button>
        )}
        {camErr && <p className="mt-2 text-sm text-cream/50">{camErr}</p>}
      </div>

      {/* Ручной ввод */}
      <div className="mt-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-cream/40">Или код билета</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="RAKI-XXXXXXXX"
            className="flex-1 rounded-xl border border-ink-border bg-ink-soft/60 px-4 py-3 font-mono text-sm uppercase text-cream outline-none focus:border-gold/50"
          />
          <button
            disabled={busy || !code}
            onClick={() => checkin({ code: code.trim().toUpperCase() })}
            className="btn-gold disabled:opacity-40"
          >
            Проверить
          </button>
        </div>
      </div>

      {/* Результат */}
      {result && (
        <div
          className={`mt-6 rounded-bento border p-5 ${
            !result.ok
              ? "border-red/40 bg-red/10"
              : result.already
                ? "border-gold/40 bg-gold/10"
                : "border-green/40 bg-green/10"
          }`}
        >
          {!result.ok ? (
            <p className="flex items-center gap-2 text-cream">
              <X size={18} className="text-red" />
              {result.reason === "not_found"
                ? "Билет не найден"
                : result.reason === "auth"
                  ? "Нет прав (проверьте секрет)"
                  : "Ошибка проверки"}
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-semibold text-cream">
                {result.already ? (
                  <>
                    <AlertTriangle size={18} className="text-gold" /> Уже отмечен
                  </>
                ) : (
                  <>
                    <Check size={18} className="text-green" /> Проход разрешён
                  </>
                )}
              </p>
              <div className="mt-3 space-y-1 text-sm text-cream/75">
                <p className="font-mono text-gold">{result.ticket.code}</p>
                {result.ticket.holder && <p>Гость: {result.ticket.holder}</p>}
                <p>Гостей: {result.ticket.guests}</p>
                <p>{result.ticket.event}</p>
                {result.ticket.seat && (
                  <p>
                    {result.ticket.seat.table}, место {result.ticket.seat.number}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
