# Little Spark · AI 对话

保留点击 ChatGPT 后淡入、上移、缩放的入场动画，并接入 OpenAI Responses API。

功能包括流式回复、多轮上下文、快捷提问、停止生成、新对话、错误重试、手机适配和键盘操作。对话保存在当前页面内存中，刷新即清空。

## 本地运行

需要 Node.js 22.13+ 与 pnpm。安装依赖后，将自己的服务端配置放在不受版本控制的 `.dev.vars` 中，字段参见 `.env.example`。运行 `pnpm dev`，访问输出的本地地址并使用本地登录。

## 部署

通过 Sites 部署，保留 `.openai/hosting.json` 的项目标识。服务端运行时配置 `OPENAI_API_KEY`（密钥）与 `OPENAI_MODEL`（默认 `gpt-5-mini`）。生产网站默认仅所有者可访问，需要 ChatGPT 登录。密钥禁止放入网页代码或 GitHub。

`pnpm build` 构建，`node --experimental-strip-types --test tests/chat.test.mjs` 验证输入限制和错误映射。接口仅接受同源、已登录的请求，最多保留最近七轮完整对话，单条提问最多 4000 字。内存中的每用户限流是辅助措施，不是持久化的计费上限。

原始纯静态动画保留在仓库根目录 `index.html`；真正的 AI 对话应用位于 `chat-app/`。
