import { z } from "zod";

export const editorGetStateSchema = z.object({});

export const editorCutSchema = z.object({
	timestamp: z
		.number()
		.nonnegative()
		.describe(
			"Cut position in seconds from the start of the timeline. Splits all active (non-muted, non-hidden) clips at this time across video, audio and overlay tracks.",
		),
});

export const editorTrimSchema = z.object({
	clipId: z
		.string()
		.min(1)
		.describe("Element id of the clip to trim. Use editor.getState to discover ids."),
	start: z
		.number()
		.nonnegative()
		.describe("New start time of the clip on the timeline, in seconds."),
	end: z
		.number()
		.positive()
		.describe("New end time of the clip on the timeline, in seconds. Must be greater than start."),
});

export const editorAddClipSchema = z.object({
	mediaId: z
		.string()
		.min(1)
		.describe(
			"Media asset id of the source. Must already be imported into the project (use editor.getState to list available media).",
		),
	timestamp: z
		.number()
		.nonnegative()
		.describe("Insert position on the timeline in seconds."),
	trackId: z
		.string()
		.optional()
		.describe(
			"Optional target track id. If omitted, the clip is placed on the main video track.",
		),
});

export const editorToolDefinitions = {
	"editor.getState": {
		description:
			"Read the current editor state: active scene, tracks (with id, type, name, muted/hidden flags), elements on each track (with id, name, startTime, duration in seconds), playhead time and total duration. Always call this first to discover ids before invoking cut/trim/addClip.",
		schema: editorGetStateSchema,
	},
	"editor.cut": {
		description:
			"Split all active clips at the given timestamp (seconds). Skips muted audio tracks and hidden video/text/graphic/effect tracks. Returns the new clip ids that were created on the right side of the cut.",
		schema: editorCutSchema,
	},
	"editor.trim": {
		description:
			"Adjust the in/out points of a single clip on the timeline. start and end are absolute timeline positions in seconds.",
		schema: editorTrimSchema,
	},
	"editor.addClip": {
		description:
			"Insert a media clip onto the timeline at the given timestamp. The media asset must already be imported.",
		schema: editorAddClipSchema,
	},
} as const;

export type EditorToolName = keyof typeof editorToolDefinitions;

export const EDITOR_TOOL_NAMES = [
	"editor.getState",
	"editor.cut",
	"editor.trim",
	"editor.addClip",
] as const satisfies readonly EditorToolName[];

export function isEditorToolName(value: string): value is EditorToolName {
	return (EDITOR_TOOL_NAMES as readonly string[]).includes(value);
}
