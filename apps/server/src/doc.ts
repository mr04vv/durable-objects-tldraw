import { DurableObject } from "cloudflare:workers";
import { LoroDoc } from "loro-crdt";

export class Doc extends DurableObject {
  // websocketの接続情報を管理
  connections: Set<WebSocket> = new Set();
  doc: LoroDoc = new LoroDoc();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void this.ctx.blockConcurrencyWhile(async () => {
      for (const ws of this.ctx.getWebSockets()) {
        this.connections.add(ws);
      }
    });
  }
  async fetch() {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    this.connections.add(server);
    this.ctx.acceptWebSocket(server);
    // 保存された状態からsnapshotを取得
    const doc = await this.ctx.storage.get("doc");
    server.send(doc as ArrayBuffer);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    if (message instanceof ArrayBuffer) {
      const array = new Uint8Array(message);
      for (const conn of this.connections) {
        // 送信元以外にブロードキャスト
        // awarenessとdataを判別
        if (array[0] === 1) {
          if (conn === ws) continue;
          conn.send(array);
        } else {
          const data = array.slice(1);
          this.doc.import(data);
          if (conn === ws) continue;
          conn.send(data);
        }
      }
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.cleanup(ws, 1006);
  }

  async webSocketClose(ws: WebSocket, code: number) {
    this.cleanup(ws, code);
  }

  cleanup = async (ws: WebSocket, code: number) => {
    if (this.connections.size < 2) {
      await this.ctx.storage.put("doc", this.doc.export({ mode: "snapshot" }));
    }
    this.connections.delete(ws);
    ws.close(code, "Durable Object is closing WebSocket");
  };
}
