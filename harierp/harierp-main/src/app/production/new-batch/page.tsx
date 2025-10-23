
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerComponent } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  PlusCircle,
  ArrowLeft,
  MinusCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RawMaterial, Product as FinishedGood } from "@/types";
import { format } from "date-fns";

interface ConsumedItem {
  id: string;
  materialId: string;
  quantity: number;
}

export default function NewProductionBatchPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [availableRawMaterials, setAvailableRawMaterials] = useState<
    RawMaterial[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [batchId, setBatchId] = useState(
    `PRODB-${Date.now().toString().slice(-6)}`
  );
  const [productionDate, setProductionDate] = useState<Date | undefined>(
    new Date()
  );
  const [notes, setNotes] = useState("");

  const [consumedItems, setConsumedItems] = useState<ConsumedItem[]>([
    { id: `c_${Date.now()}`, materialId: "", quantity: 0 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const materialsRes = await fetch("https://sajfoods.net/busa-api/database/get_raw_materials.php");
        
        if (!materialsRes.ok) throw new Error("Failed to fetch raw materials.");
        const materialsData = await materialsRes.json();
        if (materialsData.success)
          setAvailableRawMaterials(materialsData.data);
        else
          throw new Error(
            materialsData.message || "Error in raw materials response."
          );

      } catch (error: any) {
        toast({
          title: "Fetch Error",
          description: `Could not load necessary data: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [toast]);

  const addConsumedItem = () =>
    setConsumedItems([
      ...consumedItems,
      { id: `c_${Date.now()}_${Math.random()}`, materialId: "", quantity: 0 },
    ]);
  const removeConsumedItem = (id: string) =>
    setConsumedItems(consumedItems.filter((item) => item.id !== id));
  const handleConsumedChange = (
    id: string,
    field: "materialId" | "quantity",
    value: string | number
  ) => {
    setConsumedItems(
      consumedItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validConsumedItems = consumedItems.filter(
      (i) => i.materialId && i.quantity > 0
    );

    if (!productionDate || validConsumedItems.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "Please set a production date and specify at least one material with a quantity greater than zero.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    for (const item of validConsumedItems) {
      const material = availableRawMaterials.find(
        (m) => m.id === item.materialId
      );
      if (!material || material.stock < item.quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Not enough stock for ${
            material?.name || "the selected material"
          }. Required: ${item.quantity}, Available: ${material?.stock || 0}.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      batchId,
      productionDate: format(productionDate, "yyyy-MM-dd"),
      consumedItems: validConsumedItems.map((item) => ({
        materialId: item.materialId,
        quantityUsed: item.quantity,
      })),
      notes,
    };

    try {
      const response = await fetch(
        "https://sajfoods.net/busa-api/database/save_production_batch.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Production Batch Recorded",
          description: `Batch ${batchId} has been successfully logged. Stock levels have been adjusted.`,
        });
        router.push("/production");
      } else {
        throw new Error(result.message || "Failed to save production batch.");
      }
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading production data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/production" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Production Dashboard</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Step 1: Record Material Consumption
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
             <CardDescription>
              This action records the consumption of materials for a production run. This will deduct from store inventory.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchId">Production Batch ID</Label>
              <Input
                id="batchId"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="productionDate">Production Date</Label>
              <DatePickerComponent
                date={productionDate}
                setDate={setProductionDate}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MinusCircle className="text-destructive h-5 w-5" /> Consumed Store Items
            </CardTitle>
            <CardDescription>
              Select all items used for this batch (e.g., bottles, caps, labels, treatment chemicals).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Act</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumedItems.map((item) => {
                  const selectedMat = availableRawMaterials.find(
                    (m) => m.id === item.materialId
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select
                          value={item.materialId}
                          onValueChange={(val) =>
                            handleConsumedChange(item.id, "materialId", val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRawMaterials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} (Stock: {m.stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleConsumedChange(
                              item.id,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Qty"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground ml-1">
                          {selectedMat?.unitOfMeasure || ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeConsumedItem(item.id)}
                          disabled={consumedItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addConsumedItem}
              className="mt-4"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Material
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
             <CardDescription>
              Add optional notes for this batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., equipment used, shift supervisor, quality observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoadingData}>
            {isSubmitting ? "Saving Batch..." : "Save Material Consumption"}
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}
