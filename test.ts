import { HttpProxyAgent } from "http-proxy-agent";
import fetch from "node-fetch";

async function test() {
  const proxy = "http://localhost:4848";
  const agent = new HttpProxyAgent(proxy);
  const response = await fetch("http://ip-api.com", { agent });
  const text = await response.arrayBuffer();

  console.log(response.status, response.headers, text);
}

test();
