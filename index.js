#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { screenshotSvg, analyzeSvg, closeBrowser } from './screenshot.js';

const server = new Server(
  { name: 'mcp-server-svg', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'screenshot_svg',
      description:
        'Renders an SVG file (or raw SVG markup) as a high-resolution PNG screenshot and returns it along with extracted text and structure info for semantic context. Use file_path for files on disk, or svg_content for inline SVG.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or relative path to an .svg file on disk.',
          },
          svg_content: {
            type: 'string',
            description: 'Raw SVG markup string.',
          },
          background: {
            type: 'string',
            description: 'CSS background color (e.g. "white"). Defaults to transparent.',
          },
          focus_id: {
            type: 'string',
            description: "ID of an SVG element to zoom into. The screenshot will be cropped to that element's bounding box plus padding.",
          },
          padding: {
            type: 'number',
            description: 'Pixels of padding around the focused element when using focus_id. Defaults to 20.',
          },
          view_box: {
            type: 'string',
            description: 'Manual crop region as "x y width height". Use when the target has no id.',
          },
          width: {
            type: 'number',
            description: 'Override render width in pixels. Defaults to SVG intrinsic width.',
          },
          height: {
            type: 'number',
            description: 'Override render height in pixels. Defaults to SVG intrinsic height.',
          },
          scale: {
            type: 'number',
            description: 'Device scale factor for retina rendering. Defaults to 2.',
          },
        },
      },
    },
    {
      name: 'analyze_svg',
      description:
        'Extracts semantic information from an SVG without rendering it. Returns text content, element IDs, CSS classes, element counts by type, dimensions, and viewBox. Useful for understanding SVG structure before editing.',
      inputSchema: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Absolute or relative path to an .svg file on disk.',
          },
          svg_content: {
            type: 'string',
            description: 'Raw SVG markup string.',
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const { file_path, svg_content } = args ?? {};

  if (!file_path && !svg_content) {
    throw new Error('Provide either file_path or svg_content.');
  }
  if (file_path && svg_content) {
    throw new Error('Provide only one of file_path or svg_content, not both.');
  }

  if (name === 'screenshot_svg') {
    const { background, focus_id, padding, view_box, width, height, scale } = args;
    const { base64, info } = await screenshotSvg({
      file_path, svg_content, background, focus_id, padding, view_box, width, height, scale,
    });

    // Build a concise text summary for semantic context
    const textSummary = buildTextSummary(info);

    return {
      content: [
        { type: 'image', data: base64, mimeType: 'image/png' },
        { type: 'text', text: textSummary },
      ],
    };
  }

  if (name === 'analyze_svg') {
    const info = await analyzeSvg({ file_path, svg_content });
    return {
      content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

function buildTextSummary(info) {
  const lines = [];

  lines.push(`Dimensions: ${info.dimensions.width}x${info.dimensions.height}`);
  if (info.viewBox) lines.push(`viewBox: ${info.viewBox}`);

  const elSummary = Object.entries(info.elements)
    .map(([tag, count]) => `${tag}(${count})`)
    .join(', ');
  if (elSummary) lines.push(`Elements: ${elSummary}`);

  if (info.ids.length > 0) lines.push(`IDs: ${info.ids.join(', ')}`);
  if (info.classes.length > 0) lines.push(`Classes: ${info.classes.join(', ')}`);
  if (info.texts.length > 0) lines.push(`Text content: ${info.texts.join(' | ')}`);

  return lines.join('\n');
}

// Graceful shutdown — close the pooled browser
process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });

const transport = new StdioServerTransport();
await server.connect(transport);
