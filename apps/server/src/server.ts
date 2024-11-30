import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";
import { serve } from "@hono/node-server";
import { WebSocket } from "ws";

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({
  app,
});

const port = 1234;
const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);

console.log(`Server is running on port ${port}`);

const conns: WebSocket[] = [];
app.get(
  "/",
  upgradeWebSocket(() => {
    return {
      onOpen: async (evt, ws) => {
        if (!ws.raw) return;
        if (!(ws.raw instanceof WebSocket)) return;
        if (!conns.includes(ws.raw)) conns.push(ws.raw);
      },
      onMessage: (message, ws) => {
        if (!ws.raw) return;
        if (!(ws.raw instanceof WebSocket)) return;
        const update = message.data as ArrayBuffer;
        ws.raw.binaryType = "arraybuffer";
        for (const conn of conns) {
          if (conn === ws.raw) continue;
          conn.send(update);
        }
      },
    };
  }),
);
