"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function PanicButton() {
  const router = useRouter();

  const handlePanic = () => {
    // Navigate to victim page and trigger SOS
    router.push('/victim?sos=true');
  };

  return (
    <Button
      variant="destructive"
      size="lg"
      className="w-full max-w-md h-24 text-2xl font-bold shadow-2xl rounded-xl
                 bg-accent hover:bg-accent/90 text-accent-foreground
                 flex items-center justify-center gap-3
                 transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-4 focus:ring-offset-2 focus:ring-accent/50"
      onClick={handlePanic}
      aria-label="Activate SOS Panic Button"
    >
      <AlertTriangle className="w-10 h-10" />
      <span className="font-headline">PANIC SOS</span>
    </Button>
  );
}
