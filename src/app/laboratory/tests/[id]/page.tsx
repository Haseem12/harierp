
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, RefreshCw, Hash, Info, FileText, TestTube2, Thermometer, Droplets, Zap, Wind, Eye, Bug, FlaskConical, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from "@/lib/utils";

interface LabTest {
    id: string;
    batchNumber?: string;
    sampleId: string;
    testDate: Date | string;
    productName: string;
    phLevel?: number;
    tdsLevel?: number;
    chlorineLevel?: number;
    turbidity?: number;
    conductivity?: number;
    temperature?: number;
    microbiologicalTest: 'Pass' | 'Fail' | 'Pending';
    chemicalTest: 'Pass' | 'Fail' | 'Pending';
    physicalTest: 'Pass' | 'Fail' | 'Pending';
    overallStatus: 'Pass' | 'Fail' | 'Pending';
    notes?: string;
    createdAt: Date | string;
}


function InfoItem({ icon: Icon, label, value, className = '' }: { icon: React.ElementType; label: string; value: string | number | null | undefined | React.ReactNode; className?: string; }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 mt-1 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm text-muted-foreground">{label}</p>
        <div className={cn("text-base", className)}>{value ?? 'N/A'}</div>
      </div>
    </div>
  );
}

function ResultCard({ title, status, icon: Icon }: { title: string, status: 'Pass' | 'Fail' | 'Pending', icon: React.ElementType }) {
    const statusStyles = {
        Pass: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', border: 'border-green-300 dark:border-green-700' },
        Fail: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', border: 'border-red-300 dark:border-red-700' },
        Pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-300 dark:border-yellow-700' }
    };
    const styles = statusStyles[status];

    return (
        <Card className={cn('text-center', styles.bg, styles.border)}>
            <CardHeader className="p-4">
                <div className={cn('mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2', styles.bg)}>
                    <Icon className={cn('h-6 w-6', styles.text)} />
                </div>
                <CardTitle className={cn('text-md', styles.text)}>{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <Badge variant={status === 'Pass' ? 'default' : status === 'Fail' ? 'destructive' : 'secondary'} className="text-lg">
                    {status}
                </Badge>
            </CardContent>
        </Card>
    );
}

export default function LabTestDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [test, setTest] = useState<LabTest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const testId = params.id as string;

  const fetchTest = useCallback(async () => {
    if (!testId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`https://sajfoods.net/busa-api/database/get_lab_test_detail.php?id=${testId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch test details: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setTest({
          ...data.data,
          testDate: parseISO(data.data.testDate),
        });
      } else {
        throw new Error(data.message || 'Test not found.');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [testId, toast]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading test details...</div>;
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Test details could not be loaded.</p>
        <Link href="/laboratory/tests" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Test Logs</Button></Link>
      </div>
    );
  }
return (
  <>
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 print:hidden">
      <div className="flex items-center justify-between">
        <Link href="/laboratory/tests" passHref>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
      </div>
    </div>

    <div id="printable-area" className="print-container bg-white">
      <Card className="w-full border border-gray-300 shadow-md print:shadow-none print:border-none">
        {/* HEADER */}
        <CardHeader className="relative p-8 border-b bg-gradient-to-r from-blue-50 to-cyan-50 print:bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/hari-logo.png"
                alt="Company Logo"
                className="w-14 h-14 rounded-full border border-gray-200 object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-800 uppercase">
                  Hari Industries Limited
                </h1>
                <p className="text-sm text-gray-600 leading-tight">
                  Plot 7, Industrial Layout, Kaduna, Nigeria<br />
                  Tel: +234 803 456 7890 | Email: info@hariindustries.com
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="font-semibold text-lg text-slate-700">
                Laboratory Test Report
              </h2>
              <p className="text-xs text-gray-500">
                Generated on {format(new Date(), "PPpp")}
              </p>
            </div>
          </div>
        </CardHeader>

        {/* BODY */}
        <CardContent className="p-8">
          {/* Section 1: Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-gray-200">
            <InfoItem icon={Hash} label="Sample ID" value={test.sampleId} className="font-mono" />
            <InfoItem icon={Package} label="Product" value={test.productName} className="font-semibold" />
            <InfoItem icon={Calendar} label="Test Date" value={format(test.testDate, "PP")} />
            <InfoItem icon={Hash} label="Batch Number" value={test.batchNumber || "N/A"} />
          </div>

          {/* Section 2: Result Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <ResultCard title="Physical Test" status={test.physicalTest} icon={Eye} />
            <ResultCard title="Chemical Test" status={test.chemicalTest} icon={FlaskConical} />
            <ResultCard title="Microbiological Test" status={test.microbiologicalTest} icon={Bug} />
          </div>

          {/* Section 3: Test Parameters */}
          <h3 className="font-semibold mb-4 text-lg text-slate-700 border-b border-gray-300 pb-2">
            Test Parameters & Results
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-slate-800">
            <InfoItem icon={Droplets} label="pH Level" value={test.phLevel?.toFixed(2) || "N/A"} />
            <InfoItem icon={FlaskConical} label="TDS Level (ppm)" value={test.tdsLevel?.toLocaleString() || "N/A"} />
            <InfoItem icon={Zap} label="Chlorine (mg/L)" value={test.chlorineLevel?.toFixed(2) || "N/A"} />
            <InfoItem icon={Wind} label="Turbidity (NTU)" value={test.turbidity?.toFixed(2) || "N/A"} />
            <InfoItem icon={Zap} label="Conductivity (µS/cm)" value={test.conductivity?.toLocaleString() || "N/A"} />
            <InfoItem icon={Thermometer} label="Temperature (°C)" value={test.temperature?.toFixed(1) || "N/A"} />
          </div>

          {/* Section 4: Notes */}
          {test.notes && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <InfoItem icon={Info} label="Notes" value={test.notes} />
            </div>
          )}
        </CardContent>

        {/* FOOTER */}
        <CardFooter className="p-8 flex-col items-center gap-8 print:mt-16 border-t border-gray-200">
          <div className="w-full flex justify-center mb-6">
            <Badge
              variant={
                test.overallStatus === "Pass"
                  ? "default"
                  : test.overallStatus === "Fail"
                  ? "destructive"
                  : "secondary"
              }
              className="text-lg px-8 py-2 uppercase tracking-wide"
            >
              Overall Result: {test.overallStatus}
            </Badge>
          </div>
          <div className="w-full flex justify-around text-center text-sm">
            <div>
              <p className="border-t pt-2 mt-8 w-48">Tested By (Signature)</p>
            </div>
            <div>
              <p className="border-t pt-2 mt-8 w-48">Reviewed By (Signature)</p>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>

    <style jsx global>{`
      @media print {
        @page {
          size: A4;
          margin: 10mm;
        }
        html, body {
          background: white !important;
          -webkit-print-color-adjust: exact !important;
        }
        * {
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-shadow: none !important;
        }
        #printable-area {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 0;
          border: none !important;
        }
        .print\\:hidden {
          display: none !important;
        }
      }    `}</style>
  </>
);
}

