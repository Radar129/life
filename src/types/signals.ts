
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
  dob?: string; // Date of Birth, e.g., "yyyy-MM-dd"
  age?: string; // Calculated age
  gender?: string; 
  bloodGroup?: string;
  allergies?: string;
  medications?: string;
  conditions?: string;
  emergencyContact1Name?: string;
  emergencyContact1CountryCode?: string;
  emergencyContact1Phone?: string;
  emergencyContact2Name?: string;
  emergencyContact2CountryCode?: string;
  emergencyContact2Phone?: string;
  emergencyContact3Name?: string;
  emergencyContact3CountryCode?: string;
  emergencyContact3Phone?: string;
  customSOSMessage?: string;
}
