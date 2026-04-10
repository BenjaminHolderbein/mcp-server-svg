import { chromium } from 'playwright';
import { readFile } from 'fs/promises';

function parseSvgDimensions(svgText) {
  const widthMatch = svgText.match(/<svg[^>]*\swidth=["']([0-9.]+)[^"']*["']/i);
  const heightMatch = svgText.match(/<svg[^>]*\sheight=["']([0-9.]+)[^"']*["']/i);

  const width = widthMatch ? Math.round(parseFloat(widthMatch[1])) : null;
  const height = heightMatch ? Math.round(parseFloat(heightMatch[1])) : null;

  // Also try viewBox as fallback: "minX minY width height"
  if (!width || !height) {
    const viewBoxMatch = svgText.match(/<svg[^>]*\sviewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
      if (parts.length === 4) {
        return {
          width: Math.round(parseFloat(parts[2])) || 800,
          height: Math.round(parseFloat(parts[3])) || 600,
        };
      }
    }
  }

  return {
    width: width || 800,
    height: height || 600,
  };
}

export async function screenshotSvg({ file_path, svg_content, background, focus_id, padding = 20, view_box }) {
  let svgText;

  if (file_path) {
    svgText = await readFile(file_path, 'utf8');
  } else {
    svgText = svg_content;
  }

  const { width, height } = parseSvgDimensions(svgText);
  const bg = background || 'transparent';

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: ${bg}; width: ${width}px; height: ${height}px; overflow: hidden; }
      svg { display: block; width: ${width}px; height: ${height}px; }
    </style>
  </head>
  <body>${svgText}</body>
</html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Focus on a specific element by ID
    if (focus_id) {
      const box = await page.locator(`#${focus_id}`).boundingBox();
      if (!box) throw new Error(`Element with id "${focus_id}" not found in SVG.`);
      const clip = {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding),
        width: box.width + padding * 2,
        height: box.height + padding * 2,
      };
      const buffer = await page.screenshot({ type: 'png', clip, omitBackground: bg === 'transparent' });
      return buffer.toString('base64');
    }

    // Focus on a manual viewBox region: "x y width height"
    if (view_box) {
      const parts = view_box.trim().split(/[\s,]+/).map(Number);
      if (parts.length !== 4) throw new Error('view_box must be "x y width height"');
      const [x, y, w, h] = parts;
      const buffer = await page.screenshot({ type: 'png', clip: { x, y, width: w, height: h }, omitBackground: bg === 'transparent' });
      return buffer.toString('base64');
    }

    // Default: full SVG
    const buffer = await page.screenshot({ type: 'png', omitBackground: bg === 'transparent' });
    return buffer.toString('base64');
  } finally {
    await browser.close();
  }
}
