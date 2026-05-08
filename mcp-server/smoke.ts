#!/usr/bin/env bun
/**
 * Smoke test for the AIVC DACH MCP server.
 *
 * Spawns server.ts, sends an MCP `initialize` + `tools/list` + `tools/call ping`
 * over stdio, and prints the responses. Used by CI / local sanity check.
 *
 * Run: bun run smoke
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(import.meta.url), "..");
const SERVER = resolve(HERE, "server.ts");

const child = spawn("bun", ["run", SERVER], {
	stdio: ["pipe", "pipe", "inherit"],
});

const pending = new Map<number, (msg: unknown) => void>();
let id = 0;

function rpc(method: string, params: Record<string, unknown> = {}) {
	id += 1;
	const msg = { jsonrpc: "2.0", id, method, params };
	return new Promise((resolveRpc) => {
		pending.set(id, resolveRpc);
		child.stdin.write(`${JSON.stringify(msg)}\n`);
	});
}

let buf = "";
child.stdout.on("data", (chunk) => {
	buf += chunk.toString("utf8");
	let nl = buf.indexOf("\n");
	while (nl !== -1) {
		const line = buf.slice(0, nl);
		buf = buf.slice(nl + 1);
		nl = buf.indexOf("\n");
		if (line.trim()) {
			try {
				const msg = JSON.parse(line);
				const cb = pending.get(msg.id);
				if (cb) {
					pending.delete(msg.id);
					cb(msg);
				}
			} catch {
				// non-JSON line on stdout (shouldn't happen for MCP) – ignore
			}
		}
	}
});

async function main() {
	const init = await rpc("initialize", {
		protocolVersion: "2024-11-05",
		capabilities: {},
		clientInfo: { name: "aivc-smoke", version: "0.1.0" },
	});
	console.log("[init]", JSON.stringify(init, null, 2));

	const list = await rpc("tools/list");
	console.log("[tools/list]", JSON.stringify(list, null, 2));

	const ping = await rpc("tools/call", { name: "ping", arguments: {} });
	console.log("[tools/call ping]", JSON.stringify(ping, null, 2));

	child.kill();
	process.exit(0);
}

main().catch((err) => {
	console.error("smoke test failed:", err);
	child.kill();
	process.exit(1);
});
