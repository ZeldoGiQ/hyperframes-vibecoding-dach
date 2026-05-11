import { randomUUID } from "node:crypto";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobState {
	id: string;
	status: JobStatus;
	template: string;
	hash: string;
	progress: number;
	startedAt: number;
	finishedAt?: number;
	error?: string;
	fileUrl?: string;
}

// Next.js dev mode (Turbopack) isolates module state per route handler, so a
// plain module-level Map disappears between POST /render and GET /jobs/:id.
// Pin the store on globalThis so every route shares one instance.
const GLOBAL_KEY = "__aivc_overlay_jobs__";
type GlobalWithStore = typeof globalThis & {
	[GLOBAL_KEY]?: Map<string, JobState>;
};
const globalStore = globalThis as GlobalWithStore;
const jobs: Map<string, JobState> =
	globalStore[GLOBAL_KEY] ?? new Map<string, JobState>();
globalStore[GLOBAL_KEY] = jobs;

export function createJob({
	template,
	hash,
}: {
	template: string;
	hash: string;
}): JobState {
	const job: JobState = {
		id: randomUUID(),
		status: "queued",
		template,
		hash,
		progress: 0,
		startedAt: Date.now(),
	};
	jobs.set(job.id, job);
	return job;
}

export function getJob({ jobId }: { jobId: string }): JobState | undefined {
	return jobs.get(jobId);
}

export function updateJob({
	jobId,
	patch,
}: {
	jobId: string;
	patch: Partial<JobState>;
}): JobState | undefined {
	const current = jobs.get(jobId);
	if (!current) return undefined;
	const next = { ...current, ...patch };
	jobs.set(jobId, next);
	return next;
}

export function completeJob({
	jobId,
	fileUrl,
}: {
	jobId: string;
	fileUrl: string;
}): void {
	updateJob({
		jobId,
		patch: {
			status: "done",
			progress: 1,
			finishedAt: Date.now(),
			fileUrl,
		},
	});
}

export function failJob({
	jobId,
	error,
}: {
	jobId: string;
	error: string;
}): void {
	updateJob({
		jobId,
		patch: {
			status: "error",
			finishedAt: Date.now(),
			error,
		},
	});
}
