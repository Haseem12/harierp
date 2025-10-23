
// src/app/inventory-dashboard/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Package, BarChart3, PlusCircle, ListChecks, PackageCheck, History, Archive } from "lucide-react";
import Link from "next/link";

export default function FinishBayDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="pb-4">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Archive className="h-8 w-8 text-primary"/>
          Finish Bay Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage finished goods inventory. Approve stock from production, make adjustments, and view stock levels.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href="/inventory-dashboard/pending-approvals"
          icon={PackageCheck}
          title="Approve Stock Submissions"
          description="Review and accept finished goods submitted from the Production department to add them to sellable inventory."
        />
         <ActionCard
          href="/products/stock-management/add"
          icon={PlusCircle}
          title="Add/Adjust Finished Stock"
          description="Manually record new stock additions or make corrections for finished goods (e.g., for returns, spoilage)."
        />
        <ActionCard
          href="/products/stock-management"
          icon={Layers}
          title="Finished Goods Stock Levels"
          description="Monitor and view current inventory levels for all finished bottled water products."
        />
         <ActionCard_Secondary
          href="/inventory-dashboard/submission-history"
          icon={History}
          title="View Submission History"
          description="See the history of all products submitted from production, including pending and approved batches."
        />
        <ActionCard_Secondary
          href="/products/stock-management/log"
          icon={ListChecks}
          title="View Stock Adjustment Log"
          description="See a complete history of all stock movements, including sales, returns, and manual adjustments."
        />
         <ActionCard_Secondary
          href="/products"
          icon={Package}
          title="Products Catalog"
          description="View and edit all finished goods details, pricing tiers, and descriptions."
        />
      </div>
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
  <Card className="hover:shadow-lg transition-shadow border-l-4 border-primary">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      <Icon className="h-6 w-6 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Link href={href} passHref>
        <Button className="w-full">Go to {title}</Button>
      </Link>
    </CardContent>
  </Card>
);

const ActionCard_Secondary: React.FC<ActionCardProps> = ({ href, icon: Icon, title, description }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      <Link href={href} passHref>
        <Button variant="outline" size="sm" className="w-full">Go to {title}</Button>
      </Link>
    </CardContent>
  </Card>
);
