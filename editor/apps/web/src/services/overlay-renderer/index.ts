import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { computeCacheKey, templatePath } from "./cache";
import {
	completeJob,
	createJob,
	failJob,
	getJob,
	updateJob,
	type JobState,
} from "./job-store";
import { renderOverlay } from "./render";
import type { TemplateVars } from "./template-vars";

export interface OverlayMeta {
	id: string;
	name: string;
	type: "overlay";
	duration: number;
	aspectRatio: string;
	transparent: boolean;
	description: string;
	variables: Array<{
		key: string;
		label: string;
		type: "string" | "number" | "color" | "boolean";
		required: boolean;
		maxLength?: number;
		example?: string | number;
	}>;
	styleVars: Array<{
		key: string;
		label: string;
		type: "string" | "number" | "color";
		default: string | number;
	}>;
}

export interface StartOverlayJobInput {
	template?: string;
	html?: string;
	vars?: TemplateVars;
	durationSeconds?: number;
	styleVars?: Record<string, string>;
	width?: number;
	height?: number;
}

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

export async function loadOverlayMeta({
	template,
}: {
	template: string;
}): Promise<OverlayMeta> {
	const paths = templatePath({ template });
	if (!existsSync(paths.metaFile)) {
		throw new Error(`Template "${template}" has no meta.json`);
	}
	const raw = await readFile(paths.metaFile, "utf8");
	const parsed: OverlayMeta = JSON.parse(raw);
	if (typeof parsed?.id !== "string") {
		throw new Error(`meta.json for ${template} is malformed`);
	}
	return parsed;
}

export function startOverlayJob({
	template,
	html,
	vars,
	durationSeconds,
	styleVars,
	width,
	height,
	originBaseUrl,
}: StartOverlayJobInput & { originBaseUrl: string }): Promise<JobState> {
	return (async () => {
		if (!template && !html) {
			throw new Error(
				"startOverlayJob: either template or html must be provided",
			);
		}
		const effectiveVars = vars ?? {};
		const effectiveStyleVars = styleVars ?? {};
		const effectiveWidth = width ?? DEFAULT_WIDTH;
		const effectiveHeight = height ?? DEFAULT_HEIGHT;

		let effectiveDuration: number;
		if (template) {
			const meta = await loadOverlayMeta({ template });
			effectiveDuration = durationSeconds ?? meta.duration;
		} else {
			// Custom HTML: duration must be supplied (no meta.json to read).
			if (durationSeconds == null) {
				throw new Error(
					"renderCustomOverlay: durationSeconds is required when rendering raw HTML",
				);
			}
			effectiveDuration = durationSeconds;
		}

		const hash = computeCacheKey({
			template,
			html,
			vars: effectiveVars,
			durationSeconds: effectiveDuration,
			styleVars: effectiveStyleVars,
			width: effectiveWidth,
			height: effectiveHeight,
		});

		const job = createJob({
			template: template ?? "custom",
			hash,
		});

		void runRender({
			jobId: job.id,
			template,
			html,
			vars: effectiveVars,
			durationSeconds: effectiveDuration,
			styleVars: effectiveStyleVars,
			width: effectiveWidth,
			height: effectiveHeight,
			hash,
			originBaseUrl,
		}).catch((err: unknown) => {
			failJob({
				jobId: job.id,
				error: err instanceof Error ? err.message : String(err),
			});
		});

		return job;
	})();
}

async function runRender({
	jobId,
	template,
	html,
	vars,
	durationSeconds,
	styleVars,
	width,
	height,
	hash,
	originBaseUrl,
}: {
	jobId: string;
	template?: string;
	html?: string;
	vars: TemplateVars;
	durationSeconds: number;
	styleVars: Record<string, string>;
	width: number;
	height: number;
	hash: string;
	originBaseUrl: string;
}): Promise<void> {
	updateJob({ jobId, patch: { status: "running" } });
	try {
		await renderOverlay({
			template,
			html,
			vars,
			durationSeconds,
			styleVars,
			width,
			height,
			hash,
			onProgress: (progress) => {
				updateJob({ jobId, patch: { progress } });
			},
		});
		const fileUrl = `${originBaseUrl.replace(/\/$/, "")}/api/overlays/files/${hash}`;
		completeJob({ jobId, fileUrl });
	} catch (err) {
		failJob({
			jobId,
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

export { getJob };
export type { JobState };
