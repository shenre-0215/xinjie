"use client";

import type { Instance, Role } from "../lib/db";
import { clampMetric, computeAdaptiveDelta, computeDomainStats } from "../lib/suspension";

type Props = {
  onChooseKind: () => void;
  onContinueInstance: (instance: Instance) => void;
  onOpenDiary: () => void;
  onOpenLibrary: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenRoleBoard: () => void;
  onOpenSettings: () => void;
  instances: Instance[];
  recentInstances: Instance[];
  roles: Role[];
};

export function PrimerScreen({
  onChooseKind,
  onContinueInstance,
  onOpenDiary,
  onOpenLibrary,
  onOpenNotifications,
  onOpenProfile,
  onOpenRoleBoard,
  onOpenSettings,
  instances,
  recentInstances,
  roles,
}: Props) {
  const meaningfulInstances = recentInstances.filter((i) => i.title || i.phase !== "unnamed");
  const todayInstance = meaningfulInstances[0] ?? null;
  const currentRole = roles[0] ?? null;
  const unnamedCount = recentInstances.filter((i) => i.phase === "unnamed").length;

  const now = Date.now();
  const checkBacks = recentInstances.filter((i) => {
    if (i.phase !== "suspended" || !i.suspendedAt || !i.checkBackDays) return false;
    const dueAt = i.suspendedAt + i.checkBackDays * 24 * 60 * 60 * 1000;
    return now >= dueAt;
  });

  const meaningfulInstancesAll = instances.filter((i) => i.title || i.phase !== "unnamed");
  const domainStats = computeDomainStats(instances);
  const adaptiveDelta = computeAdaptiveDelta(domainStats);
  const averageHsr = meaningfulInstancesAll.length
    ? meaningfulInstancesAll.reduce((sum, item) => sum + item.hsr, 0) / meaningfulInstancesAll.length
    : 50;
  const averageCp = meaningfulInstancesAll.length
    ? meaningfulInstancesAll.reduce((sum, item) => sum + item.cp, 0) / meaningfulInstancesAll.length
    : 30;
  const suspensionPower = Math.round(clampMetric(averageHsr - averageCp * 0.2 + adaptiveDelta * 20));
  const syncRate = domainStats.nTrials === 0 ? 0 : Math.round((meaningfulInstancesAll.length / domainStats.nTrials) * 100);
  const convergence = domainStats.nTrials === 0 ? 0 : Math.round((domainStats.nClosed / domainStats.nTrials) * 100);
  const flowNames = ["觉", "观", "流", "化", "澄"];
  const flowLevel = Math.min(5, Math.max(1, Math.floor((meaningfulInstancesAll.length + domainStats.nClosed * 2) / 3) + 1));

  return (
    <section className="xuan-gate-city">
      <header className="xuan-gate-city-top">
        <button onClick={onOpenSettings}>设置</button>
        <strong>旅人的心界</strong>
        <div>
          <button onClick={onOpenNotifications}>通知</button>
          <button onClick={onOpenProfile}>档案</button>
        </div>
      </header>

      <div className="xuan-gate-status-strip" aria-label="悬置状态">
        <div>
          <span>悬力值</span>
          <strong>{suspensionPower}</strong>
        </div>
        <div>
          <span>同步率</span>
          <strong>{syncRate}%</strong>
        </div>
        <div>
          <span>当前流态</span>
          <strong>Lv.{flowLevel} · {flowNames[flowLevel - 1]}</strong>
        </div>
        <div>
          <span>收敛度</span>
          <strong>{convergence}%</strong>
        </div>
      </div>

      {checkBacks.length > 0 && (
        <article className="xuan-gate-panel xuan-gate-checkback">
          <span>🔔 该回访了</span>
          <div className="xuan-checkback-list">
            {checkBacks.map((item) => (
              <button key={item.id} onClick={() => onContinueInstance(item)}>
                <strong>{item.title || "未命名"}</strong>
                <em>悬置了 {Math.floor((now - (item.suspendedAt ?? now)) / (24 * 60 * 60 * 1000))} 天</em>
                <small>{item.landingPoint || "回来看看，现在怎么想？"}</small>
              </button>
            ))}
          </div>
        </article>
      )}

      <div className="xuan-gate-main-grid">
        <article className="xuan-gate-panel xuan-gate-daily">
          <div className="xuan-gate-daily-copy">
            <span>今日副本 · {Math.max(1, recentInstances.length)} 个入口</span>
            <h1>{todayInstance?.title || "尚未进入副本"}</h1>
            <p>{todayInstance ? `${todayInstance.phase} · HSR ${todayInstance.hsr}% / CP ${todayInstance.cp}%` : `还有 ${unnamedCount} 个未观察的问题在等你。`}</p>
          </div>
          <div className="xuan-gate-daily-orbit" aria-hidden="true">
            <span />
            <i />
            <em />
          </div>
          <div className="xuan-gate-actions">
            <button onClick={() => (todayInstance ? onContinueInstance(todayInstance) : onChooseKind())}>进入副本</button>
            <button onClick={onOpenLibrary}>暂时避开</button>
          </div>
        </article>

        <aside className="xuan-gate-side-stack">
          <article className="xuan-gate-panel xuan-gate-mini xuan-gate-role-card">
            <span>当前角色</span>
            <strong>「{currentRole?.title ?? "潜"}」</strong>
            <p>{currentRole ? "角色正在心界里显影。" : "还没有固定角色，先让它保持未命名。"}</p>
            <button onClick={onOpenRoleBoard}>切换角色</button>
          </article>

          <article className="xuan-gate-panel xuan-gate-mini xuan-gate-library-card">
            <span>心解库</span>
            <strong>{Math.max(unnamedCount, recentInstances.length)} 个未命名</strong>
            <p>聊过的、记过的、暂时放下的都在这里。</p>
            <button onClick={onOpenLibrary}>查看存档</button>
          </article>
        </aside>
      </div>

      <article className="xuan-gate-panel xuan-gate-diary-row">
        <div>
          <span>日记 · 今日观测</span>
          <strong>先记下来，不急着解释。</strong>
        </div>
        <button onClick={onOpenDiary}>写一笔</button>
      </article>
    </section>
  );
}
