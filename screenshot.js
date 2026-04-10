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

export async function screenshotSvg({ file_path, svg_content, background }) {
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
    const buffer = await page.screenshot({ type: 'png', omitBackground: bg === 'transparent' });
    return buffer.toString('base64');
  } finally {
    await browser.close();
  }
}
