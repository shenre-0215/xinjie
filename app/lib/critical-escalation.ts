import { create } from "zustand";

const HIGH_RISK_KEYWORDS = [
  "自杀", "想死", "了断", "跳楼", "跳轨", "吞药",
  "上吊", "不想活了", "结束生命", "一了百了",
];

const MEDIUM_RISK_KEYWORDS = [
  "没有意义", "活着累", "消失", "解脱", "彻底放弃",
  "伤害自己", "不想继续", "撑不下去", "活够了",
];

export type EscalationLevel = "none" | "high" | "medium";

type EscalationEvent = {
  level: EscalationLevel;
  screen: string;
  timestamp: number;
};

type EscalationStore = {
  open: boolean;
  level: EscalationLevel;
  events: EscalationEvent[];
  check: (text: string, screen: string) => EscalationLevel;
  close: () => void;
};

export const useEscalation = create<EscalationStore>((set, get) => ({
  open: false,
  level: "none",
  events: [],

  check: (text: string, screen: string): EscalationLevel => {
    const trimmed = text.trim();
    if (!trimmed) return "none";

    const highHit = HIGH_RISK_KEYWORDS.some((kw) => trimmed.includes(kw));
    const mediumHit = MEDIUM_RISK_KEYWORDS.some((kw) => trimmed.includes(kw));
    const level: EscalationLevel = highHit ? "high" : mediumHit ? "medium" : "none";

    if (level !== "none") {
      const event: EscalationEvent = { level, screen, timestamp: Date.now() };
      set((s) => ({ open: true, level, events: [...s.events, event] }));
    }

    return level;
  },

  close: () => set({ open: false }),
}));
