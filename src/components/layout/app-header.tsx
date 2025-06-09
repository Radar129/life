import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center">
        <Link href="/" className="flex items-center gap-3 text-2xl font-headline font-bold text-primary hover:opacity-80 transition-opacity">
          <HeartPulse className="w-8 h-8 text-accent" />
          <span className='font-headline'>Life</span>
        </Link>
      </div>
    </header>
  );
}
