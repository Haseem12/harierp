
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserPlus, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/users';

const availableRoles: UserRole[] = ['DirectorGeneral', 'GeneralManager', 'FinanceManager', 'SalesManager', 'Laboratory', 'ProductionManager'];

export default function RegisterUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !selectedRole) {
      toast({
        title: "Missing Information",
        description: "Please provide a username, password, and role.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
        const response = await fetch('https://sajfoods.net/busa-api/database/register_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: selectedRole }),
        });
        const result = await response.json();

        if (result.success) {
            toast({
                title: "User Registered",
                description: `User "${username}" has been successfully created.`,
            });
            router.push('/admin/user-management');
        } else {
            throw new Error(result.message || 'An unknown error occurred.');
        }
    } catch (error: any) {
        toast({
            title: "Registration Failed",
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/admin/user-management" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to User Management</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          <UserPlus className="h-5 w-5 mr-2 inline" />
          Register New User
        </h1>
      </header>

      <Card className="max-w-xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New User Details</CardTitle>
            <CardDescription>
              Create a new user account. The username will be their login ID. The default password should be changed upon first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(value) => setSelectedRole(value as UserRole)} value={selectedRole} required disabled={isLoading}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role for the user" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Register User</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
