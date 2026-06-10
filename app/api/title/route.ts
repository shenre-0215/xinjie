import { NextResponse } from "next/server";

type DialogueMessage = {
  speaker: "user" | "ai";
  text: string;
};

type RequestBody = {
  messages: DialogueMessage[];
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
      { error: "missing_config", message: "请先配置 API。" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as RequestBody;
  const history = body.messages
    .filter((m) => m.speaker === "user")
    .slice(0, 6)
    .map((m) => m.text);

  const systemPrompt = `你是一个为「悬」App 给对话命名的小助手。

用户和心宝聊了几轮，心宝是一个帮助人暂停、反思、悬置不确定性的导航员。

请根据用户说的内容，生成：
- title：一个诗意的、2-6 字的中文标题，像歌曲名或小诗标题。不要出现"悬置""副本"这些词。
- summary：一句话（≤20 字）概括用户在聊什么。

只返回 JSON：{"title":"...","summary":"..."}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `用户说了：\n${history.join("\n")}` },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ title: "未命名", summary: "" });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(extractJson(content));
    return NextResponse.json({
      title: typeof parsed.title === "string" ? parsed.title : "未命名",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    });
  } catch {
    return NextResponse.json({ title: "未命名", summary: "" });
  }
}
