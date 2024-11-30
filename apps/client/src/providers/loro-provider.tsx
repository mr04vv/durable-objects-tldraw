import { LoroDoc } from "loro-crdt";
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
  useEffect(() => {
    wsProvider.onerror = (err) => {
      console.log(err);
    };
  }, [wsProvider]);
  return (
    <LoroContext.Provider value={{ doc, wsProvider, userName }}>
      {children}
    </LoroContext.Provider>
  );
};
