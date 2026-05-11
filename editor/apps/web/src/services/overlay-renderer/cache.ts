import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { TemplateVars } from "./template-vars";

// process.cwd() at runtime is editor/apps/web. Repo root is three levels up.
const REPO_ROOT_FROM_WEB = ["..", "..", ".."];

export interface CacheKeyInput {
	/** Either a template id (resolved to /generator/overlays/<id>/template.html) … */
	template?: string;
	/** … or a raw HTML string for ad-hoc renders. */
	html?: string;
	vars: TemplateVars;
	durationSeconds: number;
	styleVars: Record<string, string>;
	width: number;
	height: number;
}

export function computeCacheKey({
	template,
	html,
	vars,
	durationSeconds,
	styleVars,
	width,
	height,
}: CacheKeyInput): string {
	const sortedVars = Object.fromEntries(
		Object.entries(vars).sort(([a], [b]) => a.localeCompare(b)),
	);
	const sortedStyle = Object.fromEntries(
		Object.entries(styleVars).sort(([a], [b]) => a.localeCompare(b)),
	);
	// For custom HTML, hash the body; for template, use the id. Keys for the
	// two paths are disjoint by construction (different prefixes).
	const sourceKey = template ? `tpl:${template}` : `html:${createHash("sha256").update(html ?? "").digest("hex")}`;
	const payload = JSON.stringify({
		source: sourceKey,
		vars: sortedVars,
		durationSeconds,
		styleVars: sortedStyle,
		width,
		height,
	});
	return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function repoRoot(): string {
	return join(process.cwd(), ...REPO_ROOT_FROM_WEB);
}

export function templatesRoot(): string {
	return join(repoRoot(), "generator", "overlays");
}

export function templatePath({ template }: { template: string }): {
	dir: string;
	htmlFile: string;
	metaFile: string;
} {
	const dir = join(templatesRoot(), template);
	return {
		dir,
		htmlFile: join(dir, "template.html"),
		metaFile: join(dir, "meta.json"),
	};
}

export function cacheRoot(): string {
	return join(process.cwd(), ".aivc-cache", "overlays");
}

export async function ensureCacheRoot(): Promise<string> {
	const dir = cacheRoot();
	await mkdir(dir, { recursive: true });
	return dir;
}

export function cachedFilePath({ hash }: { hash: string }): string {
	return join(cacheRoot(), `${hash}.webm`);
}

export function cachedFileExists({ hash }: { hash: string }): boolean {
	return existsSync(cachedFilePath({ hash }));
}
