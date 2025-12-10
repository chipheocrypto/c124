
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Download, Wallet, Users, Calculator, Plus, Trash2, X, Filter, ArrowRight, Truck, FileText, Zap, Package, Layers, Clock, Receipt } from 'lucide-react';
import { Shareholder, Role, OperatingCost } from '../../types';

type ViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const Reports = () => {
  const { orders, rooms, settings, updateSettings, users, importHistory, products, purchaseInvoices, dailyExpenses, user } = useApp();
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH'); // Mặc định xem tháng này
  
  // Date Picker State
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Local state for modal inputs
  const [tempFinancials, setTempFinancials] = useState(settings.financials);

  const isManager = user?.role === Role.MANAGER;

  // --- Helpers for Date Filtering ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setHours(0,0,0,0);
    return new Date(d.setDate(diff));
  };

  const checkDateFilter = (dateStr: number | string) => {
    let date: Date;
    // Fix: Handle YYYY-MM-DD string from DailyExpenses manually as Local Time
    // to avoid UTC conversion shift (e.g., 2023-10-25 -> 2023-10-24 17:00 UTC-7)
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        date = new Date(y, m - 1, d);
    } else {
        date = new Date(dateStr);
    }

    const target = new Date(selectedDate);
    
    switch (viewMode) {
        case 'DAY':
          return date.getDate() === target.getDate() && 
                 date.getMonth() === target.getMonth() && 
                 date.getFullYear() === target.getFullYear();
        case 'WEEK':
          const startOfWeek = getStartOfWeek(target);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return date >= startOfWeek && date <= endOfWeek;
        case 'MONTH':
          return date.getMonth() === target.getMonth() && 
                 date.getFullYear() === target.getFullYear();
        case 'YEAR':
          return date.getFullYear() === target.getFullYear();
        default:
          return true;
    }
  };

  // --- Data Processing ---

  // 1. Filter Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => checkDateFilter(o.startTime));
  }, [orders, viewMode, selectedDate]);

  // 2. Filter Imports
  const filteredImports = useMemo(() => {
    return importHistory.filter(i => checkDateFilter(i.timestamp)).sort((a, b) => b.timestamp - a.timestamp);
  }, [importHistory, viewMode, selectedDate]);

  // 3. Filter Daily Expenses (New)
  const filteredDailyExpenses = useMemo(() => {
    return dailyExpenses.filter(e => checkDateFilter(e.date)); // e.date is string YYYY-MM-DD
  }, [dailyExpenses, viewMode, selectedDate]);

  // 4. Calculate Summaries
  const totalRevenue = filteredOrders.reduce((sum, o) => (sum || 0) + (o.totalAmount || 0), 0);
  const totalCOGS = filteredOrders.reduce((sum, o) => (sum || 0) + ((o.subTotal || 0) - (o.totalProfit || 0)), 0);
  
  const totalImportSpendPeriod = filteredImports.reduce((sum, i) => (sum || 0) + (i.totalCost || 0), 0);
  const totalImportCapital = purchaseInvoices.reduce((sum, inv) => (sum || 0) + (inv.totalAmount || 0), 0);

  const currentInventoryValue = products.reduce((sum, p) => {
    if (p.isTimeBased) return sum; 
    return (sum || 0) + ((p.stock || 0) * (p.costPrice || 0));
  }, 0);

  // --- COST CALCULATIONS ---
  
  // A. Chi phí nhân sự (Full Month)
  const totalRealMonthlyStaffCost = users.reduce((sum, u) => {
    const hr = u.hr;
    if (!hr) return sum;
    const netSalary = (hr.baseSalary || 0) + (hr.bonus || 0) - (hr.penalty || 0) - (hr.cashAdvance || 0);
    return (sum || 0) + netSalary;
  }, 0);

  // B. Chi phí Vận hành (Fixed Full Month)
  const totalOperatingCostPerMonth = (settings.financials.operatingCosts || []).reduce((sum, cost) => {
    const months = cost.months > 0 ? cost.months : 1;
    return (sum || 0) + (cost.amount / months);
  }, 0);

  // C. Chi phí Vặt hàng ngày (Daily Expenses - In Selected Period)
  const totalDailyExpenseCost = filteredDailyExpenses.reduce((sum, e) => (sum || 0) + (e.amount || 0), 0);

  // --- DYNAMIC EXPENSE LOGIC ---
  const isDayOrWeek = viewMode === 'DAY' || viewMode === 'WEEK';
  let totalExpenses = 0;
  let operatingProfit = 0;

  if (isDayOrWeek) {
      // Chế độ NGÀY/TUẦN: Tính theo dòng tiền (Cash Flow)
      // Tổng Chi = Tiền Nhập Hàng + Chi Vặt
      // (Không tính COGS, Lương, Cố định)
      totalExpenses = totalImportSpendPeriod + totalDailyExpenseCost;
      operatingProfit = totalRevenue - totalExpenses;
  } else {
      // Chế độ THÁNG/NĂM: Tính theo hạch toán (Accounting)
      // Tổng Chi = Vốn hàng bán + Lương + Cố định + Chi Vặt
      // (Scale Lương/Cố định nếu xem năm)
      const scaleFactor = viewMode === 'YEAR' ? 12 : 1;
      const periodStaffCost = totalRealMonthlyStaffCost * scaleFactor;
      const periodOperatingCost = totalOperatingCostPerMonth * scaleFactor;
      
      totalExpenses = totalCOGS + periodStaffCost + periodOperatingCost + totalDailyExpenseCost;
      operatingProfit = totalRevenue - totalExpenses;
  }
  
  const totalConstructionCost = (settings.financials.constructionCost || 0) + (settings.financials.otherCost || 0);
  const totalOrders = filteredOrders.length;

  // Chart Data
  const chartData = useMemo(() => {
    let data: any[] = [];
    const targetDate = new Date(selectedDate);

    if (viewMode === 'DAY') {
      data = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, revenue: 0, profit: 0 }));
      filteredOrders.forEach(o => {
        const h = new Date(o.startTime).getHours();
        data[h].revenue += o.totalAmount;
        // Profit per order is static (Rev - COGS), but for Day view chart we might want to show Revenue vs Expenses distributed? 
        // Showing Order Profit is safer for hourly granularity.
        data[h].profit += o.totalProfit; 
      });
    } else if (viewMode === 'WEEK') {
      const orderedDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      data = orderedDays.map(d => ({ name: d, revenue: 0, profit: 0 }));
      filteredOrders.forEach(o => {
        const dayIdx = new Date(o.startTime).getDay(); 
        const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        data[mappedIdx].revenue += o.totalAmount;
        data[mappedIdx].profit += o.totalProfit;
      });
    } else if (viewMode === 'MONTH') {
      const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      data = Array.from({ length: daysInMonth }, (_, i) => ({ name: `${i + 1}`, revenue: 0, profit: 0 }));
      filteredOrders.forEach(o => {
        const d = new Date(o.startTime).getDate();
        data[d - 1].revenue += o.totalAmount;
        data[d - 1].profit += o.totalProfit;
      });
    } else if (viewMode === 'YEAR') {
      data = Array.from({ length: 12 }, (_, i) => ({ name: `T${i + 1}`, revenue: 0, profit: 0 }));
      filteredOrders.forEach(o => {
        const m = new Date(o.startTime).getMonth();
        data[m].revenue += o.totalAmount;
        data[m].profit += o.totalProfit;
      });
    }
    return data;
  }, [filteredOrders, viewMode, selectedDate]);

  const getRoomName = (roomId: string) => {
    const r = rooms.find(room => room.id === roomId);
    return r ? r.name : 'Phòng đã xóa';
  };

  const handleExportExcel = () => {
    let headers = [
      "Mã HĐ", 
      "Phòng", 
      "Ngày", 
      "Giờ vào", 
      "Giờ ra", 
      "Phút hát",
      "Chi tiết món/dịch vụ",
      "Doanh thu trước thuế", 
      "VAT (%)", 
      "Tiền VAT", 
      "Tổng thanh toán"
    ];
    
    if (!isManager) {
      headers.push("Vốn hàng bán", "Lợi nhuận ròng (Đơn hàng)");
    }

    const allOrdersSorted = [...orders].sort((a, b) => b.startTime - a.startTime);

    const rows = allOrdersSorted.map(o => {
      const start = new Date(o.startTime);
      const end = o.endTime ? new Date(o.endTime) : new Date();
      const durationMins = Math.ceil((end.getTime() - start.getTime()) / 60000);

      const itemsDetailStr = o.items.map(i => {
         if (i.isTimeBased) return `${i.name} (Dịch vụ)`;
         return `${i.name} (x${i.quantity})`;
      }).join(", ");

      const vatAmount = (o.totalAmount || 0) - (o.subTotal || 0);
      const cost = (o.subTotal || 0) - (o.totalProfit || 0);

      const baseRow = [
        o.id,
        getRoomName(o.roomId),
        start.toLocaleDateString('vi-VN'),
        start.toLocaleTimeString('vi-VN'),
        o.endTime ? new Date(o.endTime).toLocaleTimeString('vi-VN') : 'Đang hoạt động',
        durationMins,
        `"${itemsDetailStr}"`,
        Math.round(o.subTotal || 0),
        o.vatRate,
        Math.round(vatAmount),
        Math.round(o.totalAmount || 0)
      ];

      if (!isManager) {
        baseRow.push(Math.round(cost), Math.round(o.totalProfit || 0));
      }
      return baseRow;
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_Cao_Chi_Tiet_Day_Du_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ... (Modal Handlers) ...
  const handleSaveFinancials = () => {
    updateSettings({ financials: tempFinancials });
    setIsFinancialModalOpen(false);
  };
  const handleAddShareholder = () => {
    const newSh: Shareholder = { id: `sh-${Date.now()}`, name: '', percentage: 0 };
    setTempFinancials(prev => ({ ...prev, shareholdersList: [...(prev.shareholdersList || []), newSh] }));
  };
  const handleUpdateShareholder = (id: string, field: 'name' | 'percentage', value: any) => {
    setTempFinancials(prev => ({
      ...prev,
      shareholdersList: prev.shareholdersList.map(sh => sh.id === id ? { ...sh, [field]: value } : sh)
    }));
  };
  const handleDeleteShareholder = (id: string) => {
    setTempFinancials(prev => ({
      ...prev,
      shareholdersList: prev.shareholdersList.filter(sh => sh.id !== id)
    }));
  };
  const handleAddOperatingCost = () => {
    const newCost: OperatingCost = { id: `cost-${Date.now()}`, name: '', amount: 0, months: 1 };
    setTempFinancials(prev => ({
      ...prev,
      operatingCosts: [...(prev.operatingCosts || []), newCost]
    }));
  };
  const handleUpdateOperatingCost = (id: string, field: keyof OperatingCost, value: any) => {
    setTempFinancials(prev => ({
      ...prev,
      operatingCosts: (prev.operatingCosts || []).map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };
  const handleDeleteOperatingCost = (id: string) => {
    setTempFinancials(prev => ({
      ...prev,
      operatingCosts: (prev.operatingCosts || []).filter(c => c.id !== id)
    }));
  };

  const getViewLabel = () => {
    const d = new Date(selectedDate);
    switch(viewMode) {
      case 'DAY': return `Ngày ${d.toLocaleDateString('vi-VN')}`;
      case 'WEEK': return 'Tuần này';
      case 'MONTH': return `Tháng ${d.getMonth()+1}/${d.getFullYear()}`;
      case 'YEAR': return `Năm ${d.getFullYear()}`;
      default: return '';
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.value) {
      if (viewMode === 'DAY' || viewMode === 'WEEK') {
         const [y, m, d] = e.target.value.split('-').map(Number);
         setSelectedDate(new Date(y, m - 1, d));
      } else if (viewMode === 'MONTH') {
         const [y, m] = e.target.value.split('-').map(Number);
         setSelectedDate(new Date(y, m - 1, 1));
      } else if (viewMode === 'YEAR') {
         setSelectedDate(new Date(Number(e.target.value), 0, 1));
      } else {
         setSelectedDate(new Date(e.target.value));
      }
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-white">Báo Cáo Doanh Thu</h2>
           <p className="text-gray-400 text-sm mt-1">Dữ liệu thống kê: <span className="text-pink-500 font-bold">{getViewLabel()}</span></p>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-end items-center">
          <div className="flex items-center bg-gray-800 p-1 rounded-lg border border-gray-700 mr-2">
             <input 
               type={viewMode === 'MONTH' ? "month" : (viewMode === 'YEAR' ? "number" : "date")}
               className="bg-transparent text-white px-2 py-1 outline-none text-sm w-36"
               value={viewMode === 'MONTH' ? selectedDate.toISOString().slice(0, 7) : (viewMode === 'YEAR' ? selectedDate.getFullYear() : selectedDate.toISOString().slice(0, 10))}
               onChange={handleDateChange}
               placeholder={viewMode === 'YEAR' ? "yyyy" : undefined}
             />
          </div>

          <div className="bg-gray-800 p-1 rounded-lg border border-gray-700 flex mr-2">
             <button onClick={() => setViewMode('DAY')} className={`px-3 py-1 rounded text-sm ${viewMode === 'DAY' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Ngày</button>
             <button onClick={() => setViewMode('WEEK')} className={`px-3 py-1 rounded text-sm ${viewMode === 'WEEK' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Tuần</button>
             <button onClick={() => setViewMode('MONTH')} className={`px-3 py-1 rounded text-sm ${viewMode === 'MONTH' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Tháng</button>
             <button onClick={() => setViewMode('YEAR')} className={`px-3 py-1 rounded text-sm ${viewMode === 'YEAR' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Năm</button>
          </div>

          {!isManager && (
            <button 
              onClick={() => {
                setTempFinancials(settings.financials);
                setIsFinancialModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center shadow-lg font-bold text-sm"
            >
              <Calculator size={16} className="mr-2" /> Chi Phí & Vốn
            </button>
          )}
          
          <button 
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg flex items-center shadow-lg font-bold text-sm"
          >
            <Download size={16} className="mr-2" /> Xuất Tất Cả
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${!isManager ? 'xl:grid-cols-4' : 'xl:grid-cols-1'} gap-6 mb-8`}>
        {/* Doanh thu */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase">Doanh Thu {getViewLabel()}</p>
              <h3 className="text-3xl font-bold text-white mt-2">{Math.round(totalRevenue).toLocaleString()}</h3>
              <p className="text-xs text-blue-400 mt-1 flex items-center">
                 <Calendar size={12} className="mr-1" /> {totalOrders} đơn hàng
              </p>
            </div>
            <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400">
              <DollarSign size={28} />
            </div>
          </div>
        </div>

        {/* ADMIN ONLY CARDS */}
        {!isManager && (
          <>
            {/* Tổng Chi Phí */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative group">
               <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase">Tổng Chi Phí</p>
                  <h3 className="text-3xl font-bold text-red-400 mt-2">{Math.round(totalExpenses).toLocaleString()}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {isDayOrWeek ? 'Nhập hàng + Chi vặt (Cash Flow)' : 'Vốn hàng bán + Nhân sự + Cố định + Chi vặt'}
                  </p>
                </div>
                <div className="p-3 bg-red-900/30 rounded-lg text-red-400">
                  <TrendingUp size={28} />
                </div>
              </div>
            </div>

            {/* Lợi nhuận */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative group">
               <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase">Lợi Nhuận</p>
                  <h3 className={`text-3xl font-bold mt-2 ${operatingProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.round(operatingProfit).toLocaleString()}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Doanh thu - Tổng chi phí</p>
                </div>
                <div className="p-3 bg-purple-900/30 rounded-lg text-purple-400">
                  <Wallet size={28} />
                </div>
              </div>
            </div>
            
            {/* Tổng Tiền Nhập Hàng (Period Info) */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative group">
               <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase">Tiền Chi Nhập Hàng</p>
                  <h3 className="text-3xl font-bold text-orange-400 mt-2">{Math.round(totalImportSpendPeriod).toLocaleString()}</h3>
                  <p className="text-xs text-gray-500 mt-1">Dòng tiền chi nhập ({filteredImports.length} phiếu)</p>
                </div>
                <div className="p-3 bg-orange-900/30 rounded-lg text-orange-400">
                  <Truck size={28} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Shareholder & Investment Analysis - ADMIN ONLY */}
      {!isManager && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-2">
               <h3 className="text-lg font-bold text-white">Tài Sản & Vốn Đầu Tư</h3>
               <span className="text-xs text-gray-400 italic">Số liệu tích lũy</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-gray-900/50 p-4 rounded-lg">
                 <p className="text-gray-400 text-sm">Vốn Cố Định</p>
                 <p className="text-xl font-bold text-orange-400">{Math.round(totalConstructionCost).toLocaleString()}</p>
                 <p className="text-[10px] text-gray-500">Xây dựng + Setup</p>
               </div>
               <div className="bg-gray-900/50 p-4 rounded-lg border border-blue-900/30">
                 <p className="text-gray-400 text-sm flex items-center"><Truck size={14} className="mr-1"/> Tổng Vốn Nhập</p>
                 <p className="text-xl font-bold text-blue-400">{Math.round(totalImportCapital).toLocaleString()}</p>
                 <p className="text-[10px] text-gray-500">Tổng tiền các phiếu nhập</p>
               </div>
               <div className="bg-gray-900/50 p-4 rounded-lg border border-green-900/30">
                 <p className="text-gray-400 text-sm flex items-center"><Package size={14} className="mr-1"/> Giá Trị Tồn Kho</p>
                 <p className="text-xl font-bold text-green-400">{Math.round(currentInventoryValue).toLocaleString()}</p>
                 <p className="text-[10px] text-gray-500">SL Tồn Kho * Giá Vốn TB</p>
               </div>
               <div className="col-span-1 sm:col-span-3 bg-gray-700/30 p-4 rounded-lg mt-2">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-gray-300 font-bold">Chia Lợi Nhuận ({getViewLabel()})</span>
                     <span className={`text-sm ${operatingProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Tổng Lãi: {Math.round(operatingProfit).toLocaleString()}
                     </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                     {settings.financials.shareholdersList && settings.financials.shareholdersList.length > 0 ? (
                        settings.financials.shareholdersList.map(sh => (
                          <div key={sh.id} className="flex justify-between text-sm border-b border-gray-600 pb-1">
                            <span className="text-gray-400">{sh.name} <span className="text-xs text-gray-500">({sh.percentage}%)</span></span>
                            <span className="font-bold text-white">
                               {Math.round(operatingProfit * (sh.percentage / 100)).toLocaleString()}
                            </span>
                          </div>
                        ))
                     ) : (
                        <p className="text-xs text-gray-500 italic text-center">Chưa có danh sách cổ đông.</p>
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* Expense Structure */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
             <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-600 pb-2">Cấu Trúc Chi Phí ({getViewLabel()})</h3>
             <div className="space-y-4 pt-2">
               {isDayOrWeek ? (
                  <>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">Tiền Nhập Hàng (Cash Flow):</span>
                        <span className="font-bold text-orange-400">{Math.round(totalImportSpendPeriod).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-400 h-full" style={{width: `${totalExpenses ? (totalImportSpendPeriod / totalExpenses) * 100 : 0}%`}}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm flex items-center"><Receipt size={12} className="mr-1"/> Sổ chi tiêu (Vặt):</span>
                        <span className="font-bold text-yellow-400">{Math.round(totalDailyExpenseCost).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-400 h-full" style={{width: `${totalExpenses ? (totalDailyExpenseCost / totalExpenses) * 100 : 0}%`}}></div>
                        </div>
                    </div>
                    <div className="pt-2 text-center text-xs text-gray-500 italic">
                        * Chế độ Ngày/Tuần chỉ tính dòng tiền chi ra trực tiếp (Không bao gồm Lương & Chi phí cố định).
                    </div>
                  </>
               ) : (
                  <>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">Vốn hàng bán (COGS):</span>
                        <span className="font-bold text-orange-400">{Math.round(totalCOGS).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-400 h-full" style={{width: `${totalExpenses ? (totalCOGS / totalExpenses) * 100 : 0}%`}}></div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">Lương nhân viên:</span>
                        <span className="font-bold text-blue-400">{Math.round(viewMode === 'YEAR' ? totalRealMonthlyStaffCost*12 : totalRealMonthlyStaffCost).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full" style={{width: `${totalExpenses ? ((viewMode === 'YEAR' ? totalRealMonthlyStaffCost*12 : totalRealMonthlyStaffCost) / totalExpenses) * 100 : 0}%`}}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">Cố định (Điện, nước...):</span>
                        <span className="font-bold text-red-400">{Math.round(viewMode === 'YEAR' ? totalOperatingCostPerMonth*12 : totalOperatingCostPerMonth).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-400 h-full" style={{width: `${totalExpenses ? ((viewMode === 'YEAR' ? totalOperatingCostPerMonth*12 : totalOperatingCostPerMonth) / totalExpenses) * 100 : 0}%`}}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm flex items-center"><Receipt size={12} className="mr-1"/> Sổ chi tiêu (Vặt):</span>
                        <span className="font-bold text-yellow-400">{Math.round(totalDailyExpenseCost).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-400 h-full" style={{width: `${totalExpenses ? (totalDailyExpenseCost / totalExpenses) * 100 : 0}%`}}></div>
                        </div>
                    </div>
                  </>
               )}

               <div className="pt-2 text-right border-t border-gray-600 mt-2">
                  <span className="text-xs text-gray-500 mr-2">Tổng chi phí: </span>
                  <span className="font-bold text-white text-lg">
                    {Math.round(totalExpenses).toLocaleString()}
                  </span>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[400px] shadow-lg mb-8">
        <h3 className="text-xl font-bold mb-4 text-white">
          Biểu Đồ Doanh Thu {isManager ? '' : '& Lợi Nhuận'} ({getViewLabel()})
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" tickFormatter={(value) => `${value/1000}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => Math.round(value).toLocaleString()}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#3B82F6" name="Doanh thu" radius={[4, 4, 0, 0]} />
            {!isManager && (
              <Bar dataKey="profit" fill="#10B981" name="Lãi gộp (Đơn hàng)" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Import & Expense Tables - ADMIN ONLY */}
      {!isManager && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mb-8">
          <h3 className="text-xl font-bold mb-4 text-white flex items-center">
             <FileText className="mr-2 text-blue-400" /> Chi Tiết Nhập Hàng ({getViewLabel()})
          </h3>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-700 text-gray-300 sticky top-0">
                  <tr>
                     <th className="p-3">Thời gian</th>
                     <th className="p-3">Sản phẩm</th>
                     <th className="p-3 text-center">Số lượng</th>
                     <th className="p-3 text-right">Giá nhập</th>
                     <th className="p-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                   {filteredImports.length > 0 ? (
                      filteredImports.map(imp => (
                        <tr key={imp.id} className="hover:bg-gray-700/50">
                           <td className="p-3 text-gray-400">{new Date(imp.timestamp).toLocaleString('vi-VN')}</td>
                           <td className="p-3 font-medium text-white">{imp.productName}</td>
                           <td className="p-3 text-center">{imp.quantity}</td>
                           <td className="p-3 text-right text-gray-300">{Math.round(imp.importPrice).toLocaleString()}</td>
                           <td className="p-3 text-right font-bold text-orange-400">{Math.round(imp.totalCost).toLocaleString()}</td>
                        </tr>
                      ))
                   ) : (
                      <tr>
                         <td colSpan={5} className="p-6 text-center text-gray-500 italic">Không có phiếu nhập hàng nào trong khoảng thời gian này.</td>
                      </tr>
                   )}
                </tbody>
                {filteredImports.length > 0 && (
                  <tfoot className="bg-gray-750 font-bold border-t-2 border-gray-600">
                     <tr>
                        <td colSpan={4} className="p-3 text-right text-white">TỔNG CỘNG:</td>
                        <td className="p-3 text-right text-orange-400">{Math.round(totalImportSpendPeriod).toLocaleString()}</td>
                     </tr>
                  </tfoot>
                )}
             </table>
          </div>
        </div>
      )}

      {/* Financial Input Modal */}
      {isFinancialModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-3xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* ... Keeping existing modal content ... */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-600 pb-4">
              <h3 className="text-2xl font-bold text-white">Nhập Số Liệu Tài Chính</h3>
              <button onClick={() => setIsFinancialModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>

            <div className="space-y-6">
              {/* Investment Section */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h4 className="font-bold text-orange-400 mb-4 flex items-center">
                  <Wallet size={18} className="mr-2" /> Vốn Đầu Tư Cố Định
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Chi phí xây dựng quán</label>
                    <input 
                      type="number"
                      className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white focus:border-blue-500 outline-none"
                      value={tempFinancials.constructionCost === 0 ? '' : tempFinancials.constructionCost}
                      onChange={(e) => setTempFinancials({...tempFinancials, constructionCost: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Chi phí khác (Setup, Giấy phép...)</label>
                    <input 
                      type="number"
                      className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white focus:border-blue-500 outline-none"
                      value={tempFinancials.otherCost === 0 ? '' : tempFinancials.otherCost}
                      onChange={(e) => setTempFinancials({...tempFinancials, otherCost: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Operating Costs Table */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-purple-400 flex items-center">
                    <Zap size={18} className="mr-2" /> Chi Phí Vận Hành (Cố định)
                  </h4>
                  <button 
                    onClick={handleAddOperatingCost}
                    className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center"
                  >
                    <Plus size={12} className="mr-1"/> Thêm dòng
                  </button>
                </div>
                <table className="w-full text-left text-sm mb-2">
                  <thead className="bg-gray-700 text-gray-300">
                    <tr>
                      <th className="p-2 pl-3">Tên khoản chi</th>
                      <th className="p-2 text-right">Số tiền</th>
                      <th className="p-2 text-center w-24">Số tháng</th>
                      <th className="p-2 text-right text-xs">Phí/Tháng</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {(tempFinancials.operatingCosts || []).map((cost) => (
                      <tr key={cost.id} className="hover:bg-gray-800">
                        <td className="p-2">
                          <input type="text" className="w-full bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none text-white px-1"
                            value={cost.name} onChange={(e) => handleUpdateOperatingCost(cost.id, 'name', e.target.value)} />
                        </td>
                        <td className="p-2 text-right">
                          <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded text-right text-white px-1"
                            value={cost.amount === 0 ? '' : cost.amount} onChange={(e) => handleUpdateOperatingCost(cost.id, 'amount', Number(e.target.value))} />
                        </td>
                        <td className="p-2 text-center">
                          <input type="number" min="1" className="w-full bg-gray-800 border border-gray-600 rounded text-center text-white px-1"
                            value={cost.months} onChange={(e) => handleUpdateOperatingCost(cost.id, 'months', Number(e.target.value))} />
                        </td>
                        <td className="p-2 text-right text-gray-400 text-xs">
                           {Math.round(cost.amount / (cost.months || 1)).toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                           <button onClick={() => handleDeleteOperatingCost(cost.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Shareholder Table */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-blue-400 flex items-center">
                    <Users size={18} className="mr-2" /> Danh sách Cổ Đông
                  </h4>
                  <button onClick={handleAddShareholder} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center">
                    <Plus size={12} className="mr-1"/> Thêm dòng
                  </button>
                </div>
                <table className="w-full text-left text-sm mb-2">
                  <thead className="bg-gray-700 text-gray-300">
                    <tr><th className="p-2 pl-3">Tên Cổ Đông</th><th className="p-2 text-center w-32">Góp vốn (%)</th><th className="p-2 w-10"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {(tempFinancials.shareholdersList || []).map((sh) => (
                      <tr key={sh.id} className="hover:bg-gray-800">
                        <td className="p-2">
                          <input type="text" className="w-full bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none text-white px-1"
                            value={sh.name} onChange={(e) => handleUpdateShareholder(sh.id, 'name', e.target.value)} />
                        </td>
                        <td className="p-2 text-center">
                          <input type="number" min="0" max="100" className="w-full bg-gray-800 border border-gray-600 rounded text-center text-white px-1"
                            value={sh.percentage === 0 ? '' : sh.percentage} onChange={(e) => handleUpdateShareholder(sh.id, 'percentage', Number(e.target.value))} />
                        </td>
                        <td className="p-2 text-center">
                           <button onClick={() => handleDeleteShareholder(sh.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                 <button onClick={() => setIsFinancialModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy bỏ</button>
                 <button onClick={handleSaveFinancials} className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold shadow-lg">Lưu Dữ Liệu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
