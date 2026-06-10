"use client";

import { useEffect, useState } from "react";
import { useEscalation } from "../lib/critical-escalation";

const HOTLINES = [
  { name: "北京心理危机研究与干预中心", phone: "010-82951332" },
  { name: "全国24小时心理援助热线", phone: "400-161-9995" },
  { name: "上海市心理援助热线", phone: "021-12320-5" },
];

const MORE_RESOURCES = [
  { name: "北京安定医院", phone: "010-58303037" },
  { name: "北京回龙观医院", phone: "010-62715511" },
  { name: "广州市心理危机干预中心", phone: "020-81899120" },
  { name: "深圳市心理危机干预中心", phone: "0755-25629459" },
  { name: "杭州市心理危机干预中心", phone: "0571-85029595" },
  { name: "武汉市精神卫生中心", phone: "027-85844666" },
  { name: "成都市心理危机干预中心", phone: "028-87577510" },
  { name: "西安市精神卫生中心", phone: "029-63609288" },
];

export function CriticalEscalationModal() {
  const { open, level, close } = useEscalation();
  const [showMore, setShowMore] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setShowMore(false);
      const timer = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setFadeIn(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className={`xuan-escalation-overlay ${fadeIn ? "is-visible" : ""}`}
      role="alertdialog"
      aria-modal="true"
      aria-label="精神健康提醒"
    >
      <div className="xuan-escalation-card">
        {showMore ? (
          <>
            <div className="xuan-escalation-glyph">📋</div>
            <h2>更多心理援助资源</h2>
            <p className="xuan-escalation-note">
              这些电话24小时都可以打。打给任何一个都可以。
            </p>

            <div className="xuan-escalation-hotlines">
              {MORE_RESOURCES.map((r) => (
                <a key={r.phone} href={`tel:${r.phone}`} className="xuan-escalation-hotline">
                  <strong>{r.name}</strong>
                  <span>{r.phone}</span>
                </a>
              ))}
            </div>

            <div className="xuan-escalation-actions">
              <button
                className="xuan-escalation-back"
                onClick={() => setShowMore(false)}
              >
                返回
              </button>
              <button
                className="xuan-escalation-dismiss"
                onClick={close}
              >
                关掉
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="xuan-escalation-glyph">◈</div>

            <div className="xuan-escalation-body">
              <p className="xuan-escalation-pause">
                你刚才说的话让我停了下来。
              </p>
              <p className="xuan-escalation-core">
                这件事不应该独自悬置。
              </p>

              {level === "high" && (
                <p className="xuan-escalation-urgent">
                  下面是24小时都可以打的电话：
                </p>
              )}

              <div className="xuan-escalation-hotlines">
                {HOTLINES.map((r) => (
                  <a key={r.phone} href={`tel:${r.phone}`} className="xuan-escalation-hotline">
                    <strong>{r.name}</strong>
                    <span>{r.phone}</span>
                  </a>
                ))}
              </div>

              <p className="xuan-escalation-humility">
                也许你只是在用一个比喻——但我宁愿过度反应一次。
              </p>
            </div>

            <div className="xuan-escalation-actions">
              <button
                className="xuan-escalation-more"
                onClick={() => setShowMore(true)}
              >
                我想了解更多资源
              </button>
              <button
                className="xuan-escalation-dismiss"
                onClick={close}
              >
                我只是比喻，关掉这个
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
