import { getJob } from "@/services/overlay-renderer";

export const runtime = "nodejs";

// Next.js route handler signature is positional (req, context).
// eslint-disable-next-line opencut/prefer-object-params
export async function GET(
	_req: Request,
	context: { params: Promise<{ jobId: string }> },
) {
	const { jobId } = await context.params;
	const job = getJob({ jobId });
	if (!job) {
		return Response.json({ error: "job not found" }, { status: 404 });
	}
	return Response.json(job);
}
