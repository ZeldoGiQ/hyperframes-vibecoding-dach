# AIVC DACH MCP Server

> Model Context Protocol server that exposes AIVC DACH editor + generator tools to AI agents (Claude Code, Cursor, custom clients).
> Status: **v3.0.0-alpha skeleton** — only `ping` is fully implemented; `editor.*` and `generator.*` are stubs that respond with "not implemented yet". Real tools land in **v3.0.0**.

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
| `editor.cut` | 🟡 stub | Cut a timeline clip at a timestamp. Will land in v3.0.0. |
| `editor.trim` | 🟡 stub | Trim a clip's start/end. Will land in v3.0.0. |
| `editor.addClip` | 🟡 stub | Add a clip to the timeline. Will land in v3.0.0. |
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
