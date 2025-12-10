
import React from 'react';
import { useApp } from '../store';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  FileBarChart, 
  Settings, 
  LogOut,
  Mic2,
  Grid,
  Store,
  Receipt,
  X,
  ReceiptText,
  Database
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  isOpen: boolean; // Mobile state
  onClose: () => void; // Close mobile sidebar
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, isOpen, onClose }) => {
  const { user, logout, selectStore, currentStore, billRequests } = useApp();

  const pendingRequests = billRequests.filter(r => r.status === 'PENDING').length;

  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'rooms', label: 'Sơ đồ phòng', icon: Grid },
    { id: 'bills', label: 'Hóa đơn & Duyệt', icon: ReceiptText, badge: pendingRequests > 0 && user?.role !== Role.STAFF ? pendingRequests : 0 },
    { id: 'inventory', label: 'Kho hàng', icon: ShoppingBag },
    { id: 'import-data', label: 'Data Nhập Hàng', icon: Database }, // NEW
    { id: 'daily-expenses', label: 'Sổ Chi Tiêu', icon: Receipt },
    { id: 'staff', label: 'Nhân sự', icon: Users },
    { id: 'reports', label: 'Báo cáo', icon: FileBarChart },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  const checkPermission = (itemId: string) => {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    const perms = user.permissions || [];

    switch (itemId) {
      case 'overview': return false; // Chỉ Admin mới xem Tổng quan Dashboard
      case 'rooms': return perms.includes('pos') || perms.includes('rooms');
      case 'bills': return perms.includes('bills'); // Strict check for Bills permission
      
      // Update new separated permissions
      case 'inventory': return perms.includes('inventory');
      case 'import-data': return perms.includes('import_data'); // New perm ID
      case 'daily-expenses': return perms.includes('daily_expenses'); // New perm ID
      
      case 'staff': return perms.includes('staff');
      case 'reports': return perms.includes('reports');
      case 'settings': return perms.includes('settings');
      default: return false;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 h-screen flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-pink-500 font-bold text-2xl mb-1">
            <Mic2 size={32} />
            <span>KaraokePro</span>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        {currentStore && (
          <div className="px-6 mb-4">
             <p className="text-xs text-gray-400 truncate pl-1 border-l-2 border-pink-500">{currentStore.name}</p>
          </div>
        )}

        <div className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => {
            if (!checkPermission(item.id)) return null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  onClose(); // Close sidebar on mobile when clicked
                }}
                className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                  currentPage === item.id 
                    ? 'bg-pink-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-700 space-y-2 bg-gray-800">
           {user?.role === Role.ADMIN && (
             <button 
              onClick={() => selectStore('')}
              className="flex items-center space-x-3 w-full p-2 text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Store size={20} />
              <span>Đổi cửa hàng</span>
            </button>
           )}

          <div className="mb-2 px-2 pt-2 border-t border-gray-700">
            <p className="text-sm text-gray-400">Đăng nhập bởi</p>
            <p className="font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-pink-400">
              {user?.role === Role.ADMIN ? 'Quản Lý Cấp Cao' : (user?.role === Role.MANAGER ? 'Quản Lý' : 'Nhân Viên')}
            </p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center space-x-3 w-full p-2 text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </>
  );
};
