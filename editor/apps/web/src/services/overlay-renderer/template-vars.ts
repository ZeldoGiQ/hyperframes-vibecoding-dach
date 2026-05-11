/**
 * Mirrors the variable-substitution convention of /generator/renderer/render.js
 * so overlay templates use the same `{{VAR}}` and `{{#if VAR}}…{{/if}}` syntax.
 */

export type TemplateVars = Record<string, string | number | null | undefined>;

const IF_BLOCK = /\{\{#if ([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
const VAR_TOKEN = /\{\{([A-Z0-9_]+)\}\}/g;

function normalize({ vars }: { vars: TemplateVars }): Record<string, string> {
	const map: Record<string, string> = {};
	for (const [key, value] of Object.entries(vars)) {
		map[key] = value == null ? "" : String(value);
	}
	return map;
}

export function applyTemplateVars({
	html,
	vars,
}: {
	html: string;
	vars: TemplateVars;
}): string {
	const map = normalize({ vars });

	const ifResolved = html.replace(IF_BLOCK, (_full, key, body) => {
		return map[key] ? body : "";
	});

	return ifResolved.replace(VAR_TOKEN, (full, key) => {
		if (Object.prototype.hasOwnProperty.call(map, key)) {
			return map[key];
		}
		return full;
	});
}
