// shader-loader.ts — loads WGSL shader source as module strings.
// P0: Vite ?raw imports so shader src is bundled in; no Node fs dependency.
// P1: wire TEMPLATE_SHADER / PARTICLE_SHADER into custom ShaderMaterial.

export const TEMPLATE_SHADER = `/** placeholder — replaced by vite raw import in P1 */`;
export const PARTICLE_SHADER = `/** placeholder — replaced by vite raw import in P1 */`;

// P0: shader source files live at src/shaders/temple.wgsl and src/shaders/particles.wgsl.
// The placeholders above are replaced inline once the WGSL→ShaderMaterial bridge is wired (P1).
// For now, the .wgsl files on disk satisfy the P0 "WGSL shader skeleton" deliverable.
