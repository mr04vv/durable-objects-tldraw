import { Awareness, LoroDoc } from "loro-crdt";
import { useEffect, useMemo } from "react";
import { createContextWrapper } from "../create-context-wrapper";

export type AwarenessState = {
  userId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  userName: string;
};
type LoroContextType = {
  doc: LoroDoc;
  wsProvider: WebSocket;
  userName: string;
  awareness: Awareness<AwarenessState>;
};
const [useLoro, LoroContext] = createContextWrapper<LoroContextType>();
// eslint-disable-next-line react-refresh/only-export-components
export { useLoro };
type Props = {
  children: React.ReactNode;
};

export const LoroProvider = ({ children }: Props) => {
  const doc = useMemo(() => new LoroDoc(), []);
  const userName =
    new URLSearchParams(location.search).get("userName") || "name";
  const wsProvider = useMemo(() => {
    return new WebSocket("ws://localhost:1234");
  }, []);

  wsProvider.binaryType = "arraybuffer";

  const awareness = useMemo(
    () => new Awareness<AwarenessState>(doc.peerIdStr),
    [doc.peerIdStr],
  );
  useEffect(() => {
    wsProvider.onerror = (err) => {
      console.log(err);
    };
  }, [wsProvider]);

  useEffect(() => {
    awareness.addListener((_, origin) => {
      if (origin !== "local") return;
      const encoded = awareness.encode(awareness.peers());
      const messageType = 1;
      // messageTypeを先頭に付けてencodedを送信
      const message = new Uint8Array([messageType, ...encoded]);
      wsProvider.send(message);
    });
  }, [awareness, wsProvider]);
  return (
    <LoroContext.Provider value={{ doc, wsProvider, userName, awareness }}>
      {children}
    </LoroContext.Provider>
  );
};
