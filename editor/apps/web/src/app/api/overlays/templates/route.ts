import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
	templatesRoot,
	templatePath,
} from "@/services/overlay-renderer/cache";

export const runtime = "nodejs";

export async function GET() {
	const root = templatesRoot();
	if (!existsSync(root)) {
		return Response.json({ templates: [] });
	}
	const entries = await readdir(root, { withFileTypes: true });
	const templates: unknown[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const paths = templatePath({ template: entry.name });
		if (!existsSync(paths.metaFile)) continue;
		try {
			const raw = await readFile(paths.metaFile, "utf8");
			const meta: unknown = JSON.parse(raw);
			templates.push(meta);
		} catch (err) {
			console.error(
				`[overlay-templates] failed to read ${entry.name}/meta.json`,
				err,
			);
		}
	}

	return Response.json({ templates });
}
