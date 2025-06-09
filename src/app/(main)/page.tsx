
import { ModeSelector } from '@/components/home/mode-selector';
import { PanicButton } from '@/components/home/panic-button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] py-6 space-y-6 text-center"> {/* Adjusted min-h, py and space-y */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-3xl sm:text-5xl font-headline font-bold text-primary mb-2 sm:mb-3">
          Life
        </h1>
        <p className="text-base sm:text-xl text-foreground/80 max-w-2xl mx-auto px-2">
          Your Lifeline in Emergencies. Connect, locate, and get AI-powered guidance when every second counts.
        </p>
      </div>
      
      <PanicButton />

      <div className="w-full border-t border-border my-6 sm:my-10 max-w-md"></div>

      <ModeSelector />

    </div>
  );
}
