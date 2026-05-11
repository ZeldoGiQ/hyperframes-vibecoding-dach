import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import ffmpegPath from "ffmpeg-static";

function resolveFfmpegBinary(): string {
	// Under Bun, ffmpeg-static returns a virtual `\ROOT\node_modules\.bun\...`
	// path that node:child_process.spawn cannot resolve. Fall back to the
	// real on-disk path inside node_modules/ffmpeg-static/.
	if (ffmpegPath && existsSync(ffmpegPath)) {
		return ffmpegPath;
	}
	const exeName = platform() === "win32" ? "ffmpeg.exe" : "ffmpeg";
	const fallback = join(
		process.cwd(),
		"node_modules",
		"ffmpeg-static",
		exeName,
	);
	if (existsSync(fallback)) {
		return fallback;
	}
	throw new Error(
		`ffmpeg binary not found. Tried: ${ffmpegPath ?? "(null)"} and ${fallback}. Run \`node node_modules/ffmpeg-static/install.js\` from editor/apps/web.`,
	);
}
import {
	cachedFileExists,
	cachedFilePath,
	ensureCacheRoot,
	templatePath,
} from "./cache";
import { applyTemplateVars, type TemplateVars } from "./template-vars";

const FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const RENDER_TIMEOUT_MS = 30_000;

export interface RenderInput {
	/** Either a template id … */
	template?: string;
	/** … or raw HTML to render directly. Exactly one of these must be set. */
	html?: string;
	vars: TemplateVars;
	durationSeconds: number;
	styleVars: Record<string, string>;
	hash: string;
	width?: number;
	height?: number;
}

export interface RenderProgress {
	(progress: number): void;
}

let cachedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
	if (cachedBrowser && cachedBrowser.connected) {
		return cachedBrowser;
	}
	cachedBrowser = await puppeteer.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--default-background-color=00000000",
			"--hide-scrollbars",
		],
	});
	return cachedBrowser;
}

function buildStyleOverride({
	styleVars,
}: {
	styleVars: Record<string, string>;
}): string {
	if (Object.keys(styleVars).length === 0) return "";
	const decls = Object.entries(styleVars)
		.map(([key, value]) => `${key}: ${value};`)
		.join(" ");
	return `<style>:root { ${decls} }</style>`;
}

async function renderFrames({
	html,
	durationSeconds,
	frameDir,
	width,
	height,
	onProgress,
}: {
	html: string;
	durationSeconds: number;
	frameDir: string;
	width: number;
	height: number;
	onProgress?: RenderProgress;
}): Promise<number> {
	const browser = await getBrowser();
	const page = await browser.newPage();

	try {
		await page.setViewport({
			width,
			height,
			deviceScaleFactor: 1,
		});

		await page.setContent(html, {
			waitUntil: "networkidle0",
			timeout: RENDER_TIMEOUT_MS,
		});

		// Pause every animation so we can step through deterministically.
		await page.evaluate(() => {
			for (const animation of document.getAnimations()) {
				animation.pause();
			}
		});

		const totalFrames = Math.max(1, Math.round(durationSeconds * FPS));
		const stepMs = 1000 / FPS;

		for (let frame = 0; frame < totalFrames; frame++) {
			const tMs = frame * stepMs;
			await page.evaluate((currentMs: number) => {
				for (const animation of document.getAnimations()) {
					animation.currentTime = currentMs;
				}
			}, tMs);

			const frameFile = join(
				frameDir,
				`frame-${frame.toString().padStart(5, "0")}.png`,
			);
			const buffer = await page.screenshot({
				type: "png",
				omitBackground: true,
				clip: { x: 0, y: 0, width, height },
			});
			await writeFile(frameFile, buffer);

			if (onProgress) {
				onProgress((frame + 1) / totalFrames);
			}
		}

		return totalFrames;
	} finally {
		await page.close();
	}
}

async function encodeWebm({
	frameDir,
	outputPath,
}: {
	frameDir: string;
	outputPath: string;
}): Promise<void> {
	const ffmpegBinary = resolveFfmpegBinary();
	// We use libvpx (VP8) instead of libvpx-vp9 because:
	//   - mediabunny (used by OpenCut) only reads alpha from WebM
	//     per-Block BlockAdditions (matroska-demuxer.js:1902).
	//   - libvpx-vp9 with yuva420p packs alpha differently — Chrome's
	//     <video> tag can decode it but mediabunny/WebCodecs cannot,
	//     so the overlay renders as a black rectangle in OpenCut.
	//   - libvpx (VP8) with yuva420p produces standard BlockAdditions
	//     which mediabunny detects → real transparency.
	// metadata:s:v:0 alpha_mode=1 is also written so non-WebCodecs
	// players (Premiere etc.) keep recognising the alpha channel.
	const args = [
		"-y",
		"-framerate",
		String(FPS),
		"-i",
		join(frameDir, "frame-%05d.png"),
		"-c:v",
		"libvpx",
		"-pix_fmt",
		"yuva420p",
		"-auto-alt-ref",
		"0",
		"-b:v",
		"0",
		"-crf",
		"18",
		"-cpu-used",
		"4",
		"-metadata:s:v:0",
		"alpha_mode=1",
		outputPath,
	];

	await new Promise<void>((resolve, reject) => {
		const proc = spawn(ffmpegBinary, args, { stdio: "pipe" });
		let stderr = "";
		proc.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		proc.on("error", reject);
		proc.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(
					new Error(
						`ffmpeg exited with code ${code}. Last stderr:\n${stderr.slice(-2000)}`,
					),
				);
			}
		});
	});
}

export async function renderOverlay({
	template,
	html: rawCustomHtml,
	vars,
	durationSeconds,
	styleVars,
	hash,
	width,
	height,
	onProgress,
}: RenderInput & { onProgress?: RenderProgress }): Promise<string> {
	if (cachedFileExists({ hash })) {
		return cachedFilePath({ hash });
	}

	if (!template && !rawCustomHtml) {
		throw new Error("renderOverlay: either template or html must be provided");
	}

	const effectiveWidth = width ?? DEFAULT_WIDTH;
	const effectiveHeight = height ?? DEFAULT_HEIGHT;

	let rawHtml: string;
	if (template) {
		const paths = templatePath({ template });
		if (!existsSync(paths.htmlFile)) {
			throw new Error(`Template not found: ${template} (looking for ${paths.htmlFile})`);
		}
		rawHtml = await readFile(paths.htmlFile, "utf8");
	} else {
		rawHtml = rawCustomHtml ?? "";
	}
	// Force the body to match the requested viewport so a 9:16 canvas isn't
	// laid out for 1920x1080. Templates use absolute pixels at design time,
	// but switching width/height on body lets the rest of the CSS adapt
	// (flex/absolute children re-layout). Inject before </head> so the
	// override wins.
	const dimensionStyle = `<style>html,body{width:${effectiveWidth}px !important;height:${effectiveHeight}px !important;}</style>`;
	const styleInjection = buildStyleOverride({ styleVars });
	let html = applyTemplateVars({ html: rawHtml, vars });
	const headClose = html.indexOf("</head>");
	const combinedInjection = dimensionStyle + styleInjection;
	if (headClose !== -1) {
		html = `${html.slice(0, headClose)}${combinedInjection}${html.slice(headClose)}`;
	} else {
		html = combinedInjection + html;
	}

	await ensureCacheRoot();
	const cacheTarget = cachedFilePath({ hash });
	const tmpFrameDir = await mkdtemp(join(tmpdir(), "aivc-overlay-"));

	try {
		await mkdir(tmpFrameDir, { recursive: true });
		await renderFrames({
			html,
			durationSeconds,
			frameDir: tmpFrameDir,
			width: effectiveWidth,
			height: effectiveHeight,
			onProgress: onProgress
				? (p) => onProgress(p * 0.85) // reserve last 15% for ffmpeg
				: undefined,
		});
		await encodeWebm({ frameDir: tmpFrameDir, outputPath: cacheTarget });
		if (onProgress) onProgress(1);
		return cacheTarget;
	} finally {
		await rm(tmpFrameDir, { recursive: true, force: true });
	}
}

export async function shutdownOverlayRenderer(): Promise<void> {
	if (cachedBrowser) {
		await cachedBrowser.close();
		cachedBrowser = null;
	}
}
