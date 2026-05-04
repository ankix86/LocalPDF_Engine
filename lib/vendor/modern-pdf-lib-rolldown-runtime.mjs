/**
 * modern-pdf-lib 0.26.0 ships chunks that import `Gs` (__exportAll) from
 * `index-B4S61WjK.d.mts`, which is typings-only. Webpack cannot parse it.
 * This module implements the runtime helper those chunks expect.
 */
export function Gs(descriptors) {
  const out = {};
  for (const key of Object.keys(descriptors)) {
    Object.defineProperty(out, key, {
      enumerable: true,
      configurable: true,
      get: descriptors[key],
    });
  }
  return out;
}
