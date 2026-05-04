/** Stub for client bundles; modern-pdf-lib only needs this on Node when loading WASM from disk. */
export async function readFile() {
  throw new Error("Filesystem WASM loading is not available in the browser bundle.");
}
