import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { ProviderConfigError, resolveProvider } from "@/ai/provider";
import {
	editorAddClipSchema,
	editorCutSchema,
	editorGetStateSchema,
	editorTrimSchema,
} from "@/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are AIVC DACH, an AI video-editing assistant embedded inside a browser-based editor (OpenCut fork).

You can manipulate the timeline through four tools:
- editor.getState — read the current scene, tracks, clips and playhead. ALWAYS call this before any other tool the first time, and after each mutation that may have invalidated ids.
- editor.cut — split all active clips at a timestamp.
- editor.trim — adjust start/end of one specific clip.
- editor.addClip — insert a media asset onto the timeline.

Speak the language the user writes in. Be concise. When the user issues a command (e.g. "cut at 3 seconds"), perform it directly and report the result in one short sentence — do not ask for confirmation unless the request is ambiguous.

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
		},
	});

	return result.toUIMessageStreamResponse();
}
