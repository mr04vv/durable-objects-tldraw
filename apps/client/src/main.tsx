import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LoroProvider } from "./providers/loro-provider.tsx";
import { Tldraw } from "tldraw";
import { CollaboratorCursors } from "./cursor.tsx";

// biome-ignore lint/style/noNonNullAssertion: <explanation>
createRoot(document.getElementById("root")!).render(
  <div style={{ position: "fixed", inset: 0 }}>
    <Tldraw>
      <LoroProvider>
        <CollaboratorCursors />
        <App />
      </LoroProvider>
    </Tldraw>
  </div>,
);
