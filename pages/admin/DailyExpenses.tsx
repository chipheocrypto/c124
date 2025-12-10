
import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { DailyExpense } from '../../types';
import { Plus, Trash2, Calendar, Save, Receipt } from 'lucide-react';

export const DailyExpenses = () => {
  const { dailyExpenses, addDailyExpense, updateDailyExpense, deleteDailyExpense, currentStore } = useApp();
  
  // Date Picker State (Defaults to Today - Local Time)
  const [selectedDate, setSelectedDate] = useState(() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  });

  // Filter expenses by selected date
  const expensesForDate = useMemo(() => {
    return dailyExpenses.filter(e => e.date === selectedDate);
  }, [dailyExpenses, selectedDate]);

  // Handlers
  const handleAddRow = () => {
    if (!currentStore) return;
    const newExpense: DailyExpense = {
      id: `exp-${Date.now()}`,
      storeId: currentStore.id,
      date: selectedDate,
      description: '',
      amount: 0,
      type: 'PURCHASE', // Default type
      timestamp: Date.now()
    };
    addDailyExpense(newExpense);
  };

  const handleUpdateRow = (id: string, field: keyof DailyExpense, value: any) => {
    const exp = dailyExpenses.find(e => e.id === id);
    if (exp) {
      updateDailyExpense({ ...exp, [field]: value });
    }
  };

  const handleDeleteRow = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa dòng này?")) {
      deleteDailyExpense(id);
    }
  };

  const totalAmount = expensesForDate.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-3xl font-bold text-white flex items-center">
             <Receipt className="mr-3 text-pink-500" /> Sổ Chi Tiêu Hàng Ngày
           </h2>
           <p className="text-gray-400 text-sm mt-1">Ghi chép các khoản mua sắm vặt, thất thoát trong ngày.</p>
        </div>
        
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

      <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-750">
           <span className="text-gray-300 text-sm italic">* Dữ liệu được lưu tự động khi nhập. Qua 00h hệ thống sẽ tự động tạo trang mới.</span>
           <button 
             onClick={handleAddRow}
             className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold flex items-center text-sm"
           >
             <Plus size={16} className="mr-1" /> Thêm dòng
           </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-700 text-gray-300 text-sm uppercase">
            <tr>
              <th className="p-4 w-16 text-center">#</th>
              <th className="p-4">Nội dung chi / Tên hàng hóa</th>
              <th className="p-4 w-48">Phân loại</th>
              <th className="p-4 text-right w-48">Số tiền (VNĐ)</th>
              <th className="p-4 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {expensesForDate.map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-750 group">
                <td className="p-4 text-center text-gray-500">{idx + 1}</td>
                <td className="p-4">
                  <input 
                    type="text"
                    className="w-full bg-transparent border-b border-transparent hover:border-gray-600 focus:border-pink-500 focus:bg-gray-900 outline-none text-white px-2 py-1 transition-colors"
                    placeholder="VD: Mua đá, mua bao nilon..."
                    value={item.description}
                    onChange={(e) => handleUpdateRow(item.id, 'description', e.target.value)}
                  />
                </td>
                <td className="p-4">
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white outline-none focus:border-pink-500"
                    value={item.type}
                    onChange={(e) => handleUpdateRow(item.id, 'type', e.target.value)}
                  >
                    <option value="PURCHASE">Mua sắm</option>
                    <option value="LOSS">Thất thoát / Hư hỏng</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  <input 
                    type="number"
                    className="w-full bg-transparent border-b border-transparent hover:border-gray-600 focus:border-pink-500 focus:bg-gray-900 outline-none text-white text-right font-bold px-2 py-1 transition-colors"
                    value={item.amount === 0 ? '' : item.amount}
                    placeholder="0"
                    onChange={(e) => handleUpdateRow(item.id, 'amount', Number(e.target.value))}
                  />
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => handleDeleteRow(item.id)}
                    className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {expensesForDate.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Chưa có khoản chi nào trong ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-750 border-t border-gray-600">
             <tr>
               <td colSpan={3} className="p-4 text-right font-bold text-white">TỔNG CHI NGÀY:</td>
               <td className="p-4 text-right font-bold text-xl text-red-400">{totalAmount.toLocaleString()}</td>
               <td></td>
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
