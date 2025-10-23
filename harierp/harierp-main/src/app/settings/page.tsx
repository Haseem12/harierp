
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Lock, Bell, Server, DatabaseZap } from 'lucide-react';

// Mock data as the backend doesn't support this yet
const systemInfo = {
  systemVersion: "v1.0.0",
  databaseSize: "128.3 MB",
  lastBackup: "2024-05-10 02:00",
  uptime: "42 days, 3 hours",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center">
            <Settings className="mr-3 h-7 w-7" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system preferences and security settings.
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Create Backup
        </Button>
      </header>

      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company" disabled>
            <Server className="mr-2 h-4 w-4" /> Company
          </TabsTrigger>
          <TabsTrigger value="security" disabled>
            <Lock className="mr-2 h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" disabled>
            <Bell className="mr-2 h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="system" disabled>
            <Server className="mr-2 h-4 w-4" /> System
          </TabsTrigger>
          <TabsTrigger value="backup">
            <DatabaseZap className="mr-2 h-4 w-4" /> Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseZap className="text-primary"/>
                Backup & Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <CardTitle className="text-lg mb-4">Backup Settings</CardTitle>
                <div className="space-y-6">
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <Label htmlFor="automatic-backups" className="font-medium">
                      Enable Automatic Backups
                    </Label>
                    <Switch id="automatic-backups" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">Backup Frequency</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger id="backup-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly" disabled>Weekly</SelectItem>
                        <SelectItem value="monthly" disabled>Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Create Manual Backup
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-muted/30">
                 <CardTitle className="text-lg mb-4">System Information</CardTitle>
                 <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">System Version:</span>
                        <span className="font-medium">{systemInfo.systemVersion}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Database Size:</span>
                        <span className="font-medium">{systemInfo.databaseSize}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Backup:</span>
                        <span className="font-medium">{systemInfo.lastBackup}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="font-medium">{systemInfo.uptime}</span>
                    </div>
                 </div>
                 <Button variant="outline" className="w-full mt-6" disabled>
                    View System Logs
                 </Button>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Other TabsContent can be added here */}
      </Tabs>
    </div>
  );
}
