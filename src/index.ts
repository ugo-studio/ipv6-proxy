import http from "http";
import https from "https";
import fetch from "node-fetch";
import { pipeline as streamPipeline } from "stream/promises";
import denv from "@dotenvx/dotenvx";
import { getRandomIPv6 } from "./ipv6";

// load env
denv.config();

// Bearer Auth tokens
const TOKENS =
  process.env.TOKENS?.split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 3) ?? [];

// Function to validate Auth tokens
function checkAuth(req: http.IncomingMessage) {
  if (TOKENS.length === 0) return true;
  const authHeader = req.headers["proxy-authorization"];
  if (authHeader && TOKENS.includes(authHeader)) return true;
  else return false;
}

const server = http.createServer(async (req, res) => {
  try {
    // check auth
    if (!checkAuth(req)) {
      res.writeHead(401);
      return res.end("Proxy access denied");
    }
    // get target url
    let url: URL;
    try {
      url = new URL(String(req.url).substring(1));
    } catch (err: any) {
      res.writeHead(500);
      return res.end(`${err.message}`);
    }
    // generate ipv6 address from subnet
    const ipAddr = getRandomIPv6(process.env.SUBNET);
    console.log(`Proxying ${url.origin} with ${ipAddr}`);
    // get agent
    const agent = new (url.protocol === "http:" ? http : https).Agent(
      ipAddr
        ? {
            localAddress: ipAddr,
            family: 6,
          }
        : {}
    );
    // fetch request
    const reqHeaders = Object.assign(req.headers, {
      host: url.host,
      "proxy-authorization": undefined,
    });
    const reqBody = req.method === "GET" || req.method === "HEAD" ? null : req;
    const response = await fetch(url.href, {
      agent,
      body: reqBody,
      method: req.method,
      headers: reqHeaders as any,
      redirect: "manual",
    });
    // rewrite headers
    const resHeaders = Object.fromEntries(response.headers.entries());
    const location = response.headers.get("location");
    if (location) resHeaders.location = `/${location}`;
    // pipe to reponse
    res.writeHead(response.status, resHeaders);
    if (response.body) await streamPipeline(response.body, res);
    return res.end();
  } catch (err: any) {
    res.writeHead(500);
    return res.end(`${err.message}`);
  }
});

const port = Number(process.env.PORT || 4848);
server.listen(port, "0.0.0.0", () =>
  console.log(`server listening at http://localhost:${port}`)
);
