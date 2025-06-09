
import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-headline font-bold text-primary hover:opacity-80 transition-opacity">
          <HeartPulse className="w-7 h-7 sm:w-8 sm:h-8 text-accent" />
          <span className='font-headline'>Life</span>
        </Link>
      </div>
    </header>
  );
}
