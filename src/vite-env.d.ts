/// <reference types="vite/client" />

/** Injected by Vite at build time — git short hash + date. Never undefined. */
declare const __APP_VERSION__: string

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.svg?url" {
  const src: string;
  export default src;
}
