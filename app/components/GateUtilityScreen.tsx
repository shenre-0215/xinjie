"use client";

import type { Instance } from "../lib/db";

type UtilityKind = "settings" | "notifications" | "profile";

type Props = {
  kind: UtilityKind;
  instances?: Instance[];
  onBack: () => void;
  onContinueInstance?: (instance: Instance) => void;
};

const utilityCopy: Record<UtilityKind, { title: string; eyebrow: string; lines: string[]; action: string }> = {
  settings: {
    title: "设置",
    eyebrow: "SYSTEM CONFIG",
    lines: ["调整心解界的显示、提醒和本地保存。", "当前版本先保留入口，后面再接具体开关。"],
    action: "返回心门",
  },
  notifications: {
    title: "通知",
    eyebrow: "EVENT LOG",
    lines: [],
    action: "知道了",
  },
  profile: {
    title: "个人",
    eyebrow: "PLAYER FILE",
    lines: ["旅人的心解档案。", "昵称、等级、悬力统计会逐步放到这里。"],
    action: "回到主城",
  },
};

export function GateUtilityScreen({ kind, instances, onBack, onContinueInstance }: Props) {
  const copy = utilityCopy[kind];

  const now = Date.now();
  const checkBacks =
    kind === "notifications" && instances
      ? instances.filter((i) => {
          if (i.phase !== "suspended" || !i.suspendedAt || !i.checkBackDays) return false;
          const dueAt = i.suspendedAt + i.checkBackDays * 24 * 60 * 60 * 1000;
          return now >= dueAt;
        })
      : [];

  return (
    <section className="xuan-gate-utility">
      <button className="xuan-back-btn" onClick={onBack}>← 返回</button>
      <span>{copy.eyebrow}</span>
      <h1>{copy.title}</h1>

      {kind === "notifications" ? (
        checkBacks.length > 0 ? (
          <div className="xuan-checkback-list">
            {checkBacks.map((item) => (
              <button
                key={item.id}
                onClick={() => onContinueInstance?.(item)}
                style={{ display: "grid", gap: "0.15rem", textAlign: "left", padding: "0.6rem 0.8rem" }}
              >
                <strong style={{ fontSize: "1.05rem", fontWeight: 400 }}>
                  {item.title || "未命名"}
                </strong>
                <em style={{ color: "rgba(47, 77, 106, 0.55)", fontSize: "0.78rem", fontStyle: "normal" }}>
                  悬置了 {Math.floor((now - (item.suspendedAt ?? now)) / (24 * 60 * 60 * 1000))} 天 · 该回访了
                </em>
                <small style={{ color: "rgba(47, 77, 106, 0.6)", fontSize: "0.82rem" }}>
                  {item.landingPoint || "回来看看，现在怎么想？"}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <p>回访提醒、冷却结束和需要重新打开的悬置会出现在这里。</p>
            <p>现在还没有新的系统通知。</p>
          </div>
        )
      ) : (
        <div>
          {copy.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      <button onClick={onBack}>{copy.action}</button>
    </section>
  );
}
