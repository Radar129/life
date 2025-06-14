
// src/types/signals.ts
export interface DetectedSignal {
  id: string;
  name: string;
  rssi: number;
  lat?: number;
  lon?: number;
  timestamp: number;
  status?: string; 
}

export interface VictimBasicInfo {
  name?: string;
  age?: string;
  gender?: string; // Added gender field
  bloodGroup?: string;
  allergies?: string;
  medications?: string;
  conditions?: string;
  emergencyContact1Name?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2Phone?: string;
  emergencyContact3Name?: string;
  emergencyContact3Phone?: string;
  customSOSMessage?: string;
}
