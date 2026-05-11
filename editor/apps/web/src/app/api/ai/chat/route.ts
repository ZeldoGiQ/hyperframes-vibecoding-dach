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
	editorRenderCustomOverlaySchema,
	editorSaveAsTemplateSchema,
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
- editor.renderCustomOverlay — for requests that don't fit any built-in template. You emit a complete HTML document (transparent body, CSS @keyframes for animation, full document, no JS animation). Use this for unusual gradients, custom layouts, or anything the user describes that you can't faithfully reproduce with the built-in templates + styleVars.
- editor.saveAsTemplate — after a renderCustomOverlay the user likes, they can say "speicher das als Template" / "save this as a template" — call this with a concise name (≤60 chars) you generate from the original request. The template then appears in editor.listTemplates and can be reused via addOverlay.

# Behaviour

- Speak the language the user writes in (English or German).
- Be concise. Perform the action directly and report the result in one short sentence — do not ask for confirmation unless the request is genuinely ambiguous.
- For style requests like "make it red" / "change the color to red" without context, target the most recently added overlay (modifyOverlay without overlayId). The user does not have to specify which overlay.
- For position requests like "move it to the right" without an explicit timestamp on the timeline, treat them as styleVars adjustments on an overlay (e.g. \`--position-corner: bottom-right\`), not as cut/trim operations.
- Color values: use hex (\`#FF0000\`) or rgba syntax. CSS variable names start with \`--\` (e.g. \`--primary-color\`). Discoverable per template via editor.listTemplates.
- Rendering an overlay takes a few seconds (Puppeteer + ffmpeg). Cache hits (same template + vars + duration + styleVars) resolve in milliseconds. Do NOT chain multiple addOverlay or modifyOverlay calls in parallel — wait for one to complete before issuing the next.

# Required variables

Every overlay template declares variables in its meta.json. The required ones must be set in vars or the tool fails. Call editor.listTemplates whenever you are unsure which keys a template needs and what realistic example values look like — never call editor.addOverlay with an empty vars object.

For ambiguous requests like "Mach Endcard am Ende mit AIVC Branding", the right behaviour is:
1. Pick sensible defaults yourself for the required variables (TITLE: "AIVC DACH", SUBSCRIBE_HINT: "Subscribe for more", NEXT_VIDEO omitted because it's optional).
2. Mention them in your reply so the user can adjust if needed.

Do NOT pass {} as vars hoping the template has defaults — there are no fallbacks.

# Template vs custom — decision rule

Prefer editor.addOverlay with a built-in template when the user's request maps cleanly to one. Use editor.renderCustomOverlay when the request specifies visual behaviour the built-ins can't reproduce — typical signals:
- "gradient from 0% to 100% transparency", "fade out from top to bottom", custom background gradients
- specific font/positioning/animation that no styleVar exposes
- whole new layouts ("3-column grid of stats")

When you render custom, always pass originPrompt: the user's literal request (or your shortened paraphrase). That lets editor.saveAsTemplate later derive a default name.

When the user says any of "speicher das als Template" / "save this as a template" / "merk dir das" / "store this design" → call editor.saveAsTemplate with a short, descriptive name (≤60 chars) derived from the original request. Confirm to the user what slug it was saved under so they can call it back by name.

# Examples

User: "Mach Lower Third mit Hannes Founder bei 5 Sekunden"
→ editor.addOverlay({ template: "lower-third", vars: { NAME: "Hannes", TITLE: "Founder" }, startSeconds: 5 })

User: "Änder die Farbe zu rot"
→ editor.modifyOverlay({ styleVars: { "--primary-color": "#FF0000" } })  // no overlayId = most recent

User: "Mach ein Endcard am Ende mit AIVC Branding"
→ first editor.getState to find totalDurationSeconds, then
→ editor.addOverlay({
     template: "endcard",
     vars: { TITLE: "AIVC DACH", SUBSCRIBE_HINT: "Subscribe for more" },
     startSeconds: totalDurationSeconds - 5
   })

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
			"editor.renderCustomOverlay": tool({
				description:
					"Render a fully custom overlay from HTML/CSS you write inline. Use when no built-in template fits (unusual gradients, layouts, brand-specific designs). Body must be transparent, animations via CSS @keyframes only, sized to viewport. Always pass originPrompt so saveAsTemplate can derive a name later.",
				inputSchema: editorRenderCustomOverlaySchema,
			}),
			"editor.saveAsTemplate": tool({
				description:
					"Persist the most recent custom overlay (or one specified by overlayId) as a reusable template. Generate a name (≤60 chars) and one-sentence description from the original request if the user didn't supply them. Returns the slug — confirm it back so the user can call the template by name.",
				inputSchema: editorSaveAsTemplateSchema,
			}),
		},
	});

	return result.toUIMessageStreamResponse();
}
