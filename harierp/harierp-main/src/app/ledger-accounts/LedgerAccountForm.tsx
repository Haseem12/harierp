
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { LedgerAccount, LedgerAccountType } from '@/types';
import { ledgerAccountTypes, priceLevelOptions as predefinedAccountCodes } from '@/types'; 
import { parseAccountCodeDetails } from '@/lib/utils'; 

type RegistrationMode = 'salesRep' | 'supplier' | 'general';

interface LedgerAccountFormProps {
  account?: LedgerAccount; 
  onSaveSuccess?: (accountId: string, accountName: string) => void;
  registrationMode?: RegistrationMode; 
}

export default function LedgerAccountForm({ account, onSaveSuccess, registrationMode = 'general' }: LedgerAccountFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const getInitialAccountType = (): LedgerAccountType => {
    if (account?.accountType) return account.accountType;
    if (registrationMode === 'salesRep') return 'Sales Rep';
    if (registrationMode === 'supplier') return 'Supplier';
    return ledgerAccountTypes[0]; // Default for general form
  };

  const [formData, setFormData] = useState<Partial<LedgerAccount>>({
    name: account?.name || '',
    accountCode: account?.accountCode || '',
    creditPeriod: account?.creditPeriod || 0,
    creditLimit: account?.creditLimit || 0,
    address: account?.address || '',
    phone: account?.phone || '',
    accountType: getInitialAccountType(),
    bankDetails: account?.bankDetails || '',
  });

  const [derivedPriceLevel, setDerivedPriceLevel] = useState(account?.priceLevel || 'N/A');
  const [derivedZone, setDerivedZone] = useState(account?.zone || 'N/A');
  const [isLoading, setIsLoading] = useState(false);

  const updateDerivedFields = useCallback((code: string) => {
    const { priceLevel, zone } = parseAccountCodeDetails(code);
    setDerivedPriceLevel(priceLevel);
    setDerivedZone(zone);
  }, []);

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        accountCode: account.accountCode,
        priceLevel: account.priceLevel, 
        zone: account.zone,
        creditPeriod: account.creditPeriod,
        creditLimit: account.creditLimit,
        address: account.address,
        phone: account.phone,
        accountType: getInitialAccountType(), // Recalculate based on context
        bankDetails: account.bankDetails,
      });
      updateDerivedFields(account.accountCode);
    } else {
      // If it's a new form, set the account type based on registration mode
      setFormData(prev => ({ ...prev, accountType: getInitialAccountType() }));
    }
  }, [account, updateDerivedFields, registrationMode]);

  useEffect(() => {
    if (formData.accountCode) {
      updateDerivedFields(formData.accountCode);
    }
  }, [formData.accountCode, updateDerivedFields]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['creditPeriod', 'creditLimit'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    }));
  };

  const handleAccountCodeSelectChange = (newCode: string) => {
    setFormData(prev => ({ ...prev, accountCode: newCode }));
  };

  const handleAccountTypeChange = (value: LedgerAccountType) => {
    setFormData(prev => ({ ...prev, accountType: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.name || !formData.accountCode || !formData.accountType) {
      toast({
        title: "Missing Information",
        description: "Please fill in Name, Account Code, and Account Type.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { priceLevel: derivedPL, zone: derivedZ } = parseAccountCodeDetails(formData.accountCode || '');

    const payload: any = {
      name: formData.name,
      accountCode: formData.accountCode,
      priceLevel: derivedPL,
      zone: derivedZ,      
      creditPeriod: formData.creditPeriod || 0,
      creditLimit: formData.creditLimit || 0,
      address: formData.address || '',
      phone: formData.phone || '',
      accountType: formData.accountType,
      bankDetails: formData.bankDetails || '',
      createdAt: account?.createdAt ? (account.createdAt instanceof Date ? account.createdAt.toISOString() : account.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (account?.id) {
        payload.id = account.id;
    }


    try {
      const res = await fetch('https://sajfoods.net/busa-api/database/save_ledger_account.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server Response Error Text (Ledger Account):", errorText);
        throw new Error(`Server error: ${res.status} - ${errorText || res.statusText}`);
      }
      const result = await res.json();
      console.log("Save Ledger Account Response:", result);


      if (result.success) {
        toast({ title: "Success", description: result.message });
        const savedAccountId = result.id || account?.id || ''; 
        const savedAccountName = payload.name || 'N/A';

        if (onSaveSuccess) {
          onSaveSuccess(savedAccountId, savedAccountName); 
        } else if (savedAccountId) { 
          router.push(`/ledger-accounts/${savedAccountId}`);
        } else { 
          router.push('/ledger-accounts');
        }
      } else {
        console.error("PHP Script Error (Ledger Account):", result.message || "Unknown error from PHP script.");
        throw new Error(result.message || "An unknown error occurred on the server.");
      }

    } catch (error: any) {
      console.error("Error saving ledger account:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save ledger account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPageTitle = () => {
      if (account) return registrationMode === 'salesRep' ? 'Edit Sales Representative' : (registrationMode === 'supplier' ? 'Edit Supplier' : 'Edit Ledger Account');
      return registrationMode === 'salesRep' ? 'Register New Sales Representative' : (registrationMode === 'supplier' ? 'Register New Supplier' : 'Create New Ledger Account');
  };

  const getPageDescription = () => {
      if (account) return `Edit the details of this ${registrationMode === 'general' ? 'ledger account' : registrationMode}.`;
      return registrationMode === 'salesRep' ? 'Enter the details for the new sales representative. The generated ID will be their login ID.' : `Enter the details for the new ${registrationMode === 'supplier' ? 'supplier' : 'ledger account'}.`;
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{getPageTitle()}</CardTitle>
          <CardDescription>{getPageDescription()}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="name">{registrationMode === 'salesRep' ? 'Sales Rep Name' : (registrationMode === 'supplier' ? 'Supplier Name' : 'Name')} <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="accountCode">Account Code <span className="text-destructive">*</span></Label>
              <Select name="accountCode" onValueChange={handleAccountCodeSelectChange} value={formData.accountCode} required>
                <SelectTrigger id="accountCode" aria-label="Select account code">
                  <SelectValue placeholder="Select account code" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedAccountCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label>Derived Price Level</Label>
              <Input value={derivedPriceLevel} readOnly disabled className="bg-muted/50" />
            </div>
            <div className="grid gap-3">
              <Label>Derived Zone</Label>
              <Input value={derivedZone} readOnly disabled className="bg-muted/50" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="accountType">Account Type <span className="text-destructive">*</span></Label>
              <Select name="accountType" onValueChange={handleAccountTypeChange} value={formData.accountType} required disabled={registrationMode !== 'general'}>
                <SelectTrigger id="accountType" aria-label="Select account type">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {ledgerAccountTypes.map(type => (
                    <SelectItem key={type} value={type} disabled={registrationMode !== 'general' && type !== formData.accountType}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {registrationMode !== 'general' && <p className="text-xs text-muted-foreground">Account type is fixed for this registration form.</p>}
            </div>
            <div className="grid gap-3">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
            </div>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} className="min-h-24" />
          </div>
          
          {registrationMode === 'general' && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="creditPeriod">Credit Period (days)</Label>
                  <Input id="creditPeriod" name="creditPeriod" type="number" value={formData.creditPeriod || ''} onChange={handleInputChange} />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <Input id="creditLimit" name="creditLimit" type="number" value={formData.creditLimit || ''} onChange={handleInputChange} />
                </div>
              </div>
            </>
          )}

           <div className="grid gap-3">
            <Label htmlFor="bankDetails">Bank Details (Optional)</Label>
            <Textarea id="bankDetails" name="bankDetails" value={formData.bankDetails} onChange={handleInputChange} className="min-h-20" placeholder="Bank Name, Account Number, etc." />
          </div>


          <div className="pt-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Saving...' : account ? 'Update' : 'Register'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
