
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ModeSelector() {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-2xl mb-1">Choose Your Role</CardTitle>
        <CardDescription className="text-sm">
          Select how you are using the Life app right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-3 p-4 sm:p-6">
        <Button asChild variant="outline" size="lg" className="py-6 text-base hover:bg-secondary/80 transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-primary">
          <Link href="/victim" className="flex flex-col items-center justify-center space-y-2">
            <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            <span className="font-semibold">I Need Help</span>
            <span className="text-xs sm:text-sm text-muted-foreground">(Victim Mode)</span>
          </Link>
        </Button>
        <Button asChild variant="default" size="lg" className="py-6 text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-accent">
          <Link href="/rescuer/login" className="flex flex-col items-center justify-center space-y-2">
            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
            <span className="font-semibold">Rescue Team</span>
            <span className="text-xs sm:text-sm text-primary-foreground/80">(Rescuer Portal)</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
