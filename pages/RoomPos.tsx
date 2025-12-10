import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Product, RoomStatus, Role, OrderItem } from '../types';
import { 
  ArrowLeft, Search, Plus, Minus, Clock,
  CreditCard, Trash2, ArrowRightLeft, Printer, CheckCircle,
  PlayCircle, PauseCircle, Image as ImageIcon,
  Menu, ShoppingCart, ChevronUp, ChevronDown
} from 'lucide-react';

interface RoomPosProps {
  roomId: string;
  onBack: () => void;
  onChangeRoom: (newRoomId: string) => void;
}

export const RoomPos: React.FC<RoomPosProps> = ({ roomId, onBack, onChangeRoom }) => {
  const { 
    rooms, products, activeOrders, settings, user,
    addItemToOrder, removeItemFromOrder, stopServiceItem, resumeServiceItem, checkout, moveOrder, updateRoomStatus,
    updateActiveOrder, updateActiveOrderItem, incrementPrintCount
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [moveTargetRoom, setMoveTargetRoom] = useState<string>('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  
  // Frozen time state for payment review (Stops the clock)
  const [frozenTime, setFrozenTime] = useState<number | null>(null);

  // Mobile Tab State: 'MENU' (Left) or 'ORDER' (Right)
  const [mobileTab, setMobileTab] = useState<'MENU' | 'ORDER'>('MENU');

  const room = rooms.find(r => r.id === roomId);
  const order = activeOrders[roomId];

  // Role Check
  const canDeleteItems = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (room && room.status === RoomStatus.PAYMENT) {
      // If re-entering a room in payment state, freeze time to now if not already set.
      if (!frozenTime) setFrozenTime(Date.now());
      setShowInvoice(true);
    }
  }, [room?.status]);

  if (!room || !order) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Không tìm thấy dữ liệu phòng.</p>
          <button onClick={onBack} className="px-4 py-2 bg-pink-600 rounded">Quay lại</button>
        </div>
      </div>
    );
  }

  const categories = ['Tất cả', ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = products.filter(p => 
    (selectedCategory === 'Tất cả' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- Calculations ---
  // Use frozen time if available (during payment), else current time
  const calcTime = frozenTime || currentTime;

  const durationMs = calcTime - order.startTime;
  
  const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDurationText = (minutes: number) => {
     const h = Math.floor(minutes / 60);
     const m = minutes % 60;
     if (h > 0) return `${h} giờ ${m} phút`;
     return `${m} phút`;
  };

  const rawMinutes = Math.max(1, Math.ceil(durationMs / 60000));
  const rounding = settings.timeRoundingMinutes;
  let billedMinutes = rawMinutes;
  if (rounding > 1) {
    billedMinutes = Math.ceil(rawMinutes / rounding) * rounding;
  }
  billedMinutes += settings.staffServiceMinutes;

  const roomTimeCost = (billedMinutes / 60) * room.hourlyRate;

  let productTotal = 0;
  const getItemTotal = (item: any) => {
    if (item.isTimeBased && item.startTime) {
      const endTime = item.endTime || calcTime;
      const durationMins = Math.max(1, Math.ceil((endTime - item.startTime) / 60000));
      const serviceBlock = settings.serviceBlockMinutes || 1; 
      const billedMins = Math.ceil(durationMins / serviceBlock) * serviceBlock;
      const cost = (billedMins / 60) * item.sellPrice;
      return cost;
    } else {
      return item.sellPrice * item.quantity;
    }
  };

  order.items.forEach(item => {
    productTotal += getItemTotal(item);
  });
  
  const subTotal = roomTimeCost + productTotal;
  const vat = subTotal * (settings.vatRate / 100);
  const total = subTotal + vat;

  const dispRoomCost = Math.round(roomTimeCost);
  const dispProdCost = Math.round(productTotal);
  const dispVat = Math.round(vat);
  const dispTotal = Math.round(total);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
  const formatDateTime = (ts: number) => new Date(ts).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  // Helper for Time Input (HH:mm)
  const formatTimeInput = (ts: number) => {
    const d = new Date(ts);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleMoveRoom = () => {
    if(!moveTargetRoom) return;
    moveOrder(roomId, moveTargetRoom);
    setShowMoveModal(false);
    onChangeRoom(moveTargetRoom);
  };

  const handleInitiatePayment = () => {
    // STOP THE CLOCK
    setFrozenTime(Date.now()); 
    updateRoomStatus(roomId, RoomStatus.PAYMENT);
    setShowInvoice(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-section');
    if (!printContent) {
        alert("Không tìm thấy nội dung hóa đơn!");
        return;
    }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(`
            <html>
            <head>
                <title>In Hóa Đơn - ${room.name}</title>
                <meta charset="UTF-8">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: 'Arial', sans-serif; background: white; color: black; margin: 0; padding: 0; }
                    @media print { @page { margin: 0; size: auto; } body { -webkit-print-color-adjust: exact; } }
                    .print-container { width: 100%; max-width: 80mm; margin: 0 auto; padding: 5px; }
                </style>
            </head>
            <body><div class="print-container">${printContent.innerHTML}</div></body>
            </html>
        `);
        doc.close();
        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
            setTimeout(() => { document.body.removeChild(iframe); }, 2000);
        }, 500);
    }
  };

  const handleCompleteCheckout = () => {
    // 1. Print first (async-ish)
    handlePrint();
    
    // 2. Checkout after small delay to allow print dialog/logic
    setTimeout(() => {
        const success = checkout(roomId);
        if (success) {
            setShowInvoice(false);
            setFrozenTime(null);
            onBack();
        } else {
            alert("Có lỗi xảy ra khi thanh toán. Vui lòng thử lại.");
        }
    }, 1000);
  };

  // --- Input Handlers (Modified for Time Only & Number) ---
  
  // Helper to merge time string (HH:mm) with existing date
  const parseTimeInput = (originalTimestamp: number, timeString: string) => {
      if(!timeString) return originalTimestamp;
      const [hours, minutes] = timeString.split(':').map(Number);
      const newDate = new Date(originalTimestamp);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      return newDate.getTime();
  };

  const handleRoomStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newTs = parseTimeInput(order.startTime, e.target.value);
     updateActiveOrder(roomId, { startTime: newTs });
  };

  const handleItemStartTimeChange = (itemUniqueId: string, currentTs: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const newTs = parseTimeInput(currentTs, e.target.value);
      updateActiveOrderItem(roomId, itemUniqueId, { startTime: newTs });
  };

  const handleItemQuantityChange = (itemUniqueId: string, val: string) => {
      const qty = parseInt(val);
      if (!isNaN(qty) && qty > 0) {
          updateActiveOrderItem(roomId, itemUniqueId, { quantity: qty });
      }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden flex-col lg:flex-row">
      
      {/* MOBILE TABS (Bottom Navigation) - Only visible on small screens */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex z-30 pb-safe">
        <button 
          onClick={() => setMobileTab('MENU')}
          className={`flex-1 py-3 flex flex-col items-center justify-center ${mobileTab === 'MENU' ? 'text-pink-500 bg-gray-750' : 'text-gray-400'}`}
        >
          <Menu size={20} />
          <span className="text-xs font-bold mt-1">Thực Đơn</span>
        </button>
        <button 
          onClick={() => setMobileTab('ORDER')}
          className={`flex-1 py-3 flex flex-col items-center justify-center relative ${mobileTab === 'ORDER' ? 'text-pink-500 bg-gray-750' : 'text-gray-400'}`}
        >
          <ShoppingCart size={20} />
          <span className="text-xs font-bold mt-1">Hóa Đơn ({order.items.length})</span>
          {order.items.length > 0 && (
            <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* LEFT: Products (Shown on Desktop OR Mobile Tab 'MENU') */}
      <div className={`w-full lg:w-3/5 flex flex-col border-r border-gray-700 h-[calc(100vh-60px)] lg:h-screen ${mobileTab === 'MENU' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-full shrink-0">
            <ArrowLeft />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Tìm món..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-pink-500 text-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-2 bg-gray-800 flex space-x-2 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === cat ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-4 bg-gray-900 pb-20 lg:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-4">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => {
                  addItemToOrder(roomId, product, 1);
                }}
                className={`
                  rounded-xl cursor-pointer hover:bg-gray-750 border transition-all flex flex-col overflow-hidden relative group h-48 lg:h-auto
                  ${product.isTimeBased ? 'bg-indigo-900/30 border-indigo-500' : 'bg-gray-800 border-gray-700 hover:border-pink-500'}
                `}
              >
                <div className="h-24 lg:h-32 w-full bg-gray-700 relative shrink-0">
                  {product.imageUrl ? (
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <ImageIcon size={24} />
                     </div>
                  )}
                  {product.isTimeBased && (
                    <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">TÍNH GIỜ</div>
                  )}
                </div>

                <div className="p-2 flex flex-col justify-between flex-1">
                   <div>
                      <h4 className="font-bold text-sm mb-1 truncate leading-tight" title={product.name}>{product.name}</h4>
                      <div className="flex justify-between items-center text-[10px] lg:text-xs">
                        {product.isTimeBased ? (
                          <span className="text-indigo-300 font-bold uppercase flex items-center"><Clock size={10} className="mr-1"/> Theo giờ</span>
                        ) : (
                          <span className={`${product.stock <= settings.lowStockThreshold ? 'text-red-400' : 'text-gray-400'}`}>Kho: {product.stock}</span>
                        )}
                      </div>
                   </div>
                   <div className="mt-1 flex justify-between items-end">
                      <span className="text-pink-400 font-bold text-sm lg:text-lg">{Math.round(product.sellPrice).toLocaleString()}</span>
                      <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shadow-lg ${product.isTimeBased ? 'bg-indigo-600' : 'bg-gray-700 text-pink-500'}`}>
                        <Plus size={14} />
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Order Details (Shown on Desktop OR Mobile Tab 'ORDER') */}
      <div className={`w-full lg:w-2/5 flex flex-col bg-gray-800 h-[calc(100vh-60px)] lg:h-screen ${mobileTab === 'ORDER' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Room Header */}
        <div className="p-4 bg-gray-800 border-b border-gray-700 shadow-md shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                 <h2 className="text-xl lg:text-2xl font-bold text-white truncate max-w-[150px]">{room.name}</h2>
                 <span className="px-2 py-0.5 rounded text-[10px] bg-pink-900 text-pink-200">{room.type}</span>
              </div>
              <p className="text-xs text-gray-400">Giá: {Math.round(room.hourlyRate).toLocaleString()} / giờ</p>
            </div>
            
            <div className="flex space-x-2">
              <select 
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs lg:text-sm focus:outline-none max-w-[100px]"
                onChange={(e) => onChangeRoom(e.target.value)}
                value={roomId}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id} disabled={r.status === RoomStatus.AVAILABLE && r.id !== roomId}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button onClick={() => setShowMoveModal(true)} className="p-2 bg-blue-600 rounded text-white"><ArrowRightLeft size={16} /></button>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
               <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 font-bold uppercase">Giờ vào:</span>
                  {/* EDITABLE ROOM START TIME (TIME ONLY) - CLOCK ICON & AM/PM HIDDEN */}
                  <input 
                    type="time"
                    className="bg-gray-900 border border-gray-500 rounded px-3 py-1 text-2xl text-white font-mono font-bold outline-none focus:border-pink-500 w-32 text-center [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit-ampm-field]:hidden"
                    value={formatTimeInput(order.startTime)}
                    onChange={handleRoomStartTimeChange}
                  />
               </div>
               <div className="text-right">
                  <p className="text-xs text-gray-400">Tạm tính</p>
                  <p className="font-bold text-lg">{dispRoomCost.toLocaleString()}</p>
               </div>
            </div>
            <div className="flex items-center text-yellow-400 border-t border-gray-600 pt-2">
              {/* REMOVED CLOCK ICON */}
              <span className="text-2xl font-mono font-bold tracking-wider">{formatDuration(durationMs)}</span>
            </div>
          </div>
        </div>

        {/* Selected Items List */}
        <div className="flex-1 overflow-y-auto p-2 pb-20 lg:pb-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-700">
                <th className="py-2 pl-2">Tên món</th>
                <th className="py-2 text-center">SL / Giờ Vào</th>
                <th className="py-2 text-right pr-2">Tổng</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const itemTotal = getItemTotal(item);
                if (item.isTimeBased && item.startTime) {
                   const isRunning = !item.endTime;
                   const itemDurationMs = (item.endTime || calcTime) - item.startTime;
                   return (
                     <tr key={item.id} className="border-b border-gray-700/50 bg-indigo-900/10 text-sm">
                       <td className="py-3 pl-2">
                         <p className="font-medium text-indigo-300 truncate max-w-[120px] text-base">{item.name}</p>
                         <span className="text-lg font-bold text-yellow-500 font-mono flex items-center mt-1">
                            {formatDuration(itemDurationMs)}
                         </span>
                       </td>
                       <td className="py-3 text-center align-middle">
                         <div className="flex flex-col items-center space-y-2">
                            {/* TIME INPUT FOR SERVICE ITEM */}
                            <div className="flex items-center">
                               <input 
                                 type="time" 
                                 className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-lg text-white font-mono font-bold w-24 text-center focus:border-indigo-500 outline-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit-ampm-field]:hidden"
                                 value={formatTimeInput(item.startTime)}
                                 onChange={(e) => handleItemStartTimeChange(item.id!, item.startTime!, e)}
                               />
                            </div>
                            <div className="flex justify-center">
                               {isRunning ? (
                                  <button onClick={() => stopServiceItem(roomId, item.id!)} className="text-yellow-500 p-1 hover:bg-gray-700 rounded"><PauseCircle size={20} /></button>
                               ) : (
                                  <button onClick={() => resumeServiceItem(roomId, item.id!)} className="text-green-500 p-1 hover:bg-gray-700 rounded"><PlayCircle size={20} /></button>
                               )}
                            </div>
                         </div>
                       </td>
                       <td className="py-3 text-right pr-2 font-medium text-base">{Math.round(itemTotal).toLocaleString()}</td>
                       <td className="py-3 text-center">
                         {canDeleteItems && (
                           <button onClick={() => removeItemFromOrder(roomId, item.id!)} className="text-red-500 hover:bg-gray-700 p-1 rounded"><Trash2 size={16} /></button>
                         )}
                       </td>
                     </tr>
                   );
                } else {
                  return (
                    <tr key={item.id || item.productId} className="border-b border-gray-700/50 text-sm">
                      <td className="py-3 pl-2">
                        <p className="font-medium truncate max-w-[120px] text-sm">{item.name}</p>
                        <p className="text-[10px] text-gray-500">{Math.round(item.sellPrice).toLocaleString()}</p>
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => addItemToOrder(roomId, { ...item, id: item.productId } as unknown as Product, -1)} className="p-1 rounded bg-gray-600 hover:bg-gray-500"><Minus size={14} /></button>
                          {/* EDITABLE QUANTITY INPUT (TEXTBOX) */}
                          <input 
                             type="number"
                             className="w-12 bg-gray-700 border border-gray-600 text-center rounded text-white text-lg font-bold py-1 outline-none focus:border-pink-500"
                             value={item.quantity}
                             onChange={(e) => handleItemQuantityChange(item.id || item.productId, e.target.value)}
                          />
                          <button onClick={() => addItemToOrder(roomId, { ...item, id: item.productId } as unknown as Product, 1)} className="p-1 rounded bg-gray-600 hover:bg-gray-500"><Plus size={14} /></button>
                        </div>
                      </td>
                      <td className="py-3 text-right pr-2 font-medium">{Math.round(itemTotal).toLocaleString()}</td>
                      <td className="py-3 text-center">
                        {canDeleteItems && (
                          <button onClick={() => removeItemFromOrder(roomId, item.id || item.productId)} className="text-red-500 hover:bg-gray-700 p-1 rounded"><Trash2 size={16} /></button>
                        )}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 shrink-0 pb-20 lg:pb-4">
          <div className="space-y-1 mb-4 text-xs lg:text-sm">
             <div className="flex justify-between text-gray-400"><span>Tiền giờ phòng</span><span>{dispRoomCost.toLocaleString()}</span></div>
             <div className="flex justify-between text-gray-400"><span>Dịch vụ / Đồ uống</span><span>{dispProdCost.toLocaleString()}</span></div>
             <div className="flex justify-between text-gray-400"><span>Thuế VAT ({settings.vatRate}%)</span><span>{dispVat.toLocaleString()}</span></div>
             <div className="flex justify-between text-xl lg:text-2xl font-bold text-pink-500 pt-2 border-t border-gray-700 mt-2">
               <span>Tổng cộng</span>
               <span>{dispTotal.toLocaleString()}</span>
             </div>
          </div>
          <button onClick={handleInitiatePayment} className="w-full flex items-center justify-center bg-pink-600 hover:bg-pink-500 text-white py-3 lg:py-4 rounded-lg font-bold shadow-lg text-lg uppercase transition-transform hover:scale-[1.02]">
             <CreditCard className="mr-2" size={24} /> THANH TOÁN
          </button>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="flex flex-col max-h-full w-full max-w-sm">
            <div 
              id="print-section" 
              className="bg-white text-black p-4 w-full mx-auto shadow-2xl relative font-sans text-xs leading-tight"
              style={{ fontFamily: settings.invoiceFontFamily || 'Arial, sans-serif' }}
            >
              {/* Invoice Content */}
              <div className="text-center mb-2">
                 <h1 className="font-bold uppercase mb-1" style={{ fontSize: (settings.invoiceHeaderFontSize || 18) + 'px' }}>{settings.storeName}</h1>
                 <p className="mb-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>{settings.storeAddress}</p>
                 <p className="mb-2 font-bold" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>ĐT: {settings.storeTaxCode}</p>
                 <h2 className="font-bold uppercase mt-3 mb-1" style={{ fontSize: ((settings.invoiceHeaderFontSize || 18) - 2) + 'px' }}>HÓA ĐƠN TÍNH TIỀN {room.name.toUpperCase()}</h2>
              </div>
              <div className="mb-3 border-b border-black pb-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <div className="flex justify-between"><span>Giờ vào:</span><span>{formatDateTime(order.startTime)}</span></div>
                 <div className="flex justify-between"><span>Giờ ra:</span><span>{formatDateTime(calcTime)}</span></div>
                 <div className="flex justify-between font-bold"><span>Thời gian:</span><span>{formatDurationText(rawMinutes)}</span></div>
              </div>
              <div className="border-t-2 border-dashed border-black py-2 mb-2" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <div className="flex font-bold mb-1 border-b border-black pb-1">
                    <span className="w-[35%] text-left">Tên</span>
                    <span className="w-[25%] text-center text-[10px]">Giờ Vào - Ra</span>
                    <span className="w-[15%] text-center">SL/TG</span>
                    <span className="w-[25%] text-right">Thành tiền</span>
                 </div>
                 
                 {/* Room Time Row */}
                 <div className="flex mb-1">
                    <span className="w-[35%] text-left pr-1">Tiền giờ hát</span>
                    <span className="w-[25%] text-center text-[10px]">{formatTime(order.startTime)} - {formatTime(calcTime)}</span>
                    <span className="w-[15%] text-center">{(billedMinutes/60).toFixed(2)}h</span>
                    <span className="w-[25%] text-right">{Math.round(roomTimeCost).toLocaleString()}</span>
                 </div>

                 {/* Items Rows */}
                 {order.items.map((item) => {
                    if (item.isTimeBased && item.startTime) {
                       const endTime = item.endTime || calcTime;
                       const durationMins = Math.max(1, Math.ceil((endTime - item.startTime) / 60000));
                       return (
                          <div key={item.id} className="flex mb-1">
                             <span className="w-[35%] text-left pr-1 truncate">{item.name}</span>
                             <span className="w-[25%] text-center text-[10px]">{formatTime(item.startTime)} - {formatTime(endTime)}</span>
                             <span className="w-[15%] text-center">{durationMins}p</span>
                             <span className="w-[25%] text-right">{Math.round(getItemTotal(item)).toLocaleString()}</span>
                          </div>
                       );
                    } else {
                       return (
                          <div key={item.id || item.productId} className="flex mb-1">
                             <span className="w-[35%] text-left pr-1 truncate">{item.name}</span>
                             <span className="w-[25%] text-center text-[10px]">-</span>
                             <span className="w-[15%] text-center">{item.quantity}</span>
                             <span className="w-[25%] text-right">{Math.round(getItemTotal(item)).toLocaleString()}</span>
                          </div>
                       );
                    }
                 })}
              </div>
              <div className="border-t border-black pt-2 mb-2" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <div className="flex justify-between mb-1"><span>Tổng tiền giờ:</span><span className="font-bold">{dispRoomCost.toLocaleString()}</span></div>
                 <div className="flex justify-between mb-1"><span>Tổng dịch vụ:</span><span className="font-bold">{dispProdCost.toLocaleString()}</span></div>
                 {settings.vatRate > 0 && <div className="flex justify-between mb-1"><span>VAT ({settings.vatRate}%):</span><span className="font-bold">{dispVat.toLocaleString()}</span></div>}
              </div>
              <div className="border-t-2 border-black pt-2 mb-4 text-center">
                 <span className="block text-sm font-bold uppercase">Tổng thanh toán:</span>
                 <span className="block text-2xl font-bold">{dispTotal.toLocaleString()}</span>
              </div>
              <div className="text-center text-[10px] mb-4" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <p className="mt-2 font-bold uppercase">XIN CẢM ƠN QUÝ KHÁCH!</p>
                 <p className="mt-1 italic">{settings.invoiceFooter}</p>
              </div>
            </div>
            <div className="no-print mt-4 flex justify-center space-x-2 pb-8">
              {/* Only "Hoàn tất & In Bill" button exists */}
              <button 
                  onClick={handleCompleteCheckout} 
                  className="flex-1 bg-pink-600 hover:bg-pink-500 text-white py-4 rounded font-bold text-base shadow-lg flex items-center justify-center transition-transform hover:scale-105"
              >
                  <Printer className="mr-2" size={20} /> HOÀN TẤT & IN BILL
              </button>
              <button onClick={() => { setShowInvoice(false); setFrozenTime(null); }} className="bg-gray-600 text-white px-4 py-3 rounded text-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Room Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-xs border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Chuyển phòng</h3>
            <select 
              className="w-full bg-gray-900 border border-gray-600 p-2 rounded mb-6"
              onChange={(e) => setMoveTargetRoom(e.target.value)}
              value={moveTargetRoom}
            >
              <option value="">Chọn phòng đích</option>
              {rooms.filter(r => r.status === RoomStatus.AVAILABLE).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowMoveModal(false)} className="px-4 py-2 text-gray-400">Hủy</button>
              <button onClick={handleMoveRoom} className="px-4 py-2 bg-blue-600 rounded text-white font-bold" disabled={!moveTargetRoom}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};