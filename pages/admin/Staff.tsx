
import React from 'react';
import { useApp } from '../../store';
import { User, Role, HRDetails } from '../../types';
import { Trash2, Plus, Edit, Briefcase, User as UserIcon } from 'lucide-react';

export const Staff = () => {
  const { users, addUser, updateUser, deleteUser, user: currentUser, currentStore, settings } = useApp();
  
  // Tab PAYROLL: Show ALL users (Both system and manual entries)
  const payrollUsers = users;

  // --- Handlers for Inline Payroll Editing ---
  const handleAddPayrollRow = () => {
    if (!currentStore) return;
    const newUser: User = {
      id: `staff-${Date.now()}`,
      storeId: currentStore.id,
      name: '', // Empty name for user to input
      username: '', // No login
      role: Role.STAFF, // Default
      permissions: [],
      isSystemAccount: false, // Mark as Non-System (Hidden in Accounts Tab)
      hr: { baseSalary: 0, workDays: 0, overtimeShifts: 0, leaveDays: 0, bonus: 0, penalty: 0, cashAdvance: 0 }
    };
    addUser(newUser);
  };

  const handleInlineUpdate = (userId: string, field: keyof HRDetails | 'name', value: any) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (field === 'name') {
      updateUser({ ...user, name: value });
    } else {
      const numValue = field === 'note' ? value : Number(value);
      updateUser({
        ...user,
        hr: {
          ...user.hr!,
          [field]: numValue
        }
      });
    }
  };

  const calculateTotalSalary = (hr?: HRDetails) => {
    if (!hr) return 0;
    
    // Quy tắc: 
    // Lương 1 ngày = Lương cứng (Base) / Ngày công thực tế (WorkDays)
    // Lương thực nhận = Lương cứng + (Lương 1 ngày * Số buổi làm thêm) + Thưởng - Phạt - Ứng
    // (Lương cứng đã bao gồm trả cho 'workDays', 'overtime' là tính thêm)
    
    const workDays = hr.workDays > 0 ? hr.workDays : 1; 
    const dailyRate = hr.baseSalary / workDays;
    
    // Tiền công cho ngày thường chính là Lương Cứng (vì DailyRate = Base/Days)
    // -> salaryWork = dailyRate * workDays = BaseSalary
    const salaryWork = hr.baseSalary; 
    const salaryOvertime = dailyRate * hr.overtimeShifts; 

    const total = salaryWork + salaryOvertime + hr.bonus - hr.penalty - (hr.cashAdvance || 0);
    return total;
  };

  const handleDeleteStaff = (id: string) => {
     if (currentUser && currentUser.id === id) {
      alert("Không thể xóa tài khoản đang đăng nhập!");
      return;
    }
    if (confirm("CẢNH BÁO: Bạn có chắc muốn xóa nhân viên này khỏi hệ thống?\nToàn bộ dữ liệu tài khoản và bảng lương sẽ bị mất.")) {
      deleteUser(id);
    }
  };

  // Helper to render inline input
  const renderInput = (userId: string, value: any, field: keyof HRDetails | 'name', type: 'text' | 'number' = 'number', className: string = '') => (
    <input
      type={type}
      className={`w-full bg-transparent border border-transparent hover:border-gray-600 focus:border-pink-500 focus:bg-gray-900 rounded px-1 py-1 outline-none transition-all ${className}`}
      value={value === 0 && type === 'number' ? '' : value}
      placeholder={type === 'number' && value === 0 ? '0' : ''}
      onChange={(e) => handleInlineUpdate(userId, field, e.target.value)}
    />
  );

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-3xl font-bold flex items-center">
                <Briefcase className="mr-3 text-pink-500"/> Bảng Lương & Chấm Công
            </h2>
            <p className="text-gray-400 text-sm mt-1">
                Công thức: Lương cứng + (Lương 1 ngày * Làm thêm) + Thưởng - Phạt - Tạm ứng. 
                (Trong đó Lương 1 ngày = Lương cứng / Ngày công)
            </p>
        </div>
      </div>

      {/* VIEW: PAYROLL (Inline Editing Excel Style) */}
      <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-yellow-900/20 p-3 rounded border border-yellow-700/50">
             <span className="text-yellow-500 text-sm flex items-center">
               <Edit size={16} className="mr-2"/>
               Chế độ nhập liệu: Tên nhân viên và lương thưởng có thể chỉnh sửa trực tiếp tại đây.
             </span>
             <button 
              onClick={handleAddPayrollRow}
              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded flex items-center text-sm font-bold"
             >
               <Plus size={16} className="mr-1" /> Thêm Hàng / Nhân viên thời vụ
             </button>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto shadow-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-700 text-gray-300">
                <tr>
                  <th className="p-3 border-r border-gray-600 w-10 text-center">#</th>
                  <th className="p-3 border-r border-gray-600 min-w-[150px]">Tên nhân viên</th>
                  <th className="p-3 border-r border-gray-600 text-right min-w-[120px]">Lương (Cứng)</th>
                  <th className="p-3 border-r border-gray-600 text-center w-24">Ngày công</th>
                  <th className="p-3 border-r border-gray-600 text-center w-24 text-blue-400">Làm thêm (Buổi)</th>
                  <th className="p-3 border-r border-gray-600 text-right text-green-400 min-w-[100px]">Thưởng (+)</th>
                  <th className="p-3 border-r border-gray-600 text-right text-red-400 min-w-[100px]">Phạt (-)</th>
                  <th className="p-3 border-r border-gray-600 text-right text-orange-400 min-w-[100px]">Tạm ứng (-)</th>
                  <th className="p-3 border-r border-gray-600 text-right font-bold text-white min-w-[120px] bg-gray-750">Thực nhận</th>
                  <th className="p-3 min-w-[150px]">Ghi chú</th>
                  <th className="p-3 text-center w-10 sticky right-0 bg-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {payrollUsers.map((u, idx) => {
                  const totalSalary = calculateTotalSalary(u.hr);
                  return (
                    <tr key={u.id} className="hover:bg-gray-750 group">
                      <td className="p-1 border-r border-gray-600 text-center text-gray-500">{idx + 1}</td>
                      
                      {/* Name (Editable here now) */}
                      <td className="p-2 border-r border-gray-600 font-medium text-white relative">
                        {renderInput(u.id, u.name, 'name', 'text', 'font-bold')}
                        {u.isSystemAccount && <span className="absolute right-1 top-2 text-[10px] bg-pink-900 text-pink-300 px-1 rounded">TK</span>}
                      </td>

                      {/* Base Salary */}
                      <td className="p-1 border-r border-gray-600 text-right">
                        {renderInput(u.id, u.hr?.baseSalary || 0, 'baseSalary', 'number', 'text-right')}
                      </td>

                      {/* Stats */}
                      <td className="p-1 border-r border-gray-600 text-center">
                        {renderInput(u.id, u.hr?.workDays || 0, 'workDays', 'number', 'text-center')}
                      </td>
                      <td className="p-1 border-r border-gray-600 text-center">
                        {renderInput(u.id, u.hr?.overtimeShifts || 0, 'overtimeShifts', 'number', 'text-center text-blue-300 font-medium')}
                      </td>

                      {/* Money Adjustments */}
                      <td className="p-1 border-r border-gray-600 text-right">
                        {renderInput(u.id, u.hr?.bonus || 0, 'bonus', 'number', 'text-right text-green-400 font-medium')}
                      </td>
                      <td className="p-1 border-r border-gray-600 text-right">
                        {renderInput(u.id, u.hr?.penalty || 0, 'penalty', 'number', 'text-right text-red-400 font-medium')}
                      </td>
                      <td className="p-1 border-r border-gray-600 text-right">
                        {renderInput(u.id, u.hr?.cashAdvance || 0, 'cashAdvance', 'number', 'text-right text-orange-400 font-medium')}
                      </td>

                      {/* Total (Calculated) */}
                      <td className={`p-2 border-r border-gray-600 text-right font-bold bg-gray-900/30 ${totalSalary < 0 ? 'text-red-500' : 'text-white'}`}>
                        {Math.round(totalSalary).toLocaleString()}
                      </td>

                      {/* Note */}
                      <td className="p-1">
                        {renderInput(u.id, u.hr?.note || '', 'note', 'text', 'text-gray-400 italic')}
                      </td>

                      {/* Action */}
                      <td className="p-1 text-center sticky right-0 bg-gray-800 group-hover:bg-gray-750">
                        <button 
                          onClick={() => handleDeleteStaff(u.id)}
                          className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors"
                          title="Xóa nhân viên"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-500 mt-2 px-1">
            * Dữ liệu được lưu tự động khi bạn nhập. <br/>
            * Để tạo/sửa tài khoản đăng nhập cho nhân viên, vui lòng truy cập mục <strong>"Chọn Chi Nhánh" &gt; "Quản lý Tài khoản"</strong>.
          </div>
        </div>
    </div>
  );
};
