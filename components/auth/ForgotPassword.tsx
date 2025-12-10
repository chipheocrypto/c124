
import React, { useState } from 'react';
import { useApp } from '../../store';
import { Lock, Mail, Phone, ArrowLeft, Key, CheckCircle, Smartphone } from 'lucide-react';
import { Role } from '../../types';

interface ForgotPasswordProps {
  onSwitchToLogin: () => void;
}

type Step = 'INPUT' | 'OTP' | 'RESET' | 'SUCCESS';

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSwitchToLogin }) => {
  const { verifyUserContact, resetUserPassword } = useApp();
  const [step, setStep] = useState<Step>('INPUT');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 1: Verify Email/Phone
  const handleVerifyContact = (e: React.FormEvent) => {
    e.preventDefault();
    const user = verifyUserContact(contact);
    
    if (user) {
      // Check Role: Only Admin or Super Admin can self-reset
      if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
        alert("Tài khoản nhân viên/quản lý không thể tự cấp lại mật khẩu.\nVui lòng liên hệ Chủ cửa hàng (Admin) để được hỗ trợ.");
        return;
      }

      setUserId(user.id);
      // Simulate sending OTP to Zalo
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(mockOtp);
      
      // Simulate API call delay
      setTimeout(() => {
        alert(`[Giả lập Zalo] Mã OTP của bạn là: ${mockOtp}`);
        setStep('OTP');
      }, 1000);
    } else {
      alert("Không tìm thấy tài khoản với Email hoặc SĐT này!");
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      setStep('RESET');
    } else {
      alert("Mã OTP không đúng! Vui lòng thử lại.");
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu nhập lại không khớp!");
      return;
    }

    // Regex check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      alert("Mật khẩu không đủ mạnh!\nYêu cầu: Ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }

    if (userId) {
      resetUserPassword(userId, newPassword);
      setStep('SUCCESS');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-900/30 text-indigo-500 mb-4">
              <Key size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Quên Mật Khẩu</h2>
            <p className="text-gray-400 mt-2 text-sm">
              {step === 'INPUT' && 'Nhập thông tin để tìm lại tài khoản (Dành cho Chủ cửa hàng)'}
              {step === 'OTP' && 'Nhập mã xác thực gửi về Zalo'}
              {step === 'RESET' && 'Thiết lập mật khẩu mới'}
              {step === 'SUCCESS' && 'Thành công!'}
            </p>
          </div>

          {/* STEP 1: INPUT CONTACT */}
          {step === 'INPUT' && (
            <form onSubmit={handleVerifyContact} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email hoặc Số điện thoại</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="block w-full pl-10 bg-gray-900 border border-gray-600 rounded-lg py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    placeholder="example@gmail.com / 09xxx"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all">
                Gửi Mã OTP
              </button>
            </form>
          )}

          {/* STEP 2: OTP */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="bg-blue-900/20 p-3 rounded text-blue-300 text-xs flex items-start">
                 <Smartphone size={16} className="mr-2 shrink-0 mt-0.5" />
                 <span>Mã OTP đã được gửi về Zalo của SĐT đăng ký. Vui lòng kiểm tra tin nhắn.</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Mã OTP (6 số)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full bg-gray-900 border border-gray-600 rounded-lg py-3 text-center text-2xl tracking-widest text-white focus:outline-none focus:border-indigo-500"
                  placeholder="------"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all">
                Xác Nhận
              </button>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Mật khẩu mới</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 bg-gray-900 border border-gray-600 rounded-lg py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Min 8 ký tự, hoa, thường, số, ký tự đặc biệt.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nhập lại mật khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 bg-gray-900 border border-gray-600 rounded-lg py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all">
                Cập Nhật Mật Khẩu
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center space-y-6">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/30 text-green-500">
                  <CheckCircle size={40} />
               </div>
               <h3 className="text-xl font-bold text-white">Đổi mật khẩu thành công!</h3>
               <p className="text-gray-400">Bạn đã có thể đăng nhập bằng mật khẩu mới.</p>
               <button 
                 onClick={onSwitchToLogin} 
                 className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold transition-all"
               >
                 Quay Về Đăng Nhập
               </button>
            </div>
          )}

          {/* Back Button (Only for Steps 1-3) */}
          {step !== 'SUCCESS' && (
            <div className="mt-6 text-center">
              <button onClick={onSwitchToLogin} className="text-gray-400 hover:text-white flex items-center justify-center w-full">
                <ArrowLeft size={16} className="mr-2" /> Quay lại đăng nhập
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
