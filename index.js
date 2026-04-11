#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { screenshotSvg } from './screenshot.js';

const server = new Server(
  { name: 'mcp-server-svg', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'screenshot_svg',
      description:
        'Renders an SVG file (or raw SVG markup) as a PNG screenshot and returns it as a base64 image. Use file_path for files on disk (primary usage), or svg_content for inline SVG markup. Use focus_id to zoom into a specific element by its id attribute, or view_box to crop to a manual pixel region.',
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
            description: 'ID of an SVG element to zoom into (matches the id="..." attribute). The output is cropped to that element\'s bounding box. Ideal for inspecting a sub-diagram or specific region without needing to know pixel coordinates.',
          },
          padding: {
            type: 'number',
            description: 'Pixels of padding around the focused element when using focus_id. Defaults to 20.',
          },
          view_box: {
            type: 'string',
            description: 'Manual pixel crop region as "x y width height" — coordinates in the rendered SVG\'s pixel space. Use as a fallback when the target element has no id.',
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'screenshot_svg') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { file_path, svg_content, background, focus_id, padding, view_box } = request.params.arguments ?? {};

  if (!file_path && !svg_content) {
    throw new Error('Provide either file_path or svg_content.');
  }
  if (file_path && svg_content) {
    throw new Error('Provide only one of file_path or svg_content, not both.');
  }

  const base64 = await screenshotSvg({ file_path, svg_content, background, focus_id, padding, view_box });

  return {
    content: [
      {
        type: 'image',
        data: base64,
        mimeType: 'image/png',
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
