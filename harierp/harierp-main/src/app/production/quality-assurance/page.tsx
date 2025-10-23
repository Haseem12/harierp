
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, TestTube2, ArrowLeft, RefreshCw, Droplets, Thermometer, Wind } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface WaterDeliveryForQA {
    id: string;
    deliveryId: string;
    supplierName: string;
    deliveryDate: Date;
    quantityLtrs: number;
    phLevel?: number;
    tds?: number; // Total Dissolved Solids
    temperature?: number;
}

const mockDeliveriesForQA: WaterDeliveryForQA[] = [
    { id: 'wd_1', deliveryId: 'WTR-001', supplierName: 'Aqua Pure Sources', deliveryDate: new Date(), quantityLtrs: 5000, phLevel: 7.2, tds: 150, temperature: 24 },
    { id: 'wd_2', deliveryId: 'WTR-002', supplierName: 'Crystal Springs', deliveryDate: new Date(Date.now() - 3600000), quantityLtrs: 10000, phLevel: 6.9, tds: 220, temperature: 23 },
    { id: 'wd_3', deliveryId: 'WTR-003', supplierName: 'Aqua Pure Sources', deliveryDate: new Date(Date.now() - 7200000), quantityLtrs: 7500, phLevel: 7.5, tds: 180, temperature: 25 },
];

export default function QualityAssurancePage() {
    const [deliveries, setDeliveries] = useState<WaterDeliveryForQA[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // TODO: This should fetch from a dedicated endpoint for pending water deliveries.
        // For now, we use mock data.
        setTimeout(() => {
            setDeliveries(mockDeliveriesForQA);
            setIsLoading(false);
        }, 1000);
    }, []);

    const handleApprove = (deliveryId: string) => {
        // TODO: Call API to approve water delivery.
        // This should update the delivery status and add the water to the raw water tank stock.
        console.log(`Approving water delivery ${deliveryId}`);
        setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        toast({
            title: "Water Delivery Approved",
            description: `Delivery ${deliveryId} has been accepted and moved to the raw water tank.`,
        });
    };

    const handleReject = (deliveryId: string) => {
        // TODO: Call API to reject water delivery.
        console.log(`Rejecting water delivery ${deliveryId}`);
        setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
        toast({
            title: "Water Delivery Rejected",
            description: `Delivery ${deliveryId} has been rejected and will not be added to stock.`,
            variant: "destructive"
        });
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading deliveries for QA...</div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <header className="flex items-center gap-4 pb-4 border-b">
                <Link href="/production" passHref>
                    <Button variant="outline" size="icon" className="h-7 w-7">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Production</span>
                    </Button>
                </Link>
                <h1 className="text-2xl font-semibold flex items-center">
                    <TestTube2 className="mr-3 h-6 w-6" /> Quality Assurance - Pending Water Deliveries
                </h1>
            </header>

            <Card className="flex-grow">
                <CardHeader>
                    <CardTitle>Awaiting Validation</CardTitle>
                    <CardDescription>
                        Review the following raw water deliveries. Approve to add the quantity to the "Raw Water" tank in the main store, or Reject to discard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Delivery ID</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Qty (Ltrs)</TableHead>
                                <TableHead className="text-right">pH Level</TableHead>
                                <TableHead className="text-right">TDS (ppm)</TableHead>
                                <TableHead className="text-right">Temp (°C)</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deliveries.length > 0 ? deliveries.map((delivery) => (
                                <TableRow key={delivery.id}>
                                    <TableCell className="font-medium">{delivery.deliveryId}</TableCell>
                                    <TableCell>{delivery.supplierName}</TableCell>
                                    <TableCell>{format(delivery.deliveryDate, 'PP p')}</TableCell>
                                    <TableCell className="text-right font-semibold">{delivery.quantityLtrs.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{delivery.phLevel?.toFixed(1) || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{delivery.tds || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{delivery.temperature?.toFixed(1) || 'N/A'}</TableCell>
                                    <TableCell className="text-center space-x-2">
                                        <Button size="sm" variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={() => handleApprove(delivery.id)}>
                                            <Check className="h-4 w-4 mr-1" /> Approve
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(delivery.id)}>
                                            <X className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        No water deliveries are currently pending quality assurance.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{deliveries.length}</strong> deliveries awaiting quality check.
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
