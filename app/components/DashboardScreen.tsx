"use client";

import { useState, type ReactNode } from "react";
import type { Diary, Instance, Role } from "../lib/db";

type Props = {
  instances: Instance[];
  roles: Role[];
  diaries: Diary[];
  onBack: () => void;
  onContinueInstance: (instance: Instance) => void;
};

type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
};

function computeBadges(instances: Instance[], roles: Role[], diaries: Diary[]): Badge[] {
  const suspended = instances.filter((i) => i.phase === "suspended");
  const hasSuspended = suspended.length > 0 || instances.length > 0;
  const oldestSuspended = suspended.length > 0
    ? Math.max(...suspended.map((i) => i.updatedAt))
    : 0;
  const twentyOneDays = 21 * 24 * 60 * 60 * 1000;

  return [
    {
      id: "first-suspend",
      name: "第一次悬置",
      emoji: "🥚",
      description: "你把一件事放在了这里，没有急着给它名字。",
      earned: hasSuspended,
    },
    {
      id: "stone-collector",
      name: "石头收集者",
      emoji: "🪨",
      description: "累计悬置 10 次。你越来越擅长等待了。",
      earned: suspended.length >= 10,
    },
    {
      id: "slow-one",
      name: "慢下来的人",
      emoji: "🐢",
      description: "有一件事，你悬置了超过 21 天。不急，它还在那里。",
      earned: Date.now() - oldestSuspended >= twentyOneDays,
    },
    {
      id: "mirror-person",
      name: "镜中人",
      emoji: "🪞",
      description: "你创建了第一个角色——你的某一面。",
      earned: roles.length > 0,
    },
    {
      id: "scribe",
      name: "记录者",
      emoji: "✍️",
      description: "你写了 10 篇日记。你在记录自己。",
      earned: diaries.length >= 10,
    },
    {
      id: "abyss-gazer",
      name: "深渊凝视者",
      emoji: "🌊",
      description: "你和心宝聊了超过 50 次。你在认真看自己。",
      earned: instances.length + diaries.length >= 50,
    },
  ];
}

function daysAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 个月前`;
}

type TimelineItem = {
  kind: "instance" | "diary";
  id: number;
  label: string;
  phase?: string;
  time: number;
};

export function DashboardScreen({ instances, roles, diaries, onBack, onContinueInstance }: Props) {
  const [devTaps, setDevTaps] = useState(0);
  const devMode = devTaps >= 5;

  const meaningfulInstances = instances.filter((i) => i.title || i.phase !== "unnamed");
  const suspendedCount = meaningfulInstances.filter((i) => i.phase === "suspended").length;
  const badges = computeBadges(meaningfulInstances, roles, diaries);
  const earnedCount = badges.filter((b) => b.earned).length;

  const timeline: TimelineItem[] = [
    ...meaningfulInstances.map((i) => ({
      kind: "instance" as const,
      id: i.id!,
      label: i.title || "未命名",
      phase: i.phase,
      time: i.updatedAt,
    })),
    ...diaries.map((d) => ({
      kind: "diary" as const,
      id: d.id!,
      label: d.content.split("\n")[0].slice(0, 30),
      time: d.createdAt,
    })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 12);

  const handleTitleTap = () => {
    if (devTaps < 5) {
      setDevTaps((n) => n + 1);
    }
  };

  return (
    <section className="xuan-dashboard">
      <button className="xuan-back-btn" onClick={onBack}>← 返回</button>

      {/* ── 悬置收成 ── */}
      <article className="xuan-dash-harvest">
        <h1 onClick={handleTitleTap} className="xuan-dash-title">
          心解档案
          {devTaps > 0 && devTaps < 5 && (
            <span className="xuan-dash-dev-hint">{5 - devTaps}</span>
          )}
        </h1>
        <p className="xuan-dash-subtitle">你的悬置收成</p>

        <div className="xuan-dash-stats">
          <div className="xuan-dash-stat">
            <strong>{meaningfulInstances.length}</strong>
            <span>次停下来</span>
          </div>
          <div className="xuan-dash-stat">
            <strong>{diaries.length}</strong>
            <span>段反思时间</span>
          </div>
          <div className="xuan-dash-stat">
            <strong>{suspendedCount}</strong>
            <span>个待解之谜</span>
          </div>
        </div>

        <p className="xuan-dash-motto">「不急着回答，也是答案。」</p>
      </article>

      {/* ── 悬置徽章 ── */}
      <article className="xuan-dash-badges">
        <h2>
          悬置徽章
          <span className="xuan-dash-badge-count">{earnedCount}/{badges.length}</span>
        </h2>
        <div className="xuan-dash-badge-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`xuan-dash-badge ${badge.earned ? "is-earned" : ""}`}
            >
              <span className="xuan-dash-badge-emoji">{badge.earned ? badge.emoji : "◌"}</span>
              <strong>{badge.earned ? badge.name : "???"}</strong>
              <p>{badge.earned ? badge.description : "尚未解锁"}</p>
            </div>
          ))}
        </div>
      </article>

      {/* ── 最近在悬置什么 ── */}
      <article className="xuan-dash-timeline">
        <h2>最近在悬置什么</h2>
        {timeline.length === 0 ? (
          <p className="xuan-dash-empty">还没有记录。去创建一个副本，或写一篇日记吧。</p>
        ) : (
          <div className="xuan-dash-timeline-list">
            {timeline.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="xuan-dash-timeline-row"
              >
                <span className="xuan-dash-timeline-dot">
                  {item.kind === "diary" ? "✍️" : item.phase === "suspended" ? "⏸" : "●"}
                </span>
                <span className="xuan-dash-timeline-label">
                  {item.kind === "instance" ? (
                    <button
                      className="xuan-dash-timeline-link"
                      onClick={() => {
                        const inst = instances.find((i) => i.id === item.id);
                        if (inst) onContinueInstance(inst);
                      }}
                    >
                      {item.label || "未命名"}
                    </button>
                  ) : (
                    <span>{item.label || "无标题"}</span>
                  )}
                </span>
                <span className="xuan-dash-timeline-kind">
                  {item.kind === "diary" ? "日记" : item.phase === "suspended" ? "悬置中" : item.phase === "named" ? "已命名" : "观察中"}
                </span>
                <span className="xuan-dash-timeline-time">{daysAgo(item.time)}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* ── 开发者模式 ── */}
      {devMode && (
        <DevPanel instances={instances} roles={roles} diaries={diaries} onClose={() => setDevTaps(0)} />
      )}
    </section>
  );
}

/* ──────────── 开发者面板 ──────────── */

function DevPanel({
  instances,
  roles,
  diaries,
  onClose,
}: {
  instances: Instance[];
  roles: Role[];
  diaries: Diary[];
  onClose: () => void;
}) {
  const phases = ["unnamed", "observed", "named", "suspended"] as const;
  const phaseCounts = phases.map(
    (p) => [p, instances.filter((i) => i.phase === p).length] as const,
  );

  return (
    <article className="xuan-dash-dev">
      <header>
        <h2>DEV MODE</h2>
        <button onClick={onClose}>关闭</button>
      </header>

      <Section title="原始数据">
        <table className="xuan-dash-dev-table">
          <tbody>
            <tr><td>副本总数</td><td>{instances.length}</td></tr>
            <tr><td>角色总数</td><td>{roles.length}</td></tr>
            <tr><td>日记总数</td><td>{diaries.length}</td></tr>
            {phaseCounts.map(([p, c]) => (
              <tr key={p}><td>phase={p}</td><td>{c}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="HSR / CP 分布">
        <table className="xuan-dash-dev-table">
          <tbody>
            {instances.slice(0, 20).map((i) => (
              <tr key={i.id}>
                <td>{i.title || `#${i.id}`}</td>
                <td>HSR {i.hsr}</td>
                <td>CP {i.cp}</td>
                <td>{i.phase}</td>
              </tr>
            ))}
            {instances.length === 0 && (
              <tr><td colSpan={4}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="活跃角色画像">
        {roles.length === 0 ? (
          <p>暂无角色</p>
        ) : (
          roles.map((r) => (
            <div key={r.id} className="xuan-dash-dev-role">
              <strong>{r.title}</strong>
              {r.profile?.mainRoleSummary && <p>{r.profile.mainRoleSummary}</p>}
              {r.profile?.fieldUncertainty && (
                <p className="xuan-dash-dev-uncertainty">
                  {Object.entries(r.profile.fieldUncertainty).map(([k, v]) => (
                    <span key={k}>{k}: κ{v.kappa}/E{v.expectation}/δ{v.delta}</span>
                  ))}
                </p>
              )}
            </div>
          ))
        )}
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="xuan-dash-dev-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
