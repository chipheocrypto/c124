
import React, { useState, useRef } from 'react';
import { useApp } from '../../store';
import { Product, Role } from '../../types';
import { Search, Plus, Edit, Trash2, Package, X, Image as ImageIcon, Upload, List, Archive, DollarSign, TrendingUp, Scale } from 'lucide-react';

export const Inventory = () => {
  const { products, user, addProduct, updateProduct, deleteProduct, addPurchaseInvoice, settings, updateSettings } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  
  // Restock Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<Product | null>(null);
  const [restockForm, setRestockForm] = useState({
      quantity: 1,
      totalMoney: 0,
      newSellPrice: 0 // Giá bán mới
  });
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    name: '', category: settings.productCategories[0] || 'Đồ uống', costPrice: 0, sellPrice: 0, stock: 0, unit: 'Lon', isTimeBased: false
  });
  
  // Management States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', ...settings.productCategories];
  const filteredProducts = products.filter(p => 
    (filterCategory === 'All' || p.category === filterCategory) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cấp full quyền cho tất cả các vai trò truy cập được trang này (Admin, Manager, Staff)
  const canManage = true; 

  const handleOpenAdd = () => {
    setEditingProduct({
        name: '', category: settings.productCategories[0] || 'Đồ uống', costPrice: 0, sellPrice: 0, stock: 0, unit: settings.availableUnits[0] || 'Lon', isTimeBased: false
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setIsProductModalOpen(true);
  };

  const handleDelete = (id: string) => {
      deleteProduct(id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProduct.name) return;
      
      if (editingProduct.id) {
          updateProduct(editingProduct as Product);
      } else {
          // Khi tạo mới, các giá trị số để 0 nếu không nhập
          addProduct({
              ...editingProduct,
              id: `prod-${Date.now()}`,
              stock: 0, // Mặc định 0, nhập sau
              costPrice: 0, 
              sellPrice: editingProduct.sellPrice || 0
          } as Product);
      }
      setIsProductModalOpen(false);
  };

  // --- Restock Logic (Thêm đồ) ---
  const handleOpenRestock = (product: Product) => {
      setImportTarget(product);
      setRestockForm({
          quantity: 1,
          totalMoney: 0,
          newSellPrice: product.sellPrice // Lấy giá bán hiện tại
      });
      setIsRestockModalOpen(true);
  };

  const handleSaveRestock = (e: React.FormEvent) => {
      e.preventDefault();
      if (!importTarget) return;

      if (restockForm.quantity <= 0) {
          alert("Số lượng phải lớn hơn 0");
          return;
      }

      // Tính giá vốn đơn vị
      const unitCost = restockForm.totalMoney / restockForm.quantity;

      addPurchaseInvoice({
          invoiceCode: `TM-${Date.now()}`,
          supplier: 'Mua thêm nhanh',
          items: [{
              productId: importTarget.id,
              quantity: restockForm.quantity,
              price: unitCost,
              newSellPrice: restockForm.newSellPrice
          }]
      });

      setIsRestockModalOpen(false);
  };

  // --- Category Management ---
  const handleAddCategory = () => {
    if (newCategoryName && !settings.productCategories.includes(newCategoryName)) {
      updateSettings({ productCategories: [...settings.productCategories, newCategoryName] });
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    updateSettings({ productCategories: settings.productCategories.filter(c => c !== cat) });
  };

  // --- Unit Management ---
  const handleAddUnit = () => {
    if (newUnitName && !settings.availableUnits.includes(newUnitName)) {
      updateSettings({ availableUnits: [...settings.availableUnits, newUnitName] });
      setNewUnitName('');
    }
  };

  const handleDeleteUnit = (unit: string) => {
    updateSettings({ availableUnits: settings.availableUnits.filter(u => u !== unit) });
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
        {/* Header and filters */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white flex items-center">
                <Package className="mr-3 text-pink-500" /> Kho Hàng
            </h2>
            {canManage && (
                <button 
                    onClick={handleOpenAdd}
                    className="flex items-center bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg"
                >
                    <Plus className="mr-2" size={20} /> Thêm Sản Phẩm
                </button>
            )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm sản phẩm..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-pink-500"
                />
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                            filterCategory === cat ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Product Table */}
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
            <table className="w-full text-left">
                <thead className="bg-gray-750 text-gray-300 uppercase text-xs font-bold">
                    <tr>
                        <th className="p-4">Sản phẩm</th>
                        <th className="p-4 text-center">Danh mục</th>
                        <th className="p-4 text-center">Đơn vị</th>
                        {/* Cost Price Column */}
                        {canManage && <th className="p-4 text-right">Giá vốn</th>}
                        <th className="p-4 text-right">Giá bán</th>
                        <th className="p-4 text-center bg-gray-700/50">Tồn kho</th>
                        {canManage && <th className="p-4 text-center">Nhập Hàng</th>}
                        {canManage && <th className="p-4 text-right">Quản lý</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-sm">
                    {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-750 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center mr-3 overflow-hidden">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package size={20} className="text-gray-500" />
                                        )}
                                    </div>
                                    <p className="font-bold text-white">{p.name}</p>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">
                                    {p.category}
                                </span>
                            </td>
                            <td className="p-4 text-center text-gray-400">
                                {p.unit}
                            </td>
                            {/* Cost Price */}
                            {canManage && (
                                <td className="p-4 text-right text-gray-400">
                                    {p.isTimeBased ? '-' : Math.round(p.costPrice).toLocaleString()}
                                </td>
                            )}
                            <td className="p-4 text-right font-bold text-pink-400">
                                {p.sellPrice.toLocaleString()}
                            </td>
                            
                            {/* Stock Column */}
                            <td className="p-4 text-center bg-gray-700/30">
                                {p.isTimeBased ? (
                                    <span className="text-blue-400 text-xs font-bold">Vô hạn</span>
                                ) : (
                                    <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                                        p.stock <= settings.lowStockThreshold 
                                            ? 'bg-red-900 text-red-200 animate-pulse' 
                                            : 'bg-green-900 text-green-200'
                                    }`}>
                                        {p.stock}
                                    </span>
                                )}
                            </td>
                            
                            {/* Action: Import Price / Stock */}
                            {canManage && (
                                <td className="p-4 text-center">
                                    {!p.isTimeBased && (
                                        <button 
                                            onClick={() => handleOpenRestock(p)}
                                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold shadow flex items-center justify-center mx-auto transition-transform hover:scale-105"
                                        >
                                            <DollarSign size={14} className="mr-1" /> Nhập Giá/Hàng
                                        </button>
                                    )}
                                </td>
                            )}

                            {/* Actions: Edit/Delete */}
                            {canManage && (
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button 
                                            onClick={() => handleOpenEdit(p)}
                                            className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"
                                            title="Sửa"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                        <tr>
                            <td colSpan={canManage ? 8 : 7} className="p-8 text-center text-gray-500">
                                Không tìm thấy sản phẩm nào.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Restock Modal (Nhập hàng & Giá) */}
        {isRestockModalOpen && importTarget && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <Archive className="mr-2 text-green-500"/> Nhập Hàng: {importTarget.name}
                        </h3>
                        <button onClick={() => setIsRestockModalOpen(false)} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSaveRestock} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Số lượng cần thêm ({importTarget.unit})</label>
                            <input 
                                type="number" required min="1" autoFocus
                                className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white outline-none focus:border-green-500 text-lg"
                                value={restockForm.quantity}
                                onChange={(e) => setRestockForm({...restockForm, quantity: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tổng tiền nhập hàng (VNĐ)</label>
                            <input 
                                type="number" required min="0"
                                className="w-full bg-gray-900 border border-gray-600 p-3 rounded text-white outline-none focus:border-green-500 text-lg font-bold text-green-400"
                                value={restockForm.totalMoney === 0 ? '' : restockForm.totalMoney}
                                onChange={(e) => setRestockForm({...restockForm, totalMoney: Number(e.target.value)})}
                                placeholder="Ví dụ: 200,000"
                            />
                        </div>

                        {/* Calculated Unit Cost */}
                        <div className="bg-gray-900/50 p-3 rounded border border-gray-600 flex justify-between items-center">
                            <span className="text-xs text-gray-400">Giá vốn đơn vị:</span>
                            <span className="text-yellow-400 font-bold text-lg">
                                {restockForm.quantity > 0 ? Math.round(restockForm.totalMoney / restockForm.quantity).toLocaleString() : 0} 
                                <span className="text-xs text-gray-500 font-normal ml-1">đ/{importTarget.unit}</span>
                            </span>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1 flex items-center">
                                <TrendingUp size={14} className="mr-1 text-pink-500"/> Giá bán lẻ (VNĐ)
                            </label>
                            <input 
                                type="number" required min="0"
                                className="w-full bg-gray-900 border border-pink-500/50 p-3 rounded text-white outline-none focus:border-pink-500 text-lg font-bold text-pink-400"
                                value={restockForm.newSellPrice === 0 ? '' : restockForm.newSellPrice}
                                onChange={(e) => setRestockForm({...restockForm, newSellPrice: Number(e.target.value)})}
                                placeholder="Giá bán cho khách"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                            <button 
                                type="button" 
                                onClick={() => setIsRestockModalOpen(false)} 
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Add/Edit Product Modal */}
        {isProductModalOpen && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                        <h3 className="text-xl font-bold text-white">
                            {editingProduct.id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
                        </h3>
                        <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div className="flex gap-6">
                            {/* Image Upload Column */}
                            <div className="w-1/3">
                                <label className="block text-sm text-gray-400 mb-2">Hình ảnh</label>
                                <div 
                                    className="border-2 border-dashed border-gray-600 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-gray-750 transition-colors relative overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {editingProduct.imageUrl ? (
                                        <>
                                            <img src={editingProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs font-bold flex flex-col items-center">
                                                    <Upload size={20} className="mb-1" /> Đổi ảnh
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-gray-500">
                                            <ImageIcon size={32} className="mx-auto mb-2" />
                                            <span className="text-xs">Tải ảnh</span>
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

                            {/* Info Column */}
                            <div className="w-2/3 space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Tên sản phẩm</label>
                                    <input 
                                        required 
                                        type="text" 
                                        className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none" 
                                        value={editingProduct.name} 
                                        onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                                        placeholder="Ví dụ: Bia Tiger"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Danh mục</label>
                                        <select 
                                            className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none"
                                            value={editingProduct.category}
                                            onChange={(e) => {
                                                if (e.target.value === 'MANAGE_CATEGORIES') {
                                                    setIsCategoryModalOpen(true);
                                                } else {
                                                    setEditingProduct({...editingProduct, category: e.target.value});
                                                }
                                            }}
                                        >
                                            {settings.productCategories.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                            <option value="MANAGE_CATEGORIES" className="text-pink-400 font-bold bg-gray-800">
                                                ⚙️ Quản lý hạng mục...
                                            </option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Đơn vị bán</label>
                                        <select 
                                            className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-pink-500 outline-none"
                                            value={editingProduct.unit}
                                            onChange={(e) => {
                                                if (e.target.value === 'MANAGE_UNITS') {
                                                    setIsUnitModalOpen(true);
                                                } else {
                                                    setEditingProduct({...editingProduct, unit: e.target.value});
                                                }
                                            }}
                                        >
                                            {settings.availableUnits.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                            <option value="MANAGE_UNITS" className="text-pink-400 font-bold bg-gray-800">
                                                ⚙️ Quản lý đơn vị...
                                            </option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 pt-2 bg-gray-900/50 p-3 rounded border border-gray-700">
                                    <input 
                                        type="checkbox" 
                                        id="isTimeBased"
                                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-pink-600 focus:ring-pink-500"
                                        checked={editingProduct.isTimeBased}
                                        onChange={e => setEditingProduct({...editingProduct, isTimeBased: e.target.checked})}
                                    />
                                    <label htmlFor="isTimeBased" className="text-sm text-gray-300 font-bold cursor-pointer">
                                        Dịch vụ tính theo giờ (Ví dụ: Nhân viên, Nhạc công)
                                    </label>
                                </div>

                                {/* Conditional Price Input */}
                                {editingProduct.isTimeBased ? (
                                    <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/50 animate-fade-in">
                                        <label className="block text-sm text-indigo-300 mb-1 font-bold">Giá mỗi giờ (VNĐ)</label>
                                        <input 
                                            required 
                                            type="number" 
                                            className="w-full bg-gray-900 border border-indigo-500 p-2 rounded text-white focus:border-indigo-400 outline-none font-bold" 
                                            value={editingProduct.sellPrice === 0 ? '' : editingProduct.sellPrice} 
                                            onChange={e => setEditingProduct({...editingProduct, sellPrice: Number(e.target.value)})} 
                                            placeholder="300,000"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-500 italic p-2">
                                        * Giá vốn, Giá bán lẻ và Số lượng tồn kho sẽ được cập nhật khi bạn thực hiện <strong>Nhập Hàng</strong>.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                            <button 
                                type="button" 
                                onClick={() => setIsProductModalOpen(false)} 
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold shadow-lg"
                            >
                                Lưu
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Category Management Modal */}
        {isCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <List className="mr-2"/> Quản lý Hạng Mục
                        </h3>
                        <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                    </div>
                    
                    <div className="flex mb-4">
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-l p-2 text-white outline-none focus:border-pink-500"
                            placeholder="Nhập tên hạng mục..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button 
                            onClick={handleAddCategory}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-r font-bold"
                        >
                            Thêm
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {settings.productCategories.map(cat => (
                            <div key={cat} className="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-700">
                                <span className="text-white">{cat}</span>
                                <button 
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="text-red-500 hover:text-red-400 p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 pt-2 border-t border-gray-700 text-right">
                        <button onClick={() => setIsCategoryModalOpen(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Unit Management Modal */}
        {isUnitModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <Scale className="mr-2"/> Quản lý Đơn Vị Tính
                        </h3>
                        <button onClick={() => setIsUnitModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                    </div>
                    
                    <div className="flex mb-4">
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-900 border border-gray-600 rounded-l p-2 text-white outline-none focus:border-pink-500"
                            placeholder="Nhập tên đơn vị..."
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                        />
                        <button 
                            onClick={handleAddUnit}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-r font-bold"
                        >
                            Thêm
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {settings.availableUnits.map(unit => (
                            <div key={unit} className="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-700">
                                <span className="text-white">{unit}</span>
                                <button 
                                    onClick={() => handleDeleteUnit(unit)}
                                    className="text-red-500 hover:text-red-400 p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 pt-2 border-t border-gray-700 text-right">
                        <button onClick={() => setIsUnitModalOpen(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};