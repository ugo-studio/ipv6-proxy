import http from "http";
import https from "https";
import fetch from "node-fetch";
import { pipeline as streamPipeline } from "stream/promises";
import { HttpProxyAgent } from "http-proxy-agent";
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

// Server request handler
const serverListener = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  try {
    // check auth
    if (!checkAuth(req)) {
      res.writeHead(401);
      return res.end("Proxy access denied");
    }

    // check if used as url proxy
    const urlStr = String(req.url);
    const asUrlProxy = urlStr.startsWith("/");

    // get target url
    let url: URL;
    try {
      const urlProxy = process.env.URL_PROXY;
      url = new URL(
        (urlProxy ? `${new URL(urlProxy).origin}/` : "") +
          urlStr.substring(asUrlProxy ? 1 : 0)
      );
      const isHttps = url.origin.includes(":443");
      if (isHttps) {
        url.protocol = "https:";
        url = new URL(
          url.href.replace(url.origin, url.origin.replace(":443", ""))
        );
      }
    } catch (err: any) {
      res.writeHead(500);
      return res.end(`${err.message}`);
    }

    // get ipv6 proxy and generate ipv6 address  from SUBNET
    const ipv4Addr = process.env.AGENT_PROXY;
    const ipv6Addr = getRandomIPv6(process.env.SUBNET);
    console.log(`Proxying ${url.href} with ${ipv6Addr || ipv4Addr}`);

    // get agent
    let agent: http.Agent | https.Agent | HttpProxyAgent<string> | undefined;
    if (ipv6Addr)
      agent = new (url.protocol === "http:" ? http : https).Agent({
        localAddress: ipv6Addr,
        family: 6,
      });
    else if (ipv4Addr) agent = new HttpProxyAgent(ipv4Addr);

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

    // rewrite response headers
    const resHeaders = Object.fromEntries(response.headers.entries());
    if (asUrlProxy) {
      const location = response.headers.get("location");
      if (location) resHeaders.location = `/${location}`;
    }

    // pipe fetch reponse to client
    res.writeHead(response.status, resHeaders);
    if (response.body) await streamPipeline(response.body, res);
    return res.end();
  } catch (err: any) {
    // handle error
    try {
      res.writeHead(500);
    } catch (_) {}
    return res.end(`${err.message}`);
  }
};

// Create HTTP server
const server = http.createServer(serverListener);

const port = Number(process.env.PORT || 4848);

server.listen(port, "0.0.0.0", () =>
  console.log(`server listening at http://localhost:${port}`)
);
