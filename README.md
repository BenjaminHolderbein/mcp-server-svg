# mcp-server-svg

An MCP server that lets Claude Code screenshot SVG files directly in context. Pass a file path, get back a rendered PNG — no scripts, no wrapper files, no manual steps.

## How it works

Claude Code calls the `screenshot_svg` tool with an SVG file path. The server reads the file, wraps it in a minimal HTML page, renders it headlessly with Playwright Chromium, and returns a base64 PNG image that Claude Code displays inline.

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

Once configured, Claude Code can call the tool automatically while working with SVG files. You can also prompt it directly:

> "Screenshot the SVG at `src/icons/logo.svg`"

> "Show me what `diagram.svg` looks like"

### Tool: `screenshot_svg`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | one of the two | Path to an `.svg` file on disk — the primary way to use this tool |
| `svg_content` | string | one of the two | Raw SVG markup — for cases where you want to render inline SVG without a file |
| `background` | string | optional | CSS background color, e.g. `"white"`. Defaults to transparent. |

## Why I built this

Mermaid is the go-to for diagramming with Claude, but its auto-layout quickly becomes a constraint — you lose control of positioning, spacing, and visual structure the moment your diagram gets complex.

SVG is the better tool for precise, expressive diagrams. The problem is that Claude Code can't easily iterate on SVG because it can't see what it's producing. The feedback loop was broken: write SVG, save, open a browser, refresh, go back to the terminal, repeat.

This server closes that loop. Claude Code can now render and see the SVG in the same context where it's editing it — making visual iteration with SVG as fast and natural as working with any other file.

## License

MIT
