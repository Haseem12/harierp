
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { MilkSupplier } from '@/types';

interface MilkSupplierFormProps {
    onSaveSuccess: (supplierId: string, supplierName: string) => void;
}

export default function MilkSupplierForm({ onSaveSuccess }: MilkSupplierFormProps) {
    const router = useRouter();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [supplierType, setSupplierType] = useState<'Cooperative' | 'Individual'>('Cooperative');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [bankDetails, setBankDetails] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Cooperative-specific fields
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [chairmanName, setChairmanName] = useState('');
    const [secretaryName, setSecretaryName] = useState('');
    const [memberCount, setMemberCount] = useState<number | undefined>();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        if (!name || !code) {
            toast({
                title: "Validation Error",
                description: "Supplier Name and Code are required.",
                variant: "destructive"
            });
            setIsLoading(false);
            return;
        }

        const payload: Partial<MilkSupplier> = {
            name, code, supplierType, phone, address, bankDetails,
            registrationNumber: supplierType === 'Cooperative' ? registrationNumber : undefined,
            chairmanName: supplierType === 'Cooperative' ? chairmanName : undefined,
            secretaryName: supplierType === 'Cooperative' ? secretaryName : undefined,
            memberCount: supplierType === 'Cooperative' ? memberCount : undefined,
        };

        try {
            const response = await fetch('https://sajfoods.net/busa-api/database/save_milk_supplier.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server Error: ${errorText}`);
            }

            const result = await response.json();
            if (result.success && result.id) {
                onSaveSuccess(result.id, name);
            } else {
                throw new Error(result.message || 'Failed to save supplier.');
            }

        } catch (error: any) {
            toast({
                title: "Save Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Supplier Information</CardTitle>
                    <CardDescription>Enter the details for the new water supplier.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Supplier Type <span className="text-destructive">*</span></Label>
                        <RadioGroup defaultValue={supplierType} onValueChange={(value) => setSupplierType(value as 'Cooperative' | 'Individual')} className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Cooperative" id="cooperative" />
                                <Label htmlFor="cooperative">Cooperative</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Individual" id="individual" />
                                <Label htmlFor="individual">Individual Farmer</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Supplier Name <span className="text-destructive">*</span></Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="code">Supplier Code <span className="text-destructive">*</span></Label>
                            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g., COOP-001, FAR-002" />
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                    </div>
                    
                    <div>
                        <Label htmlFor="bankDetails">Bank Details (Optional)</Label>
                        <Textarea id="bankDetails" value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} placeholder="Bank Name, Account Number, Account Name..." />
                    </div>

                    {supplierType === 'Cooperative' && (
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-md font-medium text-primary">Cooperative Details</h3>
                             <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="registrationNumber">Registration Number (e.g., CAC)</Label>
                                    <Input id="registrationNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="memberCount">Number of Members</Label>
                                    <Input id="memberCount" type="number" value={memberCount || ''} onChange={(e) => setMemberCount(parseInt(e.target.value, 10))} />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="chairmanName">Chairman's Name</Label>
                                    <Input id="chairmanName" value={chairmanName} onChange={(e) => setChairmanName(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="secretaryName">Secretary's Name</Label>
                                    <Input id="secretaryName" value={secretaryName} onChange={(e) => setSecretaryName(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Register Supplier'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
