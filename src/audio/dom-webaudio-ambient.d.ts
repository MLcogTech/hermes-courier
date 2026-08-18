/// <reference lib="DOM" />

// Ambient re-export shim — no external package needed.
// DOM lib types (AudioContext, OscillatorNode, etc.) are globals when
// tsc lib includes "DOM"; this file is a module solely so types.ts can
// `import type { ... } from './dom-webaudio-ambient.d.ts'` without
// depending on any node_module package.

export type {
  AudioContext,
  AudioNode,
  AudioParam,
  AudioBuffer,
  AudioBufferSourceNode,
  OscillatorNode,
  GainNode,
  BiquadFilterNode,
  DynamicsCompressorNode,
  WaveShaperNode,
  StereoPannerNode,
  AnalyserNode,
  ChannelMergerNode,
  ChannelSplitterNode,
  PeriodicWave,
};
