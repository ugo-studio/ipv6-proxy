import http from "http";
import httpProxy from "http-proxy";
import denv from "@dotenvx/dotenvx";
import { getRandomIPv6 } from "./ipv6";

// load env
denv.config();

const proxy = httpProxy.createProxyServer({});

// Basic Auth credentials (set your own)
const USERNAME = process.env.USER;
const PASSWORD = process.env.PASS;

// Function to parse and validate Basic Auth credentials
function checkAuth(req: http.IncomingMessage) {
  if (!USERNAME || !PASSWORD) return true;

  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }
  // Decode base64 credentials
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");
  // Check if the provided credentials match the expected ones
  return username === USERNAME && password === PASSWORD;
}

const server = http.createServer((req, res) => {
  // check auth
  if (!checkAuth(req)) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Restricted Area"' });
    return res.end("Access denied");
  }
  // generate ipv6 address from subnet
  const ipAddr = getRandomIPv6(process.env.SUBNET);
  // fetch and pipe to response
  console.log(`Proxying ${new URL(req.url ?? "").origin} with ${ipAddr}`);
  proxy.web(req, res, { target: req.url, localAddress: ipAddr });
});

const port = Number(process.env.PORT || 4040);
server.listen(port, () =>
  console.log(`server listening at http://localhost:${port}`)
);
