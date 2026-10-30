"use client";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
type Message = { role: "user" | "assistant"; content: string };
const suggestions = ["帮我把一个想法变成行动计划", "给我三个有趣的创作灵感", "用简单的话解释一个复杂概念"];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [partial, setPartial] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const history = useRef<Message[]>([]);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => input.current?.focus(), 100);
    function keydown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const items = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled),textarea:not(:disabled),a[href]");
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(timer); document.removeEventListener("keydown", keydown); document.body.style.overflow = overflow; (previous ?? launch.current)?.focus(); };
  }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "instant" }); }, [messages, partial, error, busy, open]);
  useEffect(() => { if (open && !busy) input.current?.focus(); }, [open, busy]);
  useEffect(() => () => controller.current?.abort(), []);
  function newChat() {
    if (active.current) return;
    history.current = []; setMessages([]); setError(""); setPartial(""); setLastPrompt(""); setDraft(""); input.current?.focus();
  }
  async function sendText(value: string, retry = false) {
    const prompt = value.trim();
    if (!prompt || active.current || prompt.length > 4000) return;
    active.current = true;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(""); setPartial(""); setLastPrompt(prompt); setDraft("");
    if (!retry) setMessages(previous => [...previous, { role: "user", content: prompt }]);
    const context: Message[] = [...history.current.slice(-14), { role: "user", content: prompt }];
    let answer = "", completed = false;
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: context }), signal: abort.signal });
      if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.error ?? "消息发送失败，请稍后重试。"); }
      if (!response.body) throw new Error("没有收到回复，请重试。");
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = "";
      function consume(line: string) {
        if (!line.startsWith("data:")) return;
        const raw = line.slice(5).trim(); if (!raw || raw === "[DONE]") return;
        const event = JSON.parse(raw);
        if (event.type === "response.output_text.delta") { answer += event.delta ?? ""; setPartial(answer); }
        if (event.type === "response.completed") completed = true;
        if (["error", "response.failed", "response.incomplete"].includes(event.type)) throw new Error("这次回复未能完成，请重试或缩短问题。");
      }
      while (true) {
        const { value: chunk, done } = await reader.read(); buffer += decoder.decode(chunk, { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) consume(line);
        if (done) { if (buffer) consume(buffer); break; }
      }
      if (!completed || !answer.trim()) throw new Error("回复中断或为空，请重试。");
      history.current = [...context, { role: "assistant", content: answer }];
      setMessages(previous => [...previous, { role: "assistant", content: answer }]); setPartial(""); setLastPrompt("");
    } catch (cause) {
      if (abort.signal.aborted) setError("已停止生成。可以重试这条消息，或开始新的提问。");
      else setError(cause instanceof Error ? cause.message : "网络连接中断，请重试。");
    } finally { abort.abort(); controller.current = null; active.current = false; setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void sendText(draft); }
  function composerKey(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendText(draft); } }
  return <>
    <header className="site-header"><div className="brand"><span aria-hidden="true">✳</span> little spark</div><span className="edition">YOUR NEXT IDEA STARTS HERE</span></header>
    <main className="landing"><section className="copy"><div className="eyebrow">A LITTLE CLICK. A NEW POSSIBILITY.</div><h1>灵感，<br />从一次<br /><em>对话开始。</em></h1><p className="intro">给想法一个轻盈的开场。<br />带上你的好奇心，我们一起把想法往前推进。</p><button className="launch" onClick={() => setOpen(true)} ref={launch} aria-haspopup="dialog"><span aria-hidden="true">✳</span> ChatGPT <span aria-hidden="true">↗</span></button><p className="hint">点击开启真实 AI 对话</p></section>
      <section className="stage" aria-label="欢迎卡片"><div className="halo" /><div className="ring" /><span className="spark" aria-hidden="true">✧</span><article className="welcome-card"><div className="avatar" aria-hidden="true">✳</div><div className="status">HELLO, CREATIVE MIND</div><h2>你好，<br />很高兴遇见你的灵感。</h2><p>一个问题，一点好奇，一个尚未成形的想法。<br />每一段精彩的对话，都可以从这里开始。</p><button className="suggestion" onClick={() => setOpen(true)}><span>✧ &nbsp; 让想象力，向前一步</span><span aria-hidden="true">↗</span></button><div className="panel-bottom"><span>MADE FOR YOUR NEXT IDEA</span><span>✳</span></div></article></section></main>
    <footer className="site-footer"><span>A SMALL MOMENT OF DELIGHT.</span><span>由 OpenAI API 提供支持 · 独立应用</span></footer>
    {open && <div className="chat-overlay" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}><div className="chat-window" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <header className="chat-header"><div className="chat-brand"><div className="avatar" aria-hidden="true">✳</div><div><h2 id="chat-title">Little Spark</h2><p>给每一个想法，一个回应</p></div></div><div className="header-actions"><button className="text-button" onClick={newChat} disabled={busy}>新对话</button><button className="close" onClick={() => setOpen(false)} aria-label="关闭聊天">×</button></div></header>
      <div className="chat-messages" aria-busy={busy}>
        {messages.length === 0 && <div className="chat-empty"><div className="empty-symbol" aria-hidden="true">✧</div><div className="eyebrow">A SPACE FOR YOUR CURIOSITY</div><h3>今天，有什么新想法？</h3><p>写作、学习、计划，或者只是聊一聊。</p><div className="prompt-list">{suggestions.map(text => <button key={text} onClick={() => void sendText(text)}>{text}<span aria-hidden="true">↗</span></button>)}</div></div>}
        {messages.map((message, index) => <div className={`message ${message.role}`} key={index}><div className="message-name">{message.role === "user" ? "你" : "✳ Little Spark"}</div><div className="message-content">{message.content}</div></div>)}
        {(busy || partial) && <div className="message assistant"><div className="message-name">✳ Little Spark</div><div className="message-content">{partial || <span className="thinking" role="status">正在想一想<span>···</span></span>}</div></div>}
        {error && <div className="chat-error" role="alert"><p>{error}</p>{lastPrompt && <button onClick={() => void sendText(lastPrompt, true)}>重试这条消息 ↗</button>}</div>}<div ref={end} />
      </div>
      <form className="composer" onSubmit={submit}><label className="sr-only" htmlFor="message">输入消息</label><textarea ref={input} id="message" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={composerKey} placeholder="写下你的想法…" maxLength={4000} rows={2} disabled={busy} />{busy ? <button className="send" type="button" onClick={() => controller.current?.abort()} aria-label="停止生成">■</button> : <button className="send" type="submit" disabled={!draft.trim()} aria-label="发送消息">↑</button>}</form><div className="chat-footnote"><span>Enter 发送 · Shift + Enter 换行</span><span>AI 可能出错，请核实重要信息</span></div>
    </div></div>}
  </>;
}
