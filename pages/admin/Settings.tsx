
import React, { useState } from 'react';
import { useApp } from '../../store';
import { Printer, Eye, Save, Building, FileText, Clock, Database, Lock, Unlock, ShieldCheck, Type, Users } from 'lucide-react';

export const SettingsPage = () => {
  const { settings, updateSettings, user } = useApp();
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'INVOICE'>('SYSTEM');
  
  // Security State for Bill Rules
  const [isRulesUnlocked, setIsRulesUnlocked] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPin, setSecurityPin] = useState('');

  const handleUnlockClick = () => {
    if (user?.secondPassword) {
        setSecurityPin('');
        setIsSecurityModalOpen(true);
    } else {
        // No PIN set, Block access and warn user
        alert("Tài khoản của bạn chưa được thiết lập Mật khẩu cấp 2 (Mã PIN).\nVui lòng liên hệ Super Admin để được cấp mã bảo mật này trước khi chỉnh sửa cấu hình.");
    }
  };

  const handleSecurityVerify = () => {
    if (user?.secondPassword && securityPin === user.secondPassword) {
        setIsRulesUnlocked(true);
        setIsSecurityModalOpen(false);
    } else {
        alert("Mã bảo mật không đúng!");
    }
  };

  const fonts = [
      'Arial, sans-serif',
      'Times New Roman, serif',
      'Courier New, monospace',
      'Verdana, sans-serif',
      'Tahoma, sans-serif',
      'Roboto, sans-serif',
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Cài đặt hệ thống</h2>
        <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-4 py-2 rounded ${activeTab === 'SYSTEM' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Hệ thống & Giá
          </button>
          <button 
            onClick={() => setActiveTab('INVOICE')}
            className={`px-4 py-2 rounded ${activeTab === 'INVOICE' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Thiết kế Hóa đơn
          </button>
        </div>
      </div>

      {activeTab === 'SYSTEM' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Time Logic */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-pink-500 mb-4 border-b border-gray-700 pb-2">Quy tắc tính giờ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Làm tròn giờ hát Phòng (Phút)</label>
                <input 
                  type="number" 
                  value={settings.timeRoundingMinutes === 0 ? '' : settings.timeRoundingMinutes}
                  onChange={(e) => updateSettings({ timeRoundingMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Ví dụ: 5 phút. Khách hát 61p sẽ tính tiền 65p.</p>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2 font-bold text-indigo-400">Làm tròn giờ Dịch vụ / Nhân viên (Block)</label>
                <input 
                  type="number" 
                  value={settings.serviceBlockMinutes === 0 ? '' : settings.serviceBlockMinutes}
                  onChange={(e) => updateSettings({ serviceBlockMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Quy tắc "1p tính 10p":</strong> Ví dụ block là 10. <br/>
                  - Dùng 1 phút -&gt; Tính 10 phút. <br/>
                  - Dùng 11 phút -&gt; Tính 20 phút.
                </p>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Phụ thu phục vụ (Cộng thẳng vào giờ)</label>
                <input 
                  type="number" 
                  value={settings.staffServiceMinutes === 0 ? '' : settings.staffServiceMinutes}
                  onChange={(e) => updateSettings({ staffServiceMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Cộng thêm phút vào tổng giờ hát mỗi khi thanh toán (ít dùng).</p>
              </div>
            </div>
          </div>

          {/* Financials & Stock */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
             <h3 className="text-xl font-bold text-pink-500 mb-4 border-b border-gray-700 pb-2">Tài chính & Kho</h3>
             <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Thuế VAT (%)</label>
                <input 
                  type="number" 
                  value={settings.vatRate === 0 ? '' : settings.vatRate}
                  onChange={(e) => updateSettings({ vatRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                />
              </div>
               <div>
                <label className="block text-gray-400 mb-2">Cảnh báo tồn kho thấp (SL)</label>
                <input 
                  type="number" 
                  value={settings.lowStockThreshold === 0 ? '' : settings.lowStockThreshold}
                  onChange={(e) => updateSettings({ lowStockThreshold: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                />
              </div>
             </div>
          </div>

          {/* NEW: Bill Editing Rules (SECURED) */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 relative overflow-hidden">
             {/* ADDED z-20 to ensure button is clickable above the overlay */}
             <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 relative z-20">
                <h3 className="text-xl font-bold text-blue-400 flex items-center">
                    <Clock className="mr-2" /> Quy định sửa Hóa đơn (Bill)
                </h3>
                {!isRulesUnlocked && (
                    <button 
                        onClick={handleUnlockClick}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center transition-colors shadow-lg border border-gray-600 cursor-pointer"
                    >
                        <Lock size={14} className="mr-1"/> Mở khóa cấu hình
                    </button>
                )}
             </div>
             
             <div className={`space-y-4 transition-opacity duration-300 ${!isRulesUnlocked ? 'opacity-50 pointer-events-none blur-[1px]' : ''}`}>
                <div className="flex items-center space-x-2 bg-blue-900/20 p-3 rounded border border-blue-700/50">
                    <input 
                        type="checkbox" 
                        id="manualBillApproval"
                        checked={settings.manualBillApproval}
                        onChange={(e) => updateSettings({ manualBillApproval: e.target.checked })}
                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="manualBillApproval" className="text-sm font-bold text-blue-300 cursor-pointer">
                        Duyệt sửa bill THỦ CÔNG
                    </label>
                </div>
                {settings.manualBillApproval && (
                    <p className="text-xs text-gray-400 italic px-2">
                        * Khi bật chế độ này, Admin phải duyệt thủ công mọi yêu cầu sửa bill. Tính năng tự động duyệt sẽ bị vô hiệu hóa.
                    </p>
                )}

                <div>
                  <label className="block text-gray-400 mb-2">Tự động duyệt (Phút)</label>
                  <input 
                    type="number" 
                    value={settings.adminAutoApproveMinutes === 0 ? '' : settings.adminAutoApproveMinutes}
                    onChange={(e) => updateSettings({ adminAutoApproveMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={settings.manualBillApproval}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập 0 = Tắt (Duyệt tay). Nếu {'>'} 0: Yêu cầu sửa sẽ tự động duyệt nếu gửi trong khoảng này.
                    {settings.manualBillApproval && <span className="text-red-400 block font-bold">Đang bị vô hiệu hóa do bật chế độ Thủ công.</span>}
                  </p>
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Yêu cầu sửa tối đa (Phút)</label>
                  <input 
                    type="number" 
                    value={settings.staffEditWindowMinutes === 0 ? '' : settings.staffEditWindowMinutes}
                    onChange={(e) => updateSettings({ staffEditWindowMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Sau khi thanh toán, nhân viên chỉ được phép yêu cầu sửa bill trong thời gian này.</p>
                </div>
                
                <div className="bg-red-900/10 border border-red-900/30 rounded p-2">
                  <label className="block text-red-400 font-bold mb-2">Khóa sổ vĩnh viễn (Phút)</label>
                  <input 
                    type="number" 
                    value={settings.hardBillLockMinutes === 0 ? '' : settings.hardBillLockMinutes}
                    onChange={(e) => updateSettings({ hardBillLockMinutes: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="bg-gray-900 border border-red-900 rounded p-2 w-full text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Sau thời gian này, <strong>không ai (kể cả Admin)</strong> được phép sửa Bill. Chỉ xem.</p>
                </div>
             </div>

             {!isRulesUnlocked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="bg-gray-900/90 p-4 rounded-lg border border-gray-600 flex flex-col items-center shadow-2xl">
                        <Lock size={32} className="text-gray-400 mb-2" />
                        <span className="text-gray-300 font-bold text-sm">Cấu hình được bảo vệ</span>
                    </div>
                </div>
             )}
          </div>

          {/* NEW: Data Storage */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
             <h3 className="text-xl font-bold text-green-400 mb-4 border-b border-gray-700 pb-2 flex items-center">
               <Database className="mr-2" /> Lưu trữ Dữ liệu
             </h3>
             <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Tự động xóa ảnh Data Nhập hàng (Ngày)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={settings.autoDeleteImagesDays === 0 ? '' : settings.autoDeleteImagesDays}
                    onChange={(e) => updateSettings({ autoDeleteImagesDays: e.target.value === '' ? 30 : Number(e.target.value) })}
                    className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ảnh tải lên trong mục "Data Nhập Hàng" sẽ tự động bị xóa sau số ngày này để tiết kiệm dung lượng.
                  </p>
                </div>
             </div>
          </div>

        </div>
      ) : (
        // ... (Keep existing Invoice Design tab content) ...
        <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)]">
          {/* Design Controls */}
          <div className="w-full xl:w-5/12 bg-gray-800 p-6 rounded-lg border border-gray-700 overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Printer className="mr-2" /> Thiết lập mẫu Hóa Đơn
            </h3>
            
            <div className="space-y-6">
              {/* Invoice Font Settings */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                <h4 className="text-green-400 font-bold mb-3 flex items-center"><Type size={16} className="mr-2"/> Phông chữ & Kích thước</h4>
                <div className="space-y-3">
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Kiểu chữ (Font Family)</label>
                    <select 
                      value={settings.invoiceFontFamily} 
                      onChange={(e) => updateSettings({ invoiceFontFamily: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm"
                    >
                      {fonts.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                    </select>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Cỡ chữ Tiêu đề (px)</label>
                        <input type="number" value={settings.invoiceHeaderFontSize} onChange={(e) => updateSettings({ invoiceHeaderFontSize: Number(e.target.value) })}
                          className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Cỡ chữ Nội dung (px)</label>
                        <input type="number" value={settings.invoiceBodyFontSize} onChange={(e) => updateSettings({ invoiceBodyFontSize: Number(e.target.value) })}
                          className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" />
                      </div>
                   </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                <h4 className="text-blue-400 font-bold mb-3 flex items-center"><Building size={16} className="mr-2"/> Thông tin Doanh Nghiệp</h4>
                <div className="space-y-3">
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Tên đơn vị bán hàng</label>
                    <input type="text" value={settings.storeName} onChange={(e) => updateSettings({ storeName: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" />
                   </div>
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Mã số thuế</label>
                    <input type="text" value={settings.storeTaxCode} onChange={(e) => updateSettings({ storeTaxCode: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" />
                   </div>
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Địa chỉ</label>
                    <textarea rows={2} value={settings.storeAddress} onChange={(e) => updateSettings({ storeAddress: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" />
                   </div>
                </div>
              </div>

              {/* Invoice Legal Info */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                <h4 className="text-orange-400 font-bold mb-3 flex items-center"><FileText size={16} className="mr-2"/> Ký hiệu & Mẫu số</h4>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Tiêu đề hóa đơn</label>
                    <input type="text" value={settings.invoiceTitle} onChange={(e) => updateSettings({ invoiceTitle: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" />
                   </div>
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Mẫu số</label>
                    <input type="text" value={settings.invoiceFormNo} onChange={(e) => updateSettings({ invoiceFormNo: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" placeholder="1" />
                   </div>
                   <div>
                    <label className="block text-gray-400 text-xs mb-1">Ký hiệu</label>
                    <input type="text" value={settings.invoiceSerial} onChange={(e) => updateSettings({ invoiceSerial: e.target.value })}
                      className="bg-gray-800 border border-gray-600 rounded p-2 w-full text-white text-sm" placeholder="C25M" />
                   </div>
                   <div className="flex items-center pt-5">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={settings.invoiceDigitalSignature} onChange={(e) => updateSettings({ invoiceDigitalSignature: e.target.checked })}
                          className="form-checkbox text-pink-600 rounded bg-gray-900 border-gray-600" />
                        <span className="text-gray-300 text-xs">Dùng chữ ký số</span>
                      </label>
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 font-bold text-sm">Ghi chú cuối đơn</label>
                <textarea 
                  rows={3}
                  value={settings.invoiceFooter}
                  onChange={(e) => updateSettings({ invoiceFooter: e.target.value })}
                  className="bg-gray-900 border border-gray-600 rounded p-2 w-full text-white font-mono text-sm"
                  placeholder="Cảm ơn quý khách..."
                />
              </div>

              <div className="border-t border-gray-700 pt-4">
                <label className="block text-gray-400 mb-3 font-bold text-sm">Tùy chọn hiển thị</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={settings.invoiceShowCashier} onChange={(e) => updateSettings({ invoiceShowCashier: e.target.checked })}
                      className="form-checkbox text-pink-600 rounded bg-gray-900 border-gray-600" />
                    <span className="text-gray-300">Tên thu ngân</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={settings.invoiceShowTime} onChange={(e) => updateSettings({ invoiceShowTime: e.target.checked })}
                      className="form-checkbox text-pink-600 rounded bg-gray-900 border-gray-600" />
                    <span className="text-gray-300">Ngày giờ in</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={settings.invoiceShowStartTime} onChange={(e) => updateSettings({ invoiceShowStartTime: e.target.checked })}
                      className="form-checkbox text-pink-600 rounded bg-gray-900 border-gray-600" />
                    <span className="text-gray-300">Giờ vào (Check-in)</span>
                  </label>
                   <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={settings.invoiceShowEndTime} onChange={(e) => updateSettings({ invoiceShowEndTime: e.target.checked })}
                      className="form-checkbox text-pink-600 rounded bg-gray-900 border-gray-600" />
                    <span className="text-gray-300">Giờ ra (Check-out)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={settings.invoiceShowDuration} onChange={(e) => updateSettings({ invoiceShowDuration: e.target.checked })}
                      className="form-checkbox text-pink-600 rounded bg-gray-900 border-gray-600" />
                    <span className="text-gray-300">Tổng thời lượng</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="w-full xl:w-7/12 bg-gray-500 rounded-lg p-8 flex justify-center items-start overflow-y-auto">
             <div 
               className="bg-white text-black p-8 w-[500px] shadow-2xl min-h-[600px] relative"
               style={{ fontFamily: settings.invoiceFontFamily || 'Arial, sans-serif' }}
             >
                <div className="absolute top-0 right-0 bg-pink-500 text-white text-xs px-2 py-1 font-bold font-sans">LIVE PREVIEW</div>
                
                {/* Header: Company Info & Invoice Serial */}
                <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                   <div className="w-2/3 pr-4">
                      <h2 
                        className="font-bold uppercase leading-tight" 
                        style={{ fontSize: (settings.invoiceHeaderFontSize || 18) + 'px' }}
                      >
                        {settings.storeName}
                      </h2>
                      <p className="mt-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>MST: {settings.storeTaxCode}</p>
                      <p className="mt-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>{settings.storeAddress}</p>
                   </div>
                   <div className="w-1/3 text-right" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                      <p>Mẫu số: {settings.invoiceFormNo}</p>
                      <p>Ký hiệu: {settings.invoiceSerial}</p>
                      <p>Số: 0000123</p>
                   </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                   <h1 className="font-bold uppercase" style={{ fontSize: ((settings.invoiceHeaderFontSize || 18) + 4) + 'px' }}>{settings.invoiceTitle}</h1>
                   <p className="italic" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>Ngày {new Date().getDate()} tháng {new Date().getMonth()+1} năm {new Date().getFullYear()}</p>
                </div>

                {/* Customer Info (Placeholder in Preview) */}
                <div className="mb-4 space-y-1" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                   <div className="flex"><span className="w-32">Đơn vị mua hàng:</span> <span className="border-b border-dotted border-gray-400 flex-1 italic text-gray-500">Khách lẻ / Công ty ABC</span></div>
                   <div className="flex"><span className="w-32">Mã số thuế:</span> <span className="border-b border-dotted border-gray-400 flex-1 italic text-gray-500">0101234567</span></div>
                   <div className="flex"><span className="w-32">Địa chỉ:</span> <span className="border-b border-dotted border-gray-400 flex-1 italic text-gray-500">Hà Nội</span></div>
                </div>

                {/* Table Body */}
                <table className="w-full mb-6 border-collapse border border-black" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-center w-10">STT</th>
                      <th className="border border-black px-2 py-1 text-left">Tên hàng hóa, dịch vụ</th>
                      <th className="border border-black px-2 py-1 text-center w-16">ĐVT</th>
                      <th className="border border-black px-2 py-1 text-center w-12">SL</th>
                      <th className="border border-black px-2 py-1 text-right w-24">Đơn giá</th>
                      <th className="border border-black px-2 py-1 text-right w-24">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Items */}
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">1</td>
                      <td className="border border-black px-2 py-1">Tiền giờ hát (VIP 1)</td>
                      <td className="border border-black px-2 py-1 text-center">Giờ</td>
                      <td className="border border-black px-2 py-1 text-center">1</td>
                      <td className="border border-black px-2 py-1 text-right">300,000</td>
                      <td className="border border-black px-2 py-1 text-right">300,000</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">2</td>
                      <td className="border border-black px-2 py-1">Bia Heineken</td>
                      <td className="border border-black px-2 py-1 text-center">Lon</td>
                      <td className="border border-black px-2 py-1 text-center">10</td>
                      <td className="border border-black px-2 py-1 text-right">25,000</td>
                      <td className="border border-black px-2 py-1 text-right">250,000</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">3</td>
                      <td className="border border-black px-2 py-1">Trái cây (L)</td>
                      <td className="border border-black px-2 py-1 text-center">Đĩa</td>
                      <td className="border border-black px-2 py-1 text-center">1</td>
                      <td className="border border-black px-2 py-1 text-right">150,000</td>
                      <td className="border border-black px-2 py-1 text-right">150,000</td>
                    </tr>
                    
                    {/* Empty Rows Filler */}
                    <tr>
                       <td className="border border-black px-2 py-1 text-center">&nbsp;</td>
                       <td className="border border-black px-2 py-1"></td>
                       <td className="border border-black px-2 py-1"></td>
                       <td className="border border-black px-2 py-1"></td>
                       <td className="border border-black px-2 py-1"></td>
                       <td className="border border-black px-2 py-1"></td>
                    </tr>
                  </tbody>
                  <tfoot>
                     <tr>
                        <td colSpan={5} className="border border-black px-2 py-1 text-right font-bold">Cộng tiền hàng:</td>
                        <td className="border border-black px-2 py-1 text-right font-bold">700,000</td>
                     </tr>
                     <tr>
                        <td colSpan={5} className="border border-black px-2 py-1 text-right font-bold">Thuế GTGT ({settings.vatRate}%):</td>
                        <td className="border border-black px-2 py-1 text-right font-bold">70,000</td>
                     </tr>
                     <tr>
                        <td colSpan={5} className="border border-black px-2 py-1 text-right font-bold text-lg">TỔNG CỘNG:</td>
                        <td className="border border-black px-2 py-1 text-right font-bold text-lg">770,000</td>
                     </tr>
                  </tfoot>
                </table>

                <div className="mb-8 font-bold" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                   Số tiền viết bằng chữ: <span className="italic font-normal">Bảy trăm bảy mươi nghìn đồng chẵn.</span>
                </div>

                {/* Signatures */}
                <div className="flex justify-between text-center mb-16" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                   <div className="w-1/2">
                      <p className="font-bold">Người mua hàng</p>
                      <p className="italic">(Ký, ghi rõ họ tên)</p>
                   </div>
                   <div className="w-1/2">
                      <p className="font-bold">Người bán hàng</p>
                      <p className="italic">(Ký, ghi rõ họ tên)</p>
                      {settings.invoiceDigitalSignature && (
                         <div className="mt-4 border-2 border-red-500 text-red-500 px-2 py-1 inline-block rounded text-xs font-bold uppercase transform -rotate-6 opacity-80">
                            Signed digitally by<br/>{settings.storeName.toUpperCase()}
                         </div>
                      )}
                   </div>
                </div>

                {/* Footer */}
                <div className="text-center italic border-t pt-2" style={{ fontSize: (settings.invoiceBodyFontSize || 13) + 'px' }}>
                  {settings.invoiceFooter}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* SECURITY CHECK MODAL (Reused for Unlock) */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
            <div className="bg-gray-800 p-6 rounded-xl border border-purple-500/50 shadow-2xl w-96 text-center">
                <div className="mx-auto bg-purple-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-purple-500">
                    <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Bảo Mật Cấp 2</h3>
                <p className="text-gray-400 text-sm mb-4">Vui lòng nhập mã PIN để mở khóa cấu hình.</p>
                
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
                        onClick={() => { setIsSecurityModalOpen(false); }}
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
