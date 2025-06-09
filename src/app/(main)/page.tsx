
import { ModeSelector } from '@/components/home/mode-selector';
import { PanicButton } from '@/components/home/panic-button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem-3.5rem)] py-8 sm:py-12 space-y-8 sm:space-y-12 text-center"> {/* Adjusted min-h and py */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-3 sm:mb-4">
          Life
        </h1>
        <p className="text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto px-2">
          Your Lifeline in Emergencies. Connect, locate, and get AI-powered guidance when every second counts.
        </p>
      </div>
      
      <PanicButton />

      <div className="w-full border-t border-border my-8 sm:my-12 max-w-md"></div>

      <ModeSelector />

    </div>
  );
}
