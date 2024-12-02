import type { LoroEventBatch, VersionVector } from "loro-crdt";
import { useCallback, useEffect, useRef } from "react";
import { type TLRecord, type TLShape, type TLShapeId, useEditor } from "tldraw";
import "tldraw/tldraw.css";
import { useCrdt } from "./hooks/use-crdt";
import { useLoro } from "./providers/loro-provider";

function App() {
  const editor = useEditor();
  const { updateMap, removeFromMap } = useCrdt();
  const { doc, wsProvider, awareness } = useLoro();
  const versionRef = useRef<VersionVector>(doc.version());

  const includeAssetOrShapeString = useCallback((str: string) => {
    return (
      str.includes("asset") || str.includes("shape") || str.includes("binding")
    );
  }, []);
  const isAssetOrShape = useCallback((typeName: string) => {
    return (
      typeName === "asset" || typeName === "shape" || typeName === "binding"
    );
  }, []);

  const handleAddedObject = useCallback(
    (added: Record<string, TLRecord>) => {
      const addedObjKeys = Object.keys(added);
      const addedObj = Object.values(added);
      if (!addedObj.length) return;
      const includeShape = addedObjKeys.some((key) =>
        includeAssetOrShapeString(key),
      );
      if (includeShape) {
        for (const shape of addedObj) {
          if (!isAssetOrShape(shape?.typeName)) continue;
          updateMap(shape);
        }
      }
      doc.commit();
    },
    [doc, includeAssetOrShapeString, isAssetOrShape, updateMap],
  );

  const handleUpdatedObject = useCallback(
    (updated: Record<string, [from: TLRecord, to: TLRecord]>) => {
      const updatedObjKeys = Object.keys(updated);
      const updatedObj = Object.values(updated);
      if (!updatedObj.length) return;
      const includeShape = updatedObjKeys.some((key) =>
        includeAssetOrShapeString(key),
      );
      if (includeShape) {
        for (const shaped of updatedObj) {
          const updatedShape = shaped[1];
          if (!isAssetOrShape(updatedShape?.typeName)) continue;
          updateMap(updatedShape);
        }
      }
      doc.commit();
    },
    [doc, includeAssetOrShapeString, isAssetOrShape, updateMap],
  );

  const handleRemovedObject = useCallback(
    (removed: Record<string, TLRecord>) => {
      const removedObj = Object.values(removed);
      if (!removedObj.length) return;
      for (const shape of removedObj) {
        removeFromMap(shape);
      }

      doc.commit();
    },
    [doc, removeFromMap],
  );

  const handleMapUpdate = useCallback(
    (e: LoroEventBatch) => {
      if (e.by === "local") {
        const updated = doc.export({
          mode: "update",
          from: versionRef.current,
        });
        const messageType = 0;
        const message = new Uint8Array([messageType, ...updated]);
        wsProvider.send(message);
        versionRef.current = doc.version();
      }
      if (e.by === "import") {
        const updateShapes: TLRecord[] = [];
        const deleteShapeIds: TLShapeId[] = [];
        const events = e.events;
        for (const event of events) {
          if (event.diff.type === "map") {
            const map = event.diff.updated;
            for (const key in map) {
              const shape = map[key] as unknown as TLShape;
              if (shape === null) {
                deleteShapeIds.push(key as TLShapeId);
              } else {
                updateShapes.push(shape);
              }
            }
          }
        }
        editor.store.mergeRemoteChanges(() => {
          editor.store.put([...updateShapes]);
          editor.store.remove([...deleteShapeIds]);
        });
      }
    },
    [doc, editor.store, wsProvider],
  );

  useEffect(() => {
    const listen = editor.store.listen((e) => {
      const { changes, source } = e;
      if (source !== "user") return;
      const { added, removed, updated } = changes;

      handleAddedObject(added);
      handleUpdatedObject(updated);
      handleRemovedObject(removed);
    });
    return listen;
  }, [
    editor.store,
    handleAddedObject,
    handleRemovedObject,
    handleUpdatedObject,
  ]);

  const handleWsMessage = useCallback(
    async (ev: MessageEvent) => {
      try {
        const data = ev.data;
        const arrayMessage = new Uint8Array(data);
        const message = arrayMessage.slice(1);
        if (arrayMessage[0] === 1) {
          awareness.apply(new Uint8Array(message as ArrayBuffer));
          return;
        }
        const bytes = new Uint8Array(message as ArrayBuffer);
        doc.import(bytes);
        versionRef.current = doc.version();
      } catch (err) {
        console.error(err);
      }
    },
    [awareness, doc],
  );

  useEffect(() => {
    wsProvider.addEventListener("message", handleWsMessage);
    return () => {
      wsProvider.removeEventListener("message", handleWsMessage);
    };
  }, [handleWsMessage, wsProvider]);

  useEffect(() => {
    doc.getMap("map").subscribe(handleMapUpdate);
  }, [doc, handleMapUpdate]);

  useEffect(() => {
    const handleMouseEvent = (e: MouseEvent) => {
      const pagePosition = editor.screenToPage({ x: e.clientX, y: e.clientY });
      awareness.setLocalState({
        position: {
          x: pagePosition.x,
          y: pagePosition.y,
          z: editor.getCamera().z,
        },
        userId: doc.peerIdStr,
        userName: `user:${doc.peerIdStr.slice(0, 3)}`,
      });
    };

    window.addEventListener("mousemove", handleMouseEvent);
    return () => {
      window.removeEventListener("mousemove", handleMouseEvent);
    };
  }, [awareness, doc.peerIdStr, editor]);
  return <></>;
}

export default App;
