
// src/types/signals.ts
export interface DetectedSignal {
  id: string;
  name: string;
  rssi: number;
  lat?: number;
  lon?: number;
  timestamp: number;
  status?: string; // Optional: status of the victim/signal
}
