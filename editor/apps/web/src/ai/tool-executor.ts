import { EditorCore } from "@/core";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import type { TimelineTrack } from "@/timeline/types";
import {
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
} from "@/commands";
import { mediaTimeFromSeconds, type MediaTime } from "@/wasm";
import { findElementsAtTime } from "./selection-resolver";
import {
	mediaTimeToSecondsRounded,
	secondsToMediaTime,
} from "./time-utils";
import {
	editorAddClipSchema,
	editorAddOverlaySchema,
	editorCutSchema,
	editorGetStateSchema,
	editorListTemplatesSchema,
	editorModifyOverlaySchema,
	editorRemoveOverlaySchema,
	editorRenderCustomOverlaySchema,
	editorSaveAsTemplateSchema,
	editorTrimSchema,
	isEditorToolName,
} from "./tools";
import {
	getMostRecentOverlay,
	listOverlays,
	registerOverlay,
	resolveOverlay,
	unregisterOverlay,
	type OverlayRegistryEntry,
} from "./overlay-registry";

export interface ToolCallInput {
	toolName: string;
	args: unknown;
}

export interface ToolCallSuccess {
	ok: true;
	result: unknown;
}

export interface ToolCallFailure {
	ok: false;
	error: string;
}

export type ToolCallResult = ToolCallSuccess | ToolCallFailure;

function fail(error: string): ToolCallFailure {
	return { ok: false, error };
}

function succeed(result: unknown): ToolCallSuccess {
	return { ok: true, result };
}

function getStateImpl(): ToolCallResult {
	const editor = EditorCore.getInstance();
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) {
		return fail("No active scene. Open or create a project first.");
	}

	const playhead = mediaTimeToSecondsRounded({
		time: editor.playback.getCurrentTime(),
	});
	const totalDuration = mediaTimeToSecondsRounded({
		time: editor.timeline.getTotalDuration(),
	});

	const serializeTrack = (track: TimelineTrack) => ({
		id: track.id,
		type: track.type,
		name: track.name,
		muted: "muted" in track ? track.muted : false,
		hidden: "hidden" in track ? track.hidden : false,
		elements: track.elements.map((element) => ({
			id: element.id,
			name: element.name,
			startSeconds: mediaTimeToSecondsRounded({ time: element.startTime }),
			durationSeconds: mediaTimeToSecondsRounded({ time: element.duration }),
		})),
	});

	const media = editor.media.getAssets().map((asset) => ({
		id: asset.id,
		type: asset.type,
		name: asset.name,
		durationSeconds:
			asset.duration != null
				? Math.round(asset.duration * 1000) / 1000
				: null,
	}));

	return succeed({
		scene: { id: scene.id, name: scene.name },
		playheadSeconds: playhead,
		totalDurationSeconds: totalDuration,
		tracks: {
			main: serializeTrack(scene.tracks.main),
			overlay: scene.tracks.overlay.map(serializeTrack),
			audio: scene.tracks.audio.map(serializeTrack),
		},
		media,
	});
}

function cutImpl(args: unknown): ToolCallResult {
	const parsed = editorCutSchema.safeParse(args);
	if (!parsed.success) {
		return fail(`Invalid arguments for editor.cut: ${parsed.error.message}`);
	}
	const editor = EditorCore.getInstance();
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) {
		return fail("No active scene. Open or create a project first.");
	}

	let splitTime: MediaTime;
	try {
		splitTime = secondsToMediaTime(parsed.data.timestamp);
	} catch (error) {
		return fail(error instanceof Error ? error.message : String(error));
	}

	const elements = findElementsAtTime({
		tracks: scene.tracks,
		time: splitTime,
	});
	if (elements.length === 0) {
		return fail(
			`No active clip at ${parsed.data.timestamp}s — playhead range or muted/hidden tracks were skipped.`,
		);
	}

	const newRightSideElements = editor.timeline.splitElements({
		elements,
		splitTime,
	});

	return succeed({
		splitAtSeconds: parsed.data.timestamp,
		clipsCut: elements.length,
		newClipIds: newRightSideElements.map((ref) => ref.elementId),
	});
}

function trimImpl(args: unknown): ToolCallResult {
	const parsed = editorTrimSchema.safeParse(args);
	if (!parsed.success) {
		return fail(`Invalid arguments for editor.trim: ${parsed.error.message}`);
	}
	const { clipId, start, end } = parsed.data;
	if (end <= start) {
		return fail(`'end' (${end}s) must be greater than 'start' (${start}s).`);
	}

	const editor = EditorCore.getInstance();
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) {
		return fail("No active scene. Open or create a project first.");
	}

	const allTracks = [
		scene.tracks.main,
		...scene.tracks.overlay,
		...scene.tracks.audio,
	];
	let foundElement: { trackId: string; elementId: string } | null = null;
	for (const track of allTracks) {
		const hit = track.elements.find((element) => element.id === clipId);
		if (hit) {
			foundElement = { trackId: track.id, elementId: hit.id };
			break;
		}
	}
	if (!foundElement) {
		return fail(
			`Clip ${clipId} not found. Use editor.getState to discover valid clip ids.`,
		);
	}

	const newStartTime = mediaTimeFromSeconds({ seconds: start });
	const newDuration = mediaTimeFromSeconds({ seconds: end - start });

	editor.timeline.updateElements({
		updates: [
			{
				trackId: foundElement.trackId,
				elementId: foundElement.elementId,
				patch: {
					startTime: newStartTime,
					duration: newDuration,
				},
			},
		],
	});

	return succeed({
		clipId,
		newStartSeconds: start,
		newEndSeconds: end,
		newDurationSeconds: Math.round((end - start) * 1000) / 1000,
	});
}

function addClipImpl(args: unknown): ToolCallResult {
	const parsed = editorAddClipSchema.safeParse(args);
	if (!parsed.success) {
		return fail(`Invalid arguments for editor.addClip: ${parsed.error.message}`);
	}
	const { mediaId, timestamp, trackId } = parsed.data;
	const editor = EditorCore.getInstance();
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) {
		return fail("No active scene. Open or create a project first.");
	}

	const asset = editor.media.getAssets().find((a) => a.id === mediaId);
	if (!asset) {
		return fail(
			`Media asset ${mediaId} not found. Use editor.getState to list available media ids.`,
		);
	}

	const startTime = mediaTimeFromSeconds({ seconds: timestamp });
	const duration =
		asset.duration != null
			? mediaTimeFromSeconds({ seconds: asset.duration })
			: DEFAULT_NEW_ELEMENT_DURATION;

	const element = buildElementFromMedia({
		mediaId: asset.id,
		mediaType: asset.type,
		name: asset.name,
		duration,
		startTime,
	});

	editor.timeline.insertElement({
		element,
		placement: trackId
			? { mode: "explicit", trackId }
			: { mode: "auto" },
	});

	return succeed({
		mediaId,
		timestamp,
		assetName: asset.name,
		assetType: asset.type,
	});
}

// --- Overlay tools (async) ----------------------------------------------

const RENDER_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 400;

interface RenderJobResult {
	jobId: string;
	hash: string;
	fileUrl: string;
	cached: boolean;
	durationMs: number;
}

interface JobStatePayload {
	id: string;
	status: "queued" | "running" | "done" | "error";
	progress: number;
	hash: string;
	fileUrl?: string;
	error?: string;
	startedAt: number;
	finishedAt?: number;
}

async function renderOverlayJob({
	template,
	html,
	vars,
	durationSeconds,
	styleVars,
	width,
	height,
}: {
	template?: string;
	html?: string;
	vars: Record<string, string | number>;
	durationSeconds: number;
	styleVars: Record<string, string>;
	width: number;
	height: number;
}): Promise<RenderJobResult> {
	const t0 = performance.now();
	const startResp = await fetch("/api/overlays/render", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			...(template ? { template } : { html }),
			vars,
			durationSeconds,
			styleVars,
			width,
			height,
		}),
	});
	if (!startResp.ok) {
		const errorBody: unknown = await startResp.json().catch(() => null);
		let errMsg = `render endpoint returned ${startResp.status}`;
		if (
			errorBody &&
			typeof errorBody === "object" &&
			"error" in errorBody
		) {
			const errVal = (errorBody as { error?: unknown }).error;
			if (typeof errVal === "string") errMsg = errVal;
		}
		throw new Error(errMsg);
	}
	const startBody: { jobId: string; hash: string } = await startResp.json();
	const { jobId, hash } = startBody;

	const deadline = Date.now() + RENDER_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const stateResp = await fetch(`/api/overlays/jobs/${jobId}`);
		if (!stateResp.ok) {
			throw new Error(`job lookup failed (${stateResp.status})`);
		}
		const state: JobStatePayload = await stateResp.json();
		if (state.status === "done" && state.fileUrl) {
			const durationMs = performance.now() - t0;
			return {
				jobId,
				hash,
				fileUrl: state.fileUrl,
				cached: durationMs < 500, // cache hits resolve in ~1ms
				durationMs,
			};
		}
		if (state.status === "error") {
			throw new Error(state.error ?? "render failed");
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
	throw new Error(`render timed out after ${RENDER_TIMEOUT_MS}ms`);
}

async function fileFromUrl({
	url,
	name,
}: {
	url: string;
	name: string;
}): Promise<File> {
	const resp = await fetch(url);
	if (!resp.ok) {
		throw new Error(`failed to fetch overlay file (${resp.status})`);
	}
	const blob = await resp.blob();
	return new File([blob], name, { type: "video/webm" });
}

async function listTemplatesImpl(): Promise<ToolCallResult> {
	const resp = await fetch("/api/overlays/templates");
	if (!resp.ok) {
		return fail(`templates endpoint returned ${resp.status}`);
	}
	const data: unknown = await resp.json();
	return succeed(data);
}

async function addOverlayImpl(args: unknown): Promise<ToolCallResult> {
	const parsed = editorAddOverlaySchema.safeParse(args);
	if (!parsed.success) {
		return fail(`Invalid arguments for editor.addOverlay: ${parsed.error.message}`);
	}
	const editor = EditorCore.getInstance();
	const project = editor.project.getActive();
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return fail("No active scene. Open or create a project first.");

	const playheadSeconds = mediaTimeToSecondsRounded({
		time: editor.playback.getCurrentTime(),
	});
	const startSeconds = parsed.data.startSeconds ?? playheadSeconds;
	const styleVars = parsed.data.styleVars ?? {};

	// Load template meta to validate required vars and fall back to the
	// recommended duration.
	const tmplResp = await fetch("/api/overlays/templates");
	if (!tmplResp.ok) {
		return fail(`could not load template list (${tmplResp.status})`);
	}
	const tmplData: {
		templates: Array<{
			id: string;
			duration: number;
			name: string;
			variables: Array<{
				key: string;
				required: boolean;
				example?: string | number;
				maxLength?: number;
			}>;
		}>;
	} = await tmplResp.json();
	const meta = tmplData.templates.find(
		(t) => t.id === parsed.data.template,
	);
	if (!meta) {
		return fail(`template "${parsed.data.template}" not found`);
	}

	// Enforce required vars. Small LLMs (Gemini Flash Lite, GPT-4o-mini) often
	// omit them on vague requests like "make an endcard with AIVC branding".
	// A loud error here causes the assistant to retry with the missing field.
	const missing: string[] = [];
	for (const v of meta.variables) {
		if (!v.required) continue;
		const provided = parsed.data.vars[v.key];
		if (provided === undefined || provided === null || provided === "") {
			missing.push(
				v.example
					? `${v.key} (example: "${String(v.example)}")`
					: v.key,
			);
		}
	}
	if (missing.length > 0) {
		return fail(
			`Template "${parsed.data.template}" requires these variables — please re-call editor.addOverlay with them set: ${missing.join(", ")}.`,
		);
	}

	const durationSeconds =
		parsed.data.durationSeconds ?? meta.duration;

	// Match the overlay to the project canvas so 9:16 projects don't get a
	// 16:9 stripe; OpenCut composites both at the project resolution.
	const canvasSize = project.settings.canvasSize;
	const renderWidth = canvasSize?.width ?? 1920;
	const renderHeight = canvasSize?.height ?? 1080;

	let render: RenderJobResult;
	try {
		render = await renderOverlayJob({
			template: parsed.data.template,
			vars: parsed.data.vars,
			durationSeconds,
			styleVars,
			width: renderWidth,
			height: renderHeight,
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : String(err));
	}

	const file = await fileFromUrl({
		url: render.fileUrl,
		name: `${parsed.data.template}-${render.hash}.webm`,
	});
	const asset = await editor.media.addMediaAsset({
		projectId: project.metadata.id,
		asset: {
			file,
			name: meta.name,
			type: "video",
			duration: durationSeconds,
			width: renderWidth,
			height: renderHeight,
			hasAudio: false,
		},
	});
	if (!asset) {
		return fail("failed to register overlay media asset");
	}

	const startTime = mediaTimeFromSeconds({ seconds: startSeconds });
	const duration = mediaTimeFromSeconds({ seconds: durationSeconds });
	const element = buildElementFromMedia({
		mediaId: asset.id,
		mediaType: "video",
		name: meta.name,
		duration,
		startTime,
	});

	// Add a fresh overlay track and insert the element in ONE batch.
	// Splitting them runs CommandManager's pruning reactor between the two
	// steps, which removes the empty overlay track we just created (overlay
	// tracks with zero elements get filtered) — then InsertElement fails
	// with "Track not found". Batching makes the reactor see the populated
	// state at commit time.
	const addTrackCmd = new AddTrackCommand({ type: "video" });
	const trackId = addTrackCmd.getTrackId();
	const insertCmd = new InsertElementCommand({
		element,
		placement: { mode: "explicit", trackId },
	});
	editor.command.execute({
		command: new BatchCommand([addTrackCmd, insertCmd]),
	});

	// Find the freshly-inserted element id so we can register it.
	const refreshedScene = editor.scenes.getActiveScene();
	const refreshedTrack = refreshedScene.tracks.overlay.find(
		(t) => t.id === trackId,
	);
	const insertedId = refreshedTrack?.elements[0]?.id;
	if (!insertedId) {
		return fail("inserted overlay element could not be located");
	}

	const stringVars: Record<string, string> = {};
	for (const [k, v] of Object.entries(parsed.data.vars)) {
		stringVars[k] = String(v);
	}
	const entry: OverlayRegistryEntry = {
		elementId: insertedId,
		trackId,
		template: parsed.data.template,
		vars: stringVars,
		styleVars,
		durationSeconds,
		mediaId: asset.id,
		createdAt: Date.now(),
	};
	registerOverlay(entry);

	return succeed({
		overlayId: insertedId,
		template: parsed.data.template,
		startSeconds,
		durationSeconds,
		cached: render.cached,
		renderMs: Math.round(render.durationMs),
		trackId,
	});
}

async function modifyOverlayImpl(args: unknown): Promise<ToolCallResult> {
	const parsed = editorModifyOverlaySchema.safeParse(args);
	if (!parsed.success) {
		return fail(
			`Invalid arguments for editor.modifyOverlay: ${parsed.error.message}`,
		);
	}
	const existing = resolveOverlay({ overlayId: parsed.data.overlayId });
	if (!existing) {
		return fail(
			parsed.data.overlayId
				? `overlay ${parsed.data.overlayId} not found`
				: "no overlays on the timeline yet — add one first with editor.addOverlay",
		);
	}

	const editor = EditorCore.getInstance();
	const project = editor.project.getActive();

	const newVars: Record<string, string> = { ...existing.vars };
	if (parsed.data.vars) {
		for (const [k, v] of Object.entries(parsed.data.vars)) {
			newVars[k] = String(v);
		}
	}
	const newStyleVars: Record<string, string> = {
		...existing.styleVars,
		...(parsed.data.styleVars ?? {}),
	};
	const newDuration =
		parsed.data.durationSeconds ?? existing.durationSeconds;

	const canvasSize = project.settings.canvasSize;
	const renderWidth = canvasSize?.width ?? 1920;
	const renderHeight = canvasSize?.height ?? 1080;

	let render: RenderJobResult;
	try {
		render =
			existing.template === "custom"
				? await renderOverlayJob({
						html: existing.customHtml,
						vars: newVars,
						durationSeconds: newDuration,
						styleVars: newStyleVars,
						width: renderWidth,
						height: renderHeight,
					})
				: await renderOverlayJob({
						template: existing.template,
						vars: newVars,
						durationSeconds: newDuration,
						styleVars: newStyleVars,
						width: renderWidth,
						height: renderHeight,
					});
	} catch (err) {
		return fail(err instanceof Error ? err.message : String(err));
	}

	const file = await fileFromUrl({
		url: render.fileUrl,
		name: `${existing.template}-${render.hash}.webm`,
	});
	const asset = await editor.media.addMediaAsset({
		projectId: project.metadata.id,
		asset: {
			file,
			name: existing.template,
			type: "video",
			duration: newDuration,
			width: renderWidth,
			height: renderHeight,
			hasAudio: false,
		},
	});
	if (!asset) {
		return fail("failed to register re-rendered overlay media asset");
	}

	const newDurationMt = mediaTimeFromSeconds({ seconds: newDuration });
	editor.timeline.updateElements({
		updates: [
			{
				trackId: existing.trackId,
				elementId: existing.elementId,
				patch: {
					mediaId: asset.id,
					duration: newDurationMt,
				},
			},
		],
	});

	registerOverlay({
		...existing,
		vars: newVars,
		styleVars: newStyleVars,
		durationSeconds: newDuration,
		mediaId: asset.id,
	});

	return succeed({
		overlayId: existing.elementId,
		template: existing.template,
		patchedVars: parsed.data.vars ?? null,
		patchedStyleVars: parsed.data.styleVars ?? null,
		durationSeconds: newDuration,
		cached: render.cached,
		renderMs: Math.round(render.durationMs),
	});
}

async function renderCustomOverlayImpl(args: unknown): Promise<ToolCallResult> {
	const parsed = editorRenderCustomOverlaySchema.safeParse(args);
	if (!parsed.success) {
		return fail(
			`Invalid arguments for editor.renderCustomOverlay: ${parsed.error.message}`,
		);
	}
	const editor = EditorCore.getInstance();
	const project = editor.project.getActive();
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) return fail("No active scene. Open or create a project first.");

	const canvasSize = project.settings.canvasSize;
	const renderWidth = canvasSize?.width ?? 1920;
	const renderHeight = canvasSize?.height ?? 1080;
	const playheadSeconds = mediaTimeToSecondsRounded({
		time: editor.playback.getCurrentTime(),
	});
	const startSeconds = parsed.data.startSeconds ?? playheadSeconds;

	let render: RenderJobResult;
	try {
		render = await renderOverlayJob({
			html: parsed.data.html,
			vars: {},
			durationSeconds: parsed.data.durationSeconds,
			styleVars: {},
			width: renderWidth,
			height: renderHeight,
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : String(err));
	}

	const file = await fileFromUrl({
		url: render.fileUrl,
		name: `custom-${render.hash}.webm`,
	});
	const asset = await editor.media.addMediaAsset({
		projectId: project.metadata.id,
		asset: {
			file,
			name: parsed.data.originPrompt ?? "Custom Overlay",
			type: "video",
			duration: parsed.data.durationSeconds,
			width: renderWidth,
			height: renderHeight,
			hasAudio: false,
		},
	});
	if (!asset) {
		return fail("failed to register custom overlay media asset");
	}

	const startTime = mediaTimeFromSeconds({ seconds: startSeconds });
	const duration = mediaTimeFromSeconds({
		seconds: parsed.data.durationSeconds,
	});
	const element = buildElementFromMedia({
		mediaId: asset.id,
		mediaType: "video",
		name: parsed.data.originPrompt ?? "Custom Overlay",
		duration,
		startTime,
	});

	const addTrackCmd = new AddTrackCommand({ type: "video" });
	const trackId = addTrackCmd.getTrackId();
	const insertCmd = new InsertElementCommand({
		element,
		placement: { mode: "explicit", trackId },
	});
	editor.command.execute({
		command: new BatchCommand([addTrackCmd, insertCmd]),
	});

	const refreshedScene = editor.scenes.getActiveScene();
	const refreshedTrack = refreshedScene.tracks.overlay.find(
		(t) => t.id === trackId,
	);
	const insertedId = refreshedTrack?.elements[0]?.id;
	if (!insertedId) {
		return fail("inserted custom overlay element could not be located");
	}

	registerOverlay({
		elementId: insertedId,
		trackId,
		template: "custom",
		customHtml: parsed.data.html,
		originPrompt: parsed.data.originPrompt,
		vars: {},
		styleVars: {},
		durationSeconds: parsed.data.durationSeconds,
		mediaId: asset.id,
		createdAt: Date.now(),
	});

	return succeed({
		overlayId: insertedId,
		template: "custom",
		startSeconds,
		durationSeconds: parsed.data.durationSeconds,
		cached: render.cached,
		renderMs: Math.round(render.durationMs),
		trackId,
	});
}

async function saveAsTemplateImpl(args: unknown): Promise<ToolCallResult> {
	const parsed = editorSaveAsTemplateSchema.safeParse(args);
	if (!parsed.success) {
		return fail(
			`Invalid arguments for editor.saveAsTemplate: ${parsed.error.message}`,
		);
	}
	const existing = resolveOverlay({ overlayId: parsed.data.overlayId });
	if (!existing) {
		return fail(
			parsed.data.overlayId
				? `overlay ${parsed.data.overlayId} not found`
				: "no overlays on the timeline yet — render one with editor.renderCustomOverlay first",
		);
	}
	if (existing.template !== "custom" || !existing.customHtml) {
		return fail(
			"only custom overlays (rendered via editor.renderCustomOverlay) can be saved as templates — built-in templates are already persisted",
		);
	}

	const fallbackName =
		existing.originPrompt
			? existing.originPrompt.slice(0, 60)
			: `Custom overlay ${new Date().toISOString().slice(0, 10)}`;
	const name = parsed.data.name?.slice(0, 60) ?? fallbackName;

	const resp = await fetch("/api/overlays/save-template", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			name,
			description: parsed.data.description,
			html: existing.customHtml,
			durationSeconds: existing.durationSeconds,
			originPrompt: existing.originPrompt,
		}),
	});
	if (!resp.ok) {
		const body: unknown = await resp.json().catch(() => null);
		let msg = `save-template endpoint returned ${resp.status}`;
		if (body && typeof body === "object" && "error" in body) {
			const errVal = (body as { error?: unknown }).error;
			if (typeof errVal === "string") msg = errVal;
		}
		return fail(msg);
	}
	const saved: { slug: string; name: string; path: string } = await resp.json();

	return succeed({
		slug: saved.slug,
		name: saved.name,
		path: saved.path,
		note: "Template saved. Use editor.listTemplates to confirm, then editor.addOverlay({ template: slug, vars: {} }) to reuse.",
	});
}

async function removeOverlayImpl(args: unknown): Promise<ToolCallResult> {
	const parsed = editorRemoveOverlaySchema.safeParse(args);
	if (!parsed.success) {
		return fail(
			`Invalid arguments for editor.removeOverlay: ${parsed.error.message}`,
		);
	}
	const existing = resolveOverlay({ overlayId: parsed.data.overlayId });
	if (!existing) {
		return fail("no overlays on the timeline yet");
	}
	const editor = EditorCore.getInstance();
	editor.timeline.deleteElements({
		elements: [
			{ trackId: existing.trackId, elementId: existing.elementId },
		],
	});
	unregisterOverlay({ elementId: existing.elementId });
	return succeed({
		removedOverlayId: existing.elementId,
		template: existing.template,
	});
}

// --- Public dispatcher --------------------------------------------------

export async function executeEditorTool({
	toolName,
	args,
}: ToolCallInput): Promise<ToolCallResult> {
	if (!isEditorToolName(toolName)) {
		return fail(`Unknown tool: ${toolName}`);
	}
	switch (toolName) {
		case "editor.getState":
			editorGetStateSchema.parse(args ?? {});
			return getStateImpl();
		case "editor.cut":
			return cutImpl(args);
		case "editor.trim":
			return trimImpl(args);
		case "editor.addClip":
			return addClipImpl(args);
		case "editor.listTemplates":
			editorListTemplatesSchema.parse(args ?? {});
			return listTemplatesImpl();
		case "editor.addOverlay":
			return addOverlayImpl(args);
		case "editor.modifyOverlay":
			return modifyOverlayImpl(args);
		case "editor.removeOverlay":
			return removeOverlayImpl(args);
		case "editor.renderCustomOverlay":
			return renderCustomOverlayImpl(args);
		case "editor.saveAsTemplate":
			return saveAsTemplateImpl(args);
	}
}

export function debugListOverlays(): OverlayRegistryEntry[] {
	return listOverlays();
}

export function debugMostRecentOverlay(): OverlayRegistryEntry | undefined {
	return getMostRecentOverlay();
}
