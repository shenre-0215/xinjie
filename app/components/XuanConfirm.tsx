"use client";

import { useEffect } from "react";
import { useConfirm } from "../lib/confirm";

export function XuanConfirm() {
  const { open, message, close } = useConfirm();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="xuan-confirm-overlay" onClick={() => close(false)}>
      <div className="xuan-confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="xuan-confirm-glyph">◈</div>
        <p className="xuan-confirm-msg">{message}</p>
        <p className="xuan-confirm-hint">这个操作不可撤销</p>
        <div className="xuan-confirm-actions">
          <button className="xuan-confirm-no" onClick={() => close(false)}>
            等等，先留着
          </button>
          <button className="xuan-confirm-yes" onClick={() => close(true)}>
            确定，让它消散
          </button>
        </div>
      </div>
    </div>
  );
}
