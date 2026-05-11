import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { cachedFilePath } from "@/services/overlay-renderer/cache";

export const runtime = "nodejs";

const HEX16 = /^[a-f0-9]{16}$/;

// Next.js route handler signature is positional (req, context). The lint rule
// for prefer-object-params doesn't apply to framework-mandated signatures.
// eslint-disable-next-line opencut/prefer-object-params
export async function GET(
	_req: Request,
	context: { params: Promise<{ hash: string }> },
) {
	const { hash } = await context.params;
	if (!HEX16.test(hash)) {
		return new Response("invalid hash", { status: 400 });
	}

	const filePath = cachedFilePath({ hash });
	if (!existsSync(filePath)) {
		return new Response("not found", { status: 404 });
	}

	const buffer = await readFile(filePath);
	return new Response(buffer, {
		status: 200,
		headers: {
			"content-type": "video/webm",
			"content-length": String(buffer.byteLength),
			"cache-control": "public, max-age=31536000, immutable",
		},
	});
}
