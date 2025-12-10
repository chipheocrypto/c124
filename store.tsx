
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Store, Room, Product, Order, Settings, Role, RoomStatus, ImportRecord, PurchaseInvoice, DailyExpense, BillEditRequest, ActionLog, DesktopLicense, ImportImage, OrderItem, HRDetails } from './types';
import { DEFAULT_SETTINGS, MOCK_STORES, MOCK_USERS, MOCK_ROOMS, MOCK_PRODUCTS, MOCK_IMPORT_HISTORY } from './constants';
import { supabase } from './src/supabaseClient';

// --- PERSISTENCE HOOK ---
// This hook works like useState but saves to localStorage automatically
function useStickyState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  currentStore: Store | null;
  stores: Store[];
  rooms: Room[];
  products: Product[];
  orders: Order[]; // History
  activeOrders: Record<string, Order>;
  billRequests: BillEditRequest[];
  users: User[]; // Staff of current store
  allUsers: User[]; // For SuperAdmin
  importHistory: ImportRecord[];
  purchaseInvoices: PurchaseInvoice[];
  dailyExpenses: DailyExpense[];
  settings: Settings;
  importImages: ImportImage[];
  licenses: DesktopLicense[];
  actionLogs: ActionLog[];
  login: (u: string, p: string, r: boolean) => void;
  loginError: string | null;
  logout: () => void;
  register: (data: any) => Promise<{success: boolean, message?: string}>;
  selectStore: (id: string) => void;
  
  // Rooms
  addRoom: (r: Room) => void;
  updateRoomInfo: (r: Room) => void;
  deleteRoom: (id: string) => void;
  updateRoomStatus: (id: string, status: RoomStatus) => void;
  
  // POS
  startSession: (roomId: string) => void;
  addItemToOrder: (roomId: string, product: Product, quantity: number) => void;
  removeItemFromOrder: (roomId: string, itemId: string) => void;
  updateActiveOrder: (roomId: string, updates: Partial<Order>) => void;
  updateActiveOrderItem: (roomId: string, itemId: string, updates: Partial<OrderItem>) => void;
  stopServiceItem: (roomId: string, itemId: string) => void;
  resumeServiceItem: (roomId: string, itemId: string) => void;
  moveOrder: (fromId: string, toId: string) => void;
  checkout: (roomId: string) => boolean;
  updatePaidOrder: (orderId: string, items: OrderItem[], startTime: number, endTime: number, reqId?: string) => void;
  incrementPrintCount: (orderId: string) => void;
  forceEndSession: (roomId: string, status: RoomStatus) => void;

  // Products
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addPurchaseInvoice: (data: { invoiceCode: string, supplier: string, items: { productId: string, quantity: number, price: number, newSellPrice?: number }[] }) => void;

  // Settings
  updateSettings: (s: Partial<Settings>) => void;

  // Staff
  addUser: (u: User) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;
  
  // Expenses
  addDailyExpense: (e: DailyExpense) => void;
  updateDailyExpense: (e: DailyExpense) => void;
  deleteDailyExpense: (id: string) => void;

  // Requests
  requestBillEdit: (orderId: string, reason: string) => void;
  approveBillEdit: (reqId: string) => void;
  rejectBillEdit: (reqId: string) => void;

  // Import Data
  addImportImage: (img: ImportImage) => void;
  deleteImportImage: (id: string) => void;

  // Store Mgmt
  addNewStore: (s: Store) => void;
  updateStore: (s: Store) => void;
  deleteStore: (id: string) => void;
  
  // Licenses
  createLicense: (storeId: string, deviceName: string) => void;
  revokeLicense: (id: string) => void;

  // Super Admin
  updateStoreExpiry: (storeId: string, date: string) => void;
  toggleStoreLock: (storeId: string) => void;
  createStoreForOwner: (ownerId: string, storeData: any) => void;
  updateOwnerQuota: (username: string, delta: number) => void;
  updateSecondPassword: (userId: string, pin: string) => void;

  // Forgot Password
  verifyUserContact: (contact: string) => User | undefined;
  resetUserPassword: (userId: string, newPass: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // --- STATE (Using useStickyState for Persistence) ---
  const [stores, setStores] = useStickyState<Store[]>('stores', MOCK_STORES);
  const [currentStore, setCurrentStore] = useStickyState<Store | null>('currentStore', null);
  
  const [allUsers, setAllUsers] = useStickyState<User[]>('allUsers', MOCK_USERS);
  const [user, setUser] = useStickyState<User | null>('user', null);
  
  // Derived Auth State (Initialized based on persisted user)
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  const [rooms, setRooms] = useStickyState<Room[]>('rooms', MOCK_ROOMS);
  const [products, setProducts] = useStickyState<Product[]>('products', MOCK_PRODUCTS);
  
  const [orders, setOrders] = useStickyState<Order[]>('orders', []); // Paid Orders History
  const [activeOrders, setActiveOrders] = useStickyState<Record<string, Order>>('activeOrders', {});
  
  const [importHistory, setImportHistory] = useStickyState<ImportRecord[]>('importHistory', MOCK_IMPORT_HISTORY);
  const [purchaseInvoices, setPurchaseInvoices] = useStickyState<PurchaseInvoice[]>('purchaseInvoices', []);
  const [dailyExpenses, setDailyExpenses] = useStickyState<DailyExpense[]>('dailyExpenses', []);
  const [billRequests, setBillRequests] = useStickyState<BillEditRequest[]>('billRequests', []);
  const [actionLogs, setActionLogs] = useStickyState<ActionLog[]>('actionLogs', []);
  const [importImages, setImportImages] = useStickyState<ImportImage[]>('importImages', []);
  const [licenses, setLicenses] = useStickyState<DesktopLicense[]>('licenses', []);
  
  const [settings, setSettings] = useStickyState<Settings>('settings', DEFAULT_SETTINGS);

  // Derived state
  const users = currentStore ? allUsers.filter(u => u.storeId === currentStore.id) : [];

  // --- LOGGING ---
  const logAction = (actionType: ActionLog['actionType'], target: string, description: string) => {
    if (!currentStore || !user) return;
    const newLog: ActionLog = {
      id: `log-${Date.now()}`,
      storeId: currentStore.id,
      userId: user.id,
      userName: user.name,
      actionType,
      target,
      description,
      timestamp: Date.now()
    };
    setActionLogs(prev => [newLog, ...prev]);
  };

  // --- AUTH ---
  const login = (u: string, p: string, remember: boolean) => {
    // Basic Mock Login
    const foundUser = allUsers.find(user => user.username === u && user.password === p);
    if (foundUser) {
      setUser(foundUser);
      setLoginError(null);
      // Auto select store if staff/manager
      if (foundUser.role !== Role.SUPER_ADMIN && foundUser.role !== Role.ADMIN) {
        const store = stores.find(s => s.id === foundUser.storeId);
        if (store) setCurrentStore(store);
      }
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  const logout = () => {
    setUser(null);
    setCurrentStore(null);
  };

  const register = async (data: any) => {
    // Mock Registration
    const newUser: User = {
      id: `user-${Date.now()}`,
      storeId: '', // Will be assigned when store created
      name: `${data.lastName} ${data.firstName}`,
      username: data.username,
      password: data.password,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: Role.ADMIN,
      permissions: ['all'],
      isSystemAccount: true,
      maxAllowedStores: 1,
      isOwner: true
    };
    setAllUsers(prev => [...prev, newUser]);
    return { success: true };
  };

  const selectStore = (id: string) => {
    const s = stores.find(store => store.id === id);
    if (s) setCurrentStore(s);
    else setCurrentStore(null);
  };

  // --- ROOMS ---
  const updateRoomStatus = (id: string, status: RoomStatus) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };
  
  const addRoom = (r: Room) => {
    setRooms(prev => [...prev, r]);
    logAction('CREATE', r.name, 'Thêm phòng mới');
  };
  
  const updateRoomInfo = (r: Room) => {
    setRooms(prev => prev.map(room => room.id === r.id ? r : room));
    logAction('UPDATE', r.name, 'Cập nhật thông tin phòng');
  };
  
  const deleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    logAction('DELETE', id, 'Xóa phòng');
  };

  // --- POS LOGIC ---
  const startSession = (roomId: string) => {
    if (activeOrders[roomId]) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      storeId: currentStore?.id || '',
      roomId,
      items: [],
      startTime: Date.now(),
      status: 'OPEN',
      subTotal: 0,
      vatRate: settings.vatRate,
      discount: 0,
      totalAmount: 0,
      totalProfit: 0
    };
    
    setActiveOrders(prev => ({ ...prev, [roomId]: newOrder }));
    updateRoomStatus(roomId, RoomStatus.OCCUPIED);
  };

  const forceEndSession = (roomId: string, status: RoomStatus) => {
    const { [roomId]: removed, ...rest } = activeOrders;
    setActiveOrders(rest);
    updateRoomStatus(roomId, status);
  };

  const addItemToOrder = (roomId: string, product: Product, quantity: number) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      
      const existingItemIndex = order.items.findIndex(i => (i.id === product.id || i.productId === product.id));
      let newItems = [...order.items];

      if (existingItemIndex > -1) {
        if (product.isTimeBased) return prev; // Cannot add quantity to time-based service
        const item = newItems[existingItemIndex];
        const newQty = item.quantity + quantity;
        if (newQty <= 0) {
          newItems.splice(existingItemIndex, 1);
        } else {
          newItems[existingItemIndex] = { ...item, quantity: newQty };
        }
      } else if (quantity > 0) {
        newItems.push({
          id: product.id, // Use product ID as item ID primarily
          productId: product.id,
          name: product.name,
          quantity: quantity,
          sellPrice: product.sellPrice,
          costPrice: product.costPrice,
          isTimeBased: product.isTimeBased,
          startTime: product.isTimeBased ? Date.now() : undefined
        });
      }

      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const removeItemFromOrder = (roomId: string, itemId: string) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      return { ...prev, [roomId]: { ...order, items: order.items.filter(i => (i.id !== itemId && i.productId !== itemId)) } };
    });
  };

  const updateActiveOrder = (roomId: string, updates: Partial<Order>) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      return { ...prev, [roomId]: { ...order, ...updates } };
    });
  };

  const updateActiveOrderItem = (roomId: string, itemId: string, updates: Partial<OrderItem>) => {
    setActiveOrders(prev => {
      const order = prev[roomId];
      if (!order) return prev;
      const newItems = order.items.map(i => (i.id === itemId || i.productId === itemId) ? { ...i, ...updates } : i);
      return { ...prev, [roomId]: { ...order, items: newItems } };
    });
  };

  const stopServiceItem = (roomId: string, itemId: string) => {
      updateActiveOrderItem(roomId, itemId, { endTime: Date.now() });
  };

  const resumeServiceItem = (roomId: string, itemId: string) => {
      updateActiveOrderItem(roomId, itemId, { endTime: undefined });
  };

  const moveOrder = (fromId: string, toId: string) => {
    const order = activeOrders[fromId];
    if (!order) return;
    
    // Move order
    setActiveOrders(prev => {
       const { [fromId]: removed, ...rest } = prev;
       return { ...rest, [toId]: { ...removed, roomId: toId } };
    });

    // Update statuses
    updateRoomStatus(fromId, RoomStatus.AVAILABLE);
    updateRoomStatus(toId, RoomStatus.OCCUPIED);
  };

  const checkout = (roomId: string) => {
    const order = activeOrders[roomId];
    if (!order) return false;
    
    const room = rooms.find(r => r.id === roomId);
    const endTime = Date.now();
    
    // Calculate final totals
    let productTotal = 0;
    let productCost = 0;
    
    order.items.forEach(item => {
        if (item.isTimeBased && item.startTime) {
            const iEnd = item.endTime || endTime;
            const dur = Math.max(1, Math.ceil((iEnd - item.startTime)/60000));
            const blk = settings.serviceBlockMinutes || 1;
            const billed = Math.ceil(dur/blk)*blk;
            productTotal += (billed/60) * item.sellPrice;
        } else {
            productTotal += item.quantity * item.sellPrice;
            productCost += item.quantity * (item.costPrice || 0);
        }
    });

    const durationMs = endTime - order.startTime;
    let billedMinutes = Math.max(1, Math.ceil(durationMs / 60000));
    if (settings.timeRoundingMinutes > 1) {
        billedMinutes = Math.ceil(billedMinutes / settings.timeRoundingMinutes) * settings.timeRoundingMinutes;
    }
    billedMinutes += settings.staffServiceMinutes;
    
    const roomCost = (billedMinutes / 60) * (room?.hourlyRate || 0);
    const subTotal = productTotal + roomCost;
    const vat = subTotal * (settings.vatRate / 100);
    const totalAmount = subTotal + vat;
    const totalProfit = totalAmount - productCost; // Simplified profit

    const paidOrder: Order = {
        ...order,
        endTime,
        status: 'PAID',
        subTotal,
        totalAmount,
        totalProfit
    };

    setOrders(prev => [...prev, paidOrder]);
    
    // Clear active order
    const { [roomId]: removed, ...rest } = activeOrders;
    setActiveOrders(rest);
    
    updateRoomStatus(roomId, RoomStatus.AVAILABLE); // Or CLEANING
    
    // Update Stock
    setProducts(prev => prev.map(p => {
        const soldItem = order.items.find(i => (i.id === p.id || i.productId === p.id));
        if (soldItem && !p.isTimeBased) {
            return { ...p, stock: p.stock - soldItem.quantity };
        }
        return p;
    }));

    return true;
  };

  const updatePaidOrder = (orderId: string, items: OrderItem[], startTime: number, endTime: number, reqId?: string) => {
    setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
            // Recalculate totals similar to checkout
            // ... (Simplified for brevity, assuming UI handles inputs correctly)
            return { ...o, items, startTime, endTime, editCount: (o.editCount || 0) + 1 };
        }
        return o;
    }));
    
    if (reqId) {
        setBillRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'COMPLETED', resolvedAt: Date.now() } : r));
    }
    
    logAction('UPDATE', orderId, 'Sửa hóa đơn đã thanh toán');
  };

  const incrementPrintCount = (orderId: string) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, printCount: (o.printCount || 0) + 1 } : o));
      logAction('PRINT', orderId, 'In hóa đơn');
  };

  // --- PRODUCTS & INVENTORY ---
  const addProduct = (p: Product) => {
      setProducts(prev => [...prev, p]);
      logAction('CREATE', p.name, 'Thêm sản phẩm');
  };
  const updateProduct = (p: Product) => {
      setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod));
  };
  const deleteProduct = (id: string) => {
      setProducts(prev => prev.filter(p => p.id !== id));
      logAction('DELETE', id, 'Xóa sản phẩm');
  };

  // IMPORT LOGIC (FROM SNIPPET)
  const addPurchaseInvoice = (data: { invoiceCode: string, supplier: string, items: { productId: string, quantity: number, price: number, newSellPrice?: number }[] }) => {
    if (!currentStore) return;
    const timestamp = Date.now();
    const newInvoiceId = `inv-${timestamp}`;

    // 1. Create Invoice Object
    const newInvoice: PurchaseInvoice = {
        id: newInvoiceId,
        storeId: currentStore.id,
        code: data.invoiceCode,
        supplier: data.supplier,
        timestamp,
        totalAmount: data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
        items: data.items.map(i => {
            const p = products.find(prod => prod.id === i.productId);
            return {
                productId: i.productId,
                productName: p?.name || 'Unknown',
                quantity: i.quantity,
                price: i.price,
                newSellPrice: i.newSellPrice
            };
        })
    };

    setPurchaseInvoices(prev => [newInvoice, ...prev]);
    if (supabase) {
        supabase.from('purchase_invoices').insert({
            id: newInvoice.id,
            store_id: newInvoice.storeId,
            code: newInvoice.code,
            supplier: newInvoice.supplier,
            total_amount: newInvoice.totalAmount,
            timestamp: newInvoice.timestamp,
            items: newInvoice.items // JSONB
        }).then(({ error }) => { if(error) console.error("Invoice Insert Error", error) });
    }

    // 2. Create Import Records & Update Products
    const newImportRecords: ImportRecord[] = [];
    const productsToUpdate: Product[] = [];

    data.items.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.productId);
        if (productIndex > -1) {
            const product = products[productIndex];
            
            // Calculate Weighted Average Cost
            const currentTotalValue = (product.stock || 0) * (product.costPrice || 0);
            const newImportValue = item.quantity * item.price;
            const newTotalStock = (product.stock || 0) + item.quantity;
            
            // Avoid division by zero
            const newCostPrice = newTotalStock > 0 ? (currentTotalValue + newImportValue) / newTotalStock : item.price;

            // Update Product Object
            const updatedProduct = {
                ...product,
                stock: newTotalStock,
                costPrice: newCostPrice,
                // Only update sell price if provided and greater than 0
                sellPrice: (item.newSellPrice && item.newSellPrice > 0) ? item.newSellPrice : product.sellPrice
            };
            productsToUpdate.push(updatedProduct);

            // Create Import Record
            newImportRecords.push({
                id: `imp-${timestamp}-${item.productId}`,
                storeId: currentStore.id,
                invoiceId: newInvoiceId,
                invoiceCode: data.invoiceCode,
                supplier: data.supplier,
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                importPrice: item.price,
                totalCost: item.quantity * item.price,
                timestamp,
                newSellPrice: item.newSellPrice
            });
        }
    });

    // 3. Batch Update State
    setImportHistory(prev => [...newImportRecords, ...prev]);
    
    // Update Products State efficiently
    setProducts(prev => prev.map(p => {
        const updated = productsToUpdate.find(up => up.id === p.id);
        return updated || p;
    }));

    // 4. Batch Update DB
    if (supabase) {
        // Insert Import Records
        const importRecordsPayload = newImportRecords.map(r => ({
            id: r.id,
            store_id: r.storeId,
            invoice_id: r.invoiceId,
            invoice_code: r.invoiceCode,
            supplier: r.supplier,
            product_id: r.productId,
            product_name: r.productName,
            quantity: r.quantity,
            import_price: r.importPrice,
            total_cost: r.totalCost,
            timestamp: r.timestamp,
            new_sell_price: r.newSellPrice
        }));
        
        if (importRecordsPayload.length > 0) {
            supabase.from('import_records').insert(importRecordsPayload).then(({ error }) => {
                 if(error) console.error("Import Records Insert Error", error);
            });
        }

        // Update Products (Loop for now as Supabase upsert requires primary key matching)
        productsToUpdate.forEach(p => {
            supabase.from('products').update({
                stock: p.stock,
                cost_price: p.costPrice,
                sell_price: p.sellPrice
            }).eq('id', p.id).then(({ error }) => {
                if(error) console.error("Product Update Error", p.name, error);
            });
        });
    }

    logAction('IMPORT', 'Kho hàng', `Nhập hàng hóa đơn ${data.invoiceCode}`);
  };

  // --- SETTINGS ---
  const updateSettings = (s: Partial<Settings>) => setSettings(prev => ({ ...prev, ...s }));

  // --- STAFF ---
  const addUser = (u: User) => setAllUsers(prev => [...prev, u]);
  const updateUser = (u: User) => setAllUsers(prev => prev.map(user => user.id === u.id ? u : user));
  const deleteUser = (id: string) => setAllUsers(prev => prev.filter(u => u.id !== id));

  // --- EXPENSES ---
  const addDailyExpense = (e: DailyExpense) => setDailyExpenses(prev => [...prev, e]);
  const updateDailyExpense = (e: DailyExpense) => setDailyExpenses(prev => prev.map(exp => exp.id === e.id ? e : exp));
  const deleteDailyExpense = (id: string) => setDailyExpenses(prev => prev.filter(e => e.id !== id));

  // --- REQUESTS ---
  const requestBillEdit = (orderId: string, reason: string) => {
      const newReq: BillEditRequest = {
          id: `req-${Date.now()}`,
          storeId: currentStore?.id || '',
          orderId,
          requestByUserId: user?.id || '',
          requestByName: user?.name || '',
          reason,
          status: 'PENDING',
          timestamp: Date.now()
      };
      setBillRequests(prev => [...prev, newReq]);
  };
  const approveBillEdit = (reqId: string) => {
      setBillRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'APPROVED', resolvedBy: user?.name } : r));
  };
  const rejectBillEdit = (reqId: string) => {
      setBillRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'REJECTED', resolvedBy: user?.name } : r));
  };

  // --- IMPORT DATA ---
  const addImportImage = (img: ImportImage) => setImportImages(prev => [img, ...prev]);
  const deleteImportImage = (id: string) => setImportImages(prev => prev.filter(i => i.id !== id));

  // --- STORE MGMT ---
  const addNewStore = (s: Store) => setStores(prev => [...prev, s]);
  const updateStore = (s: Store) => setStores(prev => prev.map(store => store.id === s.id ? s : store));
  const deleteStore = (id: string) => setStores(prev => prev.filter(s => s.id !== id));

  // --- LICENSES ---
  const createLicense = (storeId: string, deviceName: string) => {
      const newLicense: DesktopLicense = {
          id: `lic-${Date.now()}`,
          storeId,
          licenseKey: Math.random().toString(36).substring(7).toUpperCase(),
          status: 'ACTIVE',
          deviceName,
          createdBy: user?.name || 'Admin'
      };
      setLicenses(prev => [...prev, newLicense]);
  };
  const revokeLicense = (id: string) => setLicenses(prev => prev.filter(l => l.id !== id));

  // --- SUPER ADMIN ---
  const updateStoreExpiry = (storeId: string, date: string) => {
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, expiryDate: date } : s));
  };
  const toggleStoreLock = (storeId: string) => {
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, status: s.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' } : s));
  };
  const createStoreForOwner = (ownerId: string, storeData: any) => { /* Imp */ };
  const updateOwnerQuota = (username: string, delta: number) => {
      setAllUsers(prev => prev.map(u => u.username === username ? { ...u, maxAllowedStores: (u.maxAllowedStores || 1) + delta } : u));
  };
  const updateSecondPassword = (userId: string, pin: string) => {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, secondPassword: pin } : u));
  };

  // --- FORGOT PASSWORD ---
  const verifyUserContact = (contact: string) => {
      return allUsers.find(u => u.email === contact || u.phoneNumber === contact);
  };
  const resetUserPassword = (userId: string, newPass: string) => {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
  };

  const value = {
      user, isAuthenticated, currentStore, stores, rooms, products, orders, activeOrders, billRequests, users, allUsers,
      importHistory, purchaseInvoices, dailyExpenses, settings, importImages, licenses, actionLogs, loginError,
      login, logout, register, selectStore, addRoom, updateRoomInfo, deleteRoom, updateRoomStatus, startSession,
      addItemToOrder, removeItemFromOrder, updateActiveOrder, updateActiveOrderItem, stopServiceItem, resumeServiceItem,
      moveOrder, checkout, updatePaidOrder, incrementPrintCount, forceEndSession, addProduct, updateProduct, deleteProduct,
      addPurchaseInvoice, updateSettings, addUser, updateUser, deleteUser, addDailyExpense, updateDailyExpense, deleteDailyExpense,
      requestBillEdit, approveBillEdit, rejectBillEdit, addImportImage, deleteImportImage, addNewStore, updateStore, deleteStore,
      createLicense, revokeLicense, updateStoreExpiry, toggleStoreLock, createStoreForOwner, updateOwnerQuota, updateSecondPassword,
      verifyUserContact, resetUserPassword
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
