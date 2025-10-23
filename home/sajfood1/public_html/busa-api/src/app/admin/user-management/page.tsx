
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRole, rolePermissionMap } from '@/lib/users';
import { Users, Lock, EyeOff, Save, KeyRound, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { getAllModuleSettings, saveAllSettings as saveModuleSettings, ModuleKey, allModules } from '@/lib/settings';

type User = {
  id: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

export default function UserManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moduleVisibility, setModuleVisibility] = useState<Record<ModuleKey, boolean>>(
    allModules.reduce((acc, module) => ({ ...acc, [module]: true }), {} as Record<ModuleKey, boolean>)
  );
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('https://harisindustries.com.ng/busa-api/database/get_users.php')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.data);
        } else {
          toast({ title: 'Error', description: 'Failed to fetch users.', variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Could not connect to the server to fetch users.', variant: 'destructive' }))
      .finally(() => setIsLoading(false));

    setModuleVisibility(getAllModuleSettings());
    setHasMounted(true);
  }, [toast]);

  const handleUserActivationChange = (userId: string, isActive: boolean) => {
    setUsers(users.map(user => user.id === userId ? { ...user, isActive } : user));
  };

  const handleModuleVisibilityChange = (moduleKey: ModuleKey, isVisible: boolean) => {
    setModuleVisibility(prev => ({ ...prev, [moduleKey]: isVisible }));
  };

  const handleSaveChanges = async () => {
    // Save module settings to localStorage
    saveModuleSettings(users, moduleVisibility); // This is now only for modules

    // Save user activation settings to backend
    try {
        const response = await fetch('https://harisindustries.com.ng/busa-api/database/save_user_settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: users.map(u => ({ id: u.id, isActive: u.isActive })) }),
        });
        const result = await response.json();
        if (result.success) {
            toast({
                title: 'Settings Saved',
                description: 'User activation and module settings have been updated.',
            });
        } else {
            throw new Error(result.message || "Failed to save user settings.");
        }
    } catch (error: any) {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const handleResetPassword = async (userId: string, userName: string) => {
    try {
        const response = await fetch('https://harisindustries.com.ng/busa-api/database/reset_user_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const result = await response.json();
        if (result.success) {
            toast({
                title: 'Password Reset Successful',
                description: `Password for ${userName} has been reset to 'password123'.`,
            });
        } else {
            throw new Error(result.message || "Failed to reset password.");
        }
    } catch (error: any) {
         toast({ title: 'Reset Failed', description: error.message, variant: "destructive" });
    }
  };

  if (!hasMounted || isLoading) {
    return <div className="flex justify-center items-center h-64"><RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center">
            <Users className="mr-3 h-7 w-7" />
            User and Module Management
          </h1>
          <p className="text-muted-foreground">
            Activate/deactivate user accounts and control module visibility across the application.
          </p>
        </div>
        <Link href="/admin/user-management/register" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Register New User
          </Button>
        </Link>
      </header>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> User Account Management</CardTitle>
          <CardDescription>
            Use the switches to activate or deactivate user accounts. Deactivated users will not be able to log in. Click "Reset Password" to set a user's password to 'password123'.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-center">Account Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{rolePermissionMap[user.role as UserRole]?.join(', ') || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Label htmlFor={`user-switch-${user.id}`} className="text-sm sr-only">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Label>
                      <Switch
                        id={`user-switch-${user.id}`}
                        checked={user.isActive}
                        onCheckedChange={(checked) => handleUserActivationChange(user.id, checked)}
                      />
                       <span className="text-sm">{user.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleResetPassword(user.id, user.name)}>
                        <KeyRound className="mr-2 h-4 w-4"/>
                        Reset Password
                      </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                       <AlertCircle className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
                       No users found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><EyeOff className="text-primary"/> Module Visibility</CardTitle>
          <CardDescription>
            Control which high-level modules are visible in the sidebar for all users. Hiding a module here will remove it from everyone's navigation. This setting is stored in the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allModules.map(moduleKey => (
                 <div key={moduleKey} className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <Label htmlFor={`module-switch-${moduleKey}`} className="font-medium">
                        {moduleKey}
                    </Label>
                    <Switch
                        id={`module-switch-${moduleKey}`}
                        checked={moduleVisibility[moduleKey]}
                        onCheckedChange={(checked) => handleModuleVisibilityChange(moduleKey, checked)}
                    />
                 </div>
            ))}
        </CardContent>
      </Card>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSaveChanges} size="lg">
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
        </Button>
      </div>

    </div>
  );
}

    