"use client";

import type { ReactNode } from "react";
import type { Instance } from "../lib/db";
import { XinjieMiniMark } from "./XinjieMiniMark";

export type XuanSection = "gate" | "instance" | "role" | "diary" | "library";

type Props = {
  children: ReactNode;
  currentInstance: Instance | null;
  recentInstances: Instance[];
  section: XuanSection;
  stage: string;
  onContinueInstance: (instance: Instance) => void;
  onNavigate: (section: XuanSection) => void;
  onOpenGuide?: () => void;
};

const sections: Array<{ id: XuanSection; icon: string; label: string; hint: string }> = [
  { id: "gate", icon: "⌂", label: "心门", hint: "主城" },
  { id: "instance", icon: "⚔", label: "副本", hint: "关卡" },
  { id: "role", icon: "◉", label: "角色", hint: "面具" },
  { id: "diary", icon: "▤", label: "日记", hint: "记录" },
  { id: "library", icon: "▣", label: "心解库", hint: "存档" },
];

export function XuanShell({
  children,
  currentInstance,
  recentInstances,
  section,
  stage,
  onContinueInstance,
  onNavigate,
  onOpenGuide,
}: Props) {
  return (
    <section className="xuan-shell">
      <header className="xuan-shell-hud">
        <button className="xuan-shell-brand" onClick={() => onNavigate("gate")}>
          <strong><XinjieMiniMark /></strong>
          <span>XINJIE</span>
        </button>

        <div className="xuan-shell-stage-line">
          <span>当前板块</span>
          <strong>{stage}</strong>
        </div>

        <div className="xuan-shell-save">
          {onOpenGuide && (
            <button className="xuan-shell-guide-btn" onClick={onOpenGuide} title="新手指南">
              ?
            </button>
          )}
          LOCAL SAVE · ON
        </div>
      </header>

      <div className="xuan-shell-main">{children}</div>

      <footer className="xuan-shell-dock">
        <nav className="xuan-section-nav" aria-label="主板块">
          {sections.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "is-active" : ""}
              onClick={() => onNavigate(item.id)}
            >
              <span className="xuan-section-icon" aria-hidden="true">{item.icon}</span>
              <strong>{item.label}</strong>
              <em>({item.hint})</em>
            </button>
          ))}
        </nav>

        <div className="xuan-shell-current">
          {currentInstance ? (
            <>
              <span>INSTANCE {String(currentInstance.id ?? 0).padStart(2, "0")}</span>
              <strong>{currentInstance.title || "未命名"}</strong>
            </>
          ) : (
            <span>尚未进入副本</span>
          )}
        </div>

        {recentInstances.length > 0 && (
          <div className="xuan-shell-recent">
            <span>继续上次</span>
            {recentInstances.slice(0, 3).map((instance) => (
              <button key={instance.id} onClick={() => onContinueInstance(instance)}>
                I{String(instance.id ?? 0).padStart(2, "0")}
              </button>
            ))}
          </div>
        )}
      </footer>
    </section>
  );
}
