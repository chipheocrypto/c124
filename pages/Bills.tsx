import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { Role, Order, OrderItem } from '../types';
import { Calendar, ReceiptText, Clock, AlertTriangle, Check, X, Eye, Edit, Trash2, Plus, Minus, History, Save, Printer, Lock, ChevronUp, ChevronDown, ShieldCheck } from 'lucide-react';

export const Bills = () => {
  const { orders, rooms, billRequests, user, requestBillEdit, approveBillEdit, rejectBillEdit, updatePaidOrder, incrementPrintCount, actionLogs, settings } = useApp();
  
  // DATE INIT: Force Local Time String (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  });

  const [activeTab, setActiveTab] = useState<'LIST' | 'APPROVAL'>('LIST');
  const [requestModalOrder, setRequestModalOrder] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');

  // Edit Bill State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  // Use to track if this edit session is linked to a request
  const [activeRequestId, setActiveRequestId] = useState<string | undefined>(undefined);
  
  // New State for Room Time Editing (Stored as timestamp number for easier manipulation)
  const [editStartTime, setEditStartTime] = useState<number>(0);
  const [editEndTime, setEditEndTime] = useState<number>(0);

  // History Modal State
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);

  // PRINT PREVIEW STATE
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // SECURITY PIN MODAL STATE
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isAdminOrManager = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  // Filter orders by date
  const dailyOrders = useMemo(() => {
    return orders
      .filter(o => {
        // Use local date string comparison
        const d = new Date(o.endTime || o.startTime);
        // Adjust to local timezone string YYYY-MM-DD
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const localDate = `${y}-${m}-${day}`;
        return localDate === selectedDate && o.status === 'PAID';
      })
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  }, [orders, selectedDate]);

  // Helper: Format for Display Input
  const formatDateTimeLocal = (timestamp: number) => {
    const d = new Date(timestamp);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // Check if staff can request edit (within allowed window)
  const canRequestEdit = (endTime?: number) => {
    if (!endTime) return false;
    const now = Date.now();
    const diffMinutes = (now - endTime) / 60000;
    return diffMinutes <= (settings.staffEditWindowMinutes || 5);
  };

  // Check if Bill is HARD LOCKED (Cannot edit anymore by anyone)
  const isHardLocked = (endTime?: number) => {
    if (!endTime) return false;
    const now = Date.now();
    const diffMinutes = (now - endTime) / 60000;
    return diffMinutes > (settings.hardBillLockMinutes || 1440); // Default 24h
  };

  const getRoomName = (roomId: string) => rooms.find(r => r.id === roomId)?.name || 'Phòng đã xóa';

  // --- SECURITY PIN CHECK ---
  const executeWithSecurityCheck = (action: () => void) => {
    // STRICT CHECK: If user does NOT have a second password set, BLOCK action.
    if (!user?.secondPassword) {
        alert("BẢO MẬT: Tài khoản của bạn chưa được thiết lập Mật khẩu cấp 2 (Mã PIN).\n\nVui lòng liên hệ Super Admin hoặc vào phần Dashboard > Quản lý Tài khoản để cấp quyền trước khi thực hiện thao tác nhạy cảm này.");
        return;
    }
    
    // If PIN exists, show modal to verify
    setPendingAction(() => action);
    setSecurityPin('');
    setIsSecurityModalOpen(true);
  };

  const handleSecurityVerify = () => {
    if (user?.secondPassword && securityPin === user.secondPassword) {
        setIsSecurityModalOpen(false);
        if (pendingAction) pendingAction();
        setPendingAction(null);
    } else {
        alert("Mã bảo mật không đúng!");
        setSecurityPin('');
    }
  };

  const handleRequestSubmit = () => {
    if (requestModalOrder && editReason) {
      requestBillEdit(requestModalOrder, editReason);
      setRequestModalOrder(null);
      setEditReason('');
      alert("Đã gửi yêu cầu sửa bill tới Admin.");
    }
  };

  const handleOpenPrintPreview = (order: Order) => {
    setPrintingOrder(order);
  };

  const handleConfirmPrint = () => {
    if (!printingOrder) return;

    // 1. Increment Count
    incrementPrintCount(printingOrder.id);

    // 2. Execute Print Logic
    const printContent = document.getElementById('bill-preview-content');
    if (!printContent) return;

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
                <title>In Hóa Đơn</title>
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

  // --- EDIT BILL HANDLERS ---
  const handleOpenEdit = (order: Order, requestId?: string) => {
    if (isAdminOrManager) {
        if (!requestId) {
            // Admin editing DIRECTLY -> Require PIN
            executeWithSecurityCheck(() => openEditModal(order, requestId));
        } else {
            // Admin editing via APPROVED REQUEST -> No PIN needed (already approved)
            openEditModal(order, requestId);
        }
    } else {
        // Staff editing via APPROVED REQUEST -> No PIN needed
        openEditModal(order, requestId);
    }
  };

  const openEditModal = (order: Order, requestId?: string) => {
    setEditingOrder(order);
    setActiveRequestId(requestId); // Track request ID to close it after save
    setEditItems(JSON.parse(JSON.stringify(order.items))); // Deep copy
    
    // Initialize Time Inputs (Number)
    setEditStartTime(order.startTime);
    setEditEndTime(order.endTime || Date.now());
  };

  // --- TIME ADJUSTMENT LOGIC (Arrows) ---
  const adjustRoomTime = (type: 'start' | 'end', minutes: number) => {
    if (type === 'start') {
        setEditStartTime(prev => prev + (minutes * 60000));
    } else {
        setEditEndTime(prev => prev + (minutes * 60000));
    }
  };

  const adjustItemTime = (itemId: string, field: 'startTime' | 'endTime', minutes: number) => {
    setEditItems(prev => prev.map(item => {
        if ((item.id || item.productId) === itemId && item.isTimeBased) {
            const currentVal = item[field] || Date.now();
            return { ...item, [field]: currentVal + (minutes * 60000) };
        }
        return item;
    }));
  };

  // Handle direct input change
  const handleRoomTimeInputChange = (type: 'start' | 'end', value: string) => {
      const ts = new Date(value).getTime();
      if (!isNaN(ts)) {
          if (type === 'start') setEditStartTime(ts);
          else setEditEndTime(ts);
      }
  };

  const handleItemTimeInputChange = (itemId: string, field: 'startTime' | 'endTime', value: string) => {
      const ts = new Date(value).getTime();
      if (!isNaN(ts)) {
        setEditItems(prev => prev.map(item => {
            if ((item.id || item.productId) === itemId && item.isTimeBased) {
                return { ...item, [field]: ts };
            }
            return item;
        }));
      }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setEditItems(prev => prev.map(item => {
        if ((item.id || item.productId) === itemId) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
        }
        return item;
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Xóa món này khỏi hóa đơn?")) {
        setEditItems(prev => prev.filter(i => (i.id || i.productId) !== itemId));
    }
  };

  const handleSaveEdit = () => {
    if (editingOrder) {
        if (editEndTime <= editStartTime) {
            alert("Lỗi: Giờ ra phải lớn hơn giờ vào!");
            return;
        }

        // Pass requestId to mark it as COMPLETED
        updatePaidOrder(editingOrder.id, editItems, editStartTime, editEndTime, activeRequestId);
        
        setEditingOrder(null);
        setActiveRequestId(undefined);
    }
  };

  const handleApproveRequest = (reqId: string) => {
      // Require Security PIN to Approve Request
      executeWithSecurityCheck(() => approveBillEdit(reqId));
  };

  // --- HISTORY LOGIC ---
  const getOrderHistory = (orderId: string) => {
    return actionLogs.filter(l => 
        (l.actionType === 'UPDATE' && l.target.includes(orderId)) || 
        (l.actionType === 'REQUEST' && l.target === orderId) ||
        (l.actionType === 'PRINT' && l.target.includes(orderId))
    ).sort((a, b) => b.timestamp - a.timestamp);
  };

  // Helper render arrows
  const TimeControls = ({ onUp, onDown }: { onUp: () => void, onDown: () => void }) => (
    <div className="flex flex-col ml-1">
        <button onClick={onUp} className="bg-gray-700 hover:bg-gray-600 text-white p-0.5 rounded-t h-4 w-5 flex items-center justify-center mb-[1px]">
            <ChevronUp size={12}/>
        </button>
        <button onClick={onDown} className="bg-gray-700 hover:bg-gray-600 text-white p-0.5 rounded-b h-4 w-5 flex items-center justify-center">
            <ChevronDown size={12}/>
        </button>
    </div>
  );

  // Format Helper for Preview
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
  const formatDateTime = (ts: number) => new Date(ts).toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatDurationText = (ms: number) => {
     const minutes = Math.max(1, Math.ceil(ms / 60000));
     const h = Math.floor(minutes / 60);
     const m = minutes % 60;
     if (h > 0) return `${h} giờ ${m} phút`;
     return `${m} phút`;
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* ... (Keep existing Header, Date Picker, Tabs, Bill List, Request Modal code) ... */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <ReceiptText className="mr-3 text-pink-500" /> Quản Lý Hóa Đơn
        </h2>
        
        {/* Date Picker */}
        <div className="flex items-center space-x-3 bg-gray-800 p-2 rounded-lg border border-gray-700">
           <Calendar className="text-gray-400" size={20} />
           <input 
             type="date"
             className="bg-transparent text-white outline-none font-bold"
             value={selectedDate}
             onChange={(e) => setSelectedDate(e.target.value)}
           />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button 
          onClick={() => setActiveTab('LIST')}
          className={`pb-3 px-4 font-bold border-b-2 transition-colors ${activeTab === 'LIST' ? 'border-pink-500 text-pink-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Danh sách Bill
        </button>
        {isAdminOrManager && (
          <button 
            onClick={() => setActiveTab('APPROVAL')}
            className={`pb-3 px-4 font-bold border-b-2 transition-colors flex items-center ${activeTab === 'APPROVAL' ? 'border-pink-500 text-pink-500' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Yêu cầu phê duyệt
            {billRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {billRequests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB: BILL LIST */}
      {activeTab === 'LIST' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-gray-750 text-gray-300 text-sm uppercase">
              <tr>
                <th className="p-4">Mã HĐ</th>
                <th className="p-4">Phòng</th>
                <th className="p-4 text-center">Giờ ra</th>
                <th className="p-4 text-right">Tổng tiền</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-sm">
              {dailyOrders.map(order => {
                const request = billRequests.find(r => r.orderId === order.id && r.status !== 'COMPLETED'); // Only check active requests
                const requestPending = request?.status === 'PENDING';
                const requestApproved = request?.status === 'APPROVED';
                
                const isEditableWindow = canRequestEdit(order.endTime);
                const isLockedForever = isHardLocked(order.endTime);

                return (
                  <tr key={order.id} className="hover:bg-gray-700/50">
                    <td 
                        className="p-4 font-mono text-gray-400 text-xs cursor-pointer hover:text-blue-400 hover:underline"
                        onClick={() => handleOpenPrintPreview(order)}
                        title="Xem chi tiết hóa đơn"
                    >
                        {order.id}
                    </td>
                    <td className="p-4 font-bold text-white">
                        {getRoomName(order.roomId)}
                        {(order.printCount || 0) > 0 && (
                            <span className="ml-2 text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                In: {order.printCount}
                            </span>
                        )}
                        {isAdminOrManager && (order.editCount || 0) > 0 && (
                            <span className="ml-2 text-[10px] bg-yellow-900/50 text-yellow-200 px-1.5 py-0.5 rounded border border-yellow-700">
                                Sửa: {order.editCount}
                            </span>
                        )}
                    </td>
                    <td className="p-4 text-center text-gray-400">
                      {order.endTime ? new Date(order.endTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '-'}
                    </td>
                    <td className="p-4 text-right font-bold text-green-400">
                      {Math.round(order.totalAmount).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      {isLockedForever ? (
                         <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs flex items-center justify-center inline-flex">
                           <Lock size={12} className="mr-1"/> Đã khóa sổ
                         </span>
                      ) : requestPending ? (
                        <span className="bg-yellow-900 text-yellow-200 px-2 py-1 rounded text-xs flex items-center justify-center inline-flex">
                          <Clock size={12} className="mr-1"/> Chờ duyệt sửa
                        </span>
                      ) : (
                        <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs flex items-center justify-center inline-flex">
                          <Check size={12} className="mr-1"/> Hoàn tất
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {/* History Button (Admin) */}
                        {isAdminOrManager && (
                            <button 
                                onClick={() => setHistoryOrder(order)}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 rounded transition-colors"
                                title="Lịch sử sửa đổi / in"
                            >
                                <History size={16} />
                            </button>
                        )}

                        {/* Print Button (Always available for everyone) */}
                        <button 
                            onClick={() => handleOpenPrintPreview(order)}
                            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
                            title="In lại hóa đơn"
                        >
                            <Printer size={16} />
                        </button>

                        {/* EDIT LOGIC */}
                        {!isLockedForever ? (
                            isAdminOrManager ? (
                                // Admin always edit (With Security Check)
                                <button 
                                    onClick={() => handleOpenEdit(order)}
                                    className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                >
                                    Sửa ngay
                                </button>
                            ) : (
                                // Staff Logic
                                requestApproved ? (
                                    <button 
                                        onClick={() => handleOpenEdit(order, request?.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors animate-pulse"
                                    >
                                        Sửa ngay
                                    </button>
                                ) : (
                                    // Request Button (Only if within window and not pending)
                                    (isEditableWindow && !requestPending) && (
                                        <button 
                                            onClick={() => setRequestModalOrder(order.id)}
                                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                        >
                                            Yêu cầu sửa
                                        </button>
                                    )
                                )
                            )
                        ) : (
                            // View Details when locked
                            <button 
                                onClick={() => handleOpenEdit(order)}
                                className="bg-gray-700 text-gray-400 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center"
                            >
                                <Eye size={12} className="mr-1"/> Xem
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {dailyOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Không có hóa đơn nào trong ngày {selectedDate}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: APPROVALS */}
      {activeTab === 'APPROVAL' && isAdminOrManager && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
           <table className="w-full text-left">
            <thead className="bg-gray-750 text-gray-300 text-sm uppercase">
              <tr>
                <th className="p-4">Thời gian gửi</th>
                <th className="p-4">Người yêu cầu</th>
                <th className="p-4">Mã HĐ</th>
                <th className="p-4">Lý do</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right">Duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-sm">
              {billRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-700/50">
                  <td className="p-4 text-gray-400">{new Date(req.timestamp).toLocaleString('vi-VN')}</td>
                  <td className="p-4 font-bold text-white">{req.requestByName}</td>
                  <td className="p-4 font-mono text-xs text-blue-300">{req.orderId}</td>
                  <td className="p-4 italic text-gray-300">{req.reason}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold 
                      ${req.status === 'PENDING' ? 'bg-yellow-600 text-white' : 
                        req.status === 'APPROVED' ? 'bg-green-600 text-white' : 
                        req.status === 'COMPLETED' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                      {req.status === 'PENDING' ? 'Chờ duyệt' : 
                       req.status === 'APPROVED' ? 'Đã duyệt (Chờ sửa)' : 
                       req.status === 'COMPLETED' ? 'Đã hoàn tất sửa' : 'Từ chối'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleApproveRequest(req.id)}
                          className="bg-green-600 hover:bg-green-500 text-white p-1.5 rounded"
                          title="Chấp thuận"
                        >
                          <Check size={16}/>
                        </button>
                        <button 
                          onClick={() => rejectBillEdit(req.id)}
                          className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded"
                          title="Từ chối"
                        >
                          <X size={16}/>
                        </button>
                      </div>
                    )}
                    {req.status !== 'PENDING' && (
                      <span className="text-xs text-gray-500">
                        {req.resolvedBy ? `Bởi ${req.resolvedBy}` : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {billRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
           </table>
        </div>
      )}

      {/* REQUEST EDIT MODAL */}
      {requestModalOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-yellow-500" /> Yêu cầu sửa hóa đơn
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Vui lòng nhập lý do bạn muốn sửa hóa đơn này. Admin sẽ xem xét yêu cầu của bạn.
            </p>
            <textarea 
              className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white outline-none focus:border-yellow-500 mb-4"
              rows={3}
              placeholder="Ví dụ: Nhập sai số lượng bia, khách đổi ý..."
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setRequestModalOrder(null)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleRequestSubmit}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded shadow-lg"
                disabled={!editReason.trim()}
              >
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BILL MODAL, HISTORY MODAL, PRINT MODAL (Same as before) */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-4xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* ... Edit Modal Content ... */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                        <Edit className="mr-3 text-blue-500" /> Sửa Hóa Đơn {editingOrder.id}
                    </h3>
                    <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="space-y-6">
                    {/* Time Editing Section */}
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700 flex flex-col md:flex-row gap-4">
                       <div className="flex-1">
                          <label className="block text-gray-400 text-xs mb-1">Giờ Vào (Check-in)</label>
                          <div className="flex items-center">
                             <input 
                               type="datetime-local" 
                               className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white text-sm"
                               value={formatDateTimeLocal(editStartTime)}
                               onChange={(e) => handleRoomTimeInputChange('start', e.target.value)}
                             />
                             <TimeControls onUp={() => adjustRoomTime('start', 1)} onDown={() => adjustRoomTime('start', -1)} />
                          </div>
                       </div>
                       <div className="flex-1">
                          <label className="block text-gray-400 text-xs mb-1">Giờ Ra (Check-out)</label>
                          <div className="flex items-center">
                             <input 
                               type="datetime-local" 
                               className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white text-sm"
                               value={formatDateTimeLocal(editEndTime)}
                               onChange={(e) => handleRoomTimeInputChange('end', e.target.value)}
                             />
                             <TimeControls onUp={() => adjustRoomTime('end', 1)} onDown={() => adjustRoomTime('end', -1)} />
                          </div>
                       </div>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-gray-750 text-gray-300 text-sm">
                            <tr>
                                <th className="p-3">Tên món</th>
                                <th className="p-3 text-right">Đơn giá</th>
                                <th className="p-3 text-center">Số lượng / Thời gian</th>
                                <th className="p-3 text-right">Thành tiền</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm">
                            {editItems.map(item => (
                                <tr key={item.id || item.productId} className="hover:bg-gray-700/30">
                                    <td className="p-3">
                                        <p className="font-bold">{item.name}</p>
                                        {item.isTimeBased && <span className="text-[10px] text-blue-400">Dịch vụ tính giờ</span>}
                                    </td>
                                    <td className="p-3 text-right">{item.sellPrice.toLocaleString()}</td>
                                    
                                    {/* Conditional Logic for Quantity vs Time */}
                                    <td className="p-3 text-center">
                                        {!item.isTimeBased ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <button onClick={() => handleUpdateQuantity(item.id || item.productId, -1)} className="bg-gray-700 hover:bg-gray-600 p-1 rounded"><Minus size={12}/></button>
                                                <span className="w-8 text-center">{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(item.id || item.productId, 1)} className="bg-gray-700 hover:bg-gray-600 p-1 rounded"><Plus size={12}/></button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center text-xs">
                                                    <span className="w-8 text-gray-500">Vào:</span>
                                                    <input 
                                                      type="datetime-local" 
                                                      className="bg-gray-800 border border-gray-600 rounded px-1 text-white text-[10px] w-32"
                                                      value={item.startTime ? formatDateTimeLocal(item.startTime) : ''}
                                                      onChange={(e) => handleItemTimeInputChange(item.id || item.productId, 'startTime', e.target.value)}
                                                    />
                                                    <TimeControls 
                                                        onUp={() => adjustItemTime(item.id || item.productId, 'startTime', 1)} 
                                                        onDown={() => adjustItemTime(item.id || item.productId, 'startTime', -1)} 
                                                    />
                                                </div>
                                                <div className="flex items-center text-xs">
                                                    <span className="w-8 text-gray-500">Ra:</span>
                                                    <input 
                                                      type="datetime-local" 
                                                      className="bg-gray-800 border border-gray-600 rounded px-1 text-white text-[10px] w-32"
                                                      value={item.endTime ? formatDateTimeLocal(item.endTime) : ''}
                                                      onChange={(e) => handleItemTimeInputChange(item.id || item.productId, 'endTime', e.target.value)}
                                                    />
                                                    <TimeControls 
                                                        onUp={() => adjustItemTime(item.id || item.productId, 'endTime', 1)} 
                                                        onDown={() => adjustItemTime(item.id || item.productId, 'endTime', -1)} 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td className="p-3 text-right font-bold">
                                        {item.isTimeBased ? (
                                            // Approximate display, actual calc happens on save
                                            <span className="text-gray-400 italic text-xs">Tự động tính lại</span>
                                        ) : (
                                            (item.sellPrice * item.quantity).toLocaleString()
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        {/* Allow delete for all items */}
                                        <button onClick={() => handleDeleteItem(item.id || item.productId)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div className="bg-yellow-900/20 p-3 rounded text-yellow-300 text-sm border border-yellow-700/50">
                        * Lưu ý: Thay đổi thời gian sẽ tự động tính lại tiền giờ phòng và tiền dịch vụ.
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <button onClick={() => setEditingOrder(null)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy</button>
                        {(!isHardLocked(editingOrder.endTime) || isAdminOrManager) && (
                            <button onClick={handleSaveEdit} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg flex items-center">
                                <Save size={18} className="mr-2"/> Lưu Thay Đổi
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* HISTORY & PRINT MODALS (Existing Code) */}
      {historyOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <History className="mr-3 text-gray-400" /> Lịch sử Hóa Đơn {historyOrder.id}
                    </h3>
                    <button onClick={() => setHistoryOrder(null)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="space-y-4">
                    {getOrderHistory(historyOrder.id).length > 0 ? (
                        getOrderHistory(historyOrder.id).map(log => (
                            <div key={log.id} className="bg-gray-900 p-3 rounded border border-gray-700 text-sm">
                                <div className="flex justify-between text-gray-400 text-xs mb-1">
                                    <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                                    <span>Bởi: <strong className="text-white">{log.userName}</strong></span>
                                </div>
                                <div className={`${log.actionType === 'PRINT' ? 'text-green-400' : 'text-white'}`}>
                                    {log.description}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 italic p-4">Chưa có lịch sử sửa đổi nào.</p>
                    )}
                </div>
            </div>
        </div>
      )}

      {printingOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 overflow-y-auto">
          <div className="flex flex-col max-h-full w-full max-w-sm">
            {/* Same Print Modal Code ... */}
            <div 
              id="bill-preview-content" 
              className="bg-white text-black p-4 w-full mx-auto shadow-2xl relative font-sans text-xs leading-tight"
              style={{ fontFamily: settings.invoiceFontFamily || 'Arial, sans-serif' }}
            >
              {/* Preview Content (Mimics RoomPos Invoice) */}
              <div className="text-center mb-2">
                 <h1 className="font-bold uppercase mb-1" style={{ fontSize: (settings.invoiceHeaderFontSize || 18) + 'px' }}>{settings.storeName}</h1>
                 <p className="mb-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>{settings.storeAddress}</p>
                 <p className="mb-2 font-bold" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>ĐT: {settings.storeTaxCode}</p>
                 <h2 className="font-bold uppercase mt-3 mb-1" style={{ fontSize: ((settings.invoiceHeaderFontSize || 18) - 2) + 'px' }}>HÓA ĐƠN TÍNH TIỀN {getRoomName(printingOrder.roomId).toUpperCase()}</h2>
                 {printingOrder.id && <p style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>Số: {printingOrder.id}</p>}
              </div>
              <div className="mb-3 border-b border-black pb-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <div className="flex justify-between"><span>Giờ vào:</span><span>{formatDateTime(printingOrder.startTime)}</span></div>
                 <div className="flex justify-between"><span>Giờ ra:</span><span>{printingOrder.endTime ? formatDateTime(printingOrder.endTime) : '-'}</span></div>
                 <div className="flex justify-between font-bold"><span>Thời gian:</span><span>{printingOrder.endTime ? formatDurationText(printingOrder.endTime - printingOrder.startTime) : '-'}</span></div>
              </div>
              <div className="border-t-2 border-dashed border-black py-2 mb-2" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <div className="flex font-bold mb-1 border-b border-black pb-1">
                    <span className="w-[35%] text-left">Tên</span>
                    <span className="w-[25%] text-center text-[10px]">Giờ Vào - Ra</span>
                    <span className="w-[15%] text-center">SL/TG</span>
                    <span className="w-[25%] text-right">Thành tiền</span>
                 </div>
                 
                 {/* Re-calculate Room Charge for Display */}
                 {(() => {
                    const durationMs = (printingOrder.endTime || Date.now()) - printingOrder.startTime;
                    
                    const itemTotal = printingOrder.items.reduce((sum, item) => {
                       if (item.isTimeBased && item.startTime) {
                          const iEnd = item.endTime || printingOrder.endTime || Date.now();
                          const dur = Math.max(1, Math.ceil((iEnd - item.startTime)/60000));
                          const blk = settings.serviceBlockMinutes || 1;
                          const billed = Math.ceil(dur/blk)*blk;
                          return sum + (billed/60)*item.sellPrice;
                       }
                       return sum + (item.sellPrice * item.quantity);
                    }, 0);
                    
                    const roomCost = Math.max(0, (printingOrder.subTotal || 0) - itemTotal);
                    
                    return (
                        <div className="flex mb-1">
                            <span className="w-[35%] text-left pr-1">Tiền giờ hát</span>
                            <span className="w-[25%] text-center text-[10px]">{formatTime(printingOrder.startTime)} - {printingOrder.endTime ? formatTime(printingOrder.endTime) : ''}</span>
                            <span className="w-[15%] text-center">-</span>
                            <span className="w-[25%] text-right">{Math.round(roomCost).toLocaleString()}</span>
                        </div>
                    );
                 })()}

                 {printingOrder.items.map((item) => {
                    if (item.isTimeBased && item.startTime) {
                       const endTime = item.endTime || printingOrder.endTime || Date.now();
                       const durationMins = Math.max(1, Math.ceil((endTime - item.startTime) / 60000));
                       
                       // Recalc cost for display
                       const serviceBlock = settings.serviceBlockMinutes || 1; 
                       const billedMins = Math.ceil(durationMins / serviceBlock) * serviceBlock;
                       const cost = (billedMins / 60) * item.sellPrice;

                       return (
                          <div key={item.id} className="flex mb-1">
                             <span className="w-[35%] text-left pr-1 truncate">{item.name}</span>
                             <span className="w-[25%] text-center text-[10px]">{formatTime(item.startTime)} - {formatTime(endTime)}</span>
                             <span className="w-[15%] text-center">{durationMins}p</span>
                             <span className="w-[25%] text-right">{Math.round(cost).toLocaleString()}</span>
                          </div>
                       );
                    } else {
                       return (
                          <div key={item.id || item.productId} className="flex mb-1">
                             <span className="w-[35%] text-left pr-1 truncate">{item.name}</span>
                             <span className="w-[25%] text-center text-[10px]">-</span>
                             <span className="w-[15%] text-center">{item.quantity}</span>
                             <span className="w-[25%] text-right">{Math.round(item.sellPrice * item.quantity).toLocaleString()}</span>
                          </div>
                       );
                    }
                 })}
              </div>
              <div className="border-t border-black pt-2 mb-2" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 {/* Summary Lines */}
                 <div className="flex justify-between mb-1"><span>Tạm tính:</span><span className="font-bold">{Math.round(printingOrder.subTotal || 0).toLocaleString()}</span></div>
                 {printingOrder.vatRate > 0 && <div className="flex justify-between mb-1"><span>VAT ({printingOrder.vatRate}%):</span><span className="font-bold">{Math.round((printingOrder.totalAmount || 0) - (printingOrder.subTotal || 0)).toLocaleString()}</span></div>}
              </div>
              <div className="border-t-2 border-black pt-2 mb-4 text-center">
                 <span className="block text-sm font-bold uppercase">Tổng thanh toán:</span>
                 <span className="block text-2xl font-bold">{Math.round(printingOrder.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="text-center text-[10px] mb-4" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                 <p className="mt-2 font-bold uppercase">XIN CẢM ƠN QUÝ KHÁCH!</p>
                 <p className="mt-1 italic">{settings.invoiceFooter}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="no-print mt-4 flex justify-center space-x-2 pb-8">
              <button onClick={handleConfirmPrint} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded font-bold text-sm shadow-lg flex items-center justify-center">
                 <Printer size={18} className="mr-2"/> Xác nhận In
              </button>
              <button onClick={() => setPrintingOrder(null)} className="bg-gray-600 text-white px-6 py-3 rounded text-sm font-bold">
                 Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY MODAL */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
            <div className="bg-gray-800 p-6 rounded-xl border border-purple-500/50 shadow-2xl w-96 text-center">
                <div className="mx-auto bg-purple-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-purple-500">
                    <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Bảo Mật Cấp 2</h3>
                <p className="text-gray-400 text-sm mb-4">Vui lòng nhập mã PIN để tiếp tục.</p>
                
                <input 
                    type="password" 
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-center text-2xl tracking-widest font-bold mb-6 focus:border-purple-500 outline-none"
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSecurityVerify()}
                />
                
                <div className="flex justify-center space-x-3">
                    <button 
                        onClick={() => { setIsSecurityModalOpen(false); setPendingAction(null); }}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSecurityVerify}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-lg"
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};