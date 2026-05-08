import type {
	SceneTracks,
	TimelineElement,
	TimelineTrack,
} from "@/timeline/types";
import type { MediaTime } from "@/wasm";

export type ElementRef = { trackId: string; elementId: string };

function isTrackEligible(track: TimelineTrack): boolean {
	switch (track.type) {
		case "audio":
			return !track.muted;
		case "video":
		case "text":
		case "graphic":
		case "effect":
			return !track.hidden;
		default:
			return true;
	}
}

function elementContainsTime({
	element,
	time,
}: {
	element: TimelineElement;
	time: MediaTime;
}): boolean {
	const start = element.startTime;
	const end = element.startTime + element.duration;
	return time > start && time < end;
}

export function findElementsAtTime({
	tracks,
	time,
}: {
	tracks: SceneTracks;
	time: MediaTime;
}): ElementRef[] {
	const candidates: TimelineTrack[] = [
		tracks.main,
		...tracks.overlay,
		...tracks.audio,
	];

	const result: ElementRef[] = [];
	for (const track of candidates) {
		if (!isTrackEligible(track)) continue;
		for (const element of track.elements) {
			if (elementContainsTime({ element, time })) {
				result.push({ trackId: track.id, elementId: element.id });
			}
		}
	}
	return result;
}
