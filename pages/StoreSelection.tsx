import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import { Store, Role, User } from '../types';
import { Building, MapPin, Phone, Plus, LogOut, CheckCircle, Lock, Edit, Trash2, X, Upload, Image as ImageIcon, Calendar, Monitor, Download, Key, AlertTriangle, UserPlus, Loader, Users, Mail, User as UserIcon, Shield, Star } from 'lucide-react';

export const StoreSelection = () => {
  const { stores, user, allUsers, selectStore, logout, updateStore, deleteStore, addNewStore, licenses, createLicense, revokeLicense, addUser, updateUser, deleteUser } = useApp();
  
  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false); 
  const [contactAdminModal, setContactAdminModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false); 
  const [managingStoreId, setManagingStoreId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); // User Management Modal

  // Data State
  const [editingStore, setEditingStore] = useState<Partial<Store>>({});
  const [newStoreData, setNewStoreData] = useState<Partial<Store>>({
     name: '', address: '', phone: ''
  });
  const [newDeviceName, setNewDeviceName] = useState('');

  // User Management State
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isFormVisible, setIsFormVisible] = useState(false); // Only show form when Create or Edit clicked

  // --- UPDATED PERMISSIONS LIST: SPLIT INTO INDIVIDUAL ITEMS ---
  // Đã tách riêng Data Nhập Hàng và Sổ Chi Tiêu ra khỏi Kho hàng
  const availablePermissions = [
    { id: 'pos', label: 'Bán hàng / Thu ngân (POS)' },
    { id: 'rooms', label: 'Quản lý Phòng (Sơ đồ)' },
    { id: 'bills', label: 'Quản lý Hóa đơn & Duyệt Sửa' },
    
    // Nhóm Kho & Dữ liệu (Tách biệt)
    { id: 'inventory', label: 'Kho hàng (Hàng hóa, Tồn kho)' },
    { id: 'import_data', label: 'Data Nhập Hàng (Ảnh chứng từ)' },
    { id: 'daily_expenses', label: 'Sổ Chi Tiêu Hàng Ngày' },
    
    { id: 'reports', label: 'Xem Báo cáo Doanh thu' },
    { id: 'staff', label: 'Quản lý Nhân sự & Bảng lương' },
    { id: 'settings', label: 'Cài đặt Hệ thống' },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === Role.ADMIN;

  // Filter visible stores based on Role and Permissions
  const visibleStores = stores.filter(store => {
    if (user?.role === Role.ADMIN) return true; 
    if (user?.role === Role.MANAGER) {
      const allowed = user.allowedStoreIds || [user.storeId];
      return allowed.includes(store.id);
    }
    return store.id === user?.storeId;
  });

  // Filter users that Admin manages:
  const visibleStoreIds = visibleStores.map(s => s.id);
  const managedUsers = allUsers.filter(u => 
    u.role !== Role.SUPER_ADMIN && 
    u.isSystemAccount && 
    visibleStoreIds.includes(u.storeId)
  );

  const handleSelect = (storeId: string) => {
    selectStore(storeId);
  };

  const handleOpenEdit = (e: React.MouseEvent, store: Store) => {
    e.stopPropagation();
    setEditingStore({ ...store });
    setIsEditModalOpen(true);
  };

  const handleOpenDesktop = (e: React.MouseEvent, storeId: string) => {
    e.stopPropagation();
    setManagingStoreId(storeId);
    setIsDesktopModalOpen(true);
  };

  const handleOpenDelete = (e: React.MouseEvent, storeId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(storeId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteStore(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingStore(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore.id && editingStore.name) {
       if (editingStore.phone) {
          const phoneRegex = /^(02|03|05|07|08|09)\d{8}$/;
          if (!phoneRegex.test(editingStore.phone)) {
            alert("Số điện thoại cửa hàng không hợp lệ!\nYêu cầu: 10 số, đầu số 02, 03, 05, 07, 08, 09.");
            return;
          }
       }
       updateStore(editingStore as Store);
       setIsEditModalOpen(false);
    }
  };

  const handleOrderClick = () => {
    if (!user) return;
    const allowed = user.maxAllowedStores || 1;
    const currentCount = visibleStores.length;

    if (currentCount < allowed) {
      setIsCreateStoreModalOpen(true);
    } else {
      setContactAdminModal(true);
    }
  };

  const handleCreateStore = (e: React.FormEvent) => {
     e.preventDefault();
     if (!newStoreData.name) return;

     if (newStoreData.phone) {
        const phoneRegex = /^(02|03|05|07|08|09)\d{8}$/;
        if (!phoneRegex.test(newStoreData.phone)) {
          alert("Số điện thoại cửa hàng không hợp lệ!\nYêu cầu: 10 số, đầu số 02, 03, 05, 07, 08, 09.");
          return;
        }
     }

     const expiryDate = new Date();
     expiryDate.setDate(expiryDate.getDate() + 7);

     const newStore: Store = {
       id: `store-${Date.now()}`,
       name: newStoreData.name,
       address: newStoreData.address || 'Đang cập nhật',
       phone: newStoreData.phone || '',
       status: 'ACTIVE',
       imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=600',
       expiryDate: expiryDate.toISOString()
     };
     
     addNewStore(newStore);
     setIsCreateStoreModalOpen(false);
  };

  const handleCreateLicense = () => {
    if (managingStoreId && newDeviceName) {
      createLicense(managingStoreId, newDeviceName);
      setNewDeviceName('');
    }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleOpenUserModal = (u?: User) => {
    if (u) {
        setEditingUser({ ...u, password: '' });
    } else {
        setEditingUser({
            name: '', username: '', email: '', phoneNumber: '', password: '', 
            // Reset other fields to force selection
            role: undefined, permissions: [], shift: 'Toàn thời gian', 
            allowedStoreIds: [], storeId: '', 
            hr: { baseSalary: 0, workDays: 0, overtimeShifts: 0, leaveDays: 0, bonus: 0, penalty: 0, cashAdvance: 0 }
        });
    }
    setIsFormVisible(true);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
      if (confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) {
          deleteUser(id);
          setIsFormVisible(false); // Close form after delete
      }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!editingUser.storeId) {
        alert("Vui lòng chọn chi nhánh làm việc.");
        return;
    }
    if (!editingUser.role) {
        alert("Vui lòng chọn vai trò.");
        return;
    }

    // Password Validation
    if ((!editingUser.id && editingUser.password) || (editingUser.id && editingUser.password)) {
       const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
       if (!passwordRegex.test(editingUser.password!)) {
         alert("Mật khẩu không đủ mạnh!\nYêu cầu: Ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
         return;
       }
    }
    if (editingUser.phoneNumber) {
       const phoneRegex = /^(02|03|05|07|08|09)\d{8}$/;
       if (!phoneRegex.test(editingUser.phoneNumber)) {
         alert("Số điện thoại không hợp lệ!");
         return;
       }
    }

    let finalPermissions = editingUser.permissions || [];
    if (editingUser.role === Role.ADMIN) finalPermissions = ['all'];
    if (editingUser.role === Role.MANAGER) finalPermissions = Array.from(new Set([...finalPermissions, 'rooms', 'reports']));
    if (editingUser.role === Role.STAFF && finalPermissions.length === 0) {
        // Staff must have at least one permission or defaults
        finalPermissions = ['pos'];
    }

    let finalAllowedStores = editingUser.allowedStoreIds || [editingUser.storeId];
    if (editingUser.role !== Role.MANAGER) finalAllowedStores = [editingUser.storeId];
    else if (!finalAllowedStores.includes(editingUser.storeId)) finalAllowedStores.push(editingUser.storeId);

    if (editingUser.id) {
        const oldUser = allUsers.find(x => x.id === editingUser.id);
        const u: User = {
            ...(editingUser as User),
            permissions: finalPermissions!,
            allowedStoreIds: finalAllowedStores,
            isSystemAccount: true,
            hr: oldUser?.hr || editingUser.hr
        };
        if (oldUser && !editingUser.password) u.password = oldUser.password;
        updateUser(u);
    } else {
        if (!editingUser.username || !editingUser.password) { alert("Thiếu tài khoản/mật khẩu"); return; }
        const newUser: User = {
            id: `user-${Date.now()}`,
            storeId: editingUser.storeId,
            name: editingUser.name!,
            username: editingUser.username!,
            email: editingUser.email || '',
            phoneNumber: editingUser.phoneNumber || '',
            password: editingUser.password,
            role: editingUser.role as Role,
            permissions: finalPermissions!,
            allowedStoreIds: finalAllowedStores,
            shift: editingUser.shift,
            isSystemAccount: true,
            hr: { baseSalary: 0, workDays: 0, overtimeShifts: 0, leaveDays: 0, bonus: 0, penalty: 0, cashAdvance: 0 }
        };
        addUser(newUser);
    }
    
    // Close form and return to list
    setIsFormVisible(false);
  };

  const togglePermission = (permId: string) => {
    setEditingUser(prev => {
      const current = prev.permissions || [];
      return { ...prev, permissions: current.includes(permId) ? current.filter(p => p !== permId) : [...current, permId] };
    });
  };

  const toggleAllowedStore = (storeId: string) => {
    setEditingUser(prev => {
      const current = prev.allowedStoreIds || [];
      return { ...prev, allowedStoreIds: current.includes(storeId) ? current.filter(s => s !== storeId) : [...current, storeId] };
    });
  };

  const checkExpiry = (dateStr?: string) => {
    if (!dateStr) return { isExpired: false, daysLeft: 999 };
    const now = new Date().getTime();
    const expiry = new Date(dateStr).getTime();
    const diff = expiry - now;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return { isExpired: diff < 0, daysLeft };
  };

  const activeLicense = licenses.find(l => l.storeId === managingStoreId);
  const storeStaff = allUsers.filter(u => u.storeId === managingStoreId && u.role !== Role.ADMIN);
  const hasStaff = storeStaff.length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg flex justify-between items-center px-8">
         <div className="flex items-center space-x-3">
            <Building className="text-pink-500" size={32} />
            <div>
               <h1 className="text-xl font-bold">HỆ THỐNG KARAOKE PRO</h1>
               <p className="text-xs text-gray-400">Xin chào, {user?.name}</p>
            </div>
         </div>
         <button onClick={logout} className="flex items-center text-gray-400 hover:text-white">
           <LogOut size={20} className="mr-2"/> Đăng xuất
         </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
         <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
               <div>
                  <h2 className="text-3xl font-bold">Chọn Chi Nhánh Quản Lý</h2>
                  <p className="text-gray-400 mt-2">Vui lòng chọn một cơ sở để bắt đầu làm việc.</p>
               </div>
               {isAdmin && (
                 <div className="text-right flex items-center gap-2">
                    {/* User Management Button */}
                    <button 
                      onClick={() => { setIsUserModalOpen(true); setIsFormVisible(false); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center transition-transform hover:scale-105"
                    >
                      <Users size={20} className="mr-2" /> Quản lý Tài khoản / Nhân viên
                    </button>

                    <div className="bg-gray-800 p-2 rounded border border-gray-700 text-center">
                        <p className="text-xs text-gray-400">Đã dùng</p>
                        <p className="text-white font-bold">{visibleStores.length} / {user?.maxAllowedStores || 1}</p>
                    </div>
                    
                    <button 
                      onClick={handleOrderClick}
                      className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg flex items-center transition-transform hover:scale-105"
                    >
                      <Plus size={20} className="mr-2" /> Thêm Quán Mới
                    </button>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {visibleStores.map(store => {
                 const { isExpired, daysLeft } = checkExpiry(store.expiryDate);
                 const isLocked = store.status === 'LOCKED' || isExpired;

                 return (
                   <div key={store.id} className={`bg-gray-800 rounded-xl overflow-hidden border shadow-xl group transition-all relative flex flex-col h-full ${isLocked ? 'border-red-600 opacity-80' : 'border-gray-700 hover:border-pink-500 cursor-pointer'}`} onClick={() => !isLocked && handleSelect(store.id)}>
                      <div className="h-48 bg-gray-700 relative overflow-hidden shrink-0">
                         <img src={store.imageUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=600'} alt={store.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isLocked && 'group-hover:scale-110'}`}/>
                         <div className={`absolute inset-0 transition-colors ${isLocked ? 'bg-black/60' : 'bg-black/40 group-hover:bg-black/20'}`} />
                         <div className="absolute top-4 right-4 flex space-x-2">
                            {isLocked ? (
                               <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center shadow-lg"><Lock size={12} className="mr-1" /> {isExpired ? 'Hết hạn' : 'Đã khóa'}</span>
                            ) : (
                               <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center shadow-lg"><CheckCircle size={12} className="mr-1" /> Hoạt động</span>
                            )}
                         </div>
                         {store.expiryDate && !isLocked && (
                            <div className="absolute bottom-4 left-4">
                               <span className={`text-xs font-bold px-2 py-1 rounded flex items-center shadow-lg ${daysLeft <= 3 ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}><Calendar size={12} className="mr-1" /> Còn {daysLeft} ngày</span>
                            </div>
                         )}
                      </div>
                      <div className="p-6 relative flex flex-col flex-1">
                         <h3 className="text-xl font-bold text-white mb-2 pr-16 line-clamp-2">{store.name}</h3>
                         <div className="text-gray-400 text-sm space-y-2 mb-4 flex-1">
                            <p className="flex items-start"><MapPin size={16} className="mr-2 mt-0.5 shrink-0" /><span className="line-clamp-2">{store.address}</span></p>
                            <p className="flex items-center"><Phone size={16} className="mr-2" />{store.phone || 'Chưa cập nhật'}</p>
                         </div>
                         <button disabled={isLocked} className={`w-full py-2 rounded-lg font-bold transition-colors mt-auto ${isLocked ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-pink-600 text-white'}`}>{isLocked ? 'Vui lòng liên hệ Admin' : 'Truy cập quản lý'}</button>
                         {isAdmin && (
                           <div className="absolute top-6 right-6 flex space-x-1">
                              <button onClick={(e) => handleOpenDesktop(e, store.id)} className="p-1.5 bg-gray-600 text-white rounded hover:bg-green-600 shadow z-10" title="Kích hoạt thiết bị POS (Web)"><Monitor size={14} /></button>
                              <button onClick={(e) => handleOpenEdit(e, store)} className="p-1.5 bg-gray-600 text-white rounded hover:bg-blue-600 shadow z-10" title="Sửa thông tin"><Edit size={14} /></button>
                              <button onClick={(e) => handleOpenDelete(e, store.id)} className="p-1.5 bg-gray-600 text-white rounded hover:bg-red-600 shadow z-10" title="Xóa chi nhánh"><Trash2 size={14} /></button>
                           </div>
                         )}
                      </div>
                   </div>
                 );
               })}
            </div>
         </div>
      </div>

      {/* USER MANAGEMENT MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-5xl border border-gray-700 shadow-2xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4 shrink-0">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                        <Users className="mr-3 text-indigo-500"/> Quản lý Tài khoản Hệ thống
                    </h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden gap-6">
                    {/* List Users (Left) */}
                    <div className="w-1/3 border-r border-gray-700 pr-4 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-300">Danh sách nhân viên</h4>
                            <button onClick={() => handleOpenUserModal()} className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded font-bold shadow">
                                + Tạo mới
                            </button>
                        </div>
                        <div className="space-y-2">
                            {managedUsers.length > 0 ? managedUsers.map(u => (
                                <div key={u.id} className="bg-gray-900 p-3 rounded border border-gray-700 hover:border-indigo-500 cursor-pointer transition-colors" onClick={() => handleOpenUserModal(u)}>
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-white flex items-center">
                                            {u.name}
                                            {u.isOwner && <Star size={12} className="ml-1 text-yellow-500" fill="currentColor" />}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.role === Role.MANAGER ? 'bg-orange-900 text-orange-300' : u.role === Role.ADMIN ? 'bg-pink-900 text-pink-300' : 'bg-blue-900 text-blue-300'}`}>{u.role}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{u.username}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Chi nhánh: <span className="text-indigo-400">{visibleStores.find(s => s.id === u.storeId)?.name || 'Không xác định'}</span>
                                    </p>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-sm italic text-center pt-4">Chưa có nhân viên nào.</p>
                            )}
                        </div>
                    </div>

                    {/* Edit Form (Right) */}
                    <div className="w-2/3 overflow-y-auto bg-gray-900/30 p-4 rounded-lg">
                        {isFormVisible ? (
                            <form onSubmit={handleSaveUser} className="space-y-6 animate-fade-in">
                                <h4 className="font-bold text-xl text-white mb-2 border-b border-gray-700 pb-2">
                                    {editingUser.id ? 'Cập nhật thông tin' : 'Tạo tài khoản mới'}
                                </h4>

                                {/* Step 1: Basic Info */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Họ tên</label>
                                            <input type="text" required className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Tên đăng nhập</label>
                                            <input type="text" required className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white disabled:opacity-50" 
                                                value={editingUser.username} 
                                                onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                                                disabled={!!editingUser.id} // Username is unique ID basically
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Email</label>
                                            <input type="email" className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Số điện thoại</label>
                                            <input type="text" className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white" value={editingUser.phoneNumber} onChange={e => setEditingUser({...editingUser, phoneNumber: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Mật khẩu {editingUser.id && '(Để trống nếu không đổi)'}</label>
                                            <input type="password" required={!editingUser.id} className="w-full bg-gray-800 border border-gray-600 p-2 rounded text-white" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-indigo-400 font-bold mb-1">Thuộc Chi Nhánh (Cơ Sở)</label>
                                            <select 
                                                className="w-full bg-gray-800 border border-indigo-500 p-2 rounded text-white disabled:opacity-50" 
                                                value={editingUser.storeId} 
                                                onChange={e => setEditingUser({...editingUser, storeId: e.target.value, role: undefined, permissions: []})}
                                                disabled={editingUser.isOwner}
                                            >
                                                <option value="">-- Chọn cơ sở làm việc --</option>
                                                {visibleStores.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2: Role Selection (Only if Store Selected) */}
                                {editingUser.storeId && (
                                    <div className="border-t border-gray-700 pt-4 animate-fade-in">
                                        <label className="block text-xs text-gray-400 mb-2">Vai trò</label>
                                        <div className="flex space-x-4 mb-4">
                                            {/* Owner cannot change role to be less than Admin essentially, but keeping logic flexible */}
                                            <label className={`flex items-center cursor-pointer p-2 rounded border border-transparent hover:border-pink-500 transition-colors ${editingUser.role === Role.ADMIN ? 'bg-pink-900/30 border-pink-500' : 'bg-gray-800'}`}>
                                                <input type="radio" name="role" className="mr-2" checked={editingUser.role === Role.ADMIN} onChange={() => setEditingUser({...editingUser, role: Role.ADMIN, permissions: []})} disabled={editingUser.isOwner} /> 
                                                <span className="text-sm font-bold">Admin (Toàn quyền)</span>
                                            </label>
                                            <label className={`flex items-center cursor-pointer p-2 rounded border border-transparent hover:border-orange-500 transition-colors ${editingUser.role === Role.MANAGER ? 'bg-orange-900/30 border-orange-500' : 'bg-gray-800'}`}>
                                                <input type="radio" name="role" className="mr-2" checked={editingUser.role === Role.MANAGER} onChange={() => setEditingUser({...editingUser, role: Role.MANAGER, permissions: []})} disabled={editingUser.isOwner} /> 
                                                <span className="text-sm font-bold">Quản lý (Manager)</span>
                                            </label>
                                            <label className={`flex items-center cursor-pointer p-2 rounded border border-transparent hover:border-blue-500 transition-colors ${editingUser.role === Role.STAFF ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800'}`}>
                                                <input type="radio" name="role" className="mr-2" checked={editingUser.role === Role.STAFF} onChange={() => setEditingUser({...editingUser, role: Role.STAFF, permissions: []})} disabled={editingUser.isOwner} /> 
                                                <span className="text-sm font-bold">Nhân viên</span>
                                            </label>
                                        </div>

                                        {/* Step 3: Permissions (Only if Role Selected) */}
                                        {editingUser.role && (
                                            <div className="animate-fade-in space-y-4">
                                                {editingUser.role === Role.MANAGER && (
                                                    <div className="bg-gray-800 p-3 rounded border border-orange-700/50">
                                                        <label className="block text-xs text-orange-400 font-bold mb-2">Cho phép truy cập thêm cơ sở khác:</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {visibleStores.map(store => (
                                                                <label key={store.id} className="flex items-center space-x-2 cursor-pointer">
                                                                    <input type="checkbox" className="form-checkbox text-orange-600 rounded bg-gray-700" checked={editingUser.allowedStoreIds?.includes(store.id)} onChange={() => toggleAllowedStore(store.id)} />
                                                                    <span className="text-xs">{store.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {(editingUser.role === Role.STAFF || editingUser.role === Role.MANAGER) && (
                                                    <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                                        <label className="block text-xs text-gray-400 mb-2">Phân quyền chức năng</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {availablePermissions.map(perm => {
                                                                const isFixed = editingUser.role === Role.MANAGER && ['rooms', 'reports'].includes(perm.id);
                                                                return (
                                                                    <label key={perm.id} className={`flex items-center space-x-2 p-1 rounded ${isFixed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'}`}>
                                                                        <input type="checkbox" className="form-checkbox text-pink-600 rounded bg-gray-700" checked={isFixed || editingUser.permissions?.includes(perm.id)} onChange={() => !isFixed && togglePermission(perm.id)} disabled={isFixed} />
                                                                        <span className="text-xs">{perm.label} {isFixed && '(Cố định)'}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between space-x-3 pt-6 border-t border-gray-700 mt-auto">
                                    {editingUser.id && (
                                        !editingUser.isOwner ? (
                                            <button type="button" onClick={() => handleDeleteUser(editingUser.id!)} className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded text-sm transition-colors">Xóa tài khoản</button>
                                        ) : (
                                            <span className="text-xs text-yellow-500 italic flex items-center"><Star size={12} className="mr-1"/> Tài khoản mặc định (Không thể xóa)</span>
                                        )
                                    )}
                                    <div className="ml-auto space-x-2">
                                        <button type="button" onClick={() => setIsFormVisible(false)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy</button>
                                        <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold shadow-lg transition-transform hover:scale-105" disabled={!editingUser.storeId || !editingUser.role}>
                                            Lưu Thông Tin
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <Users size={64} className="mb-4 opacity-50"/>
                                <p className="text-lg font-medium">Chọn một nhân viên để chỉnh sửa</p>
                                <p className="text-sm mt-1">hoặc nhấn nút <strong className="text-green-500">+ Tạo mới</strong></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* POS DEVICE ACTIVATION MODAL (WEB VERSION) */}
      {isDesktopModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
           <div className="bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                 <h3 className="text-2xl font-bold text-white flex items-center">
                    <Monitor className="mr-3 text-green-500" /> Kích hoạt thiết bị POS (Web)
                 </h3>
                 <button onClick={() => setIsDesktopModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
              </div>

              <div className="space-y-8">
                 {/* Step 1: Staff Check */}
                 <div className={`p-4 rounded border ${hasStaff ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
                    <h4 className={`font-bold flex items-center ${hasStaff ? 'text-green-400' : 'text-red-400'}`}>
                       {hasStaff ? <CheckCircle size={18} className="mr-2"/> : <AlertTriangle size={18} className="mr-2"/>}
                       Bước 1: Kiểm tra tài khoản nhân viên
                    </h4>
                    {hasStaff ? (
                       <p className="text-sm text-gray-400 mt-1 ml-6">Đã có {storeStaff.length} tài khoản nhân viên. Đủ điều kiện tạo Key.</p>
                    ) : (
                       <div className="ml-6 mt-1">
                          <p className="text-sm text-gray-300">Cửa hàng chưa có tài khoản nhân viên nào.</p>
                          <p className="text-xs text-gray-400 mt-1 mb-2">Bạn cần tạo ít nhất 1 tài khoản nhân viên trước khi cài đặt máy trạm.</p>
                          <button onClick={() => { setIsDesktopModalOpen(false); setIsUserModalOpen(true); setIsFormVisible(false); }} className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center">
                             <UserPlus size={14} className="mr-1"/> Quản lý nhân sự ngay
                          </button>
                       </div>
                    )}
                 </div>

                 {/* Step 2: License Creation */}
                 {hasStaff && !activeLicense && (
                    <div className="p-4 rounded border bg-gray-800 border-gray-600">
                       <h4 className="font-bold text-orange-400 flex items-center mb-2">
                          <Key size={18} className="mr-2"/> Bước 2: Tạo Key kích hoạt
                       </h4>
                       <p className="text-sm text-gray-400 mb-3 ml-6">
                          Mỗi quán chỉ được tạo <strong>1 Key duy nhất</strong>. Key này sẽ khóa vào máy tính/trình duyệt đầu tiên đăng nhập.
                       </p>
                       <div className="ml-6 flex space-x-2">
                          <input 
                            type="text" 
                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white outline-none"
                            placeholder="Đặt tên máy (VD: Máy Thu Ngân 01)"
                            value={newDeviceName}
                            onChange={(e) => setNewDeviceName(e.target.value)}
                          />
                          <button 
                            onClick={handleCreateLicense}
                            disabled={!newDeviceName}
                            className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white px-4 py-2 rounded font-bold whitespace-nowrap"
                          >
                            Tạo Key Ngay
                          </button>
                       </div>
                    </div>
                 )}

                 {/* Step 3: Info */}
                 {activeLicense && (
                    <div className="space-y-4 animate-fade-in">
                       <div className="bg-gray-900 p-4 rounded border border-green-600/50">
                          <h4 className="font-bold text-green-400 flex items-center mb-2">
                             <CheckCircle size={18} className="mr-2"/> Key đã được tạo thành công
                          </h4>
                          <div className="flex items-center bg-black/50 p-3 rounded mb-2">
                             <Key size={20} className="text-yellow-500 mr-3 shrink-0" />
                             <span className="font-mono text-xl text-yellow-400 select-all font-bold tracking-wider">{activeLicense.licenseKey}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                             <span>Thiết bị: {activeLicense.deviceName}</span>
                             <span>Trạng thái: {activeLicense.status === 'ACTIVE' ? '🟢 Đang dùng' : '⚪ Chưa dùng'}</span>
                          </div>
                          <div className="mt-2 text-right">
                             <button onClick={() => { if(confirm("Hủy Key này? Bạn sẽ cần tạo lại Key mới để cài đặt.")) revokeLicense(activeLicense.id); }} className="text-red-500 text-xs hover:underline">Hủy Key & Tạo lại</button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* CREATE STORE MODAL (FREE TRIAL) */}
      {isCreateStoreModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
           <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
              <div className="text-center mb-6">
                 <Building size={48} className="text-green-500 mx-auto mb-2" />
                 <h3 className="text-2xl font-bold text-white">Khởi tạo gian hàng mới</h3>
                 <p className="text-green-400 font-bold mt-1">Được cấp phép bởi Admin</p>
              </div>
              
              <form onSubmit={handleCreateStore} className="space-y-4">
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Tên quán Karaoke</label>
                    <input 
                      required autoFocus
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-green-500 outline-none"
                      placeholder="Ví dụ: Karaoke 123"
                      value={newStoreData.name}
                      onChange={e => setNewStoreData({...newStoreData, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Địa chỉ (Tùy chọn)</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-green-500 outline-none"
                      value={newStoreData.address}
                      onChange={e => setNewStoreData({...newStoreData, address: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Số điện thoại (Tùy chọn)</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-green-500 outline-none"
                      value={newStoreData.phone}
                      onChange={e => setNewStoreData({...newStoreData, phone: e.target.value})}
                      placeholder="09xxx"
                    />
                 </div>

                 <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={() => setIsCreateStoreModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy</button>
                    <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg">
                      Tạo Ngay
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Contact Admin Modal (Quota Exceeded) */}
      {contactAdminModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
           <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl text-center">
              <Building size={48} className="text-pink-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Đã Đạt Giới Hạn Quán</h3>
              <p className="text-gray-300 mb-6">
                 Bạn đã sử dụng hết số lượng quán được cấp phép ({user?.maxAllowedStores}). 
                 Vui lòng liên hệ Admin để mua thêm gói mở rộng.
              </p>
              
              <div className="bg-gray-900 p-4 rounded-lg text-left mb-6">
                 <p className="text-sm text-gray-400 mb-1">Hotline hỗ trợ:</p>
                 <p className="text-xl font-bold text-white">0909.888.999</p>
                 <p className="text-sm text-gray-400 mt-2 mb-1">Email kinh doanh:</p>
                 <p className="text-white font-bold">sales@karaokepro.vn</p>
              </div>

              <button 
                onClick={() => setContactAdminModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-bold"
              >
                Đã hiểu
              </button>
           </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
           <div className="bg-gray-800 p-8 rounded-xl w-full max-w-lg border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold text-white">Cập nhật Chi Nhánh</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
              </div>
              <form onSubmit={handleSaveStore} className="space-y-4">
                 {/* Image Upload */}
                 <div>
                    <label className="block text-sm text-gray-400 mb-2">Hình ảnh đại diện</label>
                    <div 
                      className="border-2 border-dashed border-gray-600 rounded-lg h-40 flex items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-gray-750 transition-colors relative overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {editingStore.imageUrl ? (
                        <div className="relative w-full h-full group">
                           <img src={editingStore.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-bold flex flex-col items-center">
                                <Upload size={20} className="mb-1" /> Thay đổi
                              </span>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                           <ImageIcon size={32} className="mx-auto mb-2" />
                           <span className="text-xs">Tải ảnh lên</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Tên quán / Chi nhánh</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-pink-500 outline-none"
                      value={editingStore.name || ''}
                      onChange={e => setEditingStore({...editingStore, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Địa chỉ</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-pink-500 outline-none"
                      value={editingStore.address || ''}
                      onChange={e => setEditingStore({...editingStore, address: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Số điện thoại</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-pink-500 outline-none"
                      value={editingStore.phone || ''}
                      onChange={e => setEditingStore({...editingStore, phone: e.target.value})}
                      placeholder="09xxx"
                    />
                 </div>
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Trạng thái</label>
                    <select 
                       className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white focus:border-pink-500 outline-none"
                       value={editingStore.status || 'ACTIVE'}
                       onChange={e => setEditingStore({...editingStore, status: e.target.value as any})}
                    >
                       <option value="ACTIVE">Hoạt động</option>
                       <option value="LOCKED">Tạm khóa</option>
                       <option value="MAINTENANCE">Bảo trì</option>
                    </select>
                 </div>

                 <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Hủy</button>
                    <button type="submit" className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold shadow-lg">Lưu thay đổi</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-red-600/50 shadow-2xl">
            <div className="text-center mb-4">
              <div className="mx-auto bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Xóa Chi Nhánh?</h3>
              <p className="text-gray-300 text-sm">
                Bạn có chắc chắn muốn xóa chi nhánh này?<br/>
                <strong className="text-red-400">Toàn bộ dữ liệu (Phòng, Kho, Báo cáo)</strong> của chi nhánh sẽ bị mất vĩnh viễn.
              </p>
            </div>
            <div className="flex justify-center space-x-3 mt-6">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};