
import React, { useState } from 'react';
import { useApp } from '../../store';
import { Mic2, Lock, User, Briefcase, Phone, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { register } = useApp();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    setServerError(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate Password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Mật khẩu yếu: Cần 8+ ký tự, Hoa, thường, số & ký tự đặc biệt.";
    }

    // Validate Confirm Password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu nhập lại không khớp.";
    }

    // Validate Phone
    const phoneRegex = /^(02|03|05|07|08|09)\d{8}$/;
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Vui lòng nhập số điện thoại.";
    } else if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "SĐT sai định dạng (10 số, bắt đầu 02,03,05,07,08,09).";
    }

    // Validate Email
    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = "Email không hợp lệ.";
    }

    // Required fields
    if (!formData.firstName) newErrors.firstName = "Bắt buộc.";
    if (!formData.lastName) newErrors.lastName = "Bắt buộc.";
    if (!formData.username) newErrors.username = "Bắt buộc.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      const result = await register(formData);
      setIsSubmitting(false);

      if (result.success) {
        alert("Đăng ký tài khoản thành công! Vui lòng đăng nhập.");
        onSwitchToLogin();
      } else {
        setServerError(result.message || "Đăng ký thất bại.");
      }
    }
  };

  // Helper to get input styling based on error state
  const getInputClass = (fieldName: string, hasIcon: boolean = false) => {
    const base = "w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:outline-none transition-colors";
    const padding = hasIcon ? "pl-9" : "";
    const borderColor = errors[fieldName] ? "border-red-500 focus:border-red-500" : "border-gray-600 focus:border-blue-500";
    return `${base} ${padding} ${borderColor}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-8">
      <div className="max-w-lg w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-900/30 text-blue-500 mb-4">
              <Briefcase size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">Đăng Ký Quản Lý Mới</h2>
            <p className="text-gray-400 mt-1">Thiết lập hệ thống cho cửa hàng của bạn</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {serverError && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded text-sm text-center mb-4">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Họ</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={getInputClass('lastName')}
                  placeholder="Nguyễn"
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tên</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={getInputClass('firstName')}
                  placeholder="Văn A"
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700"></div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Tên đăng nhập (Admin)</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={getInputClass('username', true)}
                  placeholder="admin_store"
                />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/>{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={getInputClass('email', true)}
                  placeholder="email@example.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/>{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Số điện thoại</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={getInputClass('phoneNumber', true)}
                  placeholder="09xxx"
                />
              </div>
              {errors.phoneNumber && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/>{errors.phoneNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${getInputClass('password', true)} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-red-500 text-xs mt-1 flex items-start"><AlertCircle size={10} className="mr-1 mt-0.5 shrink-0"/>{errors.password}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Min 8 ký tự, hoa, thường, số, ký tự đặc biệt.</p>
              )}
            </div>

             <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Nhập lại Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${getInputClass('confirmPassword', true)} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/>{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full mt-4 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all ${isSubmitting ? 'bg-gray-600 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ HỆ THỐNG'}
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-gray-400 text-sm">
               Đã có tài khoản?{' '}
               <button onClick={onSwitchToLogin} className="text-blue-400 hover:text-blue-300 font-bold">
                 Đăng nhập
               </button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
