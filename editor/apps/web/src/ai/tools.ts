import { z } from "zod";

export const OVERLAY_TEMPLATE_IDS = [
	"lower-third",
	"title-card",
	"logo-watermark",
	"subtitle-card",
	"cta-banner",
	"logo-reveal",
	"endcard",
] as const;

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

export const editorListTemplatesSchema = z.object({});

export const editorAddOverlaySchema = z.object({
	template: z
		.enum(OVERLAY_TEMPLATE_IDS)
		.describe(
			"Template id. Use editor.listTemplates to discover the schema (variables + styleVars) for each.",
		),
	vars: z
		.record(z.string(), z.union([z.string(), z.number()]))
		.describe(
			"Template-specific variables (e.g. NAME, TITLE for lower-third). Keys are UPPERCASE.",
		),
	startSeconds: z
		.number()
		.nonnegative()
		.optional()
		.describe(
			"Where to place the overlay on the timeline, in seconds. Defaults to the current playhead position.",
		),
	durationSeconds: z
		.number()
		.positive()
		.optional()
		.describe(
			"How long the overlay is on screen, in seconds. Defaults to the template's recommended duration.",
		),
	styleVars: z
		.record(z.string(), z.string())
		.optional()
		.describe(
			"Optional CSS variable overrides (e.g. {'--primary-color': '#FF0000'}). Discoverable via editor.listTemplates.",
		),
});

export const editorModifyOverlaySchema = z.object({
	overlayId: z
		.string()
		.optional()
		.describe(
			"Element id of the overlay to modify. If omitted, the most recently added overlay is patched.",
		),
	vars: z
		.record(z.string(), z.union([z.string(), z.number()]))
		.optional()
		.describe("Template variable patch (merged into the existing vars)."),
	styleVars: z
		.record(z.string(), z.string())
		.optional()
		.describe("CSS variable patch (merged into the existing styleVars)."),
	durationSeconds: z
		.number()
		.positive()
		.optional()
		.describe("Optional new on-screen duration, in seconds."),
});

export const editorRemoveOverlaySchema = z.object({
	overlayId: z
		.string()
		.optional()
		.describe(
			"Element id of the overlay to remove. If omitted, the most recently added overlay is removed.",
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
	"editor.listTemplates": {
		description:
			"List all available overlay templates with their variables, default duration, and styleVars (CSS-variable overrides). Always call this before editor.addOverlay if you are unsure which template fits the user's request.",
		schema: editorListTemplatesSchema,
	},
	"editor.addOverlay": {
		description:
			"Render an overlay template (e.g. lower-third, title-card, logo-watermark) as a transparent WebM and place it on a fresh overlay track. If startSeconds is omitted, the current playhead position is used. If durationSeconds is omitted, the template's default is used. styleVars (e.g. '--primary-color': '#ff0000') override the template's defaults. Rendering takes a few seconds — do not chain multiple addOverlay calls in parallel; wait for one to complete before issuing the next.",
		schema: editorAddOverlaySchema,
	},
	"editor.modifyOverlay": {
		description:
			"Patch an existing overlay's variables, styleVars, or duration. Triggers a re-render of the overlay's WebM (a few seconds). If overlayId is omitted, the most recently added overlay is patched. Use this for 'change the color to red', 'make it 6 seconds long', 'rename to Hannes Müller' etc.",
		schema: editorModifyOverlaySchema,
	},
	"editor.removeOverlay": {
		description:
			"Remove an overlay from the timeline. If overlayId is omitted, the most recently added overlay is removed.",
		schema: editorRemoveOverlaySchema,
	},
} as const;

export type EditorToolName = keyof typeof editorToolDefinitions;

export const EDITOR_TOOL_NAMES = [
	"editor.getState",
	"editor.cut",
	"editor.trim",
	"editor.addClip",
	"editor.listTemplates",
	"editor.addOverlay",
	"editor.modifyOverlay",
	"editor.removeOverlay",
] as const satisfies readonly EditorToolName[];

export function isEditorToolName(value: string): value is EditorToolName {
	return (EDITOR_TOOL_NAMES as readonly string[]).includes(value);
}
