
"use client"; 
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import AppHeader from './AppHeader';
import { isAuthenticated, getCurrentUserRole, logoutUser } from '@/lib/auth'; 
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/lib/users';
import { Button } from '@/components/ui/button';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import { addActivityLog } from '@/lib/activityLog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAuthorized, setIsAuthorized] = React.useState(false); 
  const [isAuthCheckComplete, setIsAuthCheckComplete] = React.useState(false);
  const [currentUserRole, setCurrentUserRole] = React.useState<UserRole | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Inactivity timeout hook
  useInactivityTimeout(() => {
    addActivityLog('User timed out due to inactivity.');
    logoutUser();
    router.push('/');
  }, 300000); // 5 minutes

  React.useEffect(() => {
    setIsMounted(true);
    const userRole = getCurrentUserRole();
    setCurrentUserRole(userRole); 
    
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1];

    let initialSidebarOpenState = true; 
    if (cookieValue !== undefined) {
      initialSidebarOpenState = cookieValue === 'true';
    }
    setIsSidebarOpen(initialSidebarOpenState);
    
    const authenticated = isAuthenticated();
    let intendedDestination = '/dashboard';
    
    if(userRole === 'ProductionManager') intendedDestination = '/production';
    if(userRole === 'Laboratory') intendedDestination = '/laboratory';


    if (!authenticated && pathname !== '/') {
      router.replace('/');
      setIsAuthCheckComplete(true);
      return;
    }
    
    if (authenticated && pathname === '/') {
        router.replace(intendedDestination);
        setIsAuthCheckComplete(true);
        return;
    }

    setIsAuthorized(true); 
    setIsAuthCheckComplete(true);

  }, [pathname, router]);

  // Log navigation events
  React.useEffect(() => {
    if (isAuthCheckComplete && isAuthenticated() && pathname !== '/') {
      addActivityLog(`Navigated to ${pathname}`);
    }
  }, [pathname, isAuthCheckComplete]);

  const handleSidebarOpenChange = (open: boolean) => {
    setIsSidebarOpen(open);
    if (typeof window !== 'undefined') {
      document.cookie = `sidebar_state=${open}; path=/; max-age=${60 * 60 * 24 * 7}`; 
    }
  };
  
  if (!isMounted || !isAuthCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (pathname === '/') {
    return <>{children}</>;
  }
  
  if (!isAuthorized && pathname.startsWith('/admin')) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 text-center px-4">
        <Loader2 className="h-10 w-10 animate-spin text-destructive mb-4" />
        <p className="text-lg font-semibold text-destructive">Access Denied</p>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  const showSidebar = !isMobile;
  const showBottomNav = isMobile;

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={handleSidebarOpenChange} defaultOpen={isSidebarOpen}>
      <div className="flex min-h-screen">
        {showSidebar && <AppSidebar />}
        <SidebarInset className={cn("flex-1 flex flex-col", showBottomNav ? "pb-16" : "")}>
          <AppHeader />
          <main className="flex-1 p-6 bg-background overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
        {showBottomNav && <BottomNavigationBar />}
      </div>
    </SidebarProvider>
  );
}
