import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { type AwarenessState, useLoro } from "./providers/loro-provider";
import { track, useEditor } from "tldraw";
import { useTransform } from "./hooks/use-transform";
import { useReceiverQuickReactor } from "./hooks/use-receiver-quick-reactor";

export const CollaboratorCursors = track(() => {
  const { awareness } = useLoro();
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  useReceiverQuickReactor(ref);
  const [awarenessStates, setAwarenessStates] = useState<{
    [clientId: string]: AwarenessState;
  }>({});
  useEffect(() => {
    awareness.addListener((updated, origin) => {
      if (origin === "local") return;
      const awarenessStates = awareness.getAllStates();
      for (const updatedClientId in updated.updated) {
        const state = awarenessStates[`${updated.updated[updatedClientId]}`];
        setAwarenessStates((prev) => ({
          ...prev,
          [updatedClientId]: state,
        }));
      }
    });
  }, [awareness]);

  const zoom = editor.getCamera().z;

  return (
    <div
      ref={ref}
      style={{
        zIndex: 999999,
        position: "fixed",
        pointerEvents: "none",
        userSelect: "none",
        top: 0,
      }}
    >
      {Object.values(awarenessStates).map((value) => {
        if (!value?.position || !value?.userName || !value?.userId) return null;
        return (
          <Pointer
            key={value.userId}
            zoom={zoom}
            position={{
              x: value.position.x,
              y: value.position.y,
            }}
            userName={value.userName}
            userId={value.userId}
          />
        );
      })}
    </div>
  );
});

interface Props {
  position: { x: number; y: number };
  userName: string;
  userId: string;
  zoom: number;
}

const Pointer = (props: Props) => {
  const rDiv = useRef<HTMLDivElement>(null);
  useTransform(rDiv, props.position?.x, props.position?.y, 1 / props.zoom);

  return (
    <motion.div
      ref={rDiv}
      transition={{
        type: "spring",
        damping: 60,
        mass: 2,
        stiffness: 400,
      }}
      initial={{ x: props.position.x, y: props.position.y }}
      animate={{ x: props.position.x, y: props.position.y }}
      style={{
        backgroundColor: "blue",
        color: "white",
        borderRadius: 40,
        padding: 20,
        height: 40,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 16,
        overflow: "visible",
        pointerEvents: "none",
        transformOrigin: "top left",
        position: "absolute",
        x: props.position.x,
        y: props.position.y,
        scale: 1 / props.zoom,
      }}
      key={props.userId}
    >
      <p style={{ whiteSpace: "nowrap" }}>{props.userName}</p>
    </motion.div>
  );
};
