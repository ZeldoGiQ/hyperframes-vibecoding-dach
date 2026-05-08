import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { ProviderConfigError, resolveProvider } from "@/ai/provider";
import {
	editorAddClipSchema,
	editorAddOverlaySchema,
	editorCutSchema,
	editorGetStateSchema,
	editorListTemplatesSchema,
	editorModifyOverlaySchema,
	editorRemoveOverlaySchema,
	editorTrimSchema,
} from "@/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are AIVC DACH, an AI video-editing assistant embedded inside a browser-based editor (OpenCut fork).

# Tools

Footage / timeline:
- editor.getState — read the current scene, tracks, clips, overlays and playhead. ALWAYS call this first if you need ids, and again after any mutation that may have invalidated them.
- editor.cut — split all active clips at a timestamp.
- editor.trim — adjust start/end of one specific clip.
- editor.addClip — insert a media asset that is already imported.

Overlays (transparent WebM rendered from /generator/overlays templates):
- editor.listTemplates — see what overlay templates exist and what variables / styleVars each accepts. Call this before addOverlay if you are unsure.
- editor.addOverlay — render and insert an overlay on a fresh overlay track. Defaults: startSeconds = current playhead, durationSeconds = template default.
- editor.modifyOverlay — re-render an overlay with patched vars / styleVars / duration. Without overlayId it operates on the most recently added overlay.
- editor.removeOverlay — delete an overlay from the timeline. Same default-to-most-recent behavior.

# Behaviour

- Speak the language the user writes in (English or German).
- Be concise. Perform the action directly and report the result in one short sentence — do not ask for confirmation unless the request is genuinely ambiguous.
- For style requests like "make it red" / "change the color to red" without context, target the most recently added overlay (modifyOverlay without overlayId). The user does not have to specify which overlay.
- For position requests like "move it to the right" without an explicit timestamp on the timeline, treat them as styleVars adjustments on an overlay (e.g. \`--position-corner: bottom-right\`), not as cut/trim operations.
- Color values: use hex (\`#FF0000\`) or rgba syntax. CSS variable names start with \`--\` (e.g. \`--primary-color\`). Discoverable per template via editor.listTemplates.
- Rendering an overlay takes a few seconds (Puppeteer + ffmpeg). Cache hits (same template + vars + duration + styleVars) resolve in milliseconds. Do NOT chain multiple addOverlay or modifyOverlay calls in parallel — wait for one to complete before issuing the next.

# Examples

User: "Mach Lower Third mit Hannes Founder bei 5 Sekunden"
→ editor.addOverlay({ template: "lower-third", vars: { NAME: "Hannes", TITLE: "Founder" }, startSeconds: 5 })

User: "Änder die Farbe zu rot"
→ editor.modifyOverlay({ styleVars: { "--primary-color": "#FF0000" } })  // no overlayId = most recent

User: "Mach ein Endcard am Ende mit AIVC Branding"
→ first editor.getState to find totalDurationSeconds, then editor.addOverlay({ template: "endcard", vars: {...}, startSeconds: totalDurationSeconds - 5 })

If a tool returns an error, surface it to the user in plain language and suggest the next step.`;

export async function POST(req: Request) {
	let provider;
	try {
		provider = resolveProvider();
	} catch (error) {
		if (error instanceof ProviderConfigError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
		throw error;
	}

	const body: { messages: UIMessage[] } = await req.json();

	const result = streamText({
		model: provider.model,
		system: SYSTEM_PROMPT,
		messages: await convertToModelMessages(body.messages),
		tools: {
			"editor.getState": tool({
				description:
					"Read the current editor state: active scene, tracks (with id, type, name, muted/hidden flags), elements on each track (with id, name, startSeconds, durationSeconds), playhead time and total duration. Always call this first to discover ids before invoking cut/trim/addClip.",
				inputSchema: editorGetStateSchema,
			}),
			"editor.cut": tool({
				description:
					"Split all active clips at the given timestamp (seconds). Skips muted audio tracks and hidden video/text/graphic/effect tracks. Returns the new clip ids that were created on the right side of the cut.",
				inputSchema: editorCutSchema,
			}),
			"editor.trim": tool({
				description:
					"Adjust the in/out points of a single clip on the timeline. start and end are absolute timeline positions in seconds.",
				inputSchema: editorTrimSchema,
			}),
			"editor.addClip": tool({
				description:
					"Insert a media clip onto the timeline at the given timestamp. The media asset must already be imported.",
				inputSchema: editorAddClipSchema,
			}),
			"editor.listTemplates": tool({
				description:
					"List the available overlay templates (lower-third, title-card, logo-watermark, subtitle-card, cta-banner, logo-reveal, endcard) with their variable schemas, default duration and styleVars. Call before editor.addOverlay if unsure which template fits.",
				inputSchema: editorListTemplatesSchema,
			}),
			"editor.addOverlay": tool({
				description:
					"Render an overlay template as a transparent WebM and insert it on a fresh overlay track. Defaults: startSeconds = current playhead, durationSeconds = template's recommended duration. styleVars override CSS variables for color/font/animation tweaks. Rendering takes a few seconds; do NOT chain parallel calls.",
				inputSchema: editorAddOverlaySchema,
			}),
			"editor.modifyOverlay": tool({
				description:
					"Patch an existing overlay's variables, styleVars or duration. Triggers a re-render. If overlayId is omitted, the most recently added overlay is patched — that is the right default for follow-up requests like 'change the color to red' or 'make it 6 seconds'.",
				inputSchema: editorModifyOverlaySchema,
			}),
			"editor.removeOverlay": tool({
				description:
					"Remove an overlay from the timeline. If overlayId is omitted, the most recently added overlay is removed.",
				inputSchema: editorRemoveOverlaySchema,
			}),
		},
	});

	return result.toUIMessageStreamResponse();
}
