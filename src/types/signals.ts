
// src/types/signals.ts
export interface DetectedSignal {
  id: string;
  name: string; // Parsed victim's name
  rssi: number;
  lat?: number;
  lon?: number;
  timestamp: number;
  status?: string; 
  advertisedName?: string; // The original raw advertised name, e.g., SOS_Name_Lat_Lon
}

export interface VictimBasicInfo {
  name?: string;
  dob?: string; // Date of Birth, e.g., "yyyy-MM-dd"
  age?: string; // Calculated age
  gender?: string; 
  bloodGroup?: string;
  profilePictureDataUrl?: string; // For storing the profile picture as a Base64 Data URL
  allergies?: string;
  medications?: string;
  conditions?: string;
  sharedEmergencyContactCountryCode?: string;
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

export interface RescuerProfileInfo {
  name?: string;
  teamId?: string;
  contactPhone?: string;
  profilePictureDataUrl?: string;
  // Add any other relevant fields for a rescuer
}
    
