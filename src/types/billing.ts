export interface BillItem {
  sno: number;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Bill {
  id: string;
  invoiceNo: string;
  invoiceDate: string;

  // Buyer Details
  buyerName: string;
  buyerAddress: string;
  buyerGstin: string;
  poNo: string;
  poDate: string;

  // Delivery Details
  dcNo: string;
  dcDate: string;
  modeOfTransport: string;

  // Items
  items: BillItem[];

  // Calculations
  subtotal: number;
  sgstRate: number;
  sgstAmount: number;
  cgstRate: number;
  cgstAmount: number;
  igstRate: number;
  igstAmount: number;
  grandTotal: number;
  amountInWords: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  status: 'final';
  driveFileId?: string;
  driveLink?: string;
}

export interface CompanyDetails {
  name: string;
  tagline1: string;
  tagline2: string;
  address: string;
  gstin: string;
  email: string;
  mobile: string;
  bankName: string;
  bankBranch: string;
  accountNo: string;
  ifscCode: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalBills: number;
  sgstCollected: number;
  cgstCollected: number;
  igstCollected: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topCustomers: { name: string; amount: number }[];
}

export interface FilterOptions {
  timeRange: 'last1month' | 'last3months' | 'last6months' | 'custom';
  startDate?: string;
  endDate?: string;
  searchTerm: string;
  searchField: 'buyerName' | 'invoiceNo' | 'gstin';
}

export const DEFAULT_COMPANY: CompanyDetails = {
  name: "SUSI CORPORATION",
  tagline1: "Mfrs. of : Thermoplastic, Rubber and Polyurethene Moulded Components for Engineering Industries",
  tagline2: "Specialists in : Industrial Components for Bottling Plants, Conveyors, Packaging Equipments, SPM's and Indigenous for Import Substitutes",
  address: "Old # 8, New # 17, Gnanambal Garden II Street, Ayanavaram, Chennai - 600023.",
  gstin: "33AGPPJ5057R1ZO",
  email: "susicorpn@gmail.com",
  mobile: "98841 02646",
  bankName: "KARNATAKA BANK LTD.",
  bankBranch: "Ayanavaram, Chennai - 600023",
  accountNo: "1592000100049401",
  ifscCode: "KARB0000159",
};
