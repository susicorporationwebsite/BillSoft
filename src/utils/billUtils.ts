import { Bill, BillItem, DashboardStats, FilterOptions } from '@/types/billing';

const STORAGE_KEY = 'susi_bills';

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate invoice number
export const generateInvoiceNo = (bills: Bill[]): string => {
  const currentYear = new Date().getFullYear();
  const existingNumbers = bills
    .filter(b => b.invoiceNo.startsWith(`SC${currentYear}`))
    .map(b => parseInt(b.invoiceNo.replace(`SC${currentYear}`, '')) || 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `SC${currentYear}${nextNumber.toString().padStart(4, '0')}`;
};

// Calculate item amount
export const calculateItemAmount = (quantity: number, rate: number): number => {
  return Math.round(quantity * rate * 100) / 100;
};

// Calculate GST
export const calculateGST = (subtotal: number, rate: number): number => {
  return Math.round(subtotal * rate * 100) / 100;
};

// Number to words (Indian format)
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const convertNumber = (n: number): string => {
    if (n === 0) return '';

    let result = '';

    // Crores
    if (n >= 10000000) {
      result += convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }

    // Lakhs
    if (n >= 100000) {
      result += convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }

    // Thousands
    if (n >= 1000) {
      result += convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }

    // Hundreds, Tens, Ones
    if (n > 0) {
      result += convertLessThanThousand(n);
    }

    return result.trim();
  };

  let result = convertNumber(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertNumber(paise) + ' Paise';
  }
  return result + ' Only';
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Validate GSTIN
export const validateGSTIN = (gstin: string): boolean => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// Local Storage operations removed in favor of Firebase 'api.ts'
// These functions were: saveBills, loadBills, saveBill, deleteBill, getBillById

// Filter bills
export const filterBills = (bills: Bill[], filters: FilterOptions): Bill[] => {
  let filtered = [...bills];

  // Time range filter
  const now = new Date();
  let startDate: Date | null = null;

  switch (filters.timeRange) {
    case 'last1month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case 'last3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case 'last6months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'custom':
      if (filters.startDate) startDate = new Date(filters.startDate);
      break;
  }

  if (startDate) {
    filtered = filtered.filter(bill => new Date(bill.invoiceDate) >= startDate!);
  }

  if (filters.timeRange === 'custom' && filters.endDate) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter(bill => new Date(bill.invoiceDate) <= endDate);
  }

  // Search filter
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(bill => {
      switch (filters.searchField) {
        case 'buyerName':
          return bill.buyerName.toLowerCase().includes(term);
        case 'invoiceNo':
          return bill.invoiceNo.toLowerCase().includes(term);
        case 'gstin':
          return bill.buyerGstin.toLowerCase().includes(term);
        default:
          return true;
      }
    });
  }

  return filtered.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
};

// Calculate dashboard stats
export const calculateDashboardStats = (bills: Bill[]): DashboardStats => {
  const finalBills = bills;

  const totalRevenue = finalBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const sgstCollected = finalBills.reduce((sum, b) => sum + b.sgstAmount, 0);
  const cgstCollected = finalBills.reduce((sum, b) => sum + b.cgstAmount, 0);
  const igstCollected = finalBills.reduce((sum, b) => sum + b.igstAmount, 0);

  // Monthly revenue
  const monthlyData: { [key: string]: number } = {};
  finalBills.forEach(bill => {
    const date = new Date(bill.invoiceDate);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + bill.grandTotal;
  });

  const monthlyRevenue = Object.entries(monthlyData)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  // Top customers
  const customerData: { [key: string]: number } = {};
  finalBills.forEach(bill => {
    customerData[bill.buyerName] = (customerData[bill.buyerName] || 0) + bill.grandTotal;
  });

  const topCustomers = Object.entries(customerData)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalRevenue,
    totalBills: finalBills.length,
    sgstCollected,
    cgstCollected,
    igstCollected,
    monthlyRevenue,
    topCustomers,
  };
};

// Create empty bill
export const createEmptyBill = (bills: Bill[]): Bill => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    invoiceNo: generateInvoiceNo(bills),
    invoiceDate: now.split('T')[0],
    buyerName: '',
    buyerAddress: '',
    buyerGstin: '',
    poNo: '',
    poDate: '',
    dcNo: '',
    dcDate: '',
    modeOfTransport: '',
    items: [{ sno: 1, description: '', hsnCode: '', quantity: 0, rate: 0, amount: 0 }],
    subtotal: 0,
    sgstRate: 9,
    sgstAmount: 0,
    cgstRate: 9,
    cgstAmount: 0,
    igstRate: 0,
    igstAmount: 0,
    grandTotal: 0,
    amountInWords: '',
    createdAt: now,
    updatedAt: now,
    status: 'final',
  };
};
