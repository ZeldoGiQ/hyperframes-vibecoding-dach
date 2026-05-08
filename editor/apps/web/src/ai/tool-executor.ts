import { EditorCore } from "@/core";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import type { TimelineTrack } from "@/timeline/types";
import { mediaTimeFromSeconds, type MediaTime } from "@/wasm";
import { findElementsAtTime } from "./selection-resolver";
import {
	mediaTimeToSecondsRounded,
	secondsToMediaTime,
} from "./time-utils";
import {
	editorAddClipSchema,
	editorCutSchema,
	editorGetStateSchema,
	editorTrimSchema,
	isEditorToolName,
} from "./tools";

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

export function executeEditorTool({
	toolName,
	args,
}: ToolCallInput): ToolCallResult {
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
	}
}
