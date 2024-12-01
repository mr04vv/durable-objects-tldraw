import { LoroDoc, type LoroEventBatch, type VersionVector } from "loro-crdt";
import { useCallback, useEffect, useRef } from "react";
import { type TLRecord, type TLShape, type TLShapeId, useEditor } from "tldraw";
import "tldraw/tldraw.css";
import { useCrdt } from "./hooks/use-crdt";
import { useLoro } from "./providers/loro-provider";
const doc2 = new LoroDoc();

function App() {
  const editor = useEditor();
  const { updateMap, removeFromMap } = useCrdt();
  const { doc, wsProvider } = useLoro();
  const versionRef = useRef<VersionVector>(doc.version());

  const includeAssetOrShapeString = useCallback((str: string) => {
    return str.includes("asset") || str.includes("shape");
  }, []);
  const isAssetOrShape = useCallback((typeName: string) => {
    return typeName === "asset" || typeName === "shape";
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
        const message = new Uint8Array(updated);
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
        doc.import(arrayMessage);
        versionRef.current = doc.version();
      } catch (err) {
        console.error(err);
      }
    },
    [doc],
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

  return <></>;
}

export default App;
