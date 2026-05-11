"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";

type AnyToolPart = ToolUIPart | DynamicToolUIPart;

const TOOL_LABELS: Record<string, string> = {
	"editor.getState": "Reading editor state",
	"editor.cut": "Cutting timeline",
	"editor.trim": "Trimming clip",
	"editor.addClip": "Adding clip",
	"editor.listTemplates": "Listing overlay templates",
	"editor.addOverlay": "Rendering overlay",
	"editor.modifyOverlay": "Re-rendering overlay",
	"editor.removeOverlay": "Removing overlay",
	"editor.renderCustomOverlay": "Rendering custom overlay",
	"editor.saveAsTemplate": "Saving as template",
};

interface OverlayOutputResult {
	ok?: boolean;
	result?: {
		cached?: boolean;
		renderMs?: number;
	};
}

function readOverlayMeta(output: unknown): {
	cached: boolean;
	renderMs?: number;
} | null {
	if (typeof output !== "object" || output === null) return null;
	const result = (output as OverlayOutputResult).result;
	if (!result) return null;
	if (typeof result.cached !== "boolean") return null;
	return { cached: result.cached, renderMs: result.renderMs };
}

function statusBadge(state: AnyToolPart["state"]): {
	label: string;
	className: string;
} {
	switch (state) {
		case "input-streaming":
			return {
				label: "Preparing…",
				className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
			};
		case "input-available":
			return {
				label: "Running…",
				className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
			};
		case "output-available":
			return {
				label: "Done",
				className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
			};
		case "output-error":
			return {
				label: "Failed",
				className: "bg-red-500/15 text-red-700 dark:text-red-400",
			};
		default:
			return {
				label: String(state),
				className: "bg-muted text-muted-foreground",
			};
	}
}

export function ToolCallDisplay({ part }: { part: AnyToolPart }) {
	const toolName =
		part.type === "dynamic-tool"
			? part.toolName
			: part.type.replace(/^tool-/, "");
	const label = TOOL_LABELS[toolName] ?? toolName;
	const status = statusBadge(part.state);
	const input =
		"input" in part && part.input !== undefined ? part.input : null;
	const output =
		"output" in part && part.output !== undefined ? part.output : null;
	const errorText =
		part.state === "output-error" && "errorText" in part
			? part.errorText
			: null;

	const overlayMeta =
		part.state === "output-available" ? readOverlayMeta(output) : null;

	return (
		<div className="border bg-muted/40 rounded-md p-2 text-xs space-y-1">
			<div className="flex items-center justify-between gap-2">
				<span className="font-medium font-mono text-[11px]">{toolName}</span>
				<span className={`px-1.5 py-0.5 rounded text-[10px] ${status.className}`}>
					{status.label}
				</span>
			</div>
			<div className="text-muted-foreground">{label}</div>
			{overlayMeta && (
				<div className="flex items-center gap-2 text-[10px]">
					{overlayMeta.cached ? (
						<span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
							Cached
						</span>
					) : (
						<span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400">
							Rendered{overlayMeta.renderMs != null ? ` in ${(overlayMeta.renderMs / 1000).toFixed(1)}s` : ""}
						</span>
					)}
				</div>
			)}
			{input != null && (
				<details className="text-[11px]">
					<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
						input
					</summary>
					<pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
						{JSON.stringify(input, null, 2)}
					</pre>
				</details>
			)}
			{output != null && (
				<details className="text-[11px]">
					<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
						output
					</summary>
					<pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all">
						{JSON.stringify(output, null, 2)}
					</pre>
				</details>
			)}
			{errorText && (
				<div className="text-red-600 dark:text-red-400 text-[11px]">
					{errorText}
				</div>
			)}
		</div>
	);
}
