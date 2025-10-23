
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is now deprecated and redirects to the new login page at the root.
export default function LoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/'); // Redirect to the new login page (root)
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}

    