
import type { Product, Customer, Sale, Invoice, SaleItem, LedgerAccount, PriceTier, Receipt, PurchaseOrder, PurchaseItem, ProductCategory, UnitOfMeasure, RawMaterial, RawMaterialCategory, BankName, CreditNote, CreditNoteReason, RawMaterialUsageLog } from '@/types';
import { defaultCompanyDetails, ledgerAccountTypes, receiptPaymentMethods, purchaseOrderStatuses, productCategories, unitsOfMeasure, rawMaterialCategories, priceLevelOptions, bankNames, creditNoteReasons, usageDepartments } from '@/types';
import { parseAccountCodeDetails } from '@/lib/utils';

const today = new Date();
const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
const twoWeeksAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14);
const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() -1, today.getDate());
const threeDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3);
const fiveDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
const twoDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
const oneDayAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);


// Mock Data for Finished Goods (Products)
export let mockProducts: Product[] = [
  {
    id: 'prod_1',
    name: 'Classic Vanilla Yogurt',
    description: 'Rich and creamy vanilla flavored yogurt.',
    price: 1700.00,
    costPrice: 1000.00,
    priceTiers: [
      { priceLevel: priceLevelOptions[0], price: 1500.00 }, // B1-EX-F/DLR
      { priceLevel: priceLevelOptions[1], price: 1600.00 }, // R-RETAILER-Z1/RTL
      { priceLevel: priceLevelOptions[2], price: 1400.00 }, // Z-DISTRIZ2/RTL
    ],
    productCategory: 'Greek Yogurt',
    alternateUnits: 'Carton (12 PCS)',
    pcsPerUnit: 12,
    unitOfMeasure: 'PCS',
    sku: 'VAN001',
    stock: 150,
    lowStockThreshold: 20,
    imageUrl: 'https://picsum.photos/seed/vanilla_yogurt/200/200',
    createdAt: twoWeeksAgo,
    updatedAt: oneWeekAgo,
  },
  {
    id: 'prod_2',
    name: 'Strawberry Bliss Yogurt',
    description: 'Sweet strawberries blended into smooth yogurt.',
    price: 2000.00,
    costPrice: 1200.00,
    priceTiers: [
      { priceLevel: priceLevelOptions[0], price: 1800.00 },
      { priceLevel: priceLevelOptions[1], price: 1900.00 },
      { priceLevel: priceLevelOptions[2], price: 1700.00 },
    ],
    productCategory: 'Fruit Yogurt',
    unitOfMeasure: 'PCS',
    sku: 'STR002',
    stock: 200,
    lowStockThreshold: 30,
    imageUrl: 'https://picsum.photos/seed/strawberry_yogurt/200/200',
    createdAt: twoWeeksAgo,
    updatedAt: today,
  },
  {
    id: 'prod_3',
    name: 'Plain Natural Yogurt - 1 Litre',
    description: 'Unsweetened, natural yogurt, perfect for toppings.',
    price: 1400.00,
    costPrice: 800.00,
    priceTiers: [
      { priceLevel: priceLevelOptions[0], price: 1200.00 },
      { priceLevel: priceLevelOptions[1], price: 1300.00 },
      { priceLevel: priceLevelOptions[2], price: 1100.00 },
    ],
    productCategory: 'Plain Yogurt',
    unitOfMeasure: 'Litres',
    litres: 1,
    sku: 'PLN003L',
    stock: 120,
    lowStockThreshold: 15,
    imageUrl: 'https://picsum.photos/seed/plain_yogurt/200/200',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo,
  },
  {
    id: 'prod_4',
    name: 'Blueberry Burst Drinking Yogurt - 250ml',
    description: 'Refreshing blueberry flavored drinking yogurt.',
    price: 1100.00,
    costPrice: 650.00,
    priceTiers: [
      { priceLevel: priceLevelOptions[0], price: 950.00 },
      { priceLevel: priceLevelOptions[1], price: 1000.00 },
      { priceLevel: priceLevelOptions[2], price: 900.00 },
    ],
    productCategory: 'Drinking Yogurt',
    unitOfMeasure: 'PCS',
    pcsPerUnit: 1,
    alternateUnits: "Carton (24 PCS)",
    sku: 'BLU004S',
    stock: 300,
    lowStockThreshold: 50,
    imageUrl: 'https://picsum.photos/seed/blueberry_drink/200/200',
    createdAt: today,
    updatedAt: today,
  },
];

// Mock Data for Raw Materials / Store Items
export let mockRawMaterials: RawMaterial[] = [
  {
    id: 'raw_1',
    name: 'Fresh Cow Milk',
    description: 'Raw cow milk for yogurt production.',
    category: 'Milk Inputs',
    sku: 'RAWMLK001',
    unitOfMeasure: 'Litres',
    litres: 1,
    stock: 1000,
    costPrice: 450.00,
    lowStockThreshold: 200,
    imageUrl: 'https://picsum.photos/seed/raw_milk/200/200',
    supplierId: 'supplier_1',
    createdAt: oneWeekAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'raw_2',
    name: 'Granulated Sugar',
    description: 'Fine granulated sugar for sweetening.',
    category: 'Sweeteners',
    sku: 'SUG001BG',
    unitOfMeasure: 'KG',
    stock: 2500,
    costPrice: 600.00,
    lowStockThreshold: 500,
    imageUrl: 'https://picsum.photos/seed/sugar/200/200',
    createdAt: oneMonthAgo,
    updatedAt: oneWeekAgo,
  },
  {
    id: 'raw_3',
    name: 'Yogurt Culture A',
    description: 'Standard yogurt starter culture.',
    category: 'Cultures',
    sku: 'CUL001A',
    unitOfMeasure: 'Grams',
    stock: 5000,
    costPrice: 15.00,
    lowStockThreshold: 500,
    imageUrl: 'https://picsum.photos/seed/culture_a/200/200',
    supplierId: 'supplier_1',
    createdAt: twoWeeksAgo,
    updatedAt: oneWeekAgo,
  },
  {
    id: 'raw_4',
    name: '500g Yogurt Cups',
    description: 'Plastic cups for 500g yogurt packaging.',
    category: 'Packaging',
    sku: 'PCKG001CUP',
    unitOfMeasure: 'PCS',
    stock: 10000,
    costPrice: 50.00,
    lowStockThreshold: 1000,
    imageUrl: 'https://picsum.photos/seed/yogurt_cups/200/200',
    supplierId: 'supplier_2',
    createdAt: oneMonthAgo,
    updatedAt: today,
  },
];


export const mockCustomers: Customer[] = [
  {
    id: 'cust_1',
    name: 'Alice Wonderland (Retail)',
    email: 'alice@example.com',
    phone: '555-0101',
    address: '123 Rabbit Hole Lane',
    createdAt: twoWeeksAgo,
  },
  {
    id: 'cust_2',
    name: 'Bob The Builder (Distributor)',
    email: 'bob@example.com',
    phone: '555-0102',
    address: '456 Fixit Ave',
    createdAt: oneWeekAgo,
  },
];


const saleItems1: SaleItem[] = [
  { productId: 'prod_1', productName: 'Classic Vanilla Yogurt', quantity: 2, unitPrice: 1600.00, totalPrice: 3200.00, unitOfMeasure: 'PCS' },
  { productId: 'prod_2', productName: 'Strawberry Bliss Yogurt', quantity: 1, unitPrice: 1900.00, totalPrice: 1900.00, unitOfMeasure: 'PCS' },
];

const saleItems2: SaleItem[] = [
  { productId: 'prod_3', productName: 'Plain Natural Yogurt - 1 Litre', quantity: 5, unitPrice: 1100.00, totalPrice: 5500.00, unitOfMeasure: 'Litres' },
];

export let mockSales: Sale[] = [
  {
    id: 'sale_1',
    invoiceId: 'inv_1', // Link to invoice
    saleDate: oneWeekAgo,
    customer: {
      id: 'ledger_2', // R-RETAILER-Z1/RTL
      name: 'Good Foods Retail',
      priceLevel: 'R-RETAILER-Z1/RTL',
    },
    items: saleItems1,
    subTotal: saleItems1.reduce((sum, item) => sum + item.totalPrice, 0),
    taxAmount: saleItems1.reduce((sum, item) => sum + item.totalPrice, 0) * 0.075,
    totalAmount: saleItems1.reduce((sum, item) => sum + item.totalPrice, 0) * 1.075,
    paymentMethod: 'Card',
    status: 'Completed',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo,
  },
  {
    id: 'sale_2',
    invoiceId: 'inv_2', // Link to invoice
    saleDate: today,
    customer: {
      id: 'ledger_3', // Z-DISTRIZ2/RTL
      name: 'Regional Distributors Inc.',
      priceLevel: 'Z-DISTRIZ2/RTL',
    },
    items: saleItems2,
    subTotal: saleItems2.reduce((sum, item) => sum + item.totalPrice, 0),
    discountAmount: 200.00,
    taxAmount: (saleItems2.reduce((sum, item) => sum + item.totalPrice, 0) - 200.00) * 0.075,
    totalAmount: (saleItems2.reduce((sum, item) => sum + item.totalPrice, 0) - 200.00) * 1.075,
    paymentMethod: 'Cash',
    status: 'Pending',
    notes: 'Promotional discount applied.',
    createdAt: today,
    updatedAt: today,
  },
];

export let mockInvoices: Invoice[] = [
  {
    id: 'inv_1',
    saleId: 'sale_1',
    invoiceNumber: 'INV-2024-001',
    issueDate: oneWeekAgo,
    dueDate: new Date(oneWeekAgo.getTime() + 15 * 24 * 60 * 60 * 1000),
    customer: {
      id: 'ledger_2', // R-RETAILER-Z1/RTL
      name: 'Good Foods Retail',
      email: 'goodfoods@example.com',
      address: '456 Retail Rd, Shopsville',
      priceLevel: 'R-RETAILER-Z1/RTL',
    },
    items: saleItems1,
    subTotal: mockSales.find(s => s.id === 'sale_1')?.subTotal || 0,
    discountAmount: mockSales.find(s => s.id === 'sale_1')?.discountAmount,
    taxAmount: mockSales.find(s => s.id === 'sale_1')?.taxAmount,
    totalAmount: mockSales.find(s => s.id === 'sale_1')?.totalAmount || 0,
    status: 'Paid',
    companyDetails: defaultCompanyDetails,
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo,
  },
   {
    id: 'inv_2',
    saleId: 'sale_2',
    invoiceNumber: 'INV-2024-002',
    issueDate: today,
    dueDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
    customer: {
      id: 'ledger_3', // Z-DISTRIZ2/RTL
      name: 'Regional Distributors Inc.',
      email: 'distributors@example.com',
      address: '789 Supply Ave, Distro Hub',
      priceLevel: 'Z-DISTRIZ2/RTL',
    },
    items: saleItems2,
    subTotal: mockSales.find(s => s.id === 'sale_2')?.subTotal || 0,
    discountAmount: mockSales.find(s => s.id === 'sale_2')?.discountAmount,
    taxAmount: mockSales.find(s => s.id === 'sale_2')?.taxAmount,
    totalAmount: mockSales.find(s => s.id === 'sale_2')?.totalAmount || 0,
    status: 'Draft',
    notes: mockSales.find(s => s.id === 'sale_2')?.notes,
    companyDetails: defaultCompanyDetails,
    createdAt: today,
    updatedAt: today,
  },
];


const createLedgerAccount = (id: string, accountCode: string, creditPeriod: number, creditLimit: number, name: string, address: string, phone: string, accountType: LedgerAccount['accountType'], bankDetails: string, createdAt: Date, updatedAt: Date): LedgerAccount => {
  const { priceLevel, zone } = parseAccountCodeDetails(accountCode); // priceLevel will be the accountCode itself
  return {
    id,
    accountCode,
    priceLevel, // This is now the full accountCode
    zone,
    creditPeriod,
    creditLimit,
    name,
    address,
    phone,
    accountType,
    bankDetails,
    createdAt,
    updatedAt,
  };
};

export let mockLedgerAccounts: LedgerAccount[] = [
  createLedgerAccount('ledger_1', priceLevelOptions[0], 30, 10000000, 'John Doe (Sales Rep)', '123 Sales St, Market City', '555-1111', 'Sales Rep', 'Main Street Bank', oneMonthAgo, oneWeekAgo),
  createLedgerAccount('ledger_2', priceLevelOptions[1], 15, 5000000, 'Good Foods Retail', '456 Retail Rd, Shopsville', '555-2222', 'Customer', 'Commerce Bank', twoWeeksAgo, today),
  createLedgerAccount('ledger_3', priceLevelOptions[2], 45, 25000000, 'Regional Distributors Inc.', '789 Supply Ave, Distro Hub', '555-3333', 'Customer', 'National Bank', oneWeekAgo, today),
  createLedgerAccount('ledger_4', priceLevelOptions[3], 60, 15000000, 'Yogurt Land Dealer', '101 Dairy Dr, Zone 3 City', '555-4444', 'Customer', 'Local Credit Union', today, today),
  createLedgerAccount('ledger_5', priceLevelOptions[4], 30, 20000000, 'Arizona Best Distribution', '202 Desert Way, AZ Town', '555-5555', 'Customer', 'State Bank of AZ', oneMonthAgo, today),
  createLedgerAccount('supplier_1', 'SUP-GEN-001', 0, 0, 'Dairy Farm Supplies Co.', '99 Milk Pail Rd, Farmville', '555-6666', 'Supplier', 'AgriBank', oneMonthAgo, today),
  createLedgerAccount('supplier_2', 'SUP-PACK-002', 0, 0, 'Packaging Solutions Ltd.', '88 Box Factory Ln, IndustroCity', '555-7777', 'Supplier', 'Industrial Credit', twoWeeksAgo, oneWeekAgo),
];

// Helper to get product price based on customer's price level (which is their account code)
export const getProductPriceForCustomer = (product: Product, customerPriceLevelCode: string): number => {
  const customerAccount = mockLedgerAccounts.find(acc => acc.id === customerPriceLevelCode || acc.accountCode === customerPriceLevelCode);
  const priceLevelToUse = customerAccount ? customerAccount.priceLevel : 'DEFAULT'; // Use account's priceLevel field
  const tieredPrice = product.priceTiers?.find(tier => tier.priceLevel === priceLevelToUse);
  return tieredPrice ? tieredPrice.price : product.price; // Fallback to default price
};


export let mockReceipts: Receipt[] = [
  {
    id: 'rcpt_1',
    receiptNumber: 'RCPT-2024-0001',
    receiptDate: threeDaysAgo,
    ledgerAccountId: 'ledger_2', // Good Foods Retail
    ledgerAccountName: 'Good Foods Retail',
    amountReceived: 5000.00, // NGN
    paymentMethod: 'Transfer',
    bankName: 'Access Bank',
    referenceNumber: 'TRN_AB123XYZ',
    notes: 'Part payment for INV-2024-001',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'rcpt_2',
    receiptNumber: 'RCPT-2024-0002',
    receiptDate: today,
    ledgerAccountId: 'ledger_3', // Regional Distributors Inc.
    ledgerAccountName: 'Regional Distributors Inc.',
    amountReceived: 10000.00, // NGN
    paymentMethod: 'Cheque',
    bankName: 'GT Bank',
    referenceNumber: 'CHQ_98765',
    notes: 'Advance payment',
    createdAt: today,
    updatedAt: today,
  }
];

// Purchase items now refer to RawMaterial IDs and names
const purchaseItems1: PurchaseItem[] = [
    { productId: 'raw_1', productName: 'Fresh Cow Milk', quantity: 200, unitCost: 450.00, totalCost: 90000.00, unitOfMeasure: 'Litres' },
    { productId: 'raw_3', productName: 'Yogurt Culture A', quantity: 1000, unitCost: 15.00, totalCost: 15000.00, unitOfMeasure: 'Grams' },
];
const purchaseItems2: PurchaseItem[] = [
    { productId: 'raw_4', productName: '500g Yogurt Cups', quantity: 5000, unitCost: 50.00, totalCost: 250000.00, unitOfMeasure: 'PCS'},
];

export let mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po_1',
    poNumber: `PO-${new Date().getFullYear()}-001`,
    orderDate: oneWeekAgo,
    expectedDeliveryDate: today,
    supplier: {
      id: 'supplier_1',
      name: 'Dairy Farm Supplies Co.'
    },
    items: purchaseItems1,
    subTotal: purchaseItems1.reduce((sum, item) => sum + item.totalCost, 0),
    shippingCost: 5000,
    totalCost: purchaseItems1.reduce((sum, item) => sum + item.totalCost, 0) + 5000,
    status: 'Ordered',
    notes: 'Urgent order for restocking milk and cultures.',
    createdAt: oneWeekAgo,
    updatedAt: oneWeekAgo,
  },
  {
    id: 'po_2',
    poNumber: `PO-${new Date().getFullYear()}-002`,
    orderDate: threeDaysAgo,
    supplier: {
      id: 'supplier_2',
      name: 'Packaging Solutions Ltd.'
    },
    items: purchaseItems2,
    subTotal: purchaseItems2.reduce((sum, item) => sum + item.totalCost, 0),
    totalCost: purchaseItems2.reduce((sum, item) => sum + item.totalCost, 0),
    status: 'Draft',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
];


export let mockCreditNotes: CreditNote[] = [
  {
    id: 'cn_1',
    creditNoteNumber: 'CN-2024-001',
    creditNoteDate: fiveDaysAgo,
    ledgerAccountId: 'ledger_1', // John Doe (Sales Rep)
    ledgerAccountName: 'John Doe (Sales Rep)',
    amount: 15000.00, // NGN
    reason: 'Travel Expense Reimbursement',
    description: 'Reimbursement for travel to Kano for sales meeting.',
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  },
  {
    id: 'cn_2',
    creditNoteNumber: 'CN-2024-002',
    creditNoteDate: threeDaysAgo,
    ledgerAccountId: 'ledger_2', // Good Foods Retail
    ledgerAccountName: 'Good Foods Retail',
    amount: 1600.00, // NGN
    reason: 'Returned Goods',
    description: 'Credit for 1 unit of Classic Vanilla Yogurt returned (related to INV-2024-001).',
    relatedInvoiceId: 'inv_1',
    items: [
        { productId: 'prod_1', productName: 'Classic Vanilla Yogurt', quantity: 1, unitPrice: 1600.00, totalPrice: 1600.00, unitOfMeasure: 'PCS' },
    ],
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'cn_3',
    creditNoteNumber: 'CN-2024-003',
    creditNoteDate: today,
    ledgerAccountId: 'ledger_3', // Regional Distributors Inc.
    ledgerAccountName: 'Regional Distributors Inc.',
    amount: 500.00, // NGN
    reason: 'Damages',
    description: 'Credit for slightly damaged packaging on a recent delivery.',
    createdAt: today,
    updatedAt: today,
  },
];

export let mockRawMaterialUsageLogs: RawMaterialUsageLog[] = [
  {
    id: 'usage_1',
    usageNumber: 'USE-2024-0001',
    rawMaterialId: 'raw_1',
    rawMaterialName: 'Fresh Cow Milk',
    quantityUsed: 50,
    unitOfMeasure: 'Litres',
    department: 'Production',
    usageDate: twoDaysAgo,
    notes: 'Used for batch YGH-055',
    recordedBy: 'Admin',
    createdAt: twoDaysAgo,
  },
  {
    id: 'usage_2',
    usageNumber: 'USE-2024-0002',
    rawMaterialId: 'raw_4',
    rawMaterialName: '500g Yogurt Cups',
    quantityUsed: 200,
    unitOfMeasure: 'PCS',
    department: 'Packaging',
    usageDate: oneDayAgo,
    recordedBy: 'Admin',
    createdAt: oneDayAgo,
  },
];
