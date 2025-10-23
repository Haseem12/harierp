
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TestTube2,
  Clock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Package,
  Search,
  PlusCircle,
  Thermometer,
  Droplets,
  Zap,
  FlaskConical,
  Beaker,
  Bug,
  Waves,
  Ruler,
  Wind,
  List,
  Users
} from "lucide-react";

const summaryData = [
  { label: 'Tests Today', value: '12', icon: TestTube2 },
  { label: 'Pending', value: '3', icon: Clock },
  { label: 'Pass Rate %', value: '92%', icon: CheckCircle },
  { label: 'Failed Tests', value: '1', icon: XCircle },
];

export default function LaboratoryManagementPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Laboratory Dashboard</h1>
        <p className="text-muted-foreground">Quality control, testing, and compliance monitoring for water production.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryData.map(item => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          href="/laboratory/new-test"
          icon={PlusCircle}
          title="Record New Lab Test"
          description="Log a new incoming water sample and its initial metrics."
        />
        <ActionCard
          href="/laboratory/tests"
          icon={List}
          title="View All Test Logs"
          description="See a complete history of all recorded lab tests and their results."
        />
         <ActionCard
          href="/laboratory/suppliers"
          icon={Users}
          title="Manage Suppliers"
          description="View and manage the list of all water suppliers."
        />
      </div>


      <Tabs defaultValue="physical" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="physical">Physical Tests</TabsTrigger>
          <TabsTrigger value="chemical">Chemical Tests</TabsTrigger>
          <TabsTrigger value="microbiological">Microbiological</TabsTrigger>
        </TabsList>
        <TabsContent value="physical">
            <TestParametersCard title="Physical Parameters" parameters={physicalParameters} />
        </TabsContent>
        <TabsContent value="chemical">
            <TestParametersCard title="Chemical Parameters" parameters={chemicalParameters} />
        </TabsContent>
        <TabsContent value="microbiological">
            <TestParametersCard title="Microbiological Parameters" parameters={microbiologicalParameters} />
        </TabsContent>
      </Tabs>

    </div>
  );
}

interface ActionCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ href, icon: Icon, title, description }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-6 w-6 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
       <Link href={href} passHref>
        <Button className="w-full">Go to {title}</Button>
      </Link>
    </CardContent>
  </Card>
);

const physicalParameters = [
  { label: 'Color', value: 'Clear', icon: Droplets },
  { label: 'Odor', value: 'Odorless', icon: Wind },
  { label: 'Turbidity', value: '<1 NTU', icon: Waves },
  { label: 'Temperature', value: '22°C', icon: Thermometer },
];

const chemicalParameters = [
  { label: 'pH', value: '7.2', icon: Beaker },
  { label: 'TDS', value: '150 ppm', icon: FlaskConical },
  { label: 'Hardness', value: '85 mg/L', icon: Ruler },
  { label: 'Conductivity', value: '300 µS/cm', icon: Zap },
];

const microbiologicalParameters = [
  { label: 'Total Coliforms', value: 'Absent', icon: Bug },
  { label: 'E. coli', value: 'Absent', icon: Bug },
  { label: 'Yeast & Mold', value: 'Absent', icon: Bug },
];

interface TestParametersCardProps {
    title: string;
    parameters: { label: string; value: string; icon: React.ElementType }[];
}

const TestParametersCard: React.FC<TestParametersCardProps> = ({ title, parameters }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {parameters.map(param => (
                <div key={param.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <param.icon className="h-6 w-6 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">{param.label}</p>
                        <p className="font-semibold">{param.value}</p>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
);
