import { Hono } from "hono";
export { Doc } from "./doc";

type Env = {
  Bindings: {
    DOC: DurableObjectNamespace;
  };
};
const app = new Hono<Env>();

app.get("/ws/:roomId", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const { roomId } = c.req.param();
  const id = c.env.DOC.idFromName(roomId);
  const obj = c.env.DOC.get(id);

  return obj.fetch(c.req.raw);
});

export default app;
