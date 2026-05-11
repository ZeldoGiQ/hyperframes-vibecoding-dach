import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { templatesRoot } from "@/services/overlay-renderer/cache";

export const runtime = "nodejs";

const requestSchema = z.object({
	name: z.string().min(1).max(60),
	description: z.string().max(200).optional(),
	html: z.string().min(1),
	durationSeconds: z.number().positive(),
	originPrompt: z.string().max(500).optional(),
});

function slugify({ name }: { name: string }): string {
	return name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

function findFreeSlug({ base }: { base: string }): string {
	const root = templatesRoot();
	if (!existsSync(join(root, base))) return base;
	for (let i = 2; i < 1000; i++) {
		const candidate = `${base}-${i}`;
		if (!existsSync(join(root, candidate))) return candidate;
	}
	throw new Error(`Could not find a free slug derived from "${base}"`);
}

export async function POST(req: Request) {
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: "invalid JSON body" }, { status: 400 });
	}

	const parsed = requestSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: parsed.error.message }, { status: 400 });
	}
	const { name, description, html, durationSeconds, originPrompt } =
		parsed.data;

	const baseSlug = slugify({ name }) || "custom-template";
	const slug = findFreeSlug({ base: baseSlug });

	const root = templatesRoot();
	const dir = join(root, slug);
	await mkdir(dir, { recursive: true });

	const meta = {
		id: slug,
		name,
		type: "overlay" as const,
		duration: durationSeconds,
		aspectRatio: "16:9",
		transparent: true,
		description:
			description ??
			(originPrompt
				? `Saved from chat: "${originPrompt.slice(0, 160)}"`
				: "User-saved overlay template."),
		variables: [],
		styleVars: [],
	};

	await writeFile(
		join(dir, "meta.json"),
		`${JSON.stringify(meta, null, 2)}\n`,
		"utf8",
	);
	await writeFile(join(dir, "template.html"), html, "utf8");

	return Response.json({
		ok: true,
		slug,
		name,
		path: dir,
	});
}
