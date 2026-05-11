import { mediaTimeFromSeconds, mediaTimeToSeconds, type MediaTime } from "@/wasm";

export function secondsToMediaTime(seconds: number): MediaTime {
	if (!Number.isFinite(seconds) || seconds < 0) {
		throw new Error(
			`Invalid timestamp: expected a non-negative finite number of seconds, got ${seconds}`,
		);
	}
	return mediaTimeFromSeconds({ seconds });
}

export function mediaTimeToSecondsRounded({
	time,
	digits = 3,
}: {
	time: MediaTime;
	digits?: number;
}): number {
	const seconds = mediaTimeToSeconds({ time });
	const factor = 10 ** digits;
	return Math.round(seconds * factor) / factor;
}
