export type ChatMessage = { role: "user" | "assistant"; content: string };
export function validateMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 15 || value.length % 2 !== 1) return null;
  let size = 0; const messages: ChatMessage[] = [];
  for (const [index, message] of value.entries()) {
    if (!message || typeof message !== "object" || message.role !== (index % 2 === 0 ? "user" : "assistant") || typeof message.content !== "string" || !message.content.trim() || message.content.length > 12000 || (message.role === "user" && message.content.length > 4000)) return null;
    size += message.content.length; if (size > 28000) return null;
    messages.push({ role: message.role, content: message.content });
  }
  return messages;
}
export function upstreamError(status: number, code?: string) {
  if (code === "insufficient_quota" || code === "billing_hard_limit_reached") return { status: 503, error: "AI 服务的 API 额度不足。请为网站使用的 OpenAI 项目补充额度后重试。" };
  if (status === 429) return { status: 429, error: "AI 服务暂时繁忙，请稍等片刻后重试。" };
  if (status === 401 || status === 403) return { status: 503, error: "AI 服务的访问配置需要更新，请联系网站所有者。" };
  if (status === 404) return { status: 503, error: "当前项目无法使用所配置的 AI 模型，请联系网站所有者。" };
  return { status: 502, error: "AI 服务暂时没有响应，请稍后重试。" };
}
export async function readBoundedJson(request: Request, maxBytes = 131072): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("body_too_large");
  const reader = request.body?.getReader(); if (!reader) throw new Error("empty_body");
  let bytes = 0, text = ""; const decoder = new TextDecoder();
  while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > maxBytes) { await reader.cancel(); throw new Error("body_too_large"); } text += decoder.decode(value, { stream: true }); }
  return JSON.parse(text + decoder.decode());
}
