"use client";

import { useState } from "react";
import type { FieldUncertainty, Role, RoleProfile, RoleProfileInput, SourceTag } from "../lib/db";
import { useEscalation } from "../lib/critical-escalation";

type Props = {
  onBack: () => void;
  onSaveRole: (payload: {
    profile: RoleProfile;
    input: RoleProfileInput;
    calibrations: string[];
  }) => Promise<Role>;
};

const initialInput: RoleProfileInput = {
  mbti: "",
  zodiac: "",
  bazi: "",
  lifeStage: "",
  currentQuestion: "",
};

const SOURCE_LABEL: Record<SourceTag, string> = {
  user_quote: "你说的",
  mbti: "MBTI",
  zodiac: "星座",
  bazi: "星盘",
  life_stage: "阶段",
  ai_inference: "AI 推断",
};

const FIELDS: Array<{ key: keyof RoleProfile; label: string }> = [
  { key: "coreMotivation", label: "核心动机" },
  { key: "defensePattern", label: "防御方式" },
  { key: "highEnergyState", label: "高能状态" },
  { key: "lowEnergyState", label: "低能状态" },
  { key: "conflictPoint", label: "冲突点" },
  { key: "suggestedRelationship", label: "相处建议" },
];

function formatTime(ms: number | undefined) {
  if (!ms) return "未知";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function deltaTone(delta: number | undefined) {
  if (delta == null) return "warn";
  if (delta >= 0.3) return "danger";
  if (delta >= 0) return "warn";
  return "ok";
}

function FieldMeta({ uncertainty }: { uncertainty?: FieldUncertainty }) {
  if (!uncertainty) return null;
  const tone = deltaTone(uncertainty.delta);
  return (
    <span className={`xuan-field-meta is-${tone}`}>
      <span className="xuan-meta-num">κ {uncertainty.kappa?.toFixed(2)} · E {uncertainty.expectation?.toFixed(2)} · δ {uncertainty.delta?.toFixed(2)}</span>
      <span className="xuan-meta-srcs">
        {(uncertainty.sources || []).map((src) => (
          <em key={src}>{SOURCE_LABEL[src] ?? src}</em>
        ))}
      </span>
      {uncertainty.note && <small>{uncertainty.note}</small>}
    </span>
  );
}

async function requestRoleProfile(input: RoleProfileInput, calibration = "") {
  const response = await fetch("/api/role-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, calibration }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? "角色画像暂时生成失败。");
  }

  return data.profile as RoleProfile;
}

export function RoleProfileScreen({ onBack, onSaveRole }: Props) {
  const [input, setInput] = useState<RoleProfileInput>(initialInput);
  const [profile, setProfile] = useState<RoleProfile | null>(null);
  const [calibration, setCalibration] = useState("");
  const [calibrationHistory, setCalibrationHistory] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const escalation = useEscalation();

  const updateInput = (key: keyof RoleProfileInput, value: string) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const generateProfile = async (nextCalibration = "") => {
    const combined = [input.currentQuestion, input.bazi, input.lifeStage, nextCalibration].filter(Boolean).join(" ");
    escalation.check(combined, "role-profile");

    setIsLoading(true);
    setFeedback("");

    try {
      setProfile(await requestRoleProfile(input, nextCalibration));
      if (nextCalibration) {
        setCalibrationHistory((history) => [...history, nextCalibration]);
        setCalibration("");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "角色画像暂时生成失败。");
    } finally {
      setIsLoading(false);
    }
  };

  const saveRole = async () => {
    if (!profile || isSaving) return;

    setIsSaving(true);
    setFeedback("");

    try {
      await onSaveRole({ profile, input, calibrations: calibrationHistory });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "角色保存失败。");
      setIsSaving(false);
    }
  };

  return (
    <section className="xuan-role-profile">
      <button className="xuan-back-btn" onClick={onBack}>← 返回</button>

      <header className="xuan-role-header">
        <span>ROLE PROFILE · 临时自我画像</span>
        <h1>生成我的角色画像</h1>
        <p>MBTI、星座、星盘都只是素材。真正重要的是你能指出哪里像你，哪里不像你。</p>
      </header>

      <div className="xuan-role-profile-layout">
        <form
          className="xuan-role-form"
          onSubmit={(event) => {
            event.preventDefault();
            void generateProfile();
          }}
        >
          <label>
            <span>MBTI</span>
            <input value={input.mbti} onChange={(event) => updateInput("mbti", event.target.value)} placeholder="例如 INFP / INTJ / 不知道" />
          </label>
          <label>
            <span>星座</span>
            <input value={input.zodiac} onChange={(event) => updateInput("zodiac", event.target.value)} placeholder="例如 双鱼 / 天蝎 / 可空" />
          </label>
          <label>
            <span>星盘 / 出生信息</span>
            <input value={input.bazi} onChange={(event) => updateInput("bazi", event.target.value)} placeholder="年月日时，知道多少写多少" />
          </label>
          <label>
            <span>当前阶段</span>
            <input value={input.lifeStage} onChange={(event) => updateInput("lifeStage", event.target.value)} placeholder="工作 / 关系 / 家庭 / 自我探索" />
          </label>
          <label>
            <span>最近常纠结的一句话</span>
            <textarea value={input.currentQuestion} onChange={(event) => updateInput("currentQuestion", event.target.value)} placeholder="例如：我到底要不要换一条路？" rows={4} />
          </label>
          <button type="submit" disabled={isLoading}>{isLoading ? "正在生成" : "生成临时画像"}</button>
          {feedback && <p className="xuan-role-feedback">{feedback}</p>}
        </form>

        {profile ? (
          <article className="xuan-role-result">
            <span>AI 生成 · 可反驳草稿</span>
            <h2>
              {profile.mainRoleName}
              <FieldMeta uncertainty={profile.fieldUncertainty?.mainRoleName} />
            </h2>
            <p>
              {profile.mainRoleSummary}
              <FieldMeta uncertainty={profile.fieldUncertainty?.mainRoleSummary} />
            </p>

            <div className="xuan-role-meta-row">
              <span>生成于 {formatTime(profile.generatedAt)}</span>
              {profile.ageAtGeneration != null && <span>年龄 {profile.ageAtGeneration} 岁（按今日计）</span>}
              {profile.baziChart && <span>星盘 {profile.baziChart}</span>}
            </div>

            <div className="xuan-role-result-grid">
              {FIELDS.map(({ key, label }) => (
                <p key={key}>
                  <em>{label}</em>
                  {String(profile[key] ?? "")}
                  <FieldMeta uncertainty={profile.fieldUncertainty?.[key as keyof NonNullable<RoleProfile["fieldUncertainty"]>]} />
                </p>
              ))}
            </div>

            <div className="xuan-role-source">
              {profile.sourceBadges.map((badge) => <span key={badge}>{badge}</span>)}
            </div>

            {profile.subRoles.length > 0 && (
              <div className="xuan-role-subroles">
                <span>副角色</span>
                {profile.subRoles.map((role) => <p key={role.name}><strong>{role.name}</strong>{role.description}</p>)}
              </div>
            )}

            <div className="xuan-role-question">
              <span>心宝随机追问</span>
              {profile.followUpQuestions.map((question) => <p key={question}>{question}</p>)}
              <textarea value={calibration} onChange={(event) => setCalibration(event.target.value)} placeholder="哪里不像你？你其实更像什么？想让它叫什么？" rows={4} />
              <div className="xuan-role-actions">
                <button onClick={() => void generateProfile(calibration)} disabled={isLoading || !calibration.trim()}>让 AI 重新校准</button>
                <button onClick={saveRole} disabled={isSaving}>{isSaving ? "保存中" : "保存为角色"}</button>
              </div>
            </div>
          </article>
        ) : (
          <aside className="xuan-role-empty">
            <span>WAITING PROFILE</span>
            <p>你可以只填一项，也可以全部跳过。AI 会先生成一个粗画像，再等你指出不准的地方。</p>
          </aside>
        )}
      </div>
    </section>
  );
}
