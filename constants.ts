
import { Product, Room, RoomStatus, Role, User, Settings, ImportRecord, Store } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  timeRoundingMinutes: 1, // Làm tròn giờ hát (Mặc định 1p)
  staffServiceMinutes: 0, // Không tự động cộng giờ phục vụ vào giờ hát
  serviceBlockMinutes: 10, // NEW: Làm tròn giờ Dịch vụ theo block 10 phút (1p tính 10p)
  vatRate: 10,
  lowStockThreshold: 10,
  
  // Bill Editing Rules
  manualBillApproval: false, // Default is Auto logic allowed
  staffEditWindowMinutes: 5, // 5 phút để nhân viên yêu cầu sửa
  adminAutoApproveMinutes: 0, // 0 = Tắt tự động duyệt (Phải duyệt tay)
  hardBillLockMinutes: 24 * 60, // 24 giờ (1440 phút) mặc định khóa cứng

  // Data Management
  autoDeleteImagesDays: 30, // Mặc định xóa ảnh sau 30 ngày

  availableUnits: ['Lon', 'Chai', 'Thùng', 'Két', 'Đĩa', 'Cái', 'Bao', 'Gói', 'Kg'],
  productCategories: ['Đồ uống', 'Đồ ăn', 'Combo', 'Dịch vụ', 'Khác'], // Default Categories

  // Business Defaults
  storeName: "CÔNG TY TNHH KARAOKE PRO",
  storeAddress: "Địa chỉ cửa hàng của bạn",
  storeTaxCode: "0000000000",

  // Invoice Defaults
  invoiceTitle: "HÓA ĐƠN GTGT (TIỀN ĐIỆN)", // Hoặc HÓA ĐƠN BÁN HÀNG
  invoiceFooter: "Cảm ơn quý khách và hẹn gặp lại!",
  
  invoiceFontFamily: "Arial, sans-serif",
  invoiceHeaderFontSize: 18,
  invoiceBodyFontSize: 13,

  invoiceSerial: "C25M",
  invoiceFormNo: "1",
  invoiceDigitalSignature: true,

  invoiceShowCashier: true,
  invoiceShowTime: true,
  invoiceShowStartTime: true,
  invoiceShowEndTime: true,
  invoiceShowDuration: true,

  // Financial Defaults
  financials: {
    constructionCost: 0,
    otherCost: 0,
    monthlyFixedCost: 0, // Legacy
    operatingCosts: [], // New Detailed Operating Costs
    shareholdersList: [],
  }
};

export const MOCK_STORES: Store[] = [];

// EMPTY MOCK USERS - We rely on Supabase now
export const MOCK_USERS: User[] = [];

export const MOCK_ROOMS: Room[] = [];

export const MOCK_PRODUCTS: Product[] = [];

// Start with EMPTY import history
export const MOCK_IMPORT_HISTORY: ImportRecord[] = [];
