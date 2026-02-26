# 🎨 Figma MCP Server — Implementation Plan

> **Status:** Planned (not yet implemented)
> **Created:** 2025-02-25
> **Purpose:** Let Antigravity (AI agent) read Figma design data to generate accurate, design-matching code.

---

## 📌 Overview

This MCP (Model Context Protocol) server connects Antigravity to your Figma designs by reading
**locally-exported Figma data** — no live API calls needed after the initial export.

### Architecture

```
┌──────────┐     one-time       ┌──────────────────┐      MCP        ┌─────────────┐
│  Figma   │ ──── export ─────► │  Local Data Store │ ◄─────────────► │ Antigravity │
│  (UI)    │  (script/manual)   │  (JSON + SVG +    │   (reads from   │  (AI Agent) │
└──────────┘                    │   design tokens)  │    local files)  └─────────────┘
                                └──────────────────┘
```

---

## 🔑 Prerequisites

1. **Figma Personal Access Token** — Generate from [Figma Settings → Personal Access Tokens](https://www.figma.com/settings) (free)
2. **Node.js 18+** installed
3. **Figma File Key** — extract from any Figma URL: `figma.com/file/{FILE_KEY}/...`

---

## ⚠️ Figma API Free Tier Limitations

| API Tier | Endpoint Examples                        | Free (Starter) Limit    | Paid (Pro+) Limit  |
|----------|------------------------------------------|-------------------------|---------------------|
| Tier 1   | Get File, Get File Nodes, Get Images     | ~6 requests/month       | 10-20 req/min       |
| Tier 2   | Get Comments, Post Comments              | ~12 requests/month      | 20-40 req/min       |
| Tier 3   | Get File Metadata, Components/Styles     | ~20 requests/month      | 60-120 req/min      |

**Why local export matters:** On the free tier you get ~6 file reads/month. By exporting once
and storing locally, we bypass rate limits entirely. Re-export only when your Figma designs change.

---

## 📦 What Data Can Be Extracted from Figma

### Available via API (Read)

| Data              | Endpoint                           | What You Get                                                    |
|-------------------|------------------------------------|-----------------------------------------------------------------|
| File Structure    | `GET /v1/files/:key`               | Full document tree — frames, groups, components, text, styles   |
| Specific Nodes    | `GET /v1/files/:key/nodes?ids=...` | Targeted node data by ID (more efficient)                       |
| Exported Images   | `GET /v1/images/:key`              | PNG/SVG/PDF exports of any node                                 |
| Image Fills       | `GET /v1/files/:key/images`        | Download URLs for images used as fills                          |
| Components        | `GET /v1/files/:key/components`    | All components with metadata                                    |
| Styles            | `GET /v1/files/:key/styles`        | Color, text, and effect styles                                  |
| Comments          | `GET /v1/files/:key/comments`      | All comments on a file                                          |
| File Versions     | `GET /v1/files/:key/versions`      | Version history (30-day on free)                                |
| File Metadata     | `GET /v1/files/:key/meta`          | Name, last modified, thumbnail                                  |
| Team Components   | `GET /v1/teams/:id/components`     | Published team library components                               |
| Team Styles       | `GET /v1/teams/:id/styles`         | Published team library styles                                   |
| User Info         | `GET /v1/me`                       | Current authenticated user                                      |

### Not Available via API

- ❌ Creating or editing files/frames/layers programmatically
- ❌ Moving/resizing elements
- ❌ Real-time collaboration data
- ❌ FigJam-specific content editing
- ❌ Prototyping/interaction data editing

---

## 🗂️ Project Structure

```
figma-mcp-server/
├── package.json
├── .env                            # FIGMA_ACCESS_TOKEN, FIGMA_FILE_KEY
├── README.md                       # This file
│
├── scripts/
│   └── export-figma.js             # One-time export script (hits Figma API)
│
├── data/                           # All exported Figma data (gitignored)
│   ├── files/
│   │   └── remitly-app/
│   │       ├── file.json           # Full Figma API JSON response
│   │       └── metadata.json       # File name, last modified, pages list
│   ├── components/
│   │   ├── button-primary.svg
│   │   ├── card-transaction.svg
│   │   ├── nav-bottom.svg
│   │   └── input-field.svg
│   ├── screens/
│   │   ├── home-screen.svg
│   │   ├── home-screen.png         # Visual reference
│   │   ├── send-money-flow.svg
│   │   └── profile-screen.svg
│   ├── design-tokens.json          # Colors, typography, spacing
│   └── component-index.json        # Maps component names → files + descriptions
│
├── src/
│   ├── index.js                    # MCP server entry point (stdio transport)
│   ├── figma-parser.js             # Parses raw Figma JSON into simplified structures
│   ├── tools/
│   │   ├── list-screens.js         # List all exported screens/pages
│   │   ├── get-screen-structure.js # Read JSON tree for a specific screen
│   │   ├── get-screen-svg.js       # Return SVG content of a screen
│   │   ├── get-component-svg.js    # Return SVG of a specific component
│   │   ├── get-design-tokens.js    # Return color/typography/spacing system
│   │   ├── get-node-details.js     # Drill into specific nodes in JSON tree
│   │   ├── get-node-css.js         # Extract CSS-like properties from a node
│   │   └── search-components.js    # Find components by name
│   └── utils/
│       ├── cache.js                # In-memory cache for parsed data
│       └── css-extractor.js        # Convert Figma node properties to CSS
│
└── .gitignore                      # Ignore data/, .env, node_modules/
```

---

## 🛠️ Implementation Phases

### Phase 1: Project Setup (~10 min)

```bash
cd figma-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk dotenv
```

**Dependencies:**
- `@modelcontextprotocol/sdk` — Official MCP SDK for Node.js
- `dotenv` — Load environment variables from `.env`

**.env file:**
```env
FIGMA_ACCESS_TOKEN=your_personal_access_token_here
FIGMA_FILE_KEY=your_file_key_here
```

### Phase 2: Export Script (~20 min)

Build `scripts/export-figma.js` that:
1. Reads token and file key from `.env`
2. Calls `GET /v1/files/:key` → saves full JSON to `data/files/`
3. Extracts page/frame names → saves `metadata.json`
4. Calls `GET /v1/images/:key` for each top-level frame → saves SVGs to `data/screens/`
5. Builds `component-index.json` mapping component names → node IDs
6. Extracts styles → generates `design-tokens.json`

**Usage:**
```bash
node scripts/export-figma.js
# This uses ~2-3 API calls total. Safe on free tier.
```

### Phase 3: Design Tokens Extractor (~15 min)

Auto-extract from the Figma JSON or manually create `data/design-tokens.json`:

```json
{
  "colors": {
    "primary": "#6C5CE7",
    "secondary": "#00CEC9",
    "background": "#0D1117",
    "surface": "#161B22",
    "text-primary": "#F0F6FC",
    "text-secondary": "#8B949E",
    "success": "#2EA043",
    "error": "#F85149",
    "warning": "#D29922"
  },
  "typography": {
    "heading-1": { "font": "Inter", "size": "32px", "weight": 700, "lineHeight": "40px" },
    "heading-2": { "font": "Inter", "size": "24px", "weight": 600, "lineHeight": "32px" },
    "heading-3": { "font": "Inter", "size": "20px", "weight": 600, "lineHeight": "28px" },
    "body": { "font": "Inter", "size": "16px", "weight": 400, "lineHeight": "24px" },
    "body-small": { "font": "Inter", "size": "14px", "weight": 400, "lineHeight": "20px" },
    "caption": { "font": "Inter", "size": "12px", "weight": 400, "lineHeight": "16px" }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px",
    "3xl": "64px"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "16px",
    "xl": "24px",
    "full": "9999px"
  },
  "shadows": {
    "card": "0 4px 6px rgba(0, 0, 0, 0.3)",
    "elevated": "0 8px 24px rgba(0, 0, 0, 0.4)",
    "glow": "0 0 20px rgba(108, 92, 231, 0.3)"
  }
}
```

### Phase 4: MCP Server Core (~30 min)

Build `src/index.js` using `@modelcontextprotocol/sdk`:
- Uses **stdio transport** (for local integration)
- Registers all tools from `src/tools/`
- Loads and parses Figma JSON on startup
- Serves data from memory (instant responses)

### Phase 5: MCP Tool Implementations (~30 min)

| Tool Name             | Input                              | Output                                                  |
|-----------------------|------------------------------------|---------------------------------------------------------|
| `list_screens`        | none                               | List of all screens with names and thumbnail paths      |
| `get_screen_structure`| `screenName`                       | Simplified node tree for a screen                       |
| `get_screen_svg`      | `screenName`                       | Raw SVG content of the screen                           |
| `get_component_svg`   | `componentName`                    | Raw SVG content of a component                          |
| `get_design_tokens`   | `category?` (colors/typography/…)  | Design tokens JSON (full or filtered by category)       |
| `get_node_details`    | `nodeId` or `nodeName`             | Detailed properties: position, size, styles, children   |
| `get_node_css`        | `nodeId` or `nodeName`             | CSS properties extracted from the Figma node            |
| `search_components`   | `query`                            | Components matching the search term                     |

### Phase 6: Figma Data Simplifier (~20 min)

Build `src/figma-parser.js` to transform raw Figma JSON:
- Strip unnecessary metadata (plugin data, internal IDs)
- Flatten deeply nested structures
- Convert Figma color format `{r: 0.42, g: 0.36, b: 0.9, a: 1}` → `#6C5CE7`
- Convert Figma text styles → CSS font properties
- Extract auto-layout → CSS flexbox properties
- Limit tree depth for context-window efficiency

### Phase 7: Integration with Antigravity (~5 min)

Add MCP server to your settings config. Example for `.gemini/settings.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/Users/test/Documents/Projects/remitly/figma-mcp-server/src/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## 🔄 Workflow: How to Use

### Initial Setup (One-Time)
```bash
# 1. Generate your Figma Personal Access Token
#    Go to: https://www.figma.com/settings → Personal Access Tokens → Generate

# 2. Get your Figma file key from the URL
#    URL: https://www.figma.com/file/ABC123xyz/My-Design
#    File Key: ABC123xyz

# 3. Add credentials to .env
echo "FIGMA_ACCESS_TOKEN=your_token" > .env
echo "FIGMA_FILE_KEY=your_file_key" >> .env

# 4. Run the export script
node scripts/export-figma.js

# 5. (Optional) Manually export key screens as SVG from Figma UI
#    Figma → Select frame → Export panel → SVG → Save to data/screens/
```

### When Designs Change
```bash
# Re-run the export to refresh local data
node scripts/export-figma.js
# This uses 2-3 API calls. Even on free tier, you can do this ~2x/month.
```

### Day-to-Day Usage
Just talk to Antigravity normally:
- "Build the login screen matching my Figma design"
- "What colors am I using in my design system?"
- "Create the transaction card component from Figma"

Antigravity will automatically call the MCP tools to read your design data.

---

## 📤 Manual Export Guide (No API Needed)

If you prefer to avoid the API entirely, you can export everything manually from Figma's UI:

### Exporting SVGs
1. Open your Figma file
2. Select a frame/component
3. Right panel → Export section → Click `+`
4. Choose **SVG** format
5. Click **Export** → Save to `data/screens/` or `data/components/`

### Exporting Design Tokens
1. Open your Figma file
2. Go through your styles (colors, typography, effects)
3. Manually create `data/design-tokens.json` with the values
4. Or use a Figma plugin like **"Design Tokens"** or **"Tokens Studio"**

### Copying CSS
1. Select any element in Figma
2. Right panel → **Inspect** tab
3. Copy the CSS → Paste into a reference file

---

## 🧠 What Antigravity Can Do With This Data

| Capability                        | How                                                        |
|-----------------------------------|------------------------------------------------------------|
| **Reproduce exact designs**       | Reads JSON structure + design tokens → generates HTML/CSS  |
| **Extract color palettes**        | Reads design-tokens.json                                   |
| **Match typography**              | Reads font families, sizes, weights from tokens/JSON       |
| **Build component library**       | Reads component SVGs + structure                           |
| **Understand layout/spacing**     | Reads auto-layout properties, constraints, positions       |
| **Export usable SVG assets**      | Serves SVG files directly for use in code                  |
| **Compare code vs design**        | Cross-references implementation with Figma specs           |
| **Generate responsive layouts**   | Translates Figma constraints to CSS flexbox/grid           |

---

## 📝 Notes

- The `data/` directory should be **gitignored** (contains potentially large files and API keys)
- Re-export when your Figma designs change significantly
- For teams on the free tier: coordinate exports to stay within the 6 calls/month limit
- SVG exports from Figma UI are unlimited (no API calls needed)
- The MCP server runs locally — no external services or deployments required

---

## 🔗 References

- [Figma REST API Documentation](https://www.figma.com/developers/api)
- [Figma API Rate Limits](https://www.figma.com/developers/api#rate-limits)
- [MCP SDK for Node.js](https://github.com/modelcontextprotocol/typescript-sdk)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Existing Figma MCP implementations](https://github.com/GLips/Figma-Context-MCP)
