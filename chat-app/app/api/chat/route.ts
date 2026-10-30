import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { readBoundedJson, upstreamError, validateMessages } from "../../../lib/chat";
export const dynamic = "force-dynamic";
const recentRequests = new Map<string, { since: number; count: number }>();
const responseHeaders = { "Cache-Control": "private, no-store" };
function fail(error: string, status: number) { return Response.json({ error }, { status, headers: responseHeaders }); }
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return fail("请从本站发送消息。", 403);
  const user = await getChatGPTUser();
  if (!user) return fail("请先登录后再发送消息，刷新页面即可重新登录。", 401);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("消息格式不正确。", 415);
  let payload: unknown;
  try { payload = await readBoundedJson(request); } catch { return fail("消息过长或格式不正确，请缩短后重试。", 400); }
  const messages = validateMessages((payload as { messages?: unknown })?.messages);
  if (!messages) return fail("这段对话过长，请点击“新对话”后继续，单条提问最多 4000 字。", 400);
  if (!env.OPENAI_API_KEY) return fail("AI 服务尚未完成配置，请联系网站所有者。", 503);
  const now = Date.now();
  for (const [key, value] of recentRequests) if (now - value.since > 60000) recentRequests.delete(key);
  const recent = recentRequests.get(user.userId) ?? { since: now, count: 0 };
  if (recent.count >= 12) return fail("发送得有点快，请一分钟后再试。", 429);
  recent.count++; recentRequests.set(user.userId, recent);
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: env.OPENAI_MODEL || "gpt-5-mini", instructions: "你是 Little Spark，一个友好、清晰、务实的 AI 助手。默认用简体中文交流，跟随用户使用的语言。帮助用户写作、学习、梳理思路和制定计划。诚实说明不确定性，不声称自己拥有网页浏览或执行外部操作的能力。使用简洁自然的表达。", input: messages, stream: true, store: false, max_output_tokens: 4096, reasoning: { effort: "low" } }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(90000)]),
    });
    if (!upstream.ok) {
      const detail = await upstream.json().catch(() => ({})) as { error?: { code?: string } };
      const failure = upstreamError(upstream.status, detail.error?.code);
      console.error("AI request failed", { status: upstream.status, code: detail.error?.code, requestId: upstream.headers.get("x-request-id") });
      return fail(failure.error, failure.status);
    }
    if (!upstream.body) return fail("没有收到 AI 回复，请重试。", 502);
    return new Response(upstream.body, { headers: { ...responseHeaders, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" } });
  } catch { return fail("AI 服务连接超时或中断，请稍后重试。", 504); }
}
