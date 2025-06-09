import { ModeSelector } from '@/components/home/mode-selector';
import { PanicButton } from '@/components/home/panic-button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem-4rem)] py-12 space-y-12 text-center"> {/* Adjust min-h based on header/footer */}
      <div className="mb-8">
        <h1 className="text-5xl font-headline font-bold text-primary mb-4">
          Life
        </h1>
        <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
          Your Lifeline in Emergencies. Connect, locate, and get AI-powered guidance when every second counts.
        </p>
      </div>
      
      <PanicButton />

      <div className="w-full border-t border-border my-12 max-w-md"></div>

      <ModeSelector />

    </div>
  );
}
