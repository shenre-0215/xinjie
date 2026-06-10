"use client";

import { useState } from "react";

const STEPS = [
  {
    emoji: "◈",
    title: "欢迎来到心解",
    body: "这里不是一个效率工具。\n它是一个帮你停下来的地方。",
  },
  {
    emoji: "◠◠",
    title: "心宝是你的导航员",
    body: "它不替你决定，也不催你行动。\n它帮你看见自己还没看到的东西。",
  },
  {
    emoji: "⏸",
    title: "悬置是一种能力",
    body: "不急着回答，不是逃避。\n等待本身就是一种被低估的策略。",
  },
  {
    emoji: "⌂",
    title: "准备好了",
    body: "说一句真话，从哪里开始都可以。\n心宝在。",
  },
];

const STORAGE_KEY = "xinjie-onboarded";

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function markOnboarded(): void {
  localStorage.setItem(STORAGE_KEY, "1");
}

type Props = {
  onDone: () => void;
  /** 应用内打开时传 onBack，不永久标记、显示返回按钮 */
  onBack?: () => void;
};

export function OnboardingScreen({ onDone, onBack }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isEmbedded = !!onBack;

  const next = () => {
    if (isLast) {
      if (!isEmbedded) markOnboarded();
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    if (!isEmbedded) markOnboarded();
    onDone();
  };

  return (
    <section className="xuan-onboarding">
      {isEmbedded && (
        <button className="xuan-back-btn" onClick={onBack} style={{ position: "absolute", top: "1.2rem", left: "1.2rem", zIndex: 20 }}>
          ← 返回
        </button>
      )}
      <div className="xuan-onboard-card">
        <div className="xuan-onboard-glyph">{current.emoji}</div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>

        <div className="xuan-onboard-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? "is-active" : ""} />
          ))}
        </div>

        <div className="xuan-onboard-actions">
          <button className="xuan-onboard-next" onClick={next}>
            {isLast ? "进入心解" : "继续"}
          </button>
          {!isLast && (
            <button className="xuan-onboard-skip" onClick={skip}>
              跳过
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
