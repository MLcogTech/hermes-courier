// Ambient declarations for Vite-specific module requests.
// These let tsc resolve ?raw / ?url imports that Vite handles at build time.

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*?url' {
  const content: string;
  export default content;
}
