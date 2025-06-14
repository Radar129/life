
import { AppHeader } from '@/components/layout/app-header';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {children}
      </main>
      <footer className="py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground border-t">
        R.A.D.A.R Emergency Response Assistant &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
