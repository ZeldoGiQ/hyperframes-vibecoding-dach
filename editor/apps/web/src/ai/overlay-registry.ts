/**
 * Tracks AI-generated overlays so modify/remove tools can find them later.
 * Pinned on globalThis so it survives Next.js dev module isolation, just like
 * the overlay job-store on the server side.
 */

export interface OverlayRegistryEntry {
	elementId: string;
	trackId: string;
	template: string;
	vars: Record<string, string>;
	styleVars: Record<string, string>;
	durationSeconds: number;
	mediaId: string;
	createdAt: number;
}

const REGISTRY_KEY = "__aivc_overlay_registry__";
type GlobalReg = typeof globalThis & {
	[REGISTRY_KEY]?: Map<string, OverlayRegistryEntry>;
};
const globalReg = globalThis as GlobalReg;
const registry: Map<string, OverlayRegistryEntry> =
	globalReg[REGISTRY_KEY] ?? new Map();
globalReg[REGISTRY_KEY] = registry;

export function registerOverlay(entry: OverlayRegistryEntry): void {
	registry.set(entry.elementId, entry);
}

export function unregisterOverlay({ elementId }: { elementId: string }): void {
	registry.delete(elementId);
}

export function getOverlayById({
	elementId,
}: {
	elementId: string;
}): OverlayRegistryEntry | undefined {
	return registry.get(elementId);
}

export function getMostRecentOverlay(): OverlayRegistryEntry | undefined {
	let last: OverlayRegistryEntry | undefined;
	for (const entry of registry.values()) {
		last = entry;
	}
	return last;
}

export function listOverlays(): OverlayRegistryEntry[] {
	return Array.from(registry.values());
}

export function resolveOverlay({
	overlayId,
}: {
	overlayId?: string;
}): OverlayRegistryEntry | undefined {
	if (overlayId) {
		return getOverlayById({ elementId: overlayId });
	}
	return getMostRecentOverlay();
}
