
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Search, FileDown, Eye, Edit, FileText } from 'lucide-react';
import type { Sale } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    fetch('https://sajfoods.net/busa-api/database/get_sales.php')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch sales');
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const parsedSales = data.data.map((s: any) => ({
            ...s,
            saleDate: s.saleDate && isValid(parseISO(s.saleDate)) ? parseISO(s.saleDate) : new Date(0),
            customer: s.customer || { id: s.customerId, name: s.customerName || "N/A" }
          }));
          setSales(parsedSales);
        } else {
          setSales([]);
          toast({
            title: "Error",
            description: "Could not load sales data.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching sales:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sales data from the server.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
  }, [toast]);

  const filteredSales = useMemo(() => sales.filter(sale =>
    (String(sale.id).toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (sale.customer?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (sale.status?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  ), [sales, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStatusBadgeVariant = (status: Sale['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Completed': return 'default'; 
      case 'Pending': return 'secondary'; 
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDateSafe = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "N/A";
    const date = dateInput instanceof Date ? dateInput : parseISO(String(dateInput));
    if (!isValid(date) || date.getTime() === 0) return "Invalid Date";
    return format(date, 'PP');
  };


  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Sales Transactions</h1>
        <div className="flex items-center gap-2">
          {/* <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export Sales
          </Button> */}
          <Link href="/sales/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Record Sale
            </Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Sales Log</CardTitle>
          <CardDescription>Manage and track all sales transactions. Invoices can be generated from the sale detail page.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sales by ID, customer, or status..."
              className="pl-8 w-full md:w-1/3"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading sales...</TableCell>
                </TableRow>
              ) : filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{sale.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{formatDateSafe(sale.saleDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(sale.status)}>{sale.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/sales/${sale.id}`} passHref>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" /> View Sale Details
                              </DropdownMenuItem>
                          </Link>
                          {sale.invoiceId && (
                            <Link href={`/invoices/${sale.invoiceId}`} passHref>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" /> View Invoice
                              </DropdownMenuItem>
                            </Link>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No sales found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredSales.length}</strong> of <strong>{sales.length}</strong> sales
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
