"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

export default function LedgerAccountsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLedgerAccounts = async () => {
      try {
        const response = await fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php');
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setLedgerAccounts(data.data);
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to fetch ledger accounts.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Something went wrong while fetching ledger accounts.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLedgerAccounts();
  }, []);

  const filteredLedgerAccounts = useMemo(() =>
    ledgerAccounts.filter(account =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.priceLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.zone.toLowerCase().includes(searchTerm.toLowerCase())
    ), [ledgerAccounts, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const handleDelete = async (accountId: string, accountName?: string) => {
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/deleteLedgerAccount.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: accountId }),
      });
  
      const result = await response.json();
  
      if (result.success) {
        // Remove the deleted account from state
        setLedgerAccounts(prev => prev.filter(acc => acc.id !== accountId));
  
        toast({
          title: 'Account Deleted',
          description: `Ledger account "${accountName}" was successfully deleted.`,
          variant: 'default',
        });
      } else {
        throw new Error(result.error || 'Failed to delete account.');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };
  

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p>Loading accounts...</p></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Ledger Accounts</h1>
        <div className="flex items-center gap-2">
          <Link href="/ledger-accounts/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
          <CardDescription>Manage all ledger accounts.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search accounts by name, code, type, price level, or zone..."
              className="pl-8 w-full md:w-2/3 lg:w-1/2"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Account Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price Level</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead className="text-center">Credit Period</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLedgerAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.accountCode}</TableCell>
                  <TableCell>{account.accountType}</TableCell>
                  <TableCell>{account.priceLevel}</TableCell>
                  <TableCell>{account.zone}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(account.creditLimit))}</TableCell>
                  <TableCell className="text-center">{account.creditPeriod} days</TableCell>
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
                        <Link href={`/ledger-accounts/${account.id}`} passHref>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/ledger-accounts/${account.id}/edit`} passHref>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit Account
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the ledger account
                                &quot;{account.name}&quot;.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(account.id, account.name)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredLedgerAccounts.length}</strong> of <strong>{ledgerAccounts.length}</strong> ledger accounts
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
