
'use server';

import type { Invoice, Receipt, LedgerAccount, CreditNote } from '@/types';
import { mockInvoices, mockReceipts, mockLedgerAccounts, mockCreditNotes } from './mockData'; // Keep for existing mock logic if any part still uses it
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { toDate } from 'date-fns';

// Original function for mock data
export async function getLedgerAccountOutstandingBalance(ledgerAccountId: string): Promise<{ balance: number; accountName: string | undefined; creditLimit: number | undefined; totalInvoiced: number; totalReceived: number; totalCredited: number; }> {
  const account = mockLedgerAccounts.find(acc => acc.id === ledgerAccountId);

  const totalInvoiced = mockInvoices
    .filter(invoice => invoice.customer.id === ledgerAccountId && invoice.status !== 'Cancelled')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const totalReceived = mockReceipts
    .filter(receipt => receipt.ledgerAccountId === ledgerAccountId)
    .reduce((sum, receipt) => sum + receipt.amountReceived, 0);
  
  const totalCredited = mockCreditNotes
    .filter(cn => cn.ledgerAccountId === ledgerAccountId)
    .reduce((sum, cn) => sum + cn.amount, 0);

  const balance = totalInvoiced - totalReceived - totalCredited;

  return { 
    balance, 
    accountName: account?.name, 
    creditLimit: account?.creditLimit,
    totalInvoiced,
    totalReceived,
    totalCredited,
  };
}

// New function for Firebase
export async function getLedgerAccountOutstandingBalanceFirebase(
  ledgerAccountId: string,
  invoicesData?: Invoice[], // Optional pre-fetched data
  receiptsData?: Receipt[], // Optional pre-fetched data
  creditNotesData?: CreditNote[] // Optional pre-fetched data
): Promise<{ balance: number; accountName: string | undefined; creditLimit: number | undefined; totalInvoiced: number; totalReceived: number; totalCredited: number; }> {
  
  const accountDocRef = doc(db, "ledgerAccounts", ledgerAccountId);
  const accountSnap = await getDoc(accountDocRef);
  const account = accountSnap.exists() ? accountSnap.data() as LedgerAccount : undefined;

  let finalInvoicesData = invoicesData;
  if (!finalInvoicesData) {
    const invoicesQuery = query(collection(db, "invoices") as collection<Invoice>, where("customer.id", "==", ledgerAccountId));
    const invoicesSnap = await getDocs(invoicesQuery);
    finalInvoicesData = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
  }

  let finalReceiptsData = receiptsData;
  if (!finalReceiptsData) {
    const receiptsQuery = query(collection(db, "receipts") as collection<Receipt>, where("ledgerAccountId", "==", ledgerAccountId));
    const receiptsSnap = await getDocs(receiptsQuery);
    finalReceiptsData = receiptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Receipt));
  }

  let finalCreditNotesData = creditNotesData;
  if(!finalCreditNotesData) {
    const creditNotesQuery = query(collection(db, "creditNotes") as collection<CreditNote>, where("ledgerAccountId", "==", ledgerAccountId));
    const creditNotesSnap = await getDocs(creditNotesQuery);
    finalCreditNotesData = creditNotesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CreditNote));
  }

  const totalInvoiced = finalInvoicesData
    .filter(invoice => invoice.status !== 'Cancelled')
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const totalReceived = finalReceiptsData
    .reduce((sum, receipt) => sum + receipt.amountReceived, 0);
  
  const totalCredited = finalCreditNotesData
    .reduce((sum, cn) => sum + cn.amount, 0);

  const balance = totalInvoiced - totalReceived - totalCredited;

  return { 
    balance, 
    accountName: account?.name, 
    creditLimit: account?.creditLimit,
    totalInvoiced,
    totalReceived,
    totalCredited,
  };
}


export async function getLedgerAccountDetails(ledgerAccountId: string): Promise<LedgerAccount | undefined> {
  const accountDocRef = doc(db, "ledgerAccounts", ledgerAccountId);
  const accountSnap = await getDoc(accountDocRef);
  if (accountSnap.exists()) {
    return { id: accountSnap.id, ...accountSnap.data() } as LedgerAccount;
  }
  return undefined;
}
