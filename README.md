# mcp-server-svg

An MCP server that lets Claude Code screenshot SVG files and extract their semantic content — text, structure, element IDs — directly in context. Pass a file path, get back a rendered PNG plus structured info that makes SVGs as useful as native images for AI context.

## How it works

Claude Code calls `screenshot_svg` or `analyze_svg` with an SVG file path. The server reads the file, renders it headlessly with Playwright Chromium (retina-quality, 2x scale), and returns a base64 PNG image **plus** extracted text content, element IDs, classes, and structure — giving Claude both visual and semantic understanding of the SVG.

The browser instance is pooled across calls, so subsequent screenshots are fast.

## Installation

No install needed. Claude Code pulls the server automatically via `npx`.

The only one-time step is installing the Playwright Chromium browser:

```bash
npx playwright install chromium
```

## Claude Code configuration

Register the server via the Claude Code CLI:

```bash
# Project-scoped (this project only)
claude mcp add svg npx -- -y @benjaminholderbein/mcp-server-svg

# Or globally (available in all projects)
claude mcp add svg npx -- -y @benjaminholderbein/mcp-server-svg -s user
```

## Usage

Once configured, Claude Code can call the tools automatically while working with SVG files. You can also prompt it directly:

> "Screenshot the SVG at `src/icons/logo.svg`"

> "Analyze the structure of `diagram.svg`"

> "Show me what `diagram.svg` looks like"

### Tool: `screenshot_svg`

Renders an SVG as a high-resolution PNG and returns both the image and semantic info (text content, IDs, classes, element counts).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | one of the two | Path to an `.svg` file on disk |
| `svg_content` | string | one of the two | Raw SVG markup |
| `background` | string | optional | CSS background color (e.g. `"white"`). Defaults to transparent |
| `focus_id` | string | optional | ID of an SVG element to zoom into |
| `padding` | number | optional | Pixels of padding around focused element. Defaults to 20 |
| `view_box` | string | optional | Manual crop region as `"x y width height"` |
| `width` | number | optional | Override render width in pixels |
| `height` | number | optional | Override render height in pixels |
| `scale` | number | optional | Device scale factor for retina rendering. Defaults to 2 |

### Tool: `analyze_svg`

Extracts semantic information from an SVG without rendering it. Fast, no browser needed.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | one of the two | Path to an `.svg` file on disk |
| `svg_content` | string | one of the two | Raw SVG markup |

Returns: text content, element IDs, CSS classes, element counts by type, dimensions, and viewBox.

## Why this matters

Native images (PNG, JPEG) work great as context for AI — Claude can see and reason about them directly. SVGs are trickier: they're code, not pixels. This server bridges that gap by giving Claude both the rendered visual **and** the semantic structure, making SVG iteration as natural as working with any other image format.

## License

MIT
