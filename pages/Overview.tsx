
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { RoomStatus, Order } from '../types';
import { DollarSign, Mic2, ShoppingBag, AlertCircle, Clock, TrendingUp, Calendar, Package } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

type ViewMode = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const Overview = () => {
  const { rooms, activeOrders, orders, products, settings } = useApp();
  
  // State trigger update every 1 second for Realtime feel
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('DAY');
  const [selectedDate, setSelectedDate] = useState(() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); 
    return () => clearInterval(interval);
  }, []);

  // --- SAFE DATA ACCESS ---
  const safeRooms = rooms || [];
  const safeOrders = orders || [];
  const safeProducts = products || [];
  const safeActiveOrders = activeOrders || {};

  // --- FILTER LOGIC ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setHours(0,0,0,0);
    return new Date(d.setDate(diff));
  };

  const checkDateFilter = (timestamp: number) => {
    const date = new Date(timestamp);
    
    // Parse selectedDate from YYYY-MM-DD to Local Date
    const [y, m, d] = selectedDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);

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

  const filteredOrders = useMemo(() => {
      return safeOrders.filter(o => o.status === 'PAID' && checkDateFilter(o.startTime));
  }, [safeOrders, viewMode, selectedDate]);

  // --- STATS ---
  // Realtime Stats (Independent of Filter)
  const activeRoomsCount = safeRooms.filter(r => r.status === RoomStatus.OCCUPIED || r.status === RoomStatus.PAYMENT).length;
  const availableRoomsCount = safeRooms.filter(r => r.status === RoomStatus.AVAILABLE).length;
  const cleaningRoomsCount = safeRooms.filter(r => r.status === RoomStatus.CLEANING).length;
  const lowStockCount = safeProducts.filter(p => !p.isTimeBased && p.stock <= settings.lowStockThreshold).length;
  
  // Filtered Stats
  const revenuePeriod = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // --- CHART DATA ---
  
  // 1. Revenue Chart (Dynamic X-Axis based on View)
  const revenueChartData = useMemo(() => {
    let data: any[] = [];
    const [y, m, d] = selectedDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);

    if (viewMode === 'DAY') {
      data = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, revenue: 0 }));
      filteredOrders.forEach(o => {
        const h = new Date(o.startTime).getHours();
        data[h].revenue += o.totalAmount;
      });
    } else if (viewMode === 'WEEK') {
      const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      data = days.map(d => ({ name: d, revenue: 0 }));
      filteredOrders.forEach(o => {
        const dayIdx = new Date(o.startTime).getDay();
        const mapIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        data[mapIdx].revenue += o.totalAmount;
      });
    } else if (viewMode === 'MONTH') {
      const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      data = Array.from({ length: daysInMonth }, (_, i) => ({ name: `${i + 1}`, revenue: 0 }));
      filteredOrders.forEach(o => {
        const d = new Date(o.startTime).getDate();
        data[d - 1].revenue += o.totalAmount;
      });
    } else if (viewMode === 'YEAR') {
      data = Array.from({ length: 12 }, (_, i) => ({ name: `T${i + 1}`, revenue: 0 }));
      filteredOrders.forEach(o => {
        const m = new Date(o.startTime).getMonth();
        data[m].revenue += o.totalAmount;
      });
    }
    return data;
  }, [filteredOrders, viewMode, selectedDate]);

  // 2. Room Status Pie Chart (Snapshot)
  const roomStatusData = useMemo(() => {
    return [
      { name: 'Đang hát', value: activeRoomsCount, color: '#EF4444' }, // Red
      { name: 'Trống', value: availableRoomsCount, color: '#10B981' },   // Green
      { name: 'Chờ dọn', value: cleaningRoomsCount, color: '#EAB308' },  // Yellow
    ].filter(item => item.value > 0);
  }, [activeRoomsCount, availableRoomsCount, cleaningRoomsCount]);

  // 3. Product Statistics Chart (Sold vs Stock)
  const productStatsData = useMemo(() => {
      // Calculate sold quantity per product in the filtered period
      const stats = safeProducts.map(p => {
          // If time-based (service), stock is irrelevant (Infinity), only show sold count/hours?
          // Let's focus on physical products or treat service units as sold count
          const soldCount = filteredOrders.reduce((sum, order) => {
              const item = order.items.find(i => (i.productId === p.id || i.id === p.id));
              if (item) {
                  // If time based, maybe we don't count 'quantity' the same way?
                  // For simplicity, use quantity (which is 1 per entry usually) or just count items
                  return sum + (item.quantity || 0);
              }
              return sum;
          }, 0);

          return {
              name: p.name,
              stock: p.isTimeBased ? 0 : p.stock,
              sold: soldCount,
              isTimeBased: p.isTimeBased
          };
      });

      // Filter out items with 0 stock AND 0 sold to keep chart clean
      const activeStats = stats.filter(s => s.stock > 0 || s.sold > 0);

      // Sort by Sold Quantity Descending
      return activeStats.sort((a, b) => b.sold - a.sold).slice(0, 20); // Top 20
  }, [safeProducts, filteredOrders]);

  // --- UI HELPERS ---
  const getViewLabel = () => {
    switch(viewMode) {
      case 'DAY': return 'Hôm nay';
      case 'WEEK': return 'Tuần này';
      case 'MONTH': return 'Tháng này';
      case 'YEAR': return 'Năm nay';
      default: return '';
    }
  };

  const calculateLiveTotal = (order: Order, room: any) => {
    if (!room || !order) return 0;
    try {
      const items = order.items || [];
      let productTotal = 0;

      items.forEach(item => {
        if (item.isTimeBased && item.startTime) {
            const endTime = item.endTime || currentTime;
            const durationMins = Math.max(1, Math.ceil((endTime - item.startTime) / 60000));
            const serviceBlock = settings.serviceBlockMinutes || 1;
            const billedMins = Math.ceil(durationMins / serviceBlock) * serviceBlock;
            productTotal += (billedMins / 60) * item.sellPrice;
        } else {
            productTotal += (item.sellPrice || 0) * (item.quantity || 0);
        }
      });

      const durationMs = currentTime - order.startTime;
      const rawMinutes = Math.max(1, Math.ceil(durationMs / 60000));
      let billedMinutes = rawMinutes;
      if (settings.timeRoundingMinutes > 1) {
        billedMinutes = Math.ceil(rawMinutes / settings.timeRoundingMinutes) * settings.timeRoundingMinutes;
      }
      billedMinutes += settings.staffServiceMinutes;

      const roomCost = (billedMinutes / 60) * room.hourlyRate;

      const subTotal = productTotal + roomCost;
      const vat = subTotal * (settings.vatRate / 100);
      return subTotal + vat;
    } catch (e) {
      return 0;
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-white flex items-center">
            <TrendingUp className="mr-3 text-pink-500" /> Tổng Quan Dashboard
        </h2>

        {/* View Filters */}
        <div className="flex items-center gap-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700">
            <input 
               type={viewMode === 'MONTH' ? "month" : (viewMode === 'YEAR' ? "number" : "date")}
               className="bg-transparent text-white px-2 py-1 outline-none text-sm w-32 border-r border-gray-600 mr-2"
               value={viewMode === 'MONTH' ? selectedDate.slice(0, 7) : (viewMode === 'YEAR' ? selectedDate.split('-')[0] : selectedDate)}
               onChange={(e) => {
                   if(viewMode === 'YEAR') setSelectedDate(`${e.target.value}-01-01`);
                   else if(viewMode === 'MONTH') setSelectedDate(`${e.target.value}-01`);
                   else setSelectedDate(e.target.value);
               }}
               placeholder={viewMode === 'YEAR' ? "yyyy" : undefined}
            />
            {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as ViewMode[]).map(mode => (
                <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${viewMode === mode ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                >
                    {mode === 'DAY' ? 'Ngày' : mode === 'WEEK' ? 'Tuần' : mode === 'MONTH' ? 'Tháng' : 'Năm'}
                </button>
            ))}
        </div>
      </div>

      {/* Stats Cards (Some depend on filter, some are realtime) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Doanh thu ({viewMode === 'DAY' ? selectedDate : viewMode})</p>
            <h3 className="text-2xl font-bold text-green-400 mt-1">{Math.round(revenuePeriod).toLocaleString()}</h3>
          </div>
          <div className="bg-green-900/30 p-3 rounded-full text-green-500">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Phòng đang hoạt động</p>
            <h3 className="text-2xl font-bold text-red-400 mt-1">{activeRoomsCount} <span className="text-sm text-gray-500">/ {safeRooms.length}</span></h3>
          </div>
          <div className="bg-red-900/30 p-3 rounded-full text-red-500">
            <Mic2 size={24} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Cảnh báo kho</p>
            <h3 className="text-2xl font-bold text-yellow-400 mt-1">{lowStockCount} <span className="text-sm text-gray-500">sản phẩm</span></h3>
          </div>
          <div className="bg-yellow-900/30 p-3 rounded-full text-yellow-500">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase font-bold">Tổng đơn ({viewMode === 'DAY' ? selectedDate : viewMode})</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1">{filteredOrders.length}</h3>
          </div>
          <div className="bg-blue-900/30 p-3 rounded-full text-blue-500">
            <ShoppingBag size={24} />
          </div>
        </div>
      </div>

      {/* Row 1: Revenue Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
         <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-80">
            <h3 className="text-lg font-bold text-white mb-4">Biểu đồ doanh thu</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#10B981' }}
                  formatter={(value: number) => Math.round(value).toLocaleString()}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
         </div>

         <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-80 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-4">Trạng thái phòng hiện tại</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {roomStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Row 2: Product Stats Chart (New) */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-96 mb-8">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Package className="mr-2 text-blue-400" /> Thống kê Sản phẩm (Top 20)
         </h3>
         <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={productStatsData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60}/>
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="sold" name="Đã bán (trong kỳ)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stock" name="Tồn kho hiện tại" fill="#6B7280" radius={[4, 4, 0, 0]} />
            </BarChart>
         </ResponsiveContainer>
      </div>

      {/* Row 3: Active Rooms Table */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <Clock className="mr-2 text-yellow-400" /> Phòng Đang Hoạt Động (Live)
         </h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-gray-700 text-gray-300 uppercase font-bold">
                  <tr>
                     <th className="p-3">Phòng</th>
                     <th className="p-3">Giờ vào</th>
                     <th className="p-3">Thời lượng</th>
                     <th className="p-3 text-right">Tạm tính</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-700">
                  {safeRooms.filter(r => r.status === RoomStatus.OCCUPIED || r.status === RoomStatus.PAYMENT).length > 0 ? (
                     safeRooms.filter(r => r.status === RoomStatus.OCCUPIED || r.status === RoomStatus.PAYMENT).map(room => {
                        const order = safeActiveOrders[room.id];
                        if (!order) return null;
                        
                        const durationMs = currentTime - order.startTime;
                        const hours = Math.floor(durationMs / 3600000);
                        const minutes = Math.floor((durationMs % 3600000) / 60000);
                        const liveTotal = calculateLiveTotal(order, room);

                        return (
                           <tr key={room.id} className="hover:bg-gray-700/50">
                              <td className="p-3 font-bold text-white">
                                 {room.name}
                                 {room.status === RoomStatus.PAYMENT && <span className="ml-2 text-[10px] bg-blue-600 px-1 rounded text-white">Thanh toán</span>}
                              </td>
                              <td className="p-3 text-gray-400">{new Date(order.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</td>
                              <td className="p-3 font-mono text-yellow-400">
                                 {hours}h {minutes}p
                              </td>
                              <td className="p-3 text-right font-bold text-green-400">
                                 {Math.round(liveTotal).toLocaleString()}
                              </td>
                           </tr>
                        );
                     })
                  ) : (
                     <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-500">Hiện không có phòng nào đang hoạt động.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
};
