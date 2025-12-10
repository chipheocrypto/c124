export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  PAYMENT = 'PAYMENT',
  CLEANING = 'CLEANING',
  ERROR = 'ERROR'
}

export interface Shareholder {
  id: string;
  name: string;
  percentage: number;
}

export interface OperatingCost {
  id: string;
  name: string;
  amount: number;
  months: number;
}

export interface FinancialConfig {
  constructionCost: number;
  otherCost: number;
  monthlyFixedCost?: number; // Legacy support
  operatingCosts: OperatingCost[];
  shareholdersList: Shareholder[];
}

export interface Settings {
  storeId?: string; // Linked to Store (Optional for default)

  timeRoundingMinutes: number; // e.g., 5 minutes for Room
  staffServiceMinutes: number; // e.g., 10 minutes addition
  serviceBlockMinutes: number; // NEW: Block rounding for Services (e.g., 10 mins)
  vatRate: number;
  lowStockThreshold: number;
  
  // Bill Editing Rules
  manualBillApproval: boolean; // NEW: Nếu True, bỏ qua autoApproveMinutes, bắt buộc duyệt tay
  staffEditWindowMinutes: number; // Thời gian nhân viên được phép yêu cầu sửa (VD: 5 phút)
  adminAutoApproveMinutes: number; // Thời gian hệ thống tự duyệt (nếu có)
  hardBillLockMinutes: number; // NEW: Thời gian khóa sổ vĩnh viễn (VD: 24h), không ai được sửa
  
  // Data Management
  autoDeleteImagesDays: number; // NEW: Số ngày tự động xóa ảnh import

  // Unit Management
  availableUnits: string[]; // List of available units (e.g. Lon, Thùng, Đĩa...)
  
  // Category Management (New)
  productCategories: string[]; // List of categories (Bia, Rượu, Mồi...)

  // Invoice Design - Business Info
  storeName: string;      // Tên doanh nghiệp
  storeAddress: string;   // Địa chỉ
  storeTaxCode: string;   // Mã số thuế
  
  // Invoice Design - Header/Footer
  invoiceTitle: string; 
  invoiceFooter: string;
  
  // Invoice Design - Style & Font
  invoiceFontFamily: string; // NEW
  invoiceHeaderFontSize: number; // NEW
  invoiceBodyFontSize: number; // NEW

  // Invoice Design - Legal/Symbol
  invoiceSerial: string; // Ký hiệu (1C25M...)
  invoiceFormNo: string; // Mẫu số (1/001...)
  invoiceDigitalSignature: boolean; // Hiển thị chữ ký số

  // Visibility Toggles
  invoiceShowCashier: boolean;
  invoiceShowTime: boolean;
  invoiceShowStartTime: boolean;
  invoiceShowEndTime: boolean;
  invoiceShowDuration: boolean;

  // Financials
  financials: FinancialConfig;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone?: string;
  status: 'ACTIVE' | 'LOCKED' | 'MAINTENANCE';
  imageUrl?: string;
  expiryDate?: string;
}

export interface HRDetails {
  baseSalary: number;
  workDays: number;
  overtimeShifts: number;
  leaveDays: number;
  bonus: number;
  penalty: number;
  cashAdvance: number;
  note?: string;
}

export interface User {
  id: string;
  storeId: string;
  name: string;
  username: string;
  email?: string;
  password?: string;
  secondPassword?: string; // For Admin PIN
  role: Role;
  permissions: string[];
  isSystemAccount: boolean;
  phoneNumber?: string;
  hr?: HRDetails;
  shift?: string;
  allowedStoreIds?: string[];
  maxAllowedStores?: number;
  isOwner?: boolean;
}

export interface Room {
  id: string;
  storeId: string;
  name: string;
  type: 'VIP' | 'NORMAL';
  hourlyRate: number;
  status: RoomStatus;
  imageUrl?: string;
}

export interface Product {
  id: string;
  storeId?: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  imageUrl?: string;
  isTimeBased: boolean;
}

export interface OrderItem {
  id?: string;
  productId: string;
  name: string;
  quantity: number;
  sellPrice: number;
  costPrice: number;
  isTimeBased?: boolean;
  startTime?: number;
  endTime?: number;
}

export interface Order {
  id: string;
  storeId: string;
  roomId: string;
  items: OrderItem[];
  startTime: number;
  endTime?: number;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  subTotal: number;
  vatRate: number;
  discount: number;
  totalAmount: number;
  totalProfit: number;
  printCount?: number;
  editCount?: number;
}

export interface ImportRecord {
  id: string;
  storeId: string;
  invoiceId: string;
  invoiceCode: string;
  supplier: string;
  productId: string;
  productName: string;
  quantity: number;
  importPrice: number;
  totalCost: number;
  timestamp: number;
  newSellPrice?: number;
}

export interface PurchaseInvoice {
  id: string;
  storeId: string;
  code: string;
  supplier: string;
  timestamp: number;
  totalAmount: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    newSellPrice?: number;
  }[];
  creatorName?: string;
}

export interface DailyExpense {
  id: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'PURCHASE' | 'LOSS' | 'OTHER';
  timestamp: number;
}

export interface BillEditRequest {
  id: string;
  storeId: string;
  orderId: string;
  requestByUserId: string;
  requestByName: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  timestamp: number;
  resolvedBy?: string;
  resolvedAt?: number;
}

export interface ActionLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'REQUEST' | 'PRINT' | 'SYSTEM';
  target: string;
  description: string;
  timestamp: number;
}

export interface DesktopLicense {
  id: string;
  storeId: string;
  licenseKey: string;
  status: 'UNUSED' | 'ACTIVE';
  deviceName: string;
  createdBy: string;
  machineId?: string;
  activatedAt?: number;
}

export interface ImportImage {
  id: string;
  storeId: string;
  url: string;
  description: string;
  uploaderName: string;
  timestamp: number;
}