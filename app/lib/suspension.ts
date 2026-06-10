import type { Instance } from "./db";

export type DialoguePhase = "explore" | "infer" | "suspend";

// ========== δ(C) 论文公式 ==========
// δ(C) = α / (ρ_adj(C) + ε) × log(1 + N_closed / (N_trials + 1))
//
// α:      学习率 — 系统对用户行为模式的响应速度
// ρ_adj:  调整后决策密度 — 最近 7 天内活跃副本数
// ε:      小常数，防除零
// N_closed: 已闭合副本数（suspended + named）
// N_trials: 总尝试数（所有创建的副本）

const ALPHA = 0.8;
const EPSILON = 0.5;
const DENSITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type DomainStats = {
  nClosed: number;
  nTrials: number;
  rhoAdj: number;
};

/** 从 instances 数组中提取 N_closed / N_trials / ρ_adj */
export function computeDomainStats(instances: Instance[]): DomainStats {
  const now = Date.now();
  const nTrials = instances.length;
  const nClosed = instances.filter((i) => i.phase === "suspended" || i.phase === "named").length;
  const rhoAdj = instances.filter((i) => i.updatedAt > now - DENSITY_WINDOW_MS).length;

  return { nClosed, nTrials, rhoAdj };
}

/** δ(C) = α / (ρ_adj + ε) × log(1 + N_closed / (N_trials + 1)) */
export function computeAdaptiveDelta(stats: DomainStats): number {
  const { nClosed, nTrials, rhoAdj } = stats;

  if (nTrials === 0) return 0.5; // 冷启动默认：中等探索偏好

  const closureRatio = nClosed / (nTrials + 1);
  const explorationBonus = Math.log(1 + closureRatio);
  const densityPenalty = ALPHA / (rhoAdj + EPSILON);

  return densityPenalty * explorationBonus;
}

/** δ(C) 的人类可读解释 */
export function deltaInterpretation(delta: number): {
  style: "explore-heavy" | "balanced-explore" | "balanced" | "balanced-close" | "close-heavy";
  label: string;
  description: string;
} {
  if (delta < 0.15) return {
    style: "explore-heavy",
    label: "探索型",
    description: "你最近面对很多新情境，心宝会多提醒你暂停观察，不急着下结论。",
  };
  if (delta < 0.30) return {
    style: "balanced-explore",
    label: "偏探索",
    description: "你倾向于先看全貌再行动。适合开拓新视角。",
  };
  if (delta < 0.50) return {
    style: "balanced",
    label: "平衡型",
    description: "你在探索和行动之间保持弹性。每条路都对你开放。",
  };
  if (delta < 0.70) return {
    style: "balanced-close",
    label: "偏闭合",
    description: "你善于把观察转化为行动。适合巩固已有的认知领地。",
  };
  return {
    style: "close-heavy",
    label: "闭合型",
    description: "你习惯快速收束、落地执行。心宝会在你节奏太快时轻声提醒慢一点。",
  };
}

// ========== 初始值 ==========

/** 副本（直接创建）默认 HSR / CP */
export const DEFAULT_INSTANCE_HSR = 72;
export const DEFAULT_INSTANCE_CP = 31;

/** 角色默认 HSR / CP */
export const DEFAULT_ROLE_HSR = 76;
export const DEFAULT_ROLE_CP = 28;

// ========== 悬置操作 delta ==========

export const SUSPEND_HSR_DELTA = 4;
export const SUSPEND_CP_DELTA = -10;

// ========== κ / 旧 δ(C) / E 公式参数（每副本启发式，与论文 δ(C) 不同） ==========

const PHASE_BIAS: Record<DialoguePhase, number> = {
  explore: 0,
  infer: 16,
  suspend: 8,
};

const EXPECTATION_DEDUCTION: Record<DialoguePhase, number> = {
  explore: 18,
  infer: 8,
  suspend: 2,
};

const INFER_CP_BOOST = 18;
const SUSPEND_CP_RATIO = 0.55;

/** 约束到 [0, 100] */
export function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** κ = 100 - CP + phaseBias（感知闭合度，非论文 κ） */
export function computeKappa(cp: number, phase: DialoguePhase): number {
  return clampMetric(100 - cp + (PHASE_BIAS[phase] ?? 0));
}

/** 旧 δ(C) = CP + 阶段偏移（纯启发式，非论文公式） */
export function computeDelta(cp: number, phase: DialoguePhase): number {
  if (phase === "suspend") return clampMetric(cp * SUSPEND_CP_RATIO);
  return clampMetric(cp + (phase === "infer" ? INFER_CP_BOOST : 0));
}

/** E = HSR - phaseDeduction */
export function computeExpectation(hsr: number, phase: DialoguePhase): number {
  return clampMetric(hsr - (EXPECTATION_DEDUCTION[phase] ?? 0));
}

export interface SuspensionMetrics {
  kappa: number;
  delta: number;
  expectation: number;
}

export function computeMetrics(hsr: number, cp: number, phase: DialoguePhase): SuspensionMetrics {
  return {
    kappa: computeKappa(cp, phase),
    delta: computeDelta(cp, phase),
    expectation: computeExpectation(hsr, phase),
  };
}

// ========== 能量状态阈值 ==========

export const CP_HIGH_ENTROPY_THRESHOLD = 55;
export const HSR_LOW_ENTROPY_THRESHOLD = 80;

export type EnergyLabel = "高熵：有点紧" | "低熵：有余力" | "中间态";

export function energyLabel(hsr: number, cp: number): EnergyLabel {
  if (cp >= CP_HIGH_ENTROPY_THRESHOLD) return "高熵：有点紧";
  if (hsr >= HSR_LOW_ENTROPY_THRESHOLD) return "低熵：有余力";
  return "中间态";
}

// ========== 展示缩放 ==========

export const METRIC_DISPLAY_DIVISOR = 10;

// ========== G(a_suspend) = -λ·H[q(s)] - γ·E[FutureClosure] ==========
//
// confusionScore   → H[q(s)] 近似值，LLM 输出，0-1
// futureClosureHint → E[FutureClosure] 近似值，LLM 输出，0-1
// G_suspend ∈ [-1, 0]，越大（越接近 0）悬置越理性

const LAMBDA = 0.6; // 悬置成本权重：混乱度高时悬置的代价
const GAMMA = 0.4;  // 未来闭合权重：未来信息越多，悬置越值得

export function computeGSuspend(confusionScore: number, futureClosureHint: number): number {
  return -(LAMBDA * confusionScore) - (GAMMA * (1 - futureClosureHint));
}

export type GSuspendVerdict = "rational-wait" | "mild-wait" | "borderline" | "mild-act" | "should-act";

export function gSuspendInterpretation(g: number): {
  verdict: GSuspendVerdict;
  label: string;
  hint: string;
} {
  if (g > -0.25) return {
    verdict: "rational-wait",
    label: "理性悬置",
    hint: "这件事的混乱度适中，未来大概率会有新信息。等待是聪明的选择。",
  };
  if (g > -0.45) return {
    verdict: "mild-wait",
    label: "偏悬置",
    hint: "悬置收益尚可。可以再观察一会儿，不急着做决定。",
  };
  if (g > -0.65) return {
    verdict: "borderline",
    label: "边界地带",
    hint: "悬置和行动收益接近。取决于你此刻的心理状态——想清楚了就行动，累了就放一放。",
  };
  if (g > -0.85) return {
    verdict: "mild-act",
    label: "偏行动",
    hint: "这件事的混乱度偏高或未来信息不足，持续悬置可能只是在拖延。试着迈一小步。",
  };
  return {
    verdict: "should-act",
    label: "建议行动",
    hint: "你其实已经知道答案了，或者等待不会有任何新信息。心宝建议你现在就做点什么。",
  };
}

// ========== G_total 向量化：三路径收益 ==========
//
// 三条路径各产生不可互相兑换的"营养"：
//   悬置 A → 洞察值（insight）
//   闭合 B → 确信值（conviction）
//   转换 C → 韧性值（resilience）
//
// 所有值 ∈ [0, 100]，无"总分"，不比较大小。

export interface PathRewards {
  insight: number;    // 悬置路径：洞察值
  conviction: number; // 闭合路径：确信值
  resilience: number; // 转换路径：韧性值
}

export interface PathRewardMeta {
  label: string;
  emoji: string;
  description: string;
  color: "gold" | "blue" | "green";
}

export const PATH_META: Record<keyof PathRewards, PathRewardMeta> = {
  insight: {
    label: "洞察值",
    emoji: "🌿",
    description: "地图迷雾散开，发现隐藏线索。",
    color: "gold",
  },
  conviction: {
    label: "确信值",
    emoji: "⚡",
    description: "技能升级，下次面对类似情境更从容。",
    color: "blue",
  },
  resilience: {
    label: "韧性值",
    emoji: "🔄",
    description: "新角色模板解锁，跨域连接建立。",
    color: "green",
  },
};

/**
 * 计算三条路径的预期收益。
 *
 * 洞察值 ∝ G_suspend 质量（等待越理性，洞察越多）
 *          + futureClosureHint（未来信息越多，越值得观察）
 * 确信值 ∝ κ（感知闭合度越高，闭合后信心越强）
 *          + (1 - adaptiveDelta)（风格越偏闭合，确信收益越大）
 * 韧性值 ∝ 角色数 + 中间态偏好（balanced delta 时最高）
 */
export function computePathRewards(
  gSuspend: number,
  kappa: number,
  adaptiveDelta: number,
  futureClosureHint: number,
  roleCount: number,
): PathRewards {
  // 洞察值：G_suspend 越接近 0（理性悬置），洞察越高
  const insightBase = clampMetric((gSuspend + 1) * 50); // g ∈ [-1,0] → [0,50]
  const insightBonus = futureClosureHint * 40;           // 未来线索多 → 洞察更高
  const insight = clampMetric(insightBase + insightBonus);

  // 确信值：κ 高说明用户已经接近闭合，闭合后收获大
  const convictionBase = clampMetric(kappa * 0.7);         // κ ∈ [0,100] → [0,70]
  const convictionBonus = (1 - adaptiveDelta) * 30;         // 偏闭合风格加 0-30
  const conviction = clampMetric(convictionBase + convictionBonus);

  // 韧性值：角色切换带来适应力，balanced delta 时最高
  const roleBonus = Math.min(roleCount * 8, 40);            // 每个角色 +8，上限 40
  const deltaBalance = 1 - Math.abs(adaptiveDelta - 0.5) * 2; // 0.5 时 = 1，两端 = 0
  const resilienceBase = clampMetric(roleBonus + deltaBalance * 50);
  const resilience = clampMetric(resilienceBase);

  return { insight, conviction, resilience };
}

export type PathHighlight = keyof PathRewards | "none";

export function pathHighlight(rewards: PathRewards): PathHighlight {
  const max = Math.max(rewards.insight, rewards.conviction, rewards.resilience);
  if (max < 20) return "none";
  if (rewards.insight === max) return "insight";
  if (rewards.conviction === max) return "conviction";
  return "resilience";
}
