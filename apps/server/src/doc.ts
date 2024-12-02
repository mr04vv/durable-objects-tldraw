import { DurableObject } from "cloudflare:workers";
import { LoroDoc } from "loro-crdt";

export class Doc extends DurableObject {
  // websocketの接続情報を管理
  connections: Set<WebSocket>;
  doc: LoroDoc;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.connections = new Set<WebSocket>();
    this.doc = new LoroDoc();
  }

  async fetch() {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.connections.add(server);

    server.accept();
    server.addEventListener("message", (event) => {
      const message = event.data as ArrayBuffer;

      const array = new Uint8Array(message);
      for (const conn of this.connections) {
        // 送信元以外にブロードキャスト
        if (conn === server) continue;
        // awarenessとdataを判別
        if (array[0] === 1) {
          conn.send(event.data);
        } else {
          const data = array.slice(1);
          // docにデータをimport
          this.doc.import(data);
          conn.send(data);
        }
      }
    });

    // 保存された状態からsnapshotを取得
    const snapshot = this.doc.export({ mode: "snapshot" });
    server.send(snapshot);
    return new Response(null, { status: 101, webSocket: client });
  }
}
