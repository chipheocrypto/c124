import { createClient } from '@supabase/supabase-js';

// CẤU HÌNH SUPABASE (Sử dụng biến môi trường chuẩn Vite)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// Chỉ khởi tạo nếu có key, tránh lỗi crash app
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : undefined;