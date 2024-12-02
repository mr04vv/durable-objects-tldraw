import type { RefObject } from "react";
import { useEditor, useQuickReactor, toDomPrecision } from "tldraw";

export const useReceiverQuickReactor = (
  containerRef: RefObject<HTMLDivElement>,
) => {
  const app = useEditor();
  const camera = app.getCamera();

  return useQuickReactor(
    "position layers",
    () => {
      containerRef.current?.style.setProperty(
        "transform",
        `scale(${toDomPrecision(camera.z)}) translate(${toDomPrecision(
          camera.x,
        )}px,${toDomPrecision(camera.y)}px) translateZ(1px)`,
      );
    },
    [camera],
  );
};
