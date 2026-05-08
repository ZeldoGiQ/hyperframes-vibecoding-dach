#!/usr/bin/env bun
/**
 * AIVC DACH MCP server (stdio)
 *
 * Phase 4-skeleton in v3.0.0-alpha. The real editor + generator tools
 * (cut, trim, addClip, render-template, …) land in v3.0.0 once the
 * editor's state machine is wired up.
 *
 * For now this server only ships:
 *   - `ping`               sanity check
 *   - `editor.cut`         stub — returns "not implemented yet"
 *   - `editor.trim`        stub — same
 *   - `editor.addClip`     stub — same
 *   - `generator.render`   stub — same
 *
 * Run via stdio:
 *   bun run server.ts
 *
 * Or wire into Claude Code's `~/.claude/config.json`:
 *   "mcpServers": {
 *     "aivc-dach": {
 *       "command": "bun",
 *       "args": ["run", "/abs/path/to/aivc-dach/mcp-server/server.ts"]
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SERVER_NAME = "aivc-dach";
const SERVER_VERSION = "0.1.0-alpha";

const server = new Server(
	{ name: SERVER_NAME, version: SERVER_VERSION },
	{ capabilities: { tools: {} } },
);

// --- Tool catalog -------------------------------------------------------

interface ToolDef {
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
	handler: (args: Record<string, unknown>) => Promise<string>;
}

const tools: ToolDef[] = [
	{
		name: "ping",
		description:
			"Sanity check. Returns 'pong from AIVC DACH'. Use this to verify the MCP server is reachable.",
		inputSchema: { type: "object", properties: {} },
		handler: async () =>
			`pong from ${SERVER_NAME} v${SERVER_VERSION} — server is live`,
	},
	{
		name: "editor.cut",
		description:
			"[STUB] Cut a clip on the timeline at the given timestamp. Will be implemented in v3.0.0 once the editor's state machine is wired up.",
		inputSchema: {
			type: "object",
			properties: {
				clipId: { type: "string", description: "Timeline clip ID" },
				timestamp: {
					type: "number",
					description: "Cut position in seconds from clip start",
				},
			},
			required: ["clipId", "timestamp"],
		},
		handler: async () =>
			"editor.cut is not implemented yet (v3.0.0-alpha skeleton). Coming in v3.0.0.",
	},
	{
		name: "editor.trim",
		description:
			"[STUB] Trim a clip on the timeline. Will be implemented in v3.0.0.",
		inputSchema: {
			type: "object",
			properties: {
				clipId: { type: "string", description: "Timeline clip ID" },
				start: { type: "number", description: "New start time (seconds)" },
				end: { type: "number", description: "New end time (seconds)" },
			},
			required: ["clipId", "start", "end"],
		},
		handler: async () =>
			"editor.trim is not implemented yet (v3.0.0-alpha skeleton). Coming in v3.0.0.",
	},
	{
		name: "editor.addClip",
		description:
			"[STUB] Add a clip to the timeline. Will be implemented in v3.0.0.",
		inputSchema: {
			type: "object",
			properties: {
				source: {
					type: "string",
					description: "Path or asset ID of the source media",
				},
				timestamp: {
					type: "number",
					description: "Insert position on the timeline (seconds)",
				},
			},
			required: ["source", "timestamp"],
		},
		handler: async () =>
			"editor.addClip is not implemented yet (v3.0.0-alpha skeleton). Coming in v3.0.0.",
	},
	{
		name: "generator.render",
		description:
			"[STUB] Render a generator template into an MP4 (wraps `node generator/renderer/render.js`). Will be implemented in v3.0.0 with proper job tracking.",
		inputSchema: {
			type: "object",
			properties: {
				template: {
					type: "string",
					description:
						"Template name under generator/templates/ (news-intro, promo-clip, …)",
				},
				vars: {
					type: "object",
					description: "Template variables as a key-value map",
				},
			},
			required: ["template"],
		},
		handler: async () =>
			"generator.render is not implemented yet (v3.0.0-alpha skeleton). For now, run from the CLI: `node generator/renderer/render.js --template <name> --vars '<json>'`",
	},
];

const toolMap = new Map(tools.map((t) => [t.name, t]));

// --- Wire MCP requests --------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: tools.map(({ name, description, inputSchema }) => ({
		name,
		description,
		inputSchema,
	})),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const tool = toolMap.get(request.params.name);
	if (!tool) {
		throw new Error(
			`Unknown tool: ${request.params.name}. Available: ${tools
				.map((t) => t.name)
				.join(", ")}`,
		);
	}
	const args = (request.params.arguments ?? {}) as Record<string, unknown>;
	const text = await tool.handler(args);
	return { content: [{ type: "text", text }] };
});

// --- Start over stdio ---------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
	`[${SERVER_NAME}] v${SERVER_VERSION} listening on stdio. ${tools.length} tools registered.`,
);
