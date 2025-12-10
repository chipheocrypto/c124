
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { Room, RoomStatus, Role } from '../types';
import { Mic2, Music, CheckCircle, AlertTriangle, XCircle, Clock, Move, Plus, Edit, Trash2, Image as ImageIcon, Upload, Banknote } from 'lucide-react';

interface DashboardProps {
  onSelectRoom: (roomId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectRoom }) => {
  const { rooms, updateRoomStatus, startSession, activeOrders, user, addRoom, updateRoomInfo, deleteRoom, forceEndSession, currentStore } = useApp();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: string } | null>(null);
  
  // Edit/Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room>>({
    name: '', type: 'NORMAL', hourlyRate: 150000, imageUrl: ''
  });
  
  // Delete Confirmation State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer to force re-render minutes every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000); // Update UI every minute
    return () => clearInterval(timer);
  }, []);

  const isAdmin = user?.role === Role.ADMIN;

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE: return 'border-green-600 shadow-green-900/20';
      case RoomStatus.OCCUPIED: return 'border-red-600 shadow-red-900/20 animate-pulse-border';
      case RoomStatus.PAYMENT: return 'border-blue-500 shadow-blue-900/20'; // Xanh dương cho đang thanh toán
      case RoomStatus.CLEANING: return 'border-yellow-500 shadow-yellow-900/20';
      case RoomStatus.ERROR: return 'border-gray-600 bg-gray-900';
      default: return 'border-gray-700';
    }
  };

  const getStatusText = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE: return 'TRỐNG';
      case RoomStatus.OCCUPIED: return 'ĐANG HÁT';
      case RoomStatus.PAYMENT: return 'THANH TOÁN';
      case RoomStatus.CLEANING: return 'DỌN DẸP';
      case RoomStatus.ERROR: return 'BẢO TRÌ';
      default: return '';
    }
  };

  const getStatusBadgeStyle = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE: return 'text-green-500 border-green-500';
      case RoomStatus.OCCUPIED: return 'text-red-500 border-red-500 animate-pulse';
      case RoomStatus.PAYMENT: return 'text-blue-500 border-blue-500';
      case RoomStatus.CLEANING: return 'text-yellow-500 border-yellow-500';
      case RoomStatus.ERROR: return 'text-gray-400 border-gray-500';
      default: return 'text-white border-white';
    }
  };

  const handleRightClick = (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, roomId });
  };

  const handleStatusChange = (newStatus: RoomStatus) => {
    if (!contextMenu) return;
    const roomId = contextMenu.roomId;
    const room = rooms.find(r => r.id === roomId);

    if (room) {
      // Nếu phòng đang hát hoặc đang thanh toán mà người dùng ép đổi trạng thái -> Cảnh báo
      if ((room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.PAYMENT) && 
          newStatus !== RoomStatus.OCCUPIED && newStatus !== RoomStatus.PAYMENT) {
        
        const confirmChange = window.confirm(
          "CẢNH BÁO: Phòng này đang hoạt động hoặc đang thanh toán!\n\nHành động này sẽ HỦY phiên hát hiện tại và đặt lại trạng thái phòng.\nBạn có chắc chắn muốn tiếp tục?"
        );
        if (confirmChange) {
          forceEndSession(roomId, newStatus);
        }
      } else {
        // Các trường hợp khác đổi bình thường
        updateRoomStatus(roomId, newStatus);
      }
    }
    setContextMenu(null);
  };

  const handleRoomClick = (roomId: string, status: RoomStatus) => {
    if (status === RoomStatus.AVAILABLE) {
      startSession(roomId);
      onSelectRoom(roomId);
    } else if (status === RoomStatus.OCCUPIED || status === RoomStatus.PAYMENT) {
      // Cho phép mở lại POS kể cả khi đang thanh toán để hoàn tất
      onSelectRoom(roomId);
    } else if (status === RoomStatus.CLEANING) {
       alert("Phòng đang dọn dẹp. Click chuột phải chọn 'Đã xong' sau khi dọn phòng xong.");
    }
  };

  // CRUD Handlers
  const handleOpenAdd = () => {
    setEditingRoom({ name: '', type: 'NORMAL', hourlyRate: 150000, imageUrl: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!contextMenu) return;
    const room = rooms.find(r => r.id === contextMenu.roomId);
    if (room) {
      setEditingRoom(room);
      setIsModalOpen(true);
    }
    setContextMenu(null);
  };

  const handleDeleteClick = (roomId: string) => {
    // Close context menu first
    setContextMenu(null);
    // Open Confirmation Modal
    setDeleteConfirmationId(roomId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmationId) {
        deleteRoom(deleteConfirmationId);
        setDeleteConfirmationId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingRoom(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom.name || !editingRoom.hourlyRate) return;
    if (!currentStore) return;

    if (editingRoom.id) {
      // Update
      updateRoomInfo(editingRoom as Room);
    } else {
      // Add
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        storeId: currentStore.id,
        name: editingRoom.name!,
        type: editingRoom.type as 'VIP' | 'NORMAL',
        hourlyRate: Number(editingRoom.hourlyRate),
        status: RoomStatus.AVAILABLE,
        imageUrl: editingRoom.imageUrl
      };
      addRoom(newRoom);
    }
    setIsModalOpen(false);
  };

  // Close context menu on click elsewhere
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <Music className="mr-3 text-pink-500" /> Sơ đồ phòng
        </h2>
        {isAdmin && (
          <button 
            onClick={handleOpenAdd}
            className="flex items-center bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
          >
            <Plus className="mr-2" size={20} /> Thêm Phòng
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {rooms.map(room => {
          const order = activeOrders[room.id];
          // Calculate minutes elapsed. Renders every minute due to 'tick' state
          const duration = order ? Math.floor((Date.now() - order.startTime) / 60000) : 0;

          return (
            <div
              key={room.id}
              onClick={() => handleRoomClick(room.id, room.status)}
              onContextMenu={(e) => handleRightClick(e, room.id)}
              className={`
                relative h-40 rounded-2xl shadow-xl cursor-pointer transition-all transform hover:scale-[1.03]
                overflow-hidden border-2 flex flex-col justify-between group
                ${getStatusColor(room.status)}
              `}
            >
              {/* Background Image */}
              {room.imageUrl ? (
                 <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 opacity-40"
                  style={{ backgroundImage: `url(${room.imageUrl})` }}
                 />
              ) : (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center opacity-50">
                   <Mic2 size={48} className="text-gray-600" />
                </div>
              )}
              
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60"></div>

              {/* Badges */}
              <div className="absolute top-2 right-2 z-10">
                 <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-600">
                  {room.type}
                 </span>
              </div>
              
              {/* CENTERED STATUS TEXT */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                 <span className={`text-xl font-black uppercase tracking-widest border-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-black/40 shadow-lg ${getStatusBadgeStyle(room.status)}`}>
                    {getStatusText(room.status)}
                 </span>
              </div>

              {/* Content Footer */}
              <div className="relative z-10 p-3 w-full mt-auto">
                <div className="flex justify-between items-end">
                   <div>
                     <h3 className="text-xl font-bold text-white leading-none mb-1 shadow-black drop-shadow-md">{room.name}</h3>
                     <p className="text-gray-300 text-[10px] font-medium">{Math.round(room.hourlyRate/1000)}k/h</p>
                   </div>
                   {(room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.PAYMENT) && (
                      <div className="flex items-center text-yellow-400 font-mono font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm text-sm">
                        <Clock size={12} className="mr-1" />
                        {duration}p
                      </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 max-w-2xl">
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-green-600 rounded mr-2"></div> Trống
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-red-600 rounded mr-2"></div> Đang hát
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div> Đang thanh toán
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div> Chờ dọn
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <div className="w-4 h-4 bg-gray-700 border border-gray-600 rounded mr-2"></div> Bảo trì
        </div>
      </div>

      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-gray-800 border border-gray-700 shadow-2xl rounded-lg py-2 z-50 w-56"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">Đổi trạng thái</div>
          <button onClick={() => handleStatusChange(RoomStatus.AVAILABLE)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-green-400 flex items-center">
            <CheckCircle size={16} className="mr-2" /> Đã xong / Trống
          </button>
          <button onClick={() => handleStatusChange(RoomStatus.CLEANING)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-yellow-400 flex items-center">
            <Move size={16} className="mr-2" /> Cần dọn dẹp
          </button>
           <button onClick={() => handleStatusChange(RoomStatus.ERROR)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-500 flex items-center">
            <XCircle size={16} className="mr-2" /> Báo lỗi / Hỏng
          </button>

          {isAdmin && (
            <>
              <div className="border-t border-gray-700 my-1"></div>
              <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">Quản lý</div>
              <button onClick={handleOpenEdit} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-blue-400 flex items-center">
                <Edit size={16} className="mr-2" /> Sửa thông tin
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(contextMenu.roomId); }} 
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400 flex items-center cursor-pointer"
              >
                <Trash2 size={16} className="mr-2" /> Xóa phòng
              </button>
            </>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-white">
              {editingRoom.id ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}
            </h3>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tên phòng</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none" 
                  value={editingRoom.name} 
                  onChange={e => setEditingRoom({...editingRoom, name: e.target.value})} 
                  placeholder="Ví dụ: Phòng 10"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Loại phòng</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none"
                    value={editingRoom.type} 
                    onChange={e => setEditingRoom({...editingRoom, type: e.target.value as any})}
                  >
                    <option value="NORMAL">Thường (Normal)</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Giá giờ (VND)</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none" 
                    value={editingRoom.hourlyRate === 0 ? '' : editingRoom.hourlyRate} 
                    onChange={e => setEditingRoom({...editingRoom, hourlyRate: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Hình ảnh phòng</label>
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-pink-500 hover:bg-gray-750 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {editingRoom.imageUrl ? (
                    <div className="relative">
                      <img src={editingRoom.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded">
                        <span className="text-white font-bold flex items-center">
                          <Upload size={20} className="mr-2" /> Đổi ảnh
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-gray-400">
                      <ImageIcon size={40} className="mb-2" />
                      <span>Nhấn để tải ảnh lên</span>
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

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-bold shadow-lg"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-red-500/50 shadow-2xl">
            <div className="text-center mb-4">
              <div className="mx-auto bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Xóa Phòng?</h3>
              <p className="text-gray-300 text-sm">
                Bạn có chắc chắn muốn xóa phòng này khỏi hệ thống?<br/>Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-center space-x-3 mt-6">
              <button 
                onClick={() => setDeleteConfirmationId(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg transition-colors"
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
