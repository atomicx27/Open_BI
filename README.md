# PowerBI-Automation

A workspace and custom Model Context Protocol (MCP) server for automated, programmatic Power BI report layout generation, modeling, and dashboard syncing using Microsoft Fabric's new folder-based PBIR/TMDL formats.

---

## 🚀 Key Features

### 1. Custom Power BI Report Layout MCP Server (`pbir-mcp-server`)
A standalone Node.js MCP server that allows AI coding assistants and client tools to programmatically manage pages, themes, and visual layouts on local Power BI Projects (`.pbip`).
* **Visual Projections & Drilldowns:** Supports advanced visual query projections (projections list mappings for metrics vs dimensions). Enables **hierarchical axis mappings** (arrays in axes) for native **drilldown/drillup** visual interactions.
* **Layout Collision Fixer (`audit_layout`):** Automatically audits page layout bounding boxes, identifies overlapping elements, and auto-shifts overlaps down recursively to maintain clean alignments.
* **Dynamic Theme Registry (`apply_theme`):** Registers custom user-defined color themes in `report.json` and copies asset resources dynamically to ensure Power BI Desktop reloads them from disk.
* **Exposed Tools:**
  * `connect_project`: Connects to a local `.Report` folder.
  * `list_pages`: Lists all report pages.
  * `create_page`: Creates a new report page with standard metadata.
  * `add_visual`: Generates and adds visual containers (supporting column/bar/line/pie/donut/treemap/waterfall/scatter charts, cards, and slicers) using Fabric visual container schemas.
  * `delete_visual`: Safe deletion of visuals.
  * `create_table`: Programmatically constructs Table or Pivot Table (Matrix) visuals.
  * `format_visual`: Overrides formatting properties inside `visual.json` (such as titles, labels, borders, legends, and axis settings) using Fabric expression-based single-quoted literals.
  * `auto_arrange_page`: Auto-arranges all visuals on a page based on layout templates (`dynamicGrid`, `kpiHeader`, `splitScreen`, `alignLeft`, `alignTop`).
  * `add_action_button`: Adds interactive navigation or filter buttons.
  * `group_visuals`: Bundles multiple visuals together under a visual group container.
  * `sync_slicers`: Configures sync slicer options to enable cross-page filter sharing.

### 2. Time Intelligence DAX Modeling
Adds robust, aggregated time intelligence DAX calculations to tabular definition TMDL files on disk and synchronizes active Analysis Services sessions in-memory:
* **MTD / QTD / YTD Measures:** `Sales MTD`, `Profit MTD`, `Sales QTD`, `Profit QTD`, `Sales YTD`, and `Profit YTD`.
* **Rolling Averages:** `Sales 3M Rolling` and `Profit 3M Rolling`.
* **Robust YoY Growth:** `Sales YoY Growth` and `Profit YoY Growth` implemented using `SAMEPERIODLASTYEAR` to calculate rates correctly at both card-level aggregate views and sliced hierarchies.

### 3. YoY Sales Growth HTML Dashboard (`dashboard.html`)
An interactive, responsive HTML5 dashboard mirroring the Power BI project's metrics:
* Visualized using **Chart.js**.
* Styled following a premium dark/light layout that supports corporate color themes.
* Features responsive metrics, double-line monthly trend series, and interactive YoY KPI widgets.

---

## 🛠️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+)
* [Power BI Desktop](https://powerbi.microsoft.com/desktop/) (with Developer mode enabled for `.pbip` saves).

### Running the Custom Layout MCP Server
1. Navigate to the server folder:
   ```bash
   cd pbir-mcp-server
   ```
2. Install dependencies (none required, standard Node.js libraries only):
   ```bash
   npm install
   ```
3. Start the server (runs via stdin/stdout JSON-RPC protocol):
   ```bash
   node index.js
   ```
4. Run the advanced automated test suite to verify the server's functionality:
   ```bash
   node test_advanced_mcp.js
   ```

### Registering with AI Clients (e.g., Claude Desktop)
Add the following configuration to your global `mcp_config.json` or Claude desktop config:
```json
{
  "mcpServers": {
    "powerbi-report-layout-mcp": {
      "command": "node",
      "args": [
        "C:/Users/GTXS3893/.gemini/antigravity/scratch/PowerBi-Automation/pbir-mcp-server/index.js"
      ]
    }
  }
}
```

---

## 📖 MCP Tool Usage Examples

Clients and LLM agents can interact with the server by sending standard JSON-RPC `tools/call` requests.

### 1. Connect to Project
Connects the server session to a local report directory:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "connect_project",
    "arguments": {
      "projectPath": "C:\\Users\\GTXS3893\\OneDrive - orange.com\\Bureau\\sales.Report"
    }
  },
  "id": 1
}
```

### 2. Add Drilldown Column Chart
Creates a visual featuring a hierarchy on the axis (enabling drilldown):
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "add_visual",
    "arguments": {
      "pageId": "dabb1b8c934713b3a9af",
      "visualType": "clusteredColumnChart",
      "fields": {
        "xAxis": ["financials.Country", "financials.Segment", "financials.Product"],
        "yAxis": ["financials.Total Profit"]
      },
      "layout": { "x": 30, "y": 150, "width": 600, "height": 260 }
    }
  },
  "id": 2
}
```

### 3. Audit and Resolve Coordinate Overlaps
Automatically audits page layouts and resolves overlapping visuals:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "audit_layout",
    "arguments": {
      "pageId": "dabb1b8c934713b3a9af",
      "spacing": 20,
      "autoFix": true
    }
  },
  "id": 3
}
```

### 4. Apply Custom Color Theme
Registers a custom theme and copies assets dynamically:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "apply_theme",
    "arguments": {
      "themeName": "ProfitRedTheme",
      "colors": ["#D61A3C", "#FF4D4D", "#FFEBEB"]
    }
  },
  "id": 4
}
```

---

## 📁 Repository Structure

* `pbir-mcp-server/`: Custom layout automation server codebase.
* `dashboard.html`: Interactive web replica of the dashboard.
* `add_discount_visual.js`: Sample script programmatically injecting visuals into the PBIR folder structure.
* `inspect_model.js` & `inspect_table.js`: Model diagnostics and schema discovery.
* `create_time_intelligence_measures.js`: In-memory time intelligence DAX measure creation.
* `build_extended_visuals_demo.js`: Test validation script showcasing treemaps, waterfall charts, and custom layout audits.
* `build_profit_drilldown_dashboard.js`: Script for generating the Profit Dashboard with native drilldown.
