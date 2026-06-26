const { spawn, execSync } = require('child_process');

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
          console.log("Connected successfully! Creating time intelligence measures...");
          send("tools/call", {
            name: "measure_operations",
            arguments: {
              request: {
                operation: "Create",
                definitions: [
                  {
                    tableName: "financials",
                    name: "Sales MTD",
                    expression: "TOTALMTD([Total Sales], financials[Date])",
                    formatString: "$#,##0.00",
                    description: "Sales Month-to-Date"
                  },
                  {
                    tableName: "financials",
                    name: "Profit MTD",
                    expression: "TOTALMTD([Total Profit], financials[Date])",
                    formatString: "$#,##0.00",
                    description: "Profit Month-to-Date"
                  },
                  {
                    tableName: "financials",
                    name: "Sales QTD",
                    expression: "TOTALQTD([Total Sales], financials[Date])",
                    formatString: "$#,##0.00",
                    description: "Sales Quarter-to-Date"
                  },
                  {
                    tableName: "financials",
                    name: "Profit QTD",
                    expression: "TOTALQTD([Total Profit], financials[Date])",
                    formatString: "$#,##0.00",
                    description: "Profit Quarter-to-Date"
                  },
                  {
                    tableName: "financials",
                    name: "Sales YTD",
                    expression: "TOTALYTD([Total Sales], financials[Date])",
                    formatString: "$#,##0.00",
                    description: "Sales Year-to-Date"
                  },
                  {
                    tableName: "financials",
                    name: "Profit YTD",
                    expression: "TOTALYTD([Total Profit], financials[Date])",
                    formatString: "$#,##0.00",
                    description: "Profit Year-to-Date"
                  },
                  {
                    tableName: "financials",
                    name: "Sales 3M Rolling",
                    expression: "CALCULATE(AVERAGEX(VALUES(financials[Date]), [Total Sales]), DATESINPERIOD(financials[Date], LASTDATE(financials[Date]), -3, MONTH))",
                    formatString: "$#,##0.00",
                    description: "Sales 3-Month Rolling Average"
                  },
                  {
                    tableName: "financials",
                    name: "Profit 3M Rolling",
                    expression: "CALCULATE(AVERAGEX(VALUES(financials[Date]), [Total Profit]), DATESINPERIOD(financials[Date], LASTDATE(financials[Date]), -3, MONTH))",
                    formatString: "$#,##0.00",
                    description: "Profit 3-Month Rolling Average"
                  }
                ]
              }
            }
          });
        } else if (json.id === 2) {
          console.log("\n--- TIME INTELLIGENCE MEASURES RESPONSE ---");
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
