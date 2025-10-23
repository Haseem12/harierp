
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, KeyRound, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserId, logoutUser } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure the new password and confirmation match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Your new password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const userId = getCurrentUserId();
    if (!userId) {
      toast({ title: "Error", description: "Could not identify current user. Please log in again.", variant: "destructive" });
      setIsLoading(false);
      logoutUser();
      router.push('/');
      return;
    }

    try {
        const response = await fetch('https://sajfoods.net/busa-api/database/change_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, oldPassword, newPassword }),
        });
        const result = await response.json();

        if (result.success) {
            toast({
                title: "Password Changed Successfully",
                description: "You have been logged out for security. Please log in with your new password.",
            });
            logoutUser();
            router.push('/');
        } else {
            throw new Error(result.message || "An unknown error occurred while changing the password.");
        }
    } catch (error: any) {
        toast({ title: 'Password Change Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/dashboard" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          <KeyRound className="h-5 w-5 mr-2 inline" />
          Change Your Password
        </h1>
      </header>

      <Card className="max-w-xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>
              Enter your old password and a new password to secure your account. You will be logged out after a successful change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="oldPassword">Old Password</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="ml-2 h-4 w-4" /> Save New Password</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
