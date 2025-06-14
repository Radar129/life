
import Link from 'next/link';
import { HeartPulse, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BasicInfoForm } from '@/components/victim/basic-info-form';

export function AppHeader() {
  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-headline font-bold text-primary hover:opacity-80 transition-opacity">
          <HeartPulse className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          <span className='font-headline'>R.A.D.A.R</span>
        </Link>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <span className="sr-only">Open User Profile</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="lg:max-w-2xl p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                 User Info & Emergency Details
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                This information is saved locally and can help rescuers. It will be sent automatically if you activate SOS.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <BasicInfoForm />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
