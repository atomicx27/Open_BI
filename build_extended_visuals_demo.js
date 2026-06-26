const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;

const realReportPath = 'C:\\Users\\GTXS3893\\OneDrive - orange.com\\Bureau\\sales.Report';

function runDemo() {
  console.log("Starting Automation Demo build script...");
  
  const mcp = spawn('node', [path.join(__dirname, 'pbir-mcp-server', 'index.js')], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let responseId = 1;
  const pendingRequests = new Map();
  let buffer = '';

  mcp.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line);
        if (response.id && pendingRequests.has(response.id)) {
          const { resolve, reject } = pendingRequests.get(response.id);
          pendingRequests.delete(response.id);
          resolve(response);
        }
      } catch (err) {
        console.error("Failed to parse stdout line:", line, err);
      }
    }
  });

  function sendRequest(method, params = {}) {
    const id = responseId++;
    const request = {
      jsonrpc: "2.0",
      method,
      params,
      id
    };
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      mcp.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async function executeDemo() {
    try {
      // 1. Initialize
      console.log("Initializing MCP connection...");
      await sendRequest('initialize');

      // 2. Connect to the real project
      console.log(`Connecting to project: ${realReportPath}...`);
      const connResp = await sendRequest('tools/call', {
        name: 'connect_project',
        arguments: { projectPath: realReportPath }
      });
      console.log("Connection result:", connResp.result.content[0].text);

      // 3. Create a new page named "Automation Demo"
      console.log("Creating new page 'Automation Demo'...");
      const pageResp = await sendRequest('tools/call', {
        name: 'create_page',
        arguments: { pageName: "Automation Demo" }
      });
      const pageResult = JSON.parse(pageResp.result.content[0].text);
      const pageId = pageResult.pageId;
      console.log(`✓ Created page with ID: ${pageId}`);

      // 4. Add Treemap: Sales by Segment
      console.log("Adding Treemap: Sales by Segment...");
      const treemapResp = await sendRequest('tools/call', {
        name: 'add_visual',
        arguments: {
          pageId,
          visualType: "treemap",
          fields: {
            group: "financials.Segment",
            value: "financials.Total Sales"
          },
          layout: { x: 50, y: 50, width: 400, height: 250 }
        }
      });
      const treemapVisualId = JSON.parse(treemapResp.result.content[0].text).visualId;
      console.log(`✓ Added Treemap with visual ID: ${treemapVisualId}`);

      // 5. Add Waterfall chart: Profit by Product
      console.log("Adding Waterfall Chart: Profit by Product...");
      const waterfallResp = await sendRequest('tools/call', {
        name: 'add_visual',
        arguments: {
          pageId,
          visualType: "waterfallChart",
          fields: {
            category: "financials.Product",
            yAxis: "financials.Total Profit"
          },
          layout: { x: 500, y: 50, width: 400, height: 250 }
        }
      });
      const waterfallVisualId = JSON.parse(waterfallResp.result.content[0].text).visualId;
      console.log(`✓ Added Waterfall Chart with visual ID: ${waterfallVisualId}`);

      // 6. Add Scatter chart: Profit vs Sales by Country
      console.log("Adding Scatter Chart: Profit vs Sales by Country...");
      const scatterResp = await sendRequest('tools/call', {
        name: 'add_visual',
        arguments: {
          pageId,
          visualType: "scatterChart",
          fields: {
            series: "financials.Country",
            xAxis: "financials.Total Sales",
            yAxis: "financials.Total Profit"
          },
          layout: { x: 50, y: 350, width: 450, height: 300 }
        }
      });
      const scatterVisualId = JSON.parse(scatterResp.result.content[0].text).visualId;
      console.log(`✓ Added Scatter Chart with visual ID: ${scatterVisualId}`);

      // 7. Add an overlapping visual: Card for Sales MTD
      // This overlaps the Treemap intentionally (x: 100, y: 100 instead of below/beside it)
      console.log("Adding intentionally overlapping Card: Sales MTD...");
      const overlapCardResp = await sendRequest('tools/call', {
        name: 'add_visual',
        arguments: {
          pageId,
          visualType: "card",
          fields: {
            value: "financials.Sales MTD"
          },
          layout: { x: 100, y: 100, width: 200, height: 100 }
        }
      });
      const overlapCardId = JSON.parse(overlapCardResp.result.content[0].text).visualId;
      console.log(`✓ Added Overlapping Card with visual ID: ${overlapCardId}`);

      // Let's verify the layout overlaps using audit_layout with autoFix: false first
      console.log("Auditing layout BEFORE fix (autoFix: false)...");
      const auditBeforeResp = await sendRequest('tools/call', {
        name: 'audit_layout',
        arguments: { pageId, autoFix: false }
      });
      const auditBeforeResult = JSON.parse(auditBeforeResp.result.content[0].text);
      console.log("Before Fix Overlaps:", auditBeforeResult.overlaps);
      assert(auditBeforeResult.overlaps.length > 0, "There should be overlaps detected!");

      // Now run audit_layout with autoFix: true
      console.log("Running layout auto-fix (autoFix: true)...");
      const auditAfterResp = await sendRequest('tools/call', {
        name: 'audit_layout',
        arguments: { pageId, spacing: 30, autoFix: true }
      });
      const auditAfterResult = JSON.parse(auditAfterResp.result.content[0].text);
      console.log("After Fix Result:", auditAfterResult);
      assert(auditAfterResult.fixed, "Overlap should have been resolved and fixed!");

      // Let's audit again to verify no overlaps remain
      console.log("Auditing layout AFTER fix...");
      const finalAuditResp = await sendRequest('tools/call', {
        name: 'audit_layout',
        arguments: { pageId, autoFix: false }
      });
      const finalAuditResult = JSON.parse(finalAuditResp.result.content[0].text);
      console.log("Final Overlaps:", finalAuditResult.overlaps);
      assert.equal(finalAuditResult.overlaps.length, 0, "No overlaps should remain after auto-fix!");
      console.log("✓ Layout Overlap Fixer verified successfully!");

      // 8. Apply theme: Sales Purple-Lavender Palette
      console.log("Applying theme 'SalesLavenderTheme'...");
      const themeResp = await sendRequest('tools/call', {
        name: 'apply_theme',
        arguments: {
          themeName: "SalesLavenderTheme",
          colors: ['#4b0082', '#9370db', '#8a2be2', '#e6e6fa', '#ba55d3', '#da70d6']
        }
      });
      console.log("Theme Apply Result:", themeResp.result.content[0].text);
      
      console.log("\n★ DEMO RUN SUCCESSFUL: New visuals, overlap fixer, and themes work perfectly! ★\n");
      mcp.kill();
      process.exit(0);

    } catch (err) {
      console.error("\n❌ DEMO RUN FAILED:", err);
      mcp.kill();
      process.exit(1);
    }
  }

  executeDemo();
}

runDemo();
