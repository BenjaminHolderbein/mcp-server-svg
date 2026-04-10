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

Add the following to your Claude Code MCP settings (`~/.claude/settings.json` or via the Claude Code UI):

```json
{
  "mcpServers": {
    "svg": {
      "command": "npx",
      "args": ["-y", "@benjaminholderbein/mcp-server-svg"]
    }
  }
}
```

## Usage

Once configured, Claude Code can call the tool automatically while working with SVG files. You can also prompt it directly:

> "Screenshot the SVG at `src/icons/logo.svg`"

> "Show me what `diagram.svg` looks like"

### Tool: `screenshot_svg`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `file_path` | string | one of the two | Path to an `.svg` file (absolute or relative to cwd) |
| `svg_content` | string | one of the two | Raw SVG markup |
| `background` | string | optional | CSS background color, e.g. `"white"`. Defaults to transparent. |

## Why I built this

When iterating on SVG files with Claude Code, the feedback loop was clunky — save the file, open a browser, refresh, go back to the terminal. This server closes that loop. Claude Code can now render and see the SVG in the same context where it's editing it, making visual iteration instant.

## License

MIT
