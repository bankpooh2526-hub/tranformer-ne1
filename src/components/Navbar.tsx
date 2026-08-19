import React from 'react';
import { User } from 'firebase/auth';
import {
  Zap,
  FileSpreadsheet,
  FolderGit2,
  Settings2,
  LogOut,
  ClipboardList,
  PlusCircle,
} from 'lucide-react';
import { GOOGLE_SPREADSHEET_ID } from '../services/googleSheetsService';
import { GOOGLE_DRIVE_FOLDER_ID } from '../services/googleDriveService';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  activeTab: 'form' | 'history';
  setActiveTab: (tab: 'form' | 'history') => void;
  onOpenConfig: () => void;
  historyCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  activeTab,
  setActiveTab,
  onOpenConfig,
  historyCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                  ระบบรายงานผลการตรวจสอบหม้อแปลง
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                  ภาคสนาม
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
                บันทึกพิกัด แนบภาพถ่าย ส่งเข้า Google Sheets & Drive
              </p>
            </div>
          </div>

          {/* Center Tabs for Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'form'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              <span>กรอกผลการตรวจ</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-sky-600" />
              <span>ประวัติรายงาน</span>
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Actions: Google Sign-in / User Profile & Config */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenConfig}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              title="ดูการเชื่อมต่อ Google Sheets & Drive"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-semibold">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="hidden lg:block text-left text-xs leading-tight">
                    <p className="font-semibold text-slate-800 truncate max-w-[120px]">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">เชื่อมต่อ Google สำเร็จ</p>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-all disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบ Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center border-t border-slate-100 py-1.5 gap-2">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'form'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>กรอกผลการตรวจ</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>ประวัติ ({historyCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
