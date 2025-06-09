
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ModeSelector() {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl mb-2">Choose Your Role</CardTitle>
        <CardDescription className="text-base">
          Select how you are using the Life app right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4 p-6">
        <Button asChild variant="outline" size="lg" className="py-8 text-lg hover:bg-secondary/80 transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-primary">
          <Link href="/victim" className="flex flex-col items-center justify-center space-y-3">
            <User className="w-10 h-10 text-primary" />
            <span className="font-semibold">I Need Help</span>
            <span className="text-sm text-muted-foreground">(Victim Mode)</span>
          </Link>
        </Button>
        <Button asChild variant="default" size="lg" className="py-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 focus:ring-accent">
          <Link href="/rescuer/login" className="flex flex-col items-center justify-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-accent" />
            <span className="font-semibold">Rescue Team</span>
            <span className="text-sm text-primary-foreground/80">(Rescuer Portal)</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
