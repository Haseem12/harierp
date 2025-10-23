
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, RefreshCw, User, Users, Search, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MilkSupplier } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export default function MilkSuppliersListPage() {
    const [suppliers, setSuppliers] = useState<MilkSupplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [coopSearchTerm, setCoopSearchTerm] = useState('');
    const [individualSearchTerm, setIndividualSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        fetch('https://sajfoods.net/busa-api/database/get_milk_suppliers.php')
            .then(async (res) => {
                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Failed to read error response from server.');
                    throw new Error(`Failed to fetch suppliers list. Status: ${res.status}. Response: ${errorText.substring(0, 200)}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    setSuppliers(data.data);
                } else {
                    // Handle cases where the PHP script returns success:false or an unexpected structure
                    throw new Error(data.message || "Could not load suppliers list: Invalid data format received from server.");
                }
            })
            .catch((error) => {
                console.error("Error fetching water suppliers:", error);
                toast({ title: "Error", description: error.message, variant: "destructive" });
                setSuppliers([]); // Ensure suppliers is empty on error
            })
            .finally(() => setIsLoading(false));
    }, [toast]);

    const cooperatives = useMemo(() => 
        suppliers.filter(s => s.supplier_type === 'Cooperative' && s.name.toLowerCase().includes(coopSearchTerm.toLowerCase())),
    [suppliers, coopSearchTerm]);

    const individuals = useMemo(() =>
        suppliers.filter(s => s.supplier_type === 'Individual' && s.name.toLowerCase().includes(individualSearchTerm.toLowerCase())),
    [suppliers, individualSearchTerm]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading suppliers...</div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <header className="flex items-center justify-between pb-4 border-b">
                <h1 className="text-2xl font-semibold flex items-center">
                    <Users className="mr-3 h-6 w-6" /> Water Suppliers
                </h1>
                <Link href="/laboratory/suppliers/new" passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Register New Supplier
                    </Button>
                </Link>
            </header>

            <Tabs defaultValue="cooperatives" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cooperatives">Cooperatives</TabsTrigger>
                    <TabsTrigger value="individuals">Individual Farmers</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cooperatives">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registered Cooperatives</CardTitle>
                            <CardDescription>A list of all registered water supply cooperatives.</CardDescription>
                             <div className="relative mt-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search cooperatives by name..." className="pl-8 w-full md:w-1/2" value={coopSearchTerm} onChange={(e) => setCoopSearchTerm(e.target.value)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SupplierTable suppliers={cooperatives} type="Cooperative" />
                        </CardContent>
                         <CardFooter>
                            <div className="text-xs text-muted-foreground">
                                Showing <strong>{cooperatives.length}</strong> total cooperatives.
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="individuals">
                     <Card>
                        <CardHeader>
                            <CardTitle>Registered Individual Farmers</CardTitle>
                            <CardDescription>A list of all registered individual farmers supplying water.</CardDescription>
                            <div className="relative mt-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search farmers by name..." className="pl-8 w-full md:w-1/2" value={individualSearchTerm} onChange={(e) => setIndividualSearchTerm(e.target.value)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SupplierTable suppliers={individuals} type="Individual" />
                        </CardContent>
                        <CardFooter>
                            <div className="text-xs text-muted-foreground">
                                Showing <strong>{individuals.length}</strong> total individual farmers.
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


function SupplierTable({ suppliers, type }: { suppliers: MilkSupplier[], type: 'Cooperative' | 'Individual' }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {suppliers.length > 0 ? suppliers.map(supplier => (
                    <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.code}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>{supplier.address || '-'}</TableCell>
                        <TableCell>
                            <Link href={`/laboratory/suppliers/${supplier.id}`} passHref>
                                <Button variant="outline" size="sm">
                                    <Eye className="mr-2 h-4 w-4" /> View
                                </Button>
                            </Link>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No {type === 'Cooperative' ? 'cooperatives' : 'individual farmers'} found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
