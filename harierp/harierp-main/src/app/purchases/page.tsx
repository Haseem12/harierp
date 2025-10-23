
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Search, FileDown, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
import type { PurchaseOrder } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_purchase_orders.php');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPurchaseOrders(data.data.map((po:any) => ({
          ...po,
          orderDate: new Date(po.orderDate),
          expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : undefined,
          supplier: po.supplier || {id: po.supplierId, name: po.supplierName || 'Unknown Supplier'} // Handle if supplier object is nested or flat
        })));
      } else {
        toast({ title: "Error", description: data.message || "Failed to fetch POs: Unexpected data format.", variant: "destructive" });
        setPurchaseOrders([]);
      }
    } catch (error: any) {
      toast({ title: "Fetch Error", description: `Purchase Orders: ${error.message}`, variant: "destructive" });
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPurchaseOrders();
    toast({title: "Refreshed", description: "Purchase orders list updated."});
  };

  const filteredPurchaseOrders = useMemo(() =>
    purchaseOrders.filter(po =>
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.supplier?.name && po.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      po.status.toLowerCase().includes(searchTerm.toLowerCase())
    ), [purchaseOrders, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStatusBadgeVariant = (status: PurchaseOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Received': return 'default';
      case 'Ordered': return 'secondary';
      case 'Draft': return 'outline';
      case 'Partially Received': return 'outline';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const handleDeletePurchaseOrder = async (poId: string) => {
    const poToDelete = purchaseOrders.find(po => po.id === poId);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/delete_purchase_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: poId }),
      });
      const result = await response.json();
      if (result.success) {
        setPurchaseOrders(prevPOs => prevPOs.filter(po => po.id !== poId));
        toast({
          title: "Purchase Order Deleted",
          description: `PO "${poToDelete?.poNumber}" has been removed.`,
        });
      } else {
        throw new Error(result.message || "Failed to delete PO from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };
  /*
  PHP SCRIPT: get_purchase_orders.php
  <?php
  // header("Access-Control-Allow-Origin: *"); header("Content-Type: application/json");
  // ... (database connection $conn) ...
  // $sql = "SELECT id, poNumber, orderDate, expectedDeliveryDate, supplierId, supplierName, totalCost, status, createdAt FROM purchase_orders ORDER BY orderDate DESC";
  // $result = $conn->query($sql);
  // $pos = [];
  // if ($result) { while ($row = $result->fetch_assoc()) {
  //    $row['supplier'] = ['id' => $row['supplierId'], 'name' => $row['supplierName']]; // Structure for frontend
  //    $pos[] = $row;
  // }}
  // echo json_encode(["success" => true, "data" => $pos]); // Or handle error
  // $conn->close();
  ?>

  PHP SCRIPT: delete_purchase_order.php
  <?php
  // header("Access-Control-Allow-Origin: *"); ... (all CORS) ...
  // header("Content-Type: application/json");
  // ... (database connection $conn) ...
  // $data = json_decode(file_get_contents("php://input"));
  // if (!isset($data->id)) { echo json_encode(["success" => false, "message" => "ID required"]); exit; }
  // $id = $data->id;
  // $conn->begin_transaction();
  // try {
  //   $stmtItems = $conn->prepare("DELETE FROM purchase_items WHERE purchaseOrderId = ?");
  //   $stmtItems->bind_param("s", $id);
  //   $stmtItems->execute();
  //   $stmtItems->close();
  //   $stmtPO = $conn->prepare("DELETE FROM purchase_orders WHERE id = ?");
  //   $stmtPO->bind_param("s", $id);
  //   $stmtPO->execute();
  //   $stmtPO->close();
  //   $conn->commit();
  //   echo json_encode(["success" => true, "message" => "PO deleted."]);
  // } catch (Exception $e) {
  //   $conn->rollback();
  //   echo json_encode(["success" => false, "message" => "Delete failed: " . $e->getMessage()]);
  // }
  // $conn->close();
  ?>
  */

  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading purchase orders...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* <Button variant="outline"> <FileDown className="mr-2 h-4 w-4" /> Export POs </Button> */}
          <Link href="/purchases/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Purchase Order
            </Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Purchase Order Management</CardTitle>
          <CardDescription>Track and manage all supplier purchase orders.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search POs by number, supplier, or status..."
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
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchaseOrders.length > 0 ? filteredPurchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(po.orderDate), 'PP')}</TableCell>
                  <TableCell>{po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), 'PP') : 'N/A'}</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(po.status)}>{po.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(po.totalCost)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/purchases/${po.id}`} passHref><DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View PO</DropdownMenuItem></Link>
                        <Link href={`/purchases/${po.id}/edit`} passHref><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit PO</DropdownMenuItem></Link>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete PO
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete PO "{po.poNumber}".</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePurchaseOrder(po.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No purchase orders found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredPurchaseOrders.length}</strong> of <strong>{purchaseOrders.length}</strong> purchase orders
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    