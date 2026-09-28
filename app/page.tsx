"use client";

import { useEffect, useState } from "react";

function watch(worker: Worker, setState: (state: string) => void) {
  worker.onmessage = (event) => setState(String(event.data));
  worker.onerror = (event) => {
    event.preventDefault();
    setState(`error: ${event.message}`);
  };
}

export default function Page() {
  const [control, setControl] = useState("pending");
  const [decorated, setDecorated] = useState("pending");

  useEffect(() => {
    // Control: a plain worker, exactly as Turbopack emits it.
    watch(new Worker(new URL("./worker.ts", import.meta.url)), setControl);

    // Decorated: the same worker, but the environment appends a query string to the
    // worker script URL, as the Facebook / Instagram in-app browsers and some link
    // decorators do (e.g. `?fbclid=...`).
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(`${String(url)}?fbclid=abc`, options);
      }
    };
    try {
      watch(new Worker(new URL("./worker.ts", import.meta.url)), setDecorated);
    } finally {
      window.Worker = NativeWorker;
    }
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Turbopack worker bootstrap vs. an appended query</h1>
      <p>
        Control worker: <code id="control">{control}</code>
      </p>
      <p>
        Worker URL with <code>?fbclid=abc</code> appended:{" "}
        <code id="decorated">{decorated}</code>
      </p>
      <p>Expected: both say &quot;booted&quot;.</p>
    </main>
  );
}
