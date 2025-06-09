"use client";
import { useState } from 'react';
import { SOSScannerPanel } from '@/components/rescuer/sos-scanner-panel';
import { MapDisplayPanel } from '@/components/rescuer/map-display-panel';
import { RescuerAdvicePanel } from '@/components/rescuer/rescuer-advice-panel';

interface DetectedSignal {
  id: string;
  name: string;
  rssi: number;
  lat?: number;
  lon?: number;
  timestamp: number;
}

export default function RescuerPage() {
  const [detectedSignals, setDetectedSignals] = useState<DetectedSignal[]>([]);

  const handleSignalsDetected = (signals: DetectedSignal[]) => {
    setDetectedSignals(signals);
  };

  return (
    <div className="container mx-auto py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">Rescuer Dashboard</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Access tools to locate victims and receive operational advice.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <SOSScannerPanel onSignalsDetected={handleSignalsDetected} />
          <MapDisplayPanel signals={detectedSignals} />
        </div>
        <div className="lg:sticky lg:top-24"> {/* Make advice panel sticky on larger screens */}
          <RescuerAdvicePanel />
        </div>
      </div>
    </div>
  );
}
