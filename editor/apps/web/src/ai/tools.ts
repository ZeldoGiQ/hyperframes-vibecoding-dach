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

export const editorRenderCustomOverlaySchema = z.object({
	html: z
		.string()
		.min(1)
		.describe(
			"Complete HTML document (<!DOCTYPE html>…</html>) that the renderer will Puppeteer into a transparent WebM. CSS animations are paused and stepped per frame at 30fps, so use plain @keyframes and avoid setTimeout/JS animation. The body MUST have `background: transparent` and the layout MUST be sized to 100vw/100vh (or use width/height variables) so the overlay matches the project canvas. External resources allowed (Google Fonts, public CDNs); avoid private URLs.",
		),
	durationSeconds: z
		.number()
		.positive()
		.describe("How long the overlay is on screen, in seconds."),
	startSeconds: z
		.number()
		.nonnegative()
		.optional()
		.describe("Insert position on the timeline, in seconds. Defaults to the current playhead position."),
	originPrompt: z
		.string()
		.optional()
		.describe(
			"The user's original request that produced this design. Stored alongside the overlay so editor.saveAsTemplate can derive a sensible default name later.",
		),
});

export const editorSaveAsTemplateSchema = z.object({
	overlayId: z
		.string()
		.optional()
		.describe(
			"Element id of the custom overlay to persist. If omitted, the most recently rendered custom overlay is used.",
		),
	name: z
		.string()
		.max(60)
		.optional()
		.describe(
			"Short human-readable template name (≤60 chars). Generate one from the user's original request if not provided — e.g. \"AIVC gradient endcard\".",
		),
	description: z
		.string()
		.max(200)
		.optional()
		.describe(
			"One-sentence description of what the template does. Generate from context if not provided.",
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
	"editor.renderCustomOverlay": {
		description:
			"Render a fully custom overlay from HTML/CSS that you write inline. Use this when no built-in template fits the user's request (e.g. unusual gradients, layouts, brand-specific designs). Pass complete HTML with transparent body, CSS @keyframes for animation, and sensible defaults baked in. The renderer matches the project canvas automatically (9:16, 16:9, custom) — your CSS should adapt to viewport size (use 100vw/100vh, flex, vmin etc.). Heavier than addOverlay because the model emits the full document each call — prefer addOverlay when an existing template fits.",
		schema: editorRenderCustomOverlaySchema,
	},
	"editor.saveAsTemplate": {
		description:
			"Persist the most recent custom overlay (or one specified by overlayId) as a reusable template under /generator/overlays/<slug>/. Generate a concise name (≤60 chars) and one-sentence description if the user didn't supply them — derive them from the original request. After saving, the template appears in editor.listTemplates and can be invoked via editor.addOverlay like the built-ins.",
		schema: editorSaveAsTemplateSchema,
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
	"editor.renderCustomOverlay",
	"editor.saveAsTemplate",
] as const satisfies readonly EditorToolName[];

export function isEditorToolName(value: string): value is EditorToolName {
	return (EDITOR_TOOL_NAMES as readonly string[]).includes(value);
}
