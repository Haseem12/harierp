
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, RefreshCw, PlusCircle, ListChecks, Filter } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface LabTestSummary {
    id: string;
    batchNumber?: string;
    sampleId: string;
    testDate: Date | string;
    productName: string;
    overallStatus: 'Pass' | 'Fail' | 'Pending';
}

export default function LabTestsListPage() {
  const [tests, setTests] = useState<LabTestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchLabTests = useCallback(async () => {
    !isRefreshing && setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_lab_tests.php');

      if (!response.ok) throw new Error('Failed to fetch test logs.');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTests(data.data.map((d: any) => ({...d, testDate: parseISO(d.testDate)})));
      } else {
        toast({ title: "Error", description: data.message || 'Could not load tests.', variant: "destructive" });
        setTests([]);
      }

    } catch (error: any) {
      toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast, isRefreshing]);

  useEffect(() => {
    fetchLabTests();
  }, [fetchLabTests]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLabTests();
  };

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
        if (searchTerm && !test.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) && !test.productName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    }).sort((a,b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
  }, [tests, searchTerm]);

  const formatDateSafe = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'PP p');
  };
  
  const getStatusBadge = (status: 'Pass' | 'Fail' | 'Pending') => {
    switch (status) {
        case 'Pass': return <Badge variant="default">Pass</Badge>;
        case 'Fail': return <Badge variant="destructive">Fail</Badge>;
        case 'Pending': return <Badge variant="secondary">Pending</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };


  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2"/>Loading test logs...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ListChecks /> All Lab Test Logs</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link href="/laboratory/new-test">
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Record New Test</Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow mt-6">
        <CardHeader>
          <CardTitle>Test Log</CardTitle>
          <CardDescription>A history of all recorded lab tests.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search by Sample ID or Product..." className="pl-8 w-full md:w-1/2" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Test Date</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead>Overall Result</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTests.length > 0 ? filteredTests.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.sampleId}</TableCell>
                  <TableCell>{d.productName}</TableCell>
                  <TableCell>{formatDateSafe(d.testDate)}</TableCell>
                  <TableCell>{d.batchNumber || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(d.overallStatus)}</TableCell>
                  <TableCell>
                    <Link href={`/laboratory/tests/${d.id}`} passHref>
                        <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4"/>View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">No test logs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredTests.length}</strong> of <strong>{tests.length}</strong> total test logs.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
