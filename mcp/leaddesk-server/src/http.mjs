// LeadDesk over Streamable HTTP, localhost only (Task E1). Same factory as the stdio server.
//
//   node src/http.mjs        http://127.0.0.1:3333/mcp
//
// The Host/Origin guards are called by hand before the MCP handler: passed as a toNodeHandler
// option they are silently ignored, and a forged Host gets 200 (DNS rebinding).
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { factory } from "./server.mjs";

const HOST = "127.0.0.1";
const PORT = 3333;

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(PORT, HOST, () => console.error(`leaddesk: http://${HOST}:${PORT}/mcp`));
