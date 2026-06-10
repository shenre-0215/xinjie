import { NextResponse } from "next/server";

type RoleProfileInput = {
  mbti?: string;
  zodiac?: string;
  bazi?: string;
  lifeStage?: string;
  currentQuestion?: string;
};

type RequestBody = {
  input: RoleProfileInput;
  calibration?: string;
};

const FIELD_KEYS = [
  "mainRoleName",
  "mainRoleSummary",
  "coreMotivation",
  "defensePattern",
  "highEnergyState",
  "lowEnergyState",
  "conflictPoint",
  "suggestedRelationship",
] as const;

const fallbackUncertainty = Object.fromEntries(
  FIELD_KEYS.map((key) => [
    key,
    { kappa: 0.6, expectation: 0.3, delta: 0.3, sources: ["ai_inference"], note: "资料不足，AI 默认值" },
  ]),
);

const fallbackProfile = {
  mainRoleName: "未命名的观察者",
  mainRoleSummary: "这是一个先观察、再决定是否靠近世界的临时角色。它不是结论，只是一张草稿。",
  coreMotivation: "想理解自己为什么反复卡在同一类选择里。",
  defensePattern: "先收集线索，避免太快被外界定义。",
  highEnergyState: "独处、学习、整理系统时更有能量。",
  lowEnergyState: "被催促、被比较、被迫立刻表态时容易紧绷。",
  conflictPoint: "既想被看见，又担心被看穿后失去空间。",
  suggestedRelationship: "让它负责提醒你慢一点，不让它替你推迟所有行动。",
  sourceBadges: ["资料不足", "AI 初稿", "等待用户校准"],
  subRoles: [
    { name: "守门人", description: "负责判断哪些关系和任务值得放进来。" },
    { name: "试探者", description: "负责用小行动测试世界是否安全。" },
  ],
  followUpQuestions: [
    "这张画像里，哪一句最不像你？",
    "如果这个角色有一句口头禅，它会说什么？",
    "你希望 AI 给它起一个更锋利、更温柔，还是更神秘的名字？",
  ],
  fieldUncertainty: fallbackUncertainty,
};

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_COMPAT_API_KEY;
  const baseUrl = process.env.OPENAI_COMPAT_BASE_URL;
  const model = process.env.OPENAI_COMPAT_MODEL;

  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json(
      { error: "missing_config", message: "请先配置 OPENAI_COMPAT_API_KEY、OPENAI_COMPAT_BASE_URL、OPENAI_COMPAT_MODEL。" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const input = body.input ?? {};
  const calibration = body.calibration?.trim();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const generatedAtMs = now.getTime();

  const systemPrompt = `你是「悬」App 的角色画像生成器。

【今天日期】${todayIso}（年龄、阶段都以今天为准，不要凭记忆推算）

【你的核心约束 —— 来自申淑博悬置公式 δ(C) = κ(C) - E(C)】
- 每一条画像主张都必须自报"反驳压力 κ"和"预期收益 E"，得到 δ。
- κ ∈ [0,1]：你自己有多怀疑这条；资料越少、越靠占星类间接证据，κ 越高。
- E ∈ [0,1]：这条若成立，对用户理解自己有多大帮助；越具体越能驱动行动，E 越高。
- δ = κ - E，向用户外显，让 ta 知道哪条最该被推翻。
- 每条字段附 sources 数组（取自：user_quote / mbti / zodiac / bazi / life_stage / ai_inference），让用户看见这句话从哪里来。
- 任何体系都只是素材，不是真理；画像必须是可反驳、可修改的草稿。

【星盘处理】
- 如果"出生信息"含完整年月日时（公历或农历都接受），你应**先在内部把它排成八字四柱（年柱/月柱/日柱/时柱，例如 "乙亥/己卯/甲子/戊辰"）**，把结果写入 baziChart 字段，然后再用它影响画像。
- 如果只给了年龄/星座/无法换算的信息，baziChart 留空字符串，不要瞎编。
- 顺便根据出生日期和今天日期算出 ageAtGeneration（整数岁），不要凭印象写。

【输出格式】只返回合法 JSON，不要 Markdown，不要解释。字段：
{
  "mainRoleName": string,
  "mainRoleSummary": string,
  "coreMotivation": string,
  "defensePattern": string,
  "highEnergyState": string,
  "lowEnergyState": string,
  "conflictPoint": string,
  "suggestedRelationship": string,
  "sourceBadges": string[],
  "subRoles": [{"name":string,"description":string}, ...],
  "followUpQuestions": string[3-5],
  "baziChart": string,
  "ageAtGeneration": number | null,
  "fieldUncertainty": {
    "mainRoleName": {"kappa":0-1,"expectation":0-1,"delta":-1到1,"sources":SourceTag[],"note":string},
    "mainRoleSummary": {...},
    "coreMotivation": {...},
    "defensePattern": {...},
    "highEnergyState": {...},
    "lowEnergyState": {...},
    "conflictPoint": {...},
    "suggestedRelationship": {...}
  }
}`;

  const userPrompt = `请根据以下资料生成或校准角色画像（参考校准内容时优先于初始资料）。

MBTI：${input.mbti || "未提供"}
星座：${input.zodiac || "未提供"}
出生信息：${input.bazi || "未提供"}
当前阶段：${input.lifeStage || "未提供"}
最近纠结的一句话：${input.currentQuestion || "未提供"}

用户对上一版的校准：${calibration || "（首次生成，暂无）"}

记住：今天是 ${todayIso}。算年龄要用今天减出生年。星盘要排出来。每个字段要算 κ/E/δ 和 sources。`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ error: "llm_error", message }, { status: response.status });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ profile: { ...fallbackProfile, generatedAt: generatedAtMs } });
  }

  try {
    const parsed = JSON.parse(extractJson(content));
    return NextResponse.json({ profile: { ...parsed, generatedAt: generatedAtMs } });
  } catch {
    return NextResponse.json({ profile: { ...fallbackProfile, generatedAt: generatedAtMs } });
  }
}
