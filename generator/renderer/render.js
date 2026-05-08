#!/usr/bin/env node
/**
 * AIVC DACH – Renderer
 *
 * Local video renderer. No cloud, no API keys.
 * Takes an HTML template + CSS animations, loads it in headless Chromium,
 * steps frame-by-frame through all animations and packs the PNG frames
 * into an MP4 with ffmpeg.
 *
 * Examples:
 *   node render.js --template news-intro --vars '{"TOPIC":"Hello","SUBTITLE":"World"}'
 *   node render.js --template vertical-short --output ./myvideo.mp4 --vars '{"HOOK":"Boom"}'
 *   node render.js --template news-intro --preview     (HTML only, no MP4)
 *   node render.js --help
 */

'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { Command } = require('commander');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');

// --- Paths ---
// Layout in v3.0.0+:
//   <repo>/generator/renderer/render.js   (this file)
//   <repo>/generator/templates/<name>/
//   <repo>/shared/brand.config.example.json
const RENDERER_DIR = __dirname;
const GENERATOR_ROOT = path.resolve(RENDERER_DIR, '..');
const REPO_ROOT = path.resolve(GENERATOR_ROOT, '..');
const TEMPLATES_DIR = path.join(GENERATOR_ROOT, 'templates');
const HOME = os.homedir();
const NEW_CONFIG_DIR = path.join(HOME, '.aivc-dach');
const LEGACY_CONFIG_DIR = path.join(HOME, '.hyperframes-vbc');
const USER_BRAND_CONFIG = path.join(NEW_CONFIG_DIR, 'brand.config.json');
const FALLBACK_BRAND_CONFIG = path.join(REPO_ROOT, 'shared', 'brand.config.example.json');

const DEFAULT_FPS = 30;

// --- ffmpeg path resolution: ffmpeg-static, then system PATH ---
let ffmpegBin = 'ffmpeg';
try {
  const staticBin = require('ffmpeg-static');
  if (staticBin && fs.existsSync(staticBin)) {
    ffmpegBin = staticBin;
  }
} catch (_) {
  // ffmpeg-static not installed -> use system ffmpeg
}
ffmpeg.setFfmpegPath(ffmpegBin);

// --- Config migration: ~/.hyperframes-vbc -> ~/.aivc-dach (one-shot copy) ---
migrateLegacyConfig();

// --- CLI ---
const program = new Command();
program
  .name('aivc-dach-render')
  .description('Local video renderer (HTML + CSS animation -> MP4) – AIVC DACH by ZELDOgiq & Media AI AT')
  .version('2.0.0')
  .requiredOption('-t, --template <name>', 'Template folder name under templates/ (e.g. news-intro)')
  .option('-o, --output <path>', 'Output path for the MP4 file (default: ./output/<template>-<timestamp>.mp4)')
  .option('-v, --vars <json>', 'User variables as JSON string (e.g. \'{"TOPIC":"Hello"}\')', '{}')
  .option('--fps <n>', 'Frames per second', String(DEFAULT_FPS))
  .option('--keep-frames', 'Do not delete PNG frames (debug)')
  .option('--preview', 'Render HTML file only and return its path (no MP4)')
  .option('--quiet', 'Less logging');

program.parseAsync(process.argv).then(() => main(program.opts())).catch(fatal);

// --- Logging ---
function log(msg) { if (!program.opts().quiet) console.log(msg); }
function warn(msg) { console.warn('⚠️   ' + msg); }
function fatal(err) {
  const msg = err && err.message ? err.message : String(err);
  console.error('❌  Render failed: ' + msg);
  process.exit(1);
}
function fail(msg) { fatal(new Error(msg)); }

// --- Main flow ---
async function main(opts) {
  log('🎬  AIVC DACH Renderer v2.0.0');
  log('');

  // Load template
  const tplDir = path.join(TEMPLATES_DIR, opts.template);
  if (!fs.existsSync(tplDir)) {
    fail(`Template "${opts.template}" not found at:\n    ${tplDir}\n    Available templates: ${listTemplates().join(', ')}`);
  }
  const tplHtmlPath = path.join(tplDir, 'template.html');
  const tplMetaPath = path.join(tplDir, 'meta.json');
  if (!fs.existsSync(tplHtmlPath)) fail(`template.html missing: ${tplHtmlPath}`);
  if (!fs.existsSync(tplMetaPath)) fail(`meta.json missing: ${tplMetaPath}`);

  const meta = await fs.readJson(tplMetaPath);
  let html = await fs.readFile(tplHtmlPath, 'utf8');

  // Load brand config (user > example fallback)
  let brand;
  if (fs.existsSync(USER_BRAND_CONFIG)) {
    brand = await fs.readJson(USER_BRAND_CONFIG);
  } else {
    warn(`No brand config found at ${USER_BRAND_CONFIG}`);
    warn(`Using fallback values from brand.config.example.json`);
    brand = await fs.readJson(FALLBACK_BRAND_CONFIG);
  }

  // Parse user vars
  let userVars = {};
  try {
    userVars = JSON.parse(opts.vars || '{}');
  } catch (e) {
    fail(`--vars is not valid JSON: ${e.message}`);
  }

  // Fill template
  const replacements = buildReplacements(brand, userVars, meta);
  html = applyTemplate(html, replacements);

  // Aspect ratio -> viewport
  const { width, height } = aspectToSize(meta.aspectRatio || '16:9');
  const fps = Math.max(1, parseInt(opts.fps, 10) || DEFAULT_FPS);
  const duration = Number(meta.duration) || 10;
  const totalFrames = Math.round(duration * fps);

  // Temp directory inside renderer/tmp/ (so relative file:// URLs work)
  const tmpRoot = path.join(RENDERER_DIR, 'tmp');
  await fs.ensureDir(tmpRoot);
  const tmpDir = await fs.mkdtemp(path.join(tmpRoot, 'render-'));
  const htmlFile = path.join(tmpDir, 'render.html');
  await fs.writeFile(htmlFile, html, 'utf8');

  if (opts.preview) {
    log(`📄  Preview HTML written: ${htmlFile}`);
    log(`    Open the file in your browser to inspect the template.`);
    return;
  }

  log(`🎯  Template:    ${meta.name || opts.template}`);
  log(`📐  Resolution:  ${width}x${height} (${meta.aspectRatio || '16:9'})`);
  log(`⏱️   Duration:    ${duration}s @ ${fps}fps = ${totalFrames} frames`);
  log(`🎞️   ffmpeg:      ${ffmpegBin}`);
  log(`📁  Temp:        ${tmpDir}`);
  log('');

  // Locate browser (Puppeteer Chromium, with system Chrome/Edge fallback)
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
  const customExecutable = findSystemBrowser();
  if (customExecutable && shouldUseSystemBrowser()) {
    launchOptions.executablePath = customExecutable;
    log(`🌐  Using system browser: ${customExecutable}`);
  }

  log('🌐  Starting browser (Puppeteer/Chromium)...');
  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
  } catch (e) {
    // Bundled Chromium failed -> try system browser as last resort
    if (!customExecutable) {
      throw new Error(
        `Puppeteer could not launch its bundled Chromium and no system Chrome/Edge was found.\n` +
        `    See TROUBLESHOOTING.md ("Chromium download failed") for fixes.\n` +
        `    Original error: ${e.message}`
      );
    }
    warn(`Bundled Chromium failed, retrying with system browser: ${customExecutable}`);
    launchOptions.executablePath = customExecutable;
    browser = await puppeteer.launch(launchOptions);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const fileUrl = pathToFileUrl(htmlFile);
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });

    // Let webfonts load (best-effort, max 3s)
    await page.evaluate(() => {
      if (document.fonts && document.fonts.ready) {
        return Promise.race([
          document.fonts.ready,
          new Promise(r => setTimeout(r, 3000))
        ]);
      }
    });

    // Collect + pause all animations. Prefer the template-provided helper.
    await page.evaluate(() => {
      window.__hf_anims = document.getAnimations();
      window.__hf_anims.forEach(a => { try { a.pause(); } catch (_) {} });
    });

    const framesDir = path.join(tmpDir, 'frames');
    await fs.ensureDir(framesDir);

    log(`📸  Capturing ${totalFrames} frames...`);
    const startTs = Date.now();
    for (let i = 0; i < totalFrames; i++) {
      const tMs = (i / fps) * 1000;
      await page.evaluate((time) => {
        return new Promise(resolve => {
          // Prefer template helper if present (consistent with browser preview)
          if (typeof window.__seekToTime === 'function') {
            try { window.__seekToTime(time); } catch (_) {}
          } else {
            for (const anim of window.__hf_anims) {
              try {
                const timing = anim.effect && anim.effect.getTiming ? anim.effect.getTiming() : {};
                const delay = Number(timing.delay) || 0;
                anim.currentTime = time - delay;
              } catch (_) {}
            }
          }
          // Two rAF ticks: one for style, one for paint
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      }, tMs);

      const out = path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`);
      await page.screenshot({ path: out, omitBackground: false });

      if (!opts.quiet && (i % fps === 0 || i === totalFrames - 1)) {
        const sec = Math.min(duration, ((i + 1) / fps)).toFixed(1);
        process.stdout.write(`\r   ${sec}s / ${duration}s captured   `);
      }
    }
    if (!opts.quiet) process.stdout.write('\n');
    log(`   Frame capture done in ${((Date.now() - startTs) / 1000).toFixed(1)}s.`);

    // ffmpeg -> MP4
    const outputDir = path.resolve(
      (brand.preferences && brand.preferences.outputDirectory) || './output'
    );
    await fs.ensureDir(outputDir);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const finalOutput = opts.output
      ? path.resolve(opts.output)
      : path.join(outputDir, `${opts.template}-${ts}.mp4`);
    await fs.ensureDir(path.dirname(finalOutput));

    log(`🎞️   Encoding MP4: ${finalOutput}`);
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(framesDir, 'frame_%06d.png'))
        .inputOptions([`-framerate ${fps}`])
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-preset medium',
          '-crf 18',
          `-r ${fps}`
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(finalOutput);
    });

    log('');
    log(`✅  Done! Your video is here:`);
    log(`    ${finalOutput}`);

    // Cleanup
    if (!opts.keepFrames) {
      await fs.remove(tmpDir);
    } else {
      log(`🗂️   Frames kept: ${framesDir}`);
    }
  } finally {
    if (browser) await browser.close();
  }
}

// --- Helpers ---

function migrateLegacyConfig() {
  try {
    const legacyFile = path.join(LEGACY_CONFIG_DIR, 'brand.config.json');
    const newFile = USER_BRAND_CONFIG;
    if (fs.existsSync(legacyFile) && !fs.existsSync(newFile)) {
      fs.ensureDirSync(NEW_CONFIG_DIR);
      fs.copyFileSync(legacyFile, newFile);
      // Also mirror assets dir if it exists
      const legacyAssets = path.join(LEGACY_CONFIG_DIR, 'assets');
      const newAssets = path.join(NEW_CONFIG_DIR, 'assets');
      if (fs.existsSync(legacyAssets) && !fs.existsSync(newAssets)) {
        fs.copySync(legacyAssets, newAssets);
      }
      console.log(
        `ℹ️   Migrated config from ${LEGACY_CONFIG_DIR} to ${NEW_CONFIG_DIR} – ` +
        `you can delete the old folder when ready.`
      );
    }
  } catch (e) {
    // Migration is best-effort – never block the render
    console.warn('⚠️   Config migration skipped: ' + (e.message || e));
  }
}

function shouldUseSystemBrowser() {
  // Honor explicit env override; otherwise only use system browser if PUPPETEER_SKIP_DOWNLOAD was set
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return true;
  if (process.env.PUPPETEER_SKIP_DOWNLOAD === '1' || process.env.PUPPETEER_SKIP_DOWNLOAD === 'true') return true;
  return false;
}

function findSystemBrowser() {
  // Explicit override always wins
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates = [];
  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localApp = process.env['LOCALAPPDATA'] || path.join(HOME, 'AppData', 'Local');
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pfx86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pfx86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else {
    // Linux: try `which` for common binaries
    for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
      try {
        const out = execSync(`which ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (out) candidates.push(out);
      } catch (_) {}
    }
  }

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  return fs.readdirSync(TEMPLATES_DIR).filter(d => {
    const p = path.join(TEMPLATES_DIR, d);
    return fs.statSync(p).isDirectory();
  });
}

function buildReplacements(brand, userVars, meta) {
  const b = (brand && brand.brand) || {};
  const map = {
    BRAND_NAME: b.name || '',
    PRIMARY_COLOR: b.primaryColor || '#0EA5E9',
    ACCENT_COLOR: b.accentColor || '#F59E0B',
    BACKGROUND_COLOR: b.backgroundColor || '#0A0A0A',
    TEXT_COLOR: b.textColor || '#FFFFFF',
    FONT_HEADING: b.fontHeading || 'Inter',
    FONT_BODY: b.fontBody || 'Inter',
    FONT_MONO: b.fontMono || 'JetBrains Mono',
    LOGO_PATH: b.logoPath ? toFilePath(b.logoPath) : '',
    LOGO_POSITION: b.logoPosition || 'top-left',
    LANGUAGE: b.language || 'auto'
  };

  // Defaults from meta.variables (example values), only if user provided none
  if (Array.isArray(meta && meta.variables)) {
    for (const v of meta.variables) {
      if (v && v.key && map[v.key] === undefined) {
        map[v.key] = v.example != null ? String(v.example) : '';
      }
    }
  }

  // User vars override everything
  if (userVars && typeof userVars === 'object') {
    for (const [k, v] of Object.entries(userVars)) {
      map[k] = v == null ? '' : String(v);
    }
  }
  return map;
}

function applyTemplate(html, replacements) {
  // 1. Conditional blocks {{#if VAR}}...{{/if}} (non-greedy, multiline)
  html = html.replace(
    /\{\{#if ([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_full, key, body) => (replacements[key] ? body : '')
  );

  // 2. Variables {{VAR}}
  html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key];
    }
    warn(`Variable ${full} not found – placeholder kept in HTML`);
    return full;
  });

  return html;
}

function aspectToSize(ratio) {
  switch (String(ratio)) {
    case '9:16': return { width: 1080, height: 1920 };
    case '1:1':  return { width: 1080, height: 1080 };
    case '4:5':  return { width: 1080, height: 1350 };
    case '4:3':  return { width: 1440, height: 1080 };
    case '16:9':
    default:     return { width: 1920, height: 1080 };
  }
}

function pathToFileUrl(p) {
  let abs = path.resolve(p).replace(/\\/g, '/');
  if (!abs.startsWith('/')) abs = '/' + abs;
  return 'file://' + encodeURI(abs);
}

function toFilePath(p) {
  if (!p) return '';
  if (/^https?:|^data:|^file:/i.test(p)) return p;
  return pathToFileUrl(p);
}
