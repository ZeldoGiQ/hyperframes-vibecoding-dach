export const runtime = "nodejs";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const hashes = url.searchParams.getAll("h");
	if (hashes.length === 0) {
		return new Response("Add ?h=<hash>&h=<hash>… to compare overlays.", {
			status: 400,
		});
	}

	const videos = hashes
		.map(
			(h) =>
				`<div class="cell"><div class="label">${h}</div><video src="/api/overlays/files/${h}" autoplay muted loop playsinline></video></div>`,
		)
		.join("");

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AIVC overlay alpha test</title>
<style>
  body { margin: 0; background: red; color: white; font-family: sans-serif; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 24px; padding: 24px; }
  .cell {
    background: linear-gradient(45deg, #cc0066 0 50%, #00cc66 50% 100%);
    border: 4px solid yellow;
    position: relative;
    aspect-ratio: 9 / 16;
    max-height: 80vh;
    margin: 0 auto;
  }
  .cell video { width: 100%; height: 100%; display: block; object-fit: contain; }
  .label { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.7); padding: 4px 8px; font-family: monospace; font-size: 12px; z-index: 2; }
  h1 { padding: 24px 24px 0; }
  p { padding: 0 24px; max-width: 800px; line-height: 1.5; }
</style>
</head>
<body>
<h1>Alpha test — should see CTA over the pink/green diagonal</h1>
<p>If the overlay is transparent: you see the pink/green gradient with only the CTA-banner on top.<br>
If the overlay is opaque: you see a black rectangle hiding the gradient, only the CTA-banner visible at the bottom.</p>
<div class="grid">${videos}</div>
</body>
</html>`;

	return new Response(html, {
		status: 200,
		headers: { "content-type": "text/html; charset=utf-8" },
	});
}
