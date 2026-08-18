/**
 * types — shared WebAudio type re-exports
 * Atlas lane · P0 scaffold
 *
 * Centralizes the AudioContext / node type imports so other modules
 * don't need to import from 'webaudio' directly.
 *
 * Uses DOM lib types (tsc lib includes "DOM") — no external package needed.
 * dom-webaudio-ambient.d.ts is a module shim that re-exports the DOM globals
 * so this file can import + re-export them as a stable module path.
 */

import type {
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
} from './dom-webaudio-ambient.d.ts';

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
