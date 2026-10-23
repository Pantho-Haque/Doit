"use client";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { game, type GameEvent } from "@/storage/store";

type Toast = Extract<GameEvent, { type: "toast" }> & { key: number };
type Modal = Extract<GameEvent, { type: "modal" }>;

/** "+25 XP" floating up and a spark burst from the clicked element. Plain DOM, no re-render. */
export function burst(el: Element, text: string) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const add = (node: HTMLElement) => {
    document.body.append(node);
    node.onanimationend = () => node.remove();
  };
  const f = document.createElement("div");
  f.className = "fx-float";
  f.textContent = text;
  f.style.cssText = `left:${x}px;top:${y}px`;
  add(f);
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("i");
    const a = Math.random() * Math.PI * 2;
    const d = 22 + Math.random() * 38;
    s.className = "fx-spark";
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    add(s);
  }
}

export default function Effects() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modals, setModals] = useState<Modal[]>([]);
  const dlg = useRef<HTMLDialogElement>(null);
  const modal = modals[0];

  useEffect(
    () =>
      game.on((e) => {
        if (e.adv && !game.s.adventure) return;
        if (e.type === "modal") return setModals((m) => [...m, e]);
        const key = Date.now() + Math.random();
        setToasts((t) => [...t.slice(-3), { ...e, key }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), e.undo ? 7000 : 4500);
      }),
    [],
  );

  useEffect(() => {
    if (modal && dlg.current && !dlg.current.open) dlg.current.showModal();
  }, [modal]);

  return (
    <>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.key} className={`toast ${t.tone ?? ""}`}>
            <div>
              {t.tone && ["common", "rare", "epic"].includes(t.tone) && <span className="rarity">{t.tone}</span>}
              <b>{t.text}</b>
              {t.sub && <small>{t.sub}</small>}
            </div>
            {t.undo && (
              <button
                className="btn small"
                onClick={() => {
                  t.undo!();
                  setToasts((all) => all.filter((x) => x.key !== t.key));
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>

      <dialog ref={dlg} className="modal" onClose={() => setModals((m) => m.slice(1))}>
        {modal && (
          <>
            <div className="modal-emblem">
              <Sparkles />
            </div>
            <div className="kicker">{modal.kicker}</div>
            <h2>{modal.title}</h2>
            <p>{modal.body}</p>
            <form method="dialog">
              <button className="btn primary" autoFocus>
                {modal.cta}
              </button>
            </form>
          </>
        )}
      </dialog>
    </>
  );
}
