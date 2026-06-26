const { spawn, execSync } = require('child_process');
const path = require('path');

function getActivePort() {
  try {
    const psCmd = 'Get-NetTCPConnection -State Listen | Where-Object { $_.OwningProcess -in (Get-Process -Name msmdsrv -ErrorAction SilentlyContinue).Id } | Select-Object -ExpandProperty LocalPort';
    const output = execSync(`powershell -Command "${psCmd}"`).toString().trim();
    if (output) {
      const ports = output.split(/\r?\n/).map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      if (ports.length > 0) {
        return ports[0];
      }
    }
  } catch (e) {
    console.error("Failed to find active port:", e.message);
  }
  return null;
}

const activePort = getActivePort();
if (!activePort) {
  console.error("No active port found.");
  process.exit(1);
}
console.log(`Active port: ${activePort}`);

const exePath = "C:\\Users\\GTXS3893\\AppData\\Local\\npm-cache\\_npx\\deea81b821a9ed55\\node_modules\\@microsoft\\powerbi-modeling-mcp-win32-x64\\dist\\powerbi-modeling-mcp.exe";
const mcp = spawn(exePath, ['--start'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let output = '';
let currentRequestId = 1;

function send(method, params) {
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params, id: currentRequestId++ }) + "\n");
}

mcp.stdout.on('data', (data) => {
  output += data.toString();
  const lines = output.split('\n');
  output = lines.pop();

  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      try {
        const json = JSON.parse(line.trim());
        if (json.id === 1) {
          console.log("Connected successfully! Updating YoY measures in-memory...");
          send("tools/call", {
            name: "measure_operations",
            arguments: {
              request: {
                operation: "Update",
                definitions: [
                  {
                    tableName: "financials",
                    name: "Profit YoY Growth",
                    expression: "VAR PriorProfit = CALCULATE([Total Profit], ALL(financials[Year]), TREATAS(SELECTCOLUMNS(VALUES(financials[Year]), \"PriorYear\", financials[Year] - 1), financials[Year])) RETURN DIVIDE([Total Profit] - PriorProfit, PriorProfit)",
                    formatString: "0.0%",
                    description: "Profit Year-over-Year Growth Rate"
                  },
                  {
                    tableName: "financials",
                    name: "Sales YoY Growth",
                    expression: "VAR PriorSales = CALCULATE([Total Sales], ALL(financials[Year]), TREATAS(SELECTCOLUMNS(VALUES(financials[Year]), \"PriorYear\", financials[Year] - 1), financials[Year])) RETURN DIVIDE([Total Sales] - PriorSales, PriorSales)",
                    formatString: "0.0%",
                    description: "Sales Year-over-Year Growth Rate"
                  }
                ]
              }
            }
          });
        } else if (json.id === 2) {
          console.log("\n--- IN-MEMORY MEASURES UPDATE RESPONSE ---");
          console.dir(json.result, { depth: null });
          mcp.kill();
          process.exit(0);
        }
      } catch (e) {
      }
    }
  }
});

setTimeout(() => {
  send("tools/call", {
    name: "connection_operations",
    arguments: {
      request: {
        operation: "Connect",
        connectionString: `Provider=MSOLAP;Data Source=localhost:${activePort}`
      }
    }
  });
}, 1500);
