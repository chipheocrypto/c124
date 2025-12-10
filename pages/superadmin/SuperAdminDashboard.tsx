
import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { Role, Store } from '../../types';
import { Shield, Building, Users, Clock, Lock, Unlock, Plus, Minus, LogOut, Search, UserCheck, Trash2, Mail, Phone, X, AlertTriangle, Key } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const { stores, allUsers, logout, updateStoreExpiry, toggleStoreLock, createStoreForOwner, deleteStore, updateOwnerQuota, updateSecondPassword } = useApp();
  const [activeTab, setActiveTab] = useState<'STORES' | 'OWNERS'>('STORES');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);
  const [isDeleteStoreModalOpen, setIsDeleteStoreModalOpen] = useState(false); // Modal xóa quán
  const [isPinModalOpen, setIsPinModalOpen] = useState(false); // Modal cấp MK2
  
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');

  const [ownerStoresToDelete, setOwnerStoresToDelete] = useState<Store[]>([]); // Danh sách quán của user đang chọn xóa
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [secondPin, setSecondPin] = useState('');

  // --- LOGIC: Group Owners ---
  const owners = useMemo(() => {
    const uniqueOwnersMap = new Map<string, { user: any, count: number, storeNames: string[], storeIds: string[] }>();

    allUsers.forEach(u => {
      if (u.role === Role.ADMIN) {
        // Find store info
        const store = stores.find(s => s.id === u.storeId);
        
        if (!uniqueOwnersMap.has(u.username)) {
          uniqueOwnersMap.set(u.username, {
            user: u,
            count: 0,
            storeNames: [],
            storeIds: []
          });
        }

        const entry = uniqueOwnersMap.get(u.username)!;
        if (store) {
          entry.count += 1;
          entry.storeNames.push(store.name);
          entry.storeIds.push(store.id);
        }
      }
    });

    return Array.from(uniqueOwnersMap.values());
  }, [allUsers, stores]);

  // --- FILTERS ---
  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOwners = owners.filter(o => 
    o.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.user.email && o.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- HANDLERS ---

  const handleOpenExpiry = (storeId: string, currentDate?: string) => {
    setSelectedStoreId(storeId);
    setNewExpiryDate(currentDate ? currentDate.split('T')[0] : '');
    setIsExpiryModalOpen(true);
  };

  const handleSaveExpiry = () => {
    if (selectedStoreId && newExpiryDate) {
      updateStoreExpiry(selectedStoreId, newExpiryDate);
      setIsExpiryModalOpen(false);
    }
  };

  const handleIncreaseQuota = (username: string) => {
    updateOwnerQuota(username, 1);
  };

  const handleDecreaseQuota = (username: string) => {
    updateOwnerQuota(username, -1);
  };

  const handleOpenDeleteStore = (ownerUsername: string) => {
     // Find all stores for this owner
     const ownerEntry = owners.find(o => o.user.username === ownerUsername);
     if (ownerEntry) {
        const storesToDelete = stores.filter(s => ownerEntry.storeIds.includes(s.id));
        setOwnerStoresToDelete(storesToDelete);
        setIsDeleteStoreModalOpen(true);
     }
  };

  const confirmDeleteStore = (storeId: string) => {
     // Direct delete without confirmation popup as requested
     deleteStore(storeId);
     
     // Update local list in modal immediately
     setOwnerStoresToDelete(prev => prev.filter(s => s.id !== storeId));
     
     // Auto close modal if no stores left
     if (ownerStoresToDelete.length <= 1) {
        setIsDeleteStoreModalOpen(false);
     }
  };

  const handleOpenPinModal = (userId: string) => {
    setSelectedOwnerId(userId);
    setSecondPin('');
    setIsPinModalOpen(true);
  };

  const handleSavePin = () => {
    if (selectedOwnerId && secondPin) {
        updateSecondPassword(selectedOwnerId, secondPin);
        setIsPinModalOpen(false);
        alert("Đã cấp mật khẩu cấp 2 thành công!");
    } else {
        alert("Vui lòng nhập mật khẩu cấp 2.");
    }
  };

  // Helper date display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Vĩnh viễn';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  // Find Owner Info for a specific store
  const getStoreOwner = (storeId: string) => {
     const ownerUser = allUsers.find(u => u.storeId === storeId && u.role === Role.ADMIN);
     return ownerUser;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg flex justify-between items-center px-8 border-b border-gray-700">
         <div className="flex items-center space-x-3">
            <Shield className="text-pink-500" size={32} />
            <div>
               <h1 className="text-xl font-bold uppercase">Hệ Thống Quản Trị Cấp Cao</h1>
               <p className="text-xs text-gray-400">Super Admin Dashboard</p>
            </div>
         </div>
         <button 
           onClick={logout}
           className="flex items-center text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
         >
           <LogOut size={20} className="mr-2"/> Đăng xuất
         </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          
          {/* Tabs & Search */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
             <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                <button 
                  onClick={() => setActiveTab('STORES')}
                  className={`px-6 py-2 rounded font-bold flex items-center ${activeTab === 'STORES' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Building size={18} className="mr-2"/> Quản lý Cửa Hàng
                </button>
                <button 
                  onClick={() => setActiveTab('OWNERS')}
                  className={`px-6 py-2 rounded font-bold flex items-center ${activeTab === 'OWNERS' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Users size={18} className="mr-2"/> Quản lý Khách Hàng
                </button>
             </div>

             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={20}/>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-pink-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          {/* VIEW: STORES */}
          {activeTab === 'STORES' && (
            <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
               <table className="w-full text-left">
                  <thead className="bg-gray-750 text-gray-300 uppercase text-xs font-bold">
                     <tr>
                        <th className="p-4">Tên Cửa Hàng</th>
                        <th className="p-4">Chủ sở hữu</th>
                        <th className="p-4">Địa chỉ</th>
                        <th className="p-4 text-center">Trạng thái</th>
                        <th className="p-4">Ngày hết hạn</th>
                        <th className="p-4 text-right">Hành động</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 text-sm">
                     {filteredStores.map(store => {
                        const expired = isExpired(store.expiryDate);
                        const owner = getStoreOwner(store.id);
                        return (
                           <tr key={store.id} className="hover:bg-gray-750 transition-colors">
                              <td className="p-4 font-bold text-white">{store.name}</td>
                              <td className="p-4">
                                 {owner ? (
                                    <div>
                                       <p className="font-bold text-white">{owner.name}</p>
                                       <p className="text-xs text-gray-400 flex items-center"><Phone size={10} className="mr-1"/> {owner.phoneNumber || '---'}</p>
                                    </div>
                                 ) : (
                                    <span className="text-gray-500 italic">Chưa có chủ</span>
                                 )}
                              </td>
                              <td className="p-4 text-gray-400 truncate max-w-xs">{store.address}</td>
                              <td className="p-4 text-center">
                                 {store.status === 'LOCKED' ? (
                                    <span className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs">Đã Khóa</span>
                                 ) : expired ? (
                                    <span className="bg-yellow-900 text-yellow-200 px-2 py-1 rounded text-xs">Hết Hạn</span>
                                 ) : (
                                    <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs">Hoạt Động</span>
                                 )}
                              </td>
                              <td className={`p-4 font-mono ${expired ? 'text-red-400 font-bold' : 'text-blue-300'}`}>
                                 {formatDate(store.expiryDate)}
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={() => handleOpenExpiry(store.id, store.expiryDate)}
                                      className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white p-2 rounded transition-colors"
                                      title="Gia hạn"
                                    >
                                       <Clock size={16} />
                                    </button>
                                    <button 
                                      onClick={() => toggleStoreLock(store.id)}
                                      className={`p-2 rounded transition-colors ${store.status === 'LOCKED' 
                                         ? 'bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white' 
                                         : 'bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white'}`}
                                      title={store.status === 'LOCKED' ? "Mở khóa" : "Khóa cửa hàng"}
                                    >
                                       {store.status === 'LOCKED' ? <Unlock size={16} /> : <Lock size={16} />}
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                     {filteredStores.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">Không tìm thấy cửa hàng nào.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
          )}

          {/* VIEW: OWNERS */}
          {activeTab === 'OWNERS' && (
            <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
               <table className="w-full text-left">
                  <thead className="bg-gray-750 text-gray-300 uppercase text-xs font-bold">
                     <tr>
                        <th className="p-4">Thông tin Khách Hàng</th>
                        <th className="p-4">Tài khoản (Username)</th>
                        <th className="p-4 text-center">Số lượng quán</th>
                        <th className="p-4">Danh sách quán</th>
                        <th className="p-4 text-right">Hành động</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 text-sm">
                     {filteredOwners.map((entry, idx) => {
                        return (
                           <tr key={idx} className="hover:bg-gray-750 transition-colors">
                              <td className="p-4">
                                 <div className="flex items-center mb-1">
                                    <div className="w-8 h-8 rounded-full bg-pink-900/50 flex items-center justify-center mr-3 text-pink-400 shrink-0">
                                       <UserCheck size={16} />
                                    </div>
                                    <span className="font-bold text-white text-lg">{entry.user.name}</span>
                                 </div>
                                 <div className="text-gray-400 text-xs ml-11 space-y-1">
                                    <p className="flex items-center"><Phone size={12} className="mr-1"/> {entry.user.phoneNumber || '---'}</p>
                                    <p className="flex items-center"><Mail size={12} className="mr-1"/> {entry.user.email || '---'}</p>
                                 </div>
                              </td>
                              <td className="p-4 text-gray-300 font-mono">{entry.user.username}</td>
                              <td className="p-4 text-center">
                                 <div className="flex flex-col items-center">
                                    <span className="font-bold text-blue-400 text-lg">
                                       {entry.count} <span className="text-gray-500 text-sm">/ {entry.user.maxAllowedStores || 1}</span>
                                    </span>
                                    <span className="text-[10px] text-gray-500">Đã tạo / Được phép</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex flex-wrap gap-2">
                                    {entry.storeNames.map((name, i) => (
                                       <span key={i} className="bg-gray-700 border border-gray-600 px-2 py-1 rounded text-xs text-gray-300">
                                          {name}
                                       </span>
                                    ))}
                                 </div>
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex flex-col space-y-2 items-end">
                                    <div className="flex space-x-1">
                                       <button 
                                          onClick={() => handleDecreaseQuota(entry.user.username)}
                                          className="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1.5 rounded-l text-xs font-bold flex items-center shadow-lg transition-colors"
                                          title="Giảm số lượng cho phép"
                                       >
                                          <Minus size={14} className="mr-1"/> Giảm
                                       </button>
                                       <button 
                                          onClick={() => handleIncreaseQuota(entry.user.username)}
                                          className="bg-green-600 hover:bg-green-500 text-white px-2 py-1.5 rounded-r text-xs font-bold flex items-center shadow-lg transition-colors"
                                          title="Tăng số lượng cho phép"
                                       >
                                          <Plus size={14} className="mr-1"/> Thêm
                                       </button>
                                    </div>
                                    
                                    <div className="flex space-x-1">
                                        <button 
                                            onClick={() => handleOpenPinModal(entry.user.id)}
                                            className="bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center shadow-lg transition-colors"
                                            title="Cấp mật khẩu cấp 2"
                                        >
                                            <Key size={14} className="mr-1"/> Cấp MK 2
                                        </button>
                                        <button 
                                            onClick={() => handleOpenDeleteStore(entry.user.username)}
                                            className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center shadow-lg transition-colors"
                                        >
                                            <Trash2 size={14} className="mr-1"/> Xóa Quán
                                        </button>
                                    </div>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                     {filteredOwners.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Không tìm thấy khách hàng nào.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: CHANGE EXPIRY */}
      {isExpiryModalOpen && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-96">
               <h3 className="text-xl font-bold mb-4">Gia hạn sử dụng</h3>
               <p className="text-sm text-gray-400 mb-4">Chọn ngày hết hạn mới cho cửa hàng.</p>
               <input 
                 type="date" 
                 className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white mb-6"
                 value={newExpiryDate}
                 onChange={e => setNewExpiryDate(e.target.value)}
               />
               <div className="flex justify-end space-x-3">
                  <button onClick={() => setIsExpiryModalOpen(false)} className="px-4 py-2 text-gray-400">Hủy</button>
                  <button onClick={handleSaveExpiry} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-bold">Lưu thay đổi</button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL: DELETE STORE (Reduce) */}
      {isDeleteStoreModalOpen && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md">
               <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                  <h3 className="text-xl font-bold flex items-center text-red-400">
                     <Trash2 size={24} className="mr-2"/> Xóa Cửa Hàng
                  </h3>
                  <button onClick={() => setIsDeleteStoreModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
               </div>
               
               <p className="text-gray-300 text-sm mb-4">Chọn cửa hàng muốn xóa khỏi tài khoản này:</p>

               <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ownerStoresToDelete.length > 0 ? (
                     ownerStoresToDelete.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-700">
                           <div>
                              <p className="font-bold text-white">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.address}</p>
                           </div>
                           <button 
                              onClick={() => confirmDeleteStore(s.id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold shadow-lg"
                           >
                              Xóa
                           </button>
                        </div>
                     ))
                  ) : (
                     <p className="text-center text-gray-500 italic">Không có cửa hàng nào để xóa.</p>
                  )}
               </div>

               <div className="flex justify-end mt-6 pt-2 border-t border-gray-700">
                  <button onClick={() => setIsDeleteStoreModalOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold">
                     Đóng
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL: SET SECURITY PIN (Second Password) */}
      {isPinModalOpen && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl w-96">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Key className="mr-2 text-purple-500"/> Cấp Mật Khẩu Cấp 2
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    Nhập mã PIN bảo mật cho chủ quán. Dùng để duyệt sửa bill và cài đặt nhạy cảm.
                </p>
                <input 
                    type="text"
                    className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white text-center text-xl tracking-widest font-bold mb-6 focus:border-purple-500 outline-none"
                    placeholder="VD: 123456"
                    value={secondPin}
                    onChange={e => setSecondPin(e.target.value)}
                />
                <div className="flex justify-end space-x-3">
                    <button onClick={() => setIsPinModalOpen(false)} className="px-4 py-2 text-gray-400">Hủy</button>
                    <button onClick={handleSavePin} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white font-bold">Lưu PIN</button>
                </div>
            </div>
         </div>
      )}

    </div>
  );
};
