#!/usr/bin/env node
/**
 * Hyperframes Addon by Vibe Coding DACH – Renderer
 *
 * Lokaler Video-Renderer ohne Cloud, ohne API-Key.
 * Nimmt ein HTML-Template + CSS-Animationen, lädt es in einen
 * headless Chromium, spult Frame für Frame durch alle Animationen
 * und packt die PNG-Frames mit ffmpeg in eine MP4.
 *
 * Beispiele:
 *   node render.js --template news-intro --vars '{"TOPIC":"Hallo","SUBTITLE":"Welt"}'
 *   node render.js --template vertical-short --output ./meinvideo.mp4 --vars '{"HOOK":"Boom"}'
 *   node render.js --template news-intro --preview     (nur HTML, kein MP4)
 *   node render.js --help
 */

'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { Command } = require('commander');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');

// --- ffmpeg-Pfad finden: ffmpeg-static bevorzugt, dann System-PATH ---
let ffmpegBin = 'ffmpeg';
try {
  const staticBin = require('ffmpeg-static');
  if (staticBin && fs.existsSync(staticBin)) {
    ffmpegBin = staticBin;
  }
} catch (_) {
  // ffmpeg-static nicht installiert – nutze System-ffmpeg
}
ffmpeg.setFfmpegPath(ffmpegBin);

// --- Pfade ---
const RENDERER_DIR = __dirname;
const REPO_ROOT = path.resolve(RENDERER_DIR, '..');
const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');
const HOME = os.homedir();
const USER_BRAND_CONFIG = path.join(HOME, '.hyperframes-vbc', 'brand.config.json');
const FALLBACK_BRAND_CONFIG = path.join(REPO_ROOT, 'brand.config.example.json');

const DEFAULT_FPS = 30;

// --- CLI ---
const program = new Command();
program
  .name('hyperframes-vbc-render')
  .description('Lokaler Video-Renderer (HTML + CSS-Animation -> MP4) – Hyperframes Addon by Vibe Coding DACH')
  .version('1.1.0')
  .requiredOption('-t, --template <name>', 'Template-Ordnername unter templates/ (z.B. news-intro)')
  .option('-o, --output <path>', 'Output-Pfad für die MP4-Datei (default: ./output/<template>-<timestamp>.mp4)')
  .option('-v, --vars <json>', 'User-Variablen als JSON-String (z.B. \'{"TOPIC":"Hallo"}\')', '{}')
  .option('--fps <n>', 'Frames pro Sekunde', String(DEFAULT_FPS))
  .option('--keep-frames', 'PNG-Frames nicht löschen (Debug)')
  .option('--preview', 'Nur die HTML-Datei rendern und Pfad zurückgeben (kein MP4)')
  .option('--quiet', 'Weniger Logs');

program.parseAsync(process.argv).then(() => main(program.opts())).catch(fatal);

// --- Logging ---
function log(msg) { if (!program.opts().quiet) console.log(msg); }
function warn(msg) { console.warn('⚠️   ' + msg); }
function fatal(err) {
  const msg = err && err.message ? err.message : String(err);
  console.error('❌  Render fehlgeschlagen: ' + msg);
  process.exit(1);
}
function fail(msg) { fatal(new Error(msg)); }

// --- Hauptablauf ---
async function main(opts) {
  log('🎬  Hyperframes Renderer (Vibe Coding DACH) v1.1.0');
  log('');

  // Template laden
  const tplDir = path.join(TEMPLATES_DIR, opts.template);
  if (!fs.existsSync(tplDir)) {
    fail(`Template "${opts.template}" nicht gefunden unter:\n    ${tplDir}\n    Verfügbare Templates: ${listTemplates().join(', ')}`);
  }
  const tplHtmlPath = path.join(tplDir, 'template.html');
  const tplMetaPath = path.join(tplDir, 'meta.json');
  if (!fs.existsSync(tplHtmlPath)) fail(`template.html fehlt: ${tplHtmlPath}`);
  if (!fs.existsSync(tplMetaPath)) fail(`meta.json fehlt: ${tplMetaPath}`);

  const meta = await fs.readJson(tplMetaPath);
  let html = await fs.readFile(tplHtmlPath, 'utf8');

  // Brand-Config laden (User-Config > Fallback Beispiel)
  let brand;
  if (fs.existsSync(USER_BRAND_CONFIG)) {
    brand = await fs.readJson(USER_BRAND_CONFIG);
  } else {
    warn(`Keine Brand-Config gefunden unter ${USER_BRAND_CONFIG}`);
    warn(`Nutze Fallback-Werte aus brand.config.example.json`);
    brand = await fs.readJson(FALLBACK_BRAND_CONFIG);
  }

  // User-Variablen parsen
  let userVars = {};
  try {
    userVars = JSON.parse(opts.vars || '{}');
  } catch (e) {
    fail(`--vars ist kein gültiges JSON: ${e.message}`);
  }

  // Template ausfüllen
  const replacements = buildReplacements(brand, userVars, meta);
  html = applyTemplate(html, replacements);

  // Aspect-Ratio -> Viewport
  const { width, height } = aspectToSize(meta.aspectRatio || '16:9');
  const fps = Math.max(1, parseInt(opts.fps, 10) || DEFAULT_FPS);
  const duration = Number(meta.duration) || 10;
  const totalFrames = Math.round(duration * fps);

  // Temp-Verzeichnis (in renderer/tmp/, damit relative file:// URLs funktionieren)
  const tmpRoot = path.join(RENDERER_DIR, 'tmp');
  await fs.ensureDir(tmpRoot);
  const tmpDir = await fs.mkdtemp(path.join(tmpRoot, 'render-'));
  const htmlFile = path.join(tmpDir, 'render.html');
  await fs.writeFile(htmlFile, html, 'utf8');

  if (opts.preview) {
    log(`📄  Vorschau-HTML geschrieben: ${htmlFile}`);
    log(`    Öffne die Datei im Browser, um das Template zu prüfen.`);
    return;
  }

  log(`🎯  Template:    ${meta.name || opts.template}`);
  log(`📐  Auflösung:   ${width}x${height} (${meta.aspectRatio || '16:9'})`);
  log(`⏱️   Dauer:       ${duration}s @ ${fps}fps = ${totalFrames} Frames`);
  log(`🎞️   ffmpeg:      ${ffmpegBin}`);
  log(`📁  Temp:        ${tmpDir}`);
  log('');

  // Browser starten
  log('🌐  Starte Browser (Puppeteer/Chromium)...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const fileUrl = pathToFileUrl(htmlFile);
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });

    // Webfonts laden lassen (best-effort, max 3s)
    await page.evaluate(() => {
      if (document.fonts && document.fonts.ready) {
        return Promise.race([
          document.fonts.ready,
          new Promise(r => setTimeout(r, 3000))
        ]);
      }
    });

    // Alle Animationen sammeln + pausieren
    await page.evaluate(() => {
      window.__hf_anims = document.getAnimations();
      window.__hf_anims.forEach(a => { try { a.pause(); } catch (_) {} });
    });

    const framesDir = path.join(tmpDir, 'frames');
    await fs.ensureDir(framesDir);

    log(`📸  Erfasse ${totalFrames} Frames...`);
    const startTs = Date.now();
    for (let i = 0; i < totalFrames; i++) {
      const tMs = (i / fps) * 1000;
      await page.evaluate((time) => {
        return new Promise(resolve => {
          for (const anim of window.__hf_anims) {
            try {
              const timing = anim.effect && anim.effect.getTiming ? anim.effect.getTiming() : {};
              const delay = Number(timing.delay) || 0;
              anim.currentTime = time - delay;
            } catch (_) {}
          }
          // Zwei rAF-Ticks: einen für Style, einen für Paint
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
      }, tMs);

      const out = path.join(framesDir, `frame_${String(i).padStart(6, '0')}.png`);
      await page.screenshot({ path: out, omitBackground: false });

      if (!opts.quiet && (i % fps === 0 || i === totalFrames - 1)) {
        const sec = Math.min(duration, ((i + 1) / fps)).toFixed(1);
        process.stdout.write(`\r   ${sec}s / ${duration}s erfasst   `);
      }
    }
    if (!opts.quiet) process.stdout.write('\n');
    log(`   Frame-Erfassung in ${((Date.now() - startTs) / 1000).toFixed(1)}s erledigt.`);

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

    log(`🎞️   Erstelle MP4: ${finalOutput}`);
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
    log(`✅  Fertig! Dein Video liegt hier:`);
    log(`    ${finalOutput}`);

    // Aufräumen
    if (!opts.keepFrames) {
      await fs.remove(tmpDir);
    } else {
      log(`🗂️   Frames behalten: ${framesDir}`);
    }
  } finally {
    await browser.close();
  }
}

// --- Helpers ---

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
    LANGUAGE: b.language || 'de'
  };

  // Defaults aus meta.variables (example), nur falls User nichts liefert
  if (Array.isArray(meta && meta.variables)) {
    for (const v of meta.variables) {
      if (v && v.key && map[v.key] === undefined) {
        map[v.key] = v.example != null ? String(v.example) : '';
      }
    }
  }

  // User-Vars überschreiben alles
  if (userVars && typeof userVars === 'object') {
    for (const [k, v] of Object.entries(userVars)) {
      map[k] = v == null ? '' : String(v);
    }
  }
  return map;
}

function applyTemplate(html, replacements) {
  // 1. Conditional-Blöcke {{#if VAR}}...{{/if}} (nicht-greedy, multiline)
  html = html.replace(
    /\{\{#if ([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_full, key, body) => (replacements[key] ? body : '')
  );

  // 2. Variablen {{VAR}}
  html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key];
    }
    warn(`Variable ${full} nicht gefunden – Platzhalter bleibt im HTML`);
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
