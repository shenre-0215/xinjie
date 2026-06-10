"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db, type DialogueMessage, type Instance, type InstancePhase, type Role, type SentinelAction, type SentinelLog } from "../lib/db";
import { useConfirm } from "../lib/confirm";
import { useEscalation } from "../lib/critical-escalation";
import {
  DEFAULT_INSTANCE_HSR,
  DEFAULT_INSTANCE_CP,
  SUSPEND_HSR_DELTA,
  SUSPEND_CP_DELTA,
  CP_HIGH_ENTROPY_THRESHOLD,
  HSR_LOW_ENTROPY_THRESHOLD,
  METRIC_DISPLAY_DIVISOR,
  computeMetrics,
  computeDomainStats,
  computeAdaptiveDelta,
  deltaInterpretation,
  computeGSuspend,
  gSuspendInterpretation,
  computePathRewards,
  pathHighlight,
  PATH_META,
  type DialoguePhase,
  type PathRewards,
  type PathHighlight,
} from "../lib/suspension";

const phaseLabels: Record<InstancePhase, string> = {
  unnamed: "未观察",
  observed: "已观察",
  named: "已命名",
  suspended: "已悬置",
};

const phaseMeta: Record<DialoguePhase, { label: string; face: string; description: string }> = {
  explore: {
    label: "定位惊讶",
    face: "(◕‿◕)",
    description: "在捕捉你的预测误差：你预期了什么，环境实际给了什么。",
  },
  infer: {
    label: "合成框架",
    face: "(。_。)",
    description: "回看你说的，提取模式，给出临时理解——你可以推翻。",
  },
  suspend: {
    label: "战略悬置",
    face: "(ᴗ˳ᴗ)",
    description: "等待不是逃避。帮你标记未来回访的时间锚点。",
  },
};

const reactionFaces: Record<DialoguePhase, string[]> = {
  explore: ["(◕◡◕)", "(✧ω✧)", "(◉‿◉)", "(｡･ω･｡)"],
  infer: ["(。_。)", "(⚆_⚆)", "(¬‿¬)", "(⇀‸↼)"],
  suspend: ["(－ω－)", "(ᴗ˳ᴗ)", "(￣ｰ￣)", "zzz"],
};

type Props = {
  instance: Instance | null;
  role: Role | null;
  allRoles: Role[];
  allInstances: Instance[];
  onBack: () => void;
  onInstanceChange: (instance: Instance) => void;
  onDeleteInstance: (id: number) => void;
  onSuspend: () => void;
};

function generateLocalReply(text: string) {
  return `心宝听到了「${text.slice(0, 30)}」。我先问一句：这件事里，你最想保护的是什么？`;
}

function buildRoleSummary(role: Role | null, allRoles: Role[]) {
  const parts: string[] = [];
  if (role?.profile?.mainRoleSummary) {
    parts.push(`当前角色「${role.title}」：${role.profile.mainRoleSummary}`);
  }
  for (const r of allRoles) {
    if (r.id === role?.id) continue;
    if (r.profile?.mainRoleSummary) {
      parts.push(`其他角色「${r.title}」：${r.profile.mainRoleSummary}`);
    }
  }
  return parts.join("\n");
}

export function InstanceScreen({ instance, role, allRoles, allInstances, onBack, onInstanceChange, onDeleteInstance, onSuspend }: Props) {
  const [phase, setPhase] = useState<DialoguePhase>("explore");
  const [logs, setLogs] = useState<SentinelLog[]>([]);
  const [snapshot, setSnapshot] = useState(instance);
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [apiFeedback, setApiFeedback] = useState("");
  const [confusionScore, setConfusionScore] = useState(0.5);
  const [futureClosureHint, setFutureClosureHint] = useState(0.3);
  const [title, setTitle] = useState(instance?.title ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [reactionFace, setReactionFace] = useState<string | null>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  const confirm = useConfirm();
  const escalation = useEscalation();

  const handleDelete = async () => {
    if (!activeInstance?.id) return;
    const ok = await confirm.ask(`让「${title || activeInstance.title || "这个副本"}」消散？`);
    if (ok) onDeleteInstance(activeInstance.id);
  };

  const activeInstance = snapshot ?? instance;
  const hsr = activeInstance?.hsr ?? DEFAULT_INSTANCE_HSR;
  const cp = activeInstance?.cp ?? DEFAULT_INSTANCE_CP;
  const meta = phaseMeta[phase];
  const roleSummary = buildRoleSummary(role, allRoles);

  const headerLabel = role
    ? "角色对话 · 心宝陪你看一看"
    : activeInstance?.source === "diary"
      ? "日记对话 · 心宝陪你看一看"
      : "问题副本 · 心宝陪你看一看";

  useEffect(() => {
    setSnapshot(instance);
    setTitle(instance?.title ?? "");
    setPhase("explore");
    setDraft("");
    setIsReplying(false);
    setApiFeedback("");
    setConfusionScore(0.5);
    setFutureClosureHint(0.3);
    setMessages(instance?.messages ?? []);

    if (!instance?.id) {
      setLogs([]);
      return;
    }

    void db.sentinelLogs
      .where("instanceId")
      .equals(instance.id)
      .reverse()
      .sortBy("createdAt")
      .then((items) => setLogs(items.slice(0, 4)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance?.id]);

  useEffect(() => {
    const el = threadEnd.current?.parentElement;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) threadEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const metrics = useMemo(() => computeMetrics(hsr, cp, phase), [cp, hsr, phase]);

  const adaptiveDelta = useMemo(() => {
    const stats = computeDomainStats(allInstances);
    return computeAdaptiveDelta(stats);
  }, [allInstances]);

  const deltaInfo = useMemo(() => deltaInterpretation(adaptiveDelta), [adaptiveDelta]);

  const gSuspend = useMemo(() => computeGSuspend(confusionScore, futureClosureHint), [confusionScore, futureClosureHint]);
  const gVerdict = useMemo(() => gSuspendInterpretation(gSuspend), [gSuspend]);

  const pathRewards: PathRewards = useMemo(
    () => computePathRewards(gSuspend, metrics.kappa, adaptiveDelta, futureClosureHint, allRoles.length),
    [gSuspend, metrics.kappa, adaptiveDelta, futureClosureHint, allRoles.length],
  );
  const highlight: PathHighlight = useMemo(() => pathHighlight(pathRewards), [pathRewards]);

  const displayProfile = role?.profile;

  const saveTitle = async (next: string) => {
    const trimmed = next.trim();
    setTitle(trimmed);
    setEditingTitle(false);
    if (!activeInstance?.id) return;

    const updated = { ...activeInstance, title: trimmed || "未命名", updatedAt: Date.now() };
    await db.instances.update(activeInstance.id, { title: updated.title, updatedAt: updated.updatedAt });
    setSnapshot(updated);
    onInstanceChange(updated);
  };

  const askXuanbao = async (text: string): Promise<{ reply: string; confusionScore: number; futureClosureHint: number }> => {
    const apiTitle = roleSummary
      ? `${title || activeInstance?.title || ""}\n\n【用户角色画像】\n${roleSummary}`
      : title || activeInstance?.title || "";

    const response = await fetch("/api/xuanbao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text,
        title: apiTitle,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message ?? "心宝暂时连不上大模型。");
    }

    const data = await response.json();
    const reply = typeof data.reply === "string" ? data.reply : generateLocalReply(text);
    const nextPhase: DialoguePhase = ["explore", "infer", "suspend"].includes(data.phase) ? data.phase : "explore";
    const cs = typeof data.confusionScore === "number" ? data.confusionScore : 0.5;
    const fch = typeof data.futureClosureHint === "number" ? data.futureClosureHint : 0.3;

    if (nextPhase !== phase) setPhase(nextPhase);
    setConfusionScore(cs);
    setFutureClosureHint(fch);
    return { reply, confusionScore: cs, futureClosureHint: fch };
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || isReplying) return;

    escalation.check(text, "instance-chat");

    const now = Date.now();
    const userMessage: DialogueMessage = { id: now, speaker: "user", text };
    setDraft("");
    setIsReplying(true);
    setApiFeedback("");

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    let reply = generateLocalReply(text);
    try {
      const result = await askXuanbao(text);
      reply = result.reply;
    } catch (error) {
      setApiFeedback(error instanceof Error ? error.message : "心宝暂时连不上大模型，已使用本地回复。");
    }

    const aiMessage: DialogueMessage = { id: now + 1, speaker: "ai", text: reply };
    const finalMessages = [...updatedMessages, aiMessage];
    setMessages(finalMessages);

    if (activeInstance?.id) {
      await db.instances.update(activeInstance.id, { messages: finalMessages });
    }

    setIsReplying(false);
  };

  const suspendInstance = async () => {
    if (!activeInstance?.id) return;

    let finalTitle = title || activeInstance.title || "";
    let landingPoint = activeInstance.landingPoint ?? "";

    if (!finalTitle && messages.length > 0) {
      try {
        const res = await fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.title && data.title !== "未命名") {
            finalTitle = data.title;
            landingPoint = data.summary ?? "";
            setTitle(data.title);
          }
        }
      } catch { /* fall through */ }
    }

    if (!finalTitle) finalTitle = "已悬置";

    const updated: Instance = {
      ...activeInstance,
      phase: "suspended",
      hsr: Math.min(100, hsr + SUSPEND_HSR_DELTA),
      cp: Math.max(0, cp + SUSPEND_CP_DELTA),
      title: finalTitle,
      landingPoint,
      messages,
      suspendedAt: Date.now(),
      checkBackDays: 30,
      updatedAt: Date.now(),
    };

    await db.transaction("rw", db.instances, db.sentinelLogs, async () => {
      await db.instances.update(activeInstance.id!, {
        phase: "suspended",
        hsr: updated.hsr,
        cp: updated.cp,
        title: updated.title,
        landingPoint: updated.landingPoint,
        messages: updated.messages,
        suspendedAt: updated.suspendedAt,
        checkBackDays: updated.checkBackDays,
        updatedAt: updated.updatedAt,
      });
      const log = {
        instanceId: activeInstance.id!,
        action: "suspend" as SentinelAction,
        message: `心宝把这个副本放进悬置层 · ${finalTitle}`,
        hsr: updated.hsr,
        cp: updated.cp,
        hsrDelta: SUSPEND_HSR_DELTA,
        cpDelta: SUSPEND_CP_DELTA,
        phase: "suspended" as InstancePhase,
        createdAt: updated.updatedAt,
      };
      const id = await db.sentinelLogs.add(log);
      setLogs((items) => [{ ...log, id }, ...items].slice(0, 4));
    });

    setPhase("suspend");
    setSnapshot(updated);
    onInstanceChange(updated);
    onSuspend();
  };

  return (
    <section className="xuan-instance-screen xuan-instance-lab">
      <button className="xuan-back-btn" onClick={onBack}>← 返回</button>

      <header className="xuan-xuanbao-header">
        <div>
          <span>
            {headerLabel}
            {activeInstance?.source === "diary" && !role && <em className="xuan-diary-badge"> · 来自日记</em>}
          </span>
          {editingTitle ? (
            <input
              className="xuan-title-edit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => saveTitle(title)}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(title); }}
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              title="点击修改名称"
            >
              {title || "点击这里命名"}
            </h1>
          )}
        </div>
        <strong>{phaseLabels[activeInstance?.phase ?? "unnamed"]}</strong>
        {activeInstance?.id != null && (
          <button
            className="xuan-delete-btn"
            onClick={handleDelete}
            title="删除副本"
          >
            ×
          </button>
        )}
      </header>

      <div className="xuan-xuanbao-layout">
        <aside className="xuan-xuanbao-side">
          <div
            className="xuanbao-avatar-wrapper"
            onClick={() => {
              const pool = reactionFaces[phase];
              const next = pool[Math.floor(Math.random() * pool.length)];
              setReactionFace(next);
              setTimeout(() => setReactionFace(null), 1200);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const dx = (e.clientX - cx) / (rect.width / 2);
              const dy = (e.clientY - cy) / (rect.height / 2);
              e.currentTarget.style.setProperty("--xuan-tilt-x", String((dx * 8).toFixed(1)));
              e.currentTarget.style.setProperty("--xuan-tilt-y", String((-dy * 8).toFixed(1)));
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty("--xuan-tilt-x", "0");
              e.currentTarget.style.setProperty("--xuan-tilt-y", "0");
            }}
          >
            <div className="xuanbao-avatar-tilt">
              <div className={`xuanbao-avatar is-${phase}${reactionFace ? " is-reacting" : ""}`} aria-label={`心宝：${meta.label}`}>
                <span>◠◠</span>
                <strong key={reactionFace ?? meta.face}>{reactionFace ?? meta.face}</strong>
                <em>心宝</em>
              </div>
            </div>
          </div>
          <div className="xuan-xuanbao-state">
            <span>{meta.label}</span>
            <p>{meta.description}</p>
            {messages.length >= 2 && (
              <small className="xuan-worldview-hint">等待不是被动——是对复杂性的尊重。</small>
            )}
          </div>
          {messages.length >= 2 && (
            <>
              <div className="xuan-g-suspend-card">
                <span className={`xuan-g-verdict is-${gVerdict.verdict}`}>{gVerdict.label}</span>
                <p>{gVerdict.hint}</p>
                <div className="xuan-g-bars">
                  <span title={`混乱度 H[q(s)]: ${(confusionScore * 100).toFixed(0)}%`}>
                    混乱度 {(confusionScore * 100).toFixed(0)}%
                  </span>
                  <span title={`未来闭合 E[Future]: ${(futureClosureHint * 100).toFixed(0)}%`}>
                    未来线索 {(futureClosureHint * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="xuan-path-rewards">
                {(["insight", "conviction", "resilience"] as (keyof PathRewards)[]).map((key) => {
                  const meta = PATH_META[key];
                  const isHl = highlight === key;
                  return (
                    <div key={key} className={`xuan-path-row ${isHl ? "is-highlight" : ""} is-${meta.color}`}>
                      <span className="xuan-path-emoji">{meta.emoji}</span>
                      <div className="xuan-path-info">
                        <strong>{meta.label} +{pathRewards[key].toFixed(0)}</strong>
                        <small>{meta.description}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="xuan-xuanbao-actions">
            <button onClick={suspendInstance}>
              先放一放
            </button>
          </div>
        </aside>

        <section className="xuan-xuanbao-chat" aria-label="心宝对话">
          <div className="xuan-dialogue-thread">
            {messages.length === 0 ? (
              <p className="xuan-dialogue-empty">
                心宝在。说一句真实的话，从哪里开始都可以。
                <br />
                <small>不确定性不是混乱——它是故事的前奏。</small>
              </p>
            ) : (
              messages.map((message) => (
                <p className={`is-${message.speaker}`} key={message.id}>
                  <em>{message.speaker === "user" ? "你" : "心宝"}</em>
                  {message.text}
                </p>
              ))
            )}
            <div ref={threadEnd} />
          </div>

          <form
            className="xuan-dialogue-input"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="和心宝说一句真实的话..."
              rows={3}
            />
            <button type="submit" disabled={isReplying}>{isReplying ? "心宝思考中" : "发送给心宝"}</button>
          </form>
          {apiFeedback && <p className="xuan-api-feedback">{apiFeedback}</p>}
        </section>
      </div>

      <section className="xuan-factory-card" aria-label="心宝状态画像">
        <header>
          <span>{displayProfile ? "已保存的角色画像（可反驳草稿）" : "心宝正在提取你的出厂设置"}</span>
        </header>
        {displayProfile ? (
          <div className="xuan-factory-grid">
            <p><em>核心动机</em>{displayProfile.coreMotivation}</p>
            <p><em>防御方式</em>{displayProfile.defensePattern}</p>
            <p><em>高能状态</em>{displayProfile.highEnergyState}</p>
            <p><em>低能状态</em>{displayProfile.lowEnergyState}</p>
            <p><em>冲突点</em>{displayProfile.conflictPoint}</p>
            <p><em>相处建议</em>{displayProfile.suggestedRelationship}</p>
          </div>
        ) : (
          <div className="xuan-factory-grid">
            <p><em>核心动机</em>在对话中逐渐浮现...</p>
            <p><em>能量状态</em>{cp >= CP_HIGH_ENTROPY_THRESHOLD ? "高熵：有点紧" : hsr >= HSR_LOW_ENTROPY_THRESHOLD ? "低熵：有余力" : "中间态"}</p>
            <p><em>决策偏好</em>{phase === "infer" ? "倾向先要一个临时解释" : phase === "suspend" ? "可以承受暂时不闭合" : "适合边说边看"}</p>
            <p><em>时间框架</em>心宝会根据对话动态调整</p>
          </div>
        )}
      </section>

      <details className="xuan-formula-details">
        <summary>查看心宝是怎么算的</summary>
        <div>
          <p>δ(C)：{(adaptiveDelta * 100).toFixed(0)}% · {deltaInfo.label}</p>
          <p className="xuan-delta-desc">{deltaInfo.description}</p>
          <p>κ：{(metrics.kappa / METRIC_DISPLAY_DIVISOR).toFixed(1)}</p>
          <p>E：{metrics.expectation}%</p>
          <p>HSR：{hsr}% / CP：{cp}%</p>
          <p>N_trials：{allInstances.length} / N_closed：{allInstances.filter((i) => i.phase === "suspended" || i.phase === "named").length}</p>
        </div>
        {logs.length > 0 && (
          <div className="xuan-formula-logs">
            {logs.map((log) => (
              <p key={log.id}>{log.action} · {phaseLabels[log.phase ?? "unnamed"]} · HSR {log.hsrDelta > 0 ? "+" : ""}{log.hsrDelta ?? 0} / CP {log.cpDelta > 0 ? "+" : ""}{log.cpDelta ?? 0}</p>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}
