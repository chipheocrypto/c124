
import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import { Role, ImportImage } from '../types';
import { Database, Upload, Trash2, X, Eye, Calendar, User, Lock, Download, FolderDown, ImagePlus, Loader, CheckSquare, Square, MinusCircle } from 'lucide-react';
import JSZip from 'jszip';

export const ImportData = () => {
  const { importImages, addImportImage, deleteImportImage, user, currentStore } = useApp();
  
  // States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImportImage | null>(null); // For viewing
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null); // For deleting
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Date Picker for Auto Select (Local Date String YYYY-MM-DD)
  const [targetDate, setTargetDate] = useState(() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  });

  // Bulk Download States
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  
  // Upload States
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Role Check
  const canUpload = user?.role === Role.ADMIN || user?.role === Role.MANAGER || user?.role === Role.STAFF;
  const canViewLibrary = true; 
  const canZoom = user?.role === Role.ADMIN || user?.role === Role.MANAGER; 
  const canDelete = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
  const canDownload = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPreviews: string[] = [];
      const fileReaders: Promise<string>[] = [];

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(file);
        fileReaders.push(promise);
      });

      Promise.all(fileReaders).then(results => {
          setUploadPreviews(prev => [...prev, ...results]);
      });
    }
  };

  const handleRemovePreview = (index: number) => {
      setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user || uploadPreviews.length === 0) return;

    const currentCount = importImages.length;

    uploadPreviews.forEach((url, index) => {
        const orderNumber = currentCount + index + 1;
        const newImage: ImportImage = {
            id: `img-${Date.now()}-${index}`,
            storeId: currentStore.id,
            url: url,
            description: `Nhập Hàng ${orderNumber}`,
            uploaderName: user.name,
            timestamp: Date.now()
        };
        addImportImage(newImage);
    });
    
    setIsUploadModalOpen(false);
    setUploadPreviews([]);
    alert(`Đã tải lên thành công ${uploadPreviews.length} ảnh!`);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
        deleteImportImage(deleteConfirmId);
        // Also remove from selection if exists
        setSelectedIds(prev => prev.filter(id => id !== deleteConfirmId));
        setDeleteConfirmId(null);
        setSelectedImage(null);
    }
  };

  // --- SELECTION LOGIC ---
  
  const toggleSelection = (id: string) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleSelectByDate = () => {
      const targets = importImages.filter(img => {
        const imgDate = new Date(img.timestamp);
        const y = imgDate.getFullYear();
        const m = String(imgDate.getMonth() + 1).padStart(2, '0');
        const d = String(imgDate.getDate()).padStart(2, '0');
        const imgDateStr = `${y}-${m}-${d}`;
        return imgDateStr === targetDate;
      }).map(img => img.id);

      if (targets.length === 0) {
          alert(`Không có ảnh nào trong ngày ${targetDate}.`);
          return;
      }

      const newSelection = Array.from(new Set([...selectedIds, ...targets]));
      setSelectedIds(newSelection);
  };

  const handleClearSelection = () => {
      setSelectedIds([]);
  };

  // --- DOWNLOAD LOGIC (USING JSZIP) ---

  const handleDownloadImage = (img: ImportImage) => {
    // Single file download using fetch to get Blob -> objectURL
    fetch(img.url)
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${img.description.replace(/[^a-z0-9]/gi, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        })
        .catch(err => {
            console.error("Download error:", err);
            alert("Không thể tải ảnh. Có thể do lỗi kết nối.");
        });
  };

  const handleDownloadSelected = async () => {
    const targetImages = importImages.filter(img => selectedIds.includes(img.id));

    if (targetImages.length === 0) {
        alert("Vui lòng chọn ít nhất 1 ảnh để tải.");
        return;
    }

    // Using ZIP to avoid browser blocking multiple downloads
    if (confirm(`Bạn có chắc muốn tải xuống ${targetImages.length} ảnh dưới dạng file nén (.zip)?`)) {
        setIsBulkDownloading(true);
        const zip = new JSZip();
        const folder = zip.folder(`Data_Nhap_Hang_${targetDate}`);
        let successCount = 0;
        
        try {
            for (let i = 0; i < targetImages.length; i++) {
                const img = targetImages[i];
                setDownloadProgress(`${i + 1}/${targetImages.length}`);
                
                try {
                    let blob: Blob;
                    // Handle Data URI or Remote URL
                    if (img.url.startsWith('data:')) {
                         blob = await (await fetch(img.url)).blob();
                    } else {
                         const response = await fetch(img.url, { mode: 'cors' });
                         if (!response.ok) throw new Error(`HTTP ${response.status}`);
                         blob = await response.blob();
                    }
                    
                    // Determine extension
                    const mime = blob.type;
                    let ext = 'png';
                    if (mime === 'image/jpeg') ext = 'jpg';
                    else if (mime === 'image/webp') ext = 'webp';

                    const safeDesc = img.description.replace(/[^a-z0-9\-_]/gi, '_');
                    const filename = `${safeDesc}_${i + 1}.${ext}`;
                    
                    folder?.file(filename, blob);
                    successCount++;
                } catch (e) {
                    console.error("Skipping failed image:", img.id, e);
                    folder?.file(`ERROR_${img.description.replace(/[^a-z0-9]/gi,'_')}.txt`, `Failed to download URL: ${img.url}`);
                }
            }
            
            if (successCount === 0) {
                alert("Không thể tải xuống bất kỳ ảnh nào. Vui lòng kiểm tra lại nguồn ảnh.");
                return;
            }

            setDownloadProgress('Đang nén...');
            const content = await zip.generateAsync({ type: "blob" });
            
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Data_Nhap_Hang_${targetDate}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // alert("Tải xuống thành công!");
        } catch (error) {
            console.error("Bulk download error:", error);
            alert("Có lỗi xảy ra trong quá trình nén file.");
        } finally {
            setIsBulkDownloading(false);
            setDownloadProgress('');
        }
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-white flex items-center">
             <Database className="mr-3 text-pink-500" /> Data Nhập Hàng
           </h2>
           <p className="text-gray-400 text-sm mt-1">Lưu trữ ảnh chụp hóa đơn, chứng từ nhập kho.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            {/* Admin Controls */}
            {canDownload && (
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-gray-900 rounded px-2">
                        <Calendar size={14} className="text-gray-400 mr-2"/>
                        <input 
                            type="date" 
                            className="bg-transparent text-white text-sm outline-none py-1.5"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            disabled={isBulkDownloading}
                        />
                    </div>
                    
                    <button 
                        onClick={handleSelectByDate}
                        disabled={isBulkDownloading}
                        className="text-gray-300 hover:text-white px-3 py-1.5 rounded text-sm font-medium bg-gray-700 hover:bg-gray-600 flex items-center transition-colors"
                    >
                        <CheckSquare size={14} className="mr-1.5"/> Chọn ngày
                    </button>

                    {selectedIds.length > 0 && (
                        <>
                            <button 
                                onClick={handleDownloadSelected}
                                disabled={isBulkDownloading}
                                className={`text-white px-4 py-1.5 rounded text-sm font-bold flex items-center shadow transition-colors ${
                                    isBulkDownloading ? 'bg-gray-600 cursor-wait' : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                            >
                                {isBulkDownloading ? (
                                    <><Loader size={14} className="mr-2 animate-spin"/> {downloadProgress}</>
                                ) : (
                                    <><FolderDown size={14} className="mr-2"/> Tải {selectedIds.length} ảnh (.zip)</>
                                )}
                            </button>
                            
                            <button 
                                onClick={handleClearSelection}
                                disabled={isBulkDownloading}
                                className="text-red-400 hover:text-red-300 px-2 py-1.5"
                                title="Bỏ chọn tất cả"
                            >
                                <MinusCircle size={18} />
                            </button>
                        </>
                    )}
                </div>
            )}

            {canUpload && (
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center shadow-lg font-bold ml-auto xl:ml-0"
                >
                    <Upload size={18} className="mr-2"/> Tải ảnh lên
                </button>
            )}
        </div>
      </div>

      {/* Library Content */}
      {canViewLibrary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {importImages.length > 0 ? (
                importImages.map(img => {
                    const isSelected = selectedIds.includes(img.id);
                    return (
                        <div key={img.id} className={`bg-gray-800 rounded-xl overflow-hidden shadow-lg border transition-all group relative ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700'}`}>
                            {/* Selection Checkbox (Admin Only) */}
                            {canDownload && (
                                <div 
                                    className="absolute top-2 left-2 z-20 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleSelection(img.id); }}
                                >
                                    {isSelected ? (
                                        <div className="bg-blue-600 text-white rounded shadow-md"><CheckSquare size={24} /></div>
                                    ) : (
                                        <div className="bg-gray-900/80 text-gray-400 rounded hover:text-white shadow-md"><Square size={24} /></div>
                                    )}
                                </div>
                            )}

                            <div 
                                className={`h-48 bg-gray-900 overflow-hidden relative ${canZoom ? 'cursor-pointer' : 'cursor-default'}`}
                                onClick={() => canZoom && setSelectedImage(img)}
                            >
                                <img 
                                    src={img.url} 
                                    alt={img.description} 
                                    className={`w-full h-full object-cover transition-transform duration-300 ${isSelected ? 'scale-95' : 'group-hover:scale-110'}`}
                                />
                                {canZoom && (
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <Eye size={32} className="text-white drop-shadow-md"/>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-3">
                                <p className="text-white font-bold text-sm truncate" title={img.description}>{img.description}</p>
                                <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                                    <span className="flex items-center"><User size={10} className="mr-1"/> {img.uploaderName}</span>
                                    <span className="flex items-center"><Calendar size={10} className="mr-1"/> {new Date(img.timestamp).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                {canDownload && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownloadImage(img); }}
                                        className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg hover:bg-blue-500"
                                        title="Tải ảnh này"
                                    >
                                        <Download size={16} />
                                    </button>
                                )}
                                {canDelete && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(img.id); }}
                                        className="bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-500"
                                        title="Xóa ảnh"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="col-span-full py-20 text-center text-gray-500">
                    <Database size={48} className="mx-auto mb-4 opacity-50"/>
                    <p>Chưa có dữ liệu nào được tải lên.</p>
                </div>
            )}
          </div>
      ) : (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
              <Lock size={48} className="mx-auto mb-4 text-gray-600"/>
              <h3 className="text-xl font-bold text-gray-400">Quyền truy cập bị hạn chế</h3>
          </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <Upload className="mr-2 text-green-500"/> Tải ảnh nhập hàng
                    </h3>
                    <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>

                <form onSubmit={handleUpload} className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div 
                        className="border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-gray-750 transition-colors relative shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="text-center text-gray-500 py-4">
                            <ImagePlus size={32} className="mx-auto mb-2" />
                            <span className="text-sm">Nhấn để chọn một hoặc nhiều ảnh</span>
                        </div>
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-900/50 p-2 rounded border border-gray-700">
                        {uploadPreviews.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {uploadPreviews.map((url, idx) => (
                                    <div key={idx} className="relative group aspect-square">
                                        <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded border border-gray-600" />
                                        <button 
                                            type="button"
                                            onClick={() => handleRemovePreview(idx)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                        >
                                            <X size={12} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate text-center">
                                            Nhập Hàng {importImages.length + idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                                Chưa có ảnh nào được chọn.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2 shrink-0 border-t border-gray-700">
                        <span className="text-gray-400 text-xs">
                            * Ảnh tự động đặt tên theo số thứ tự
                        </span>
                        <div className="flex space-x-2">
                            <button 
                                type="button" 
                                onClick={() => { setIsUploadModalOpen(false); setUploadPreviews([]); }}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Hủy
                            </button>
                            <button 
                                type="submit" 
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={uploadPreviews.length === 0}
                            >
                                Lưu ({uploadPreviews.length} ảnh)
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* View Image Modal */}
      {selectedImage && canZoom && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                <img src={selectedImage.url} alt={selectedImage.description} className="max-w-full max-h-[85vh] rounded shadow-2xl" />
                <div className="mt-2 text-white bg-gray-900/80 p-3 rounded backdrop-blur-sm flex justify-between items-center">
                    <div>
                        <p className="font-bold">{selectedImage.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Đăng bởi {selectedImage.uploaderName} lúc {new Date(selectedImage.timestamp).toLocaleString('vi-VN')}
                        </p>
                    </div>
                    {canDownload && (
                        <button 
                            onClick={() => handleDownloadImage(selectedImage)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center"
                        >
                            <Download size={18} className="mr-2"/> Tải về
                        </button>
                    )}
                </div>
                <button className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 hover:bg-gray-200" onClick={() => setSelectedImage(null)}><X size={24}/></button>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-red-500/50 shadow-2xl text-center">
                <div className="mx-auto bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4"><Trash2 size={32} className="text-red-500" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Xóa Hình Ảnh?</h3>
                <p className="text-gray-300 text-sm mb-6">Hành động này không thể hoàn tác.</p>
                <div className="flex justify-center space-x-3">
                    <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold">Hủy</button>
                    <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow-lg">Xóa Vĩnh Viễn</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
