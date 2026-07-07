import type { ChildProcess } from "node:child_process";

export type WorkMode = "uni-model" | "dual-model" | "tree-model";

export type ModelRole = "central" | "executor" | "auditor";

export interface ModelAssignment {
  role: ModelRole;
  file: string;
  path: string;
  port: number;
}

export interface RunningModel {
  pid: number;
  assignment: ModelAssignment;
  startedAt: string;
}

export interface GpuInfo {
  name: string;
  totalMemMiB: number;
  freeMemMiB: number;
  available: boolean;
}

export interface ModelEntry {
  name: string;
  path: string;
  sizeGB: number;
  quant: string;
  estimatedVramGB: number;
  exists: boolean;
}

export interface VramTableEntry {
  minMemGB: number;
  recommended: boolean;
}

export interface ValidationResult {
  valid: boolean;
  totalVramGB: number;
  freeVramGB: number;
  models: { name: string; vramGB: number }[];
  message: string;
  suggestions: string[];
}

export interface ModelEngineState {
  running: RunningModel[];
  startedAt: string;
  workMode: WorkMode;
}
