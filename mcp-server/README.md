# AIVC DACH MCP Server

> Model Context Protocol server that exposes AIVC DACH editor + generator tools to AI agents (Claude Code, Cursor, custom clients).
> Status: **v3.0.0-alpha.2 skeleton — held back for alpha.3**. Only `ping` is wired; `editor.*` and `generator.*` are stubs. Real tools live in the **editor itself** for alpha.2 (see below) and will be reflected here in alpha.3.

## Why this server is still a stub in alpha.2

The real AI layer landed in alpha.2 — but inside the editor, not here. Reason: OpenCut's `EditorCore` is a browser-side singleton. To talk to it from a separate stdio process, this server needs a WebSocket bridge to the running browser tab, which adds discovery and lifecycle complexity that did not fit alpha.2's scope.

For alpha.2 we therefore shipped:

- **`/editor/apps/web/src/ai/`** — `editor.getState`, `editor.cut`, `editor.trim`, `editor.addClip` as in-process Vercel AI SDK tools, executed client-side via `EditorCore.getInstance()`.
- **This server** — unchanged. Stays as the public surface for external agents (Claude Code, Cursor) and gets a WebSocket bridge to the editor in **alpha.3**.

If you wired this server into Claude Code already, `ping` keeps working. The `editor.*` tools return a clear "not implemented yet — use the editor's chat sidebar in alpha.2" message until the bridge lands.

## What this is

A small stdio server built on `@modelcontextprotocol/sdk`. It speaks MCP, so any MCP-aware client can:

1. Discover the available tools via `tools/list`
2. Call them via `tools/call`

In v3.0.0-alpha the server is a **scaffolding** for the AI layer. We're shipping it early so:

- Claude Code users can already register the server and verify the connection (`ping` works)
- We have a stable surface to wire the real tool implementations against in v3.0.0

## Run

```bash
cd mcp-server
bun install
bun run start
```

Output:

```
[aivc-dach] v0.1.0-alpha listening on stdio. 5 tools registered.
```

Server reads MCP requests from stdin, writes responses to stdout, logs to stderr.

## Smoke test

End-to-end check: spawns the server, runs `initialize`, `tools/list`, `tools/call ping`.

```bash
bun run smoke
```

Expected: a `pong from aivc-dach v0.1.0-alpha — server is live` line in the last response.

## Tools

| Name | Status | Description |
|---|---|---|
| `ping` | ✅ live | Returns `pong from aivc-dach v…`. Sanity check. |
| `editor.cut` | 🟡 stub here · ✅ live in editor | Real impl in `editor/apps/web/src/ai/`. Bridge lands in alpha.3. |
| `editor.trim` | 🟡 stub here · ✅ live in editor | Same. |
| `editor.addClip` | 🟡 stub here · ✅ live in editor | Same. |
| `generator.render` | 🟡 stub | Render a template via the generator. Will wrap `node generator/renderer/render.js`. |

Calling a stub tool returns a polite "not implemented yet" message — never an error — so clients can probe what's available without breaking.

## Wire into Claude Code

Add to `~/.claude/config.json` (or run `/mcp add` in Claude Code):

```json
{
  "mcpServers": {
    "aivc-dach": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/aivc-dach/mcp-server/server.ts"]
    }
  }
}
```

Restart Claude Code and the tools appear under the AIVC DACH server in `/mcp`.

## Architecture

```
mcp-server/
├── server.ts        # main entry: stdio MCP server + tool catalog
├── smoke.ts         # end-to-end smoke test
├── package.json
└── README.md
```

In v3.0.0 this folder will grow:

```
mcp-server/
├── server.ts
├── tools/
│   ├── editor/
│   │   ├── cut.ts
│   │   ├── trim.ts
│   │   └── addClip.ts
│   ├── generator/
│   │   └── render.ts
│   └── index.ts        # registers all tools
├── transport/
│   └── editor-bridge.ts  # state sync: chat ↔ editor timeline
└── ...
```

Tools either talk to the running editor (via Zustand-store-bridge over the same process or a localhost websocket) or shell out to the generator's CLI.

## License

MIT — see [`/LICENSE`](../LICENSE).
