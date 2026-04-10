import { chromium } from 'playwright';
import { readFile } from 'fs/promises';

// ── Browser pool (singleton) ────────────────────────────────────────────────
let _browser = null;
let _browserPromise = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  if (_browserPromise) return _browserPromise;
  _browserPromise = chromium.launch().then((b) => {
    _browser = b;
    _browserPromise = null;
    return b;
  });
  return _browserPromise;
}

export async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

// ── SVG dimension parsing ───────────────────────────────────────────────────
function parseSvgDimensions(svgText) {
  const widthMatch = svgText.match(/<svg[^>]*\swidth=["']([0-9.]+)[^"']*["']/i);
  const heightMatch = svgText.match(/<svg[^>]*\sheight=["']([0-9.]+)[^"']*["']/i);

  let width = widthMatch ? Math.round(parseFloat(widthMatch[1])) : null;
  let height = heightMatch ? Math.round(parseFloat(heightMatch[1])) : null;

  if (!width || !height) {
    const viewBoxMatch = svgText.match(/<svg[^>]*\sviewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
      if (parts.length === 4) {
        width = width || Math.round(parseFloat(parts[2])) || 800;
        height = height || Math.round(parseFloat(parts[3])) || 600;
      }
    }
  }

  return { width: width || 800, height: height || 600 };
}

// ── SVG text / structure extraction ─────────────────────────────────────────
function extractSvgInfo(svgText) {
  const info = { texts: [], ids: [], classes: [], dimensions: null, viewBox: null, elements: {} };

  // Dimensions
  info.dimensions = parseSvgDimensions(svgText);

  // viewBox
  const vbMatch = svgText.match(/<svg[^>]*\sviewBox=["']([^"']+)["']/i);
  if (vbMatch) info.viewBox = vbMatch[1].trim();

  // Text content — extract from <text>, <tspan>, <title>, <desc>
  const textTags = svgText.matchAll(/<(?:text|tspan|title|desc)[^>]*>([\s\S]*?)<\/(?:text|tspan|title|desc)>/gi);
  for (const m of textTags) {
    const cleaned = m[1].replace(/<[^>]+>/g, '').trim();
    if (cleaned) info.texts.push(cleaned);
  }

  // IDs
  const idMatches = svgText.matchAll(/\sid=["']([^"']+)["']/gi);
  for (const m of idMatches) info.ids.push(m[1]);

  // Classes
  const classMatches = svgText.matchAll(/\sclass=["']([^"']+)["']/gi);
  for (const m of classMatches) {
    m[1].split(/\s+/).forEach((c) => {
      if (c && !info.classes.includes(c)) info.classes.push(c);
    });
  }

  // Element count by tag
  const tagMatches = svgText.matchAll(/<(rect|circle|ellipse|line|polyline|polygon|path|g|use|image|text|tspan|defs|clipPath|mask|filter|linearGradient|radialGradient|pattern|symbol|marker)\b/gi);
  for (const m of tagMatches) {
    const tag = m[1].toLowerCase();
    info.elements[tag] = (info.elements[tag] || 0) + 1;
  }

  return info;
}

// ── Read SVG helper ─────────────────────────────────────────────────────────
export async function readSvg(file_path, svg_content) {
  if (file_path) return readFile(file_path, 'utf8');
  return svg_content;
}

// ── Screenshot SVG ──────────────────────────────────────────────────────────
export async function screenshotSvg({
  file_path,
  svg_content,
  background,
  focus_id,
  padding = 20,
  view_box,
  width: overrideWidth,
  height: overrideHeight,
  scale = 2,
}) {
  const svgText = await readSvg(file_path, svg_content);
  const dims = parseSvgDimensions(svgText);
  const width = overrideWidth || dims.width;
  const height = overrideHeight || dims.height;
  const bg = background || 'transparent';

  // Cap dimensions to prevent massive renders
  const cappedWidth = Math.min(width, 4096);
  const cappedHeight = Math.min(height, 4096);

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: ${bg}; width: ${cappedWidth}px; height: ${cappedHeight}px; overflow: hidden; }
      svg { display: block; width: ${cappedWidth}px; height: ${cappedHeight}px; }
    </style>
  </head>
  <body>${svgText}</body>
</html>`;

  const browser = await getBrowser();
  const context = await browser.newContext({ deviceScaleFactor: scale });
  const page = await context.newPage();

  try {
    await page.setViewportSize({ width: cappedWidth, height: cappedHeight });
    await page.setContent(html, { waitUntil: 'networkidle' });

    if (focus_id) {
      const escapedId = focus_id.replace(/([^\w-])/g, '\\$1');
      const box = await page.locator(`#${escapedId}`).boundingBox();
      if (!box) throw new Error(`Element with id "${focus_id}" not found in SVG.`);
      const clip = {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding),
        width: box.width + padding * 2,
        height: box.height + padding * 2,
      };
      const buffer = await page.screenshot({ type: 'png', clip, omitBackground: bg === 'transparent' });
      return { base64: buffer.toString('base64'), info: extractSvgInfo(svgText) };
    }

    if (view_box) {
      const parts = view_box.trim().split(/[\s,]+/).map(Number);
      if (parts.length !== 4) throw new Error('view_box must be "x y width height"');
      const [x, y, w, h] = parts;
      const buffer = await page.screenshot({ type: 'png', clip: { x, y, width: w, height: h }, omitBackground: bg === 'transparent' });
      return { base64: buffer.toString('base64'), info: extractSvgInfo(svgText) };
    }

    const buffer = await page.screenshot({ type: 'png', omitBackground: bg === 'transparent' });
    return { base64: buffer.toString('base64'), info: extractSvgInfo(svgText) };
  } finally {
    await context.close();
  }
}

// ── Analyze SVG (no browser needed) ─────────────────────────────────────────
export async function analyzeSvg({ file_path, svg_content }) {
  const svgText = await readSvg(file_path, svg_content);
  return extractSvgInfo(svgText);
}
