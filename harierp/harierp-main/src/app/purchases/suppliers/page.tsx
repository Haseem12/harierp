
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, RefreshCw, Users, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { LedgerAccount } from '@/types';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function ManageSuppliersPage() {
    const [suppliers, setSuppliers] = useState<LedgerAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php?type=Supplier');
            if (!response.ok) throw new Error("Failed to fetch suppliers.");
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setSuppliers(data.data.filter((acc: LedgerAccount) => acc.accountType === 'Supplier'));
            } else {
                toast({ title: "Error", description: data.message || "Could not load suppliers.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [toast]);
    
    const filteredSuppliers = useMemo(() =>
        suppliers.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.accountCode.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [suppliers, searchTerm]);

    const handleDelete = async (accountId: string, accountName?: string) => {
        try {
          const response = await fetch('https://sajfoods.net/busa-api/database/deleteLedgerAccount.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: accountId }),
          });
      
          const result = await response.json();
      
          if (result.success) {
            setSuppliers(prev => prev.filter(acc => acc.id !== accountId));
            toast({ title: 'Supplier Deleted', description: `Supplier "${accountName}" was successfully deleted.` });
          } else {
            throw new Error(result.error || 'Failed to delete supplier.');
          }
        } catch (error) {
          toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
        }
    };


    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading suppliers...</div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <header className="flex items-center justify-between pb-4 border-b">
                <h1 className="text-2xl font-semibold flex items-center">
                    <Users className="mr-3 h-6 w-6" /> Manage Suppliers
                </h1>
                <Link href="/purchases/suppliers/new" passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Register New Supplier
                    </Button>
                </Link>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Suppliers</CardTitle>
                    <CardDescription>A list of all registered raw material and service suppliers.</CardDescription>
                     <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search suppliers by name or code..." className="pl-8 w-full md:w-1/2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
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
                            {filteredSuppliers.length > 0 ? filteredSuppliers.map(supplier => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.accountCode}</TableCell>
                                    <TableCell>{supplier.phone || '-'}</TableCell>
                                    <TableCell className="max-w-xs truncate">{supplier.address || '-'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><span className="sr-only">Actions</span>...</Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <Link href={`/ledger-accounts/${supplier.id}`} passHref>
                                                    <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                                </Link>
                                                <Link href={`/ledger-accounts/${supplier.id}/edit`} passHref>
                                                    <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit Supplier</DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Supplier
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                              This will permanently delete supplier "{supplier.name}". This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(supplier.id, supplier.name)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No suppliers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{filteredSuppliers.length}</strong> of <strong>{suppliers.length}</strong> total suppliers.
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

