import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getCurrentUser,
  getAccessToken,
} from './services/firebaseAuth';
import { uploadImageToDrive, GOOGLE_DRIVE_FOLDER_ID } from './services/googleDriveService';
import {
  appendInspectionRecord,
  fetchRecentInspectionRecords,
  GOOGLE_SPREADSHEET_ID,
} from './services/googleSheetsService';
import { TransformerInspectionData, SheetRowRecord } from './types';
import { Navbar } from './components/Navbar';
import { InspectionForm } from './components/InspectionForm';
import { InspectionHistory } from './components/InspectionHistory';
import { ConfirmSubmitModal } from './components/ConfirmSubmitModal';
import { ConfigModal } from './components/ConfigModal';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FolderGit2,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Submission state
  const [pendingData, setPendingData] = useState<TransformerInspectionData | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');

  // History state
  const [historyRecords, setHistoryRecords] = useState<SheetRowRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sheetTabTitle, setSheetTabTitle] = useState('');
  const [sheetTabName, setSheetTabName] = useState('');

  // Success / Error Toast notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    links?: { label: string; url: string }[];
    action?: { label: string; onClick: () => void };
  } | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser) => {
        setUser(authUser);
        loadHistory();
      },
      () => {
        setUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToast({
          type: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          message: `ยินดีต้อนรับคุณ ${result.user.displayName || result.user.email} เชื่อมต่อ Google Workspace พร้อมใช้งาน`,
        });
        loadHistory();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setToast({
        type: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        message: err.message || 'กรุณาลองใหม่อีกครั้ง และอนุญาตสิทธิ์การเข้าถึง Google Sheets/Drive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setHistoryRecords([]);
    setToast({
      type: 'info',
      title: 'ออกจากระบบแล้ว',
      message: 'คุณได้ออกจากระบบ Google เรียบร้อยแล้ว',
    });
  };

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { records, title, tabName } = await fetchRecentInspectionRecords(GOOGLE_SPREADSHEET_ID, 50);
      setHistoryRecords(records);
      setSheetTabTitle(title);
      setSheetTabName(tabName);
    } catch (err: any) {
      console.warn('Could not fetch history:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Form submission triggered
  const handleFormSubmitRequest = (data: TransformerInspectionData) => {
    setPendingData(data);
    setIsConfirmOpen(true);
  };

  // User confirmed the submission in the modal
  const handleExecuteSubmission = async () => {
    if (!pendingData) return;

    // Check auth
    const token = await getAccessToken();
    if (!token || !user) {
      setIsConfirmOpen(false);
      alert('กรุณาเข้าสู่ระบบด้วย Google ก่อนส่งรายงาน');
      handleLogin();
      return;
    }

    setIsSubmitting(true);
    const driveLinks: string[] = [];
    const driveFileIds: string[] = [];

    try {
      // Step 1: Upload photos to Google Drive
      if (pendingData.photos.length > 0) {
        setSubmitStage(`กำลังอัปโหลดรูปภาพไปยัง Google Drive (0/${pendingData.photos.length})...`);

        for (let i = 0; i < pendingData.photos.length; i++) {
          const photo = pendingData.photos[i];
          setSubmitStage(
            `กำลังอัปโหลดรูปภาพ (${i + 1}/${pendingData.photos.length}) ไปยังโฟลเดอร์ Google Drive...`
          );

          const res = await uploadImageToDrive(
            photo.blob,
            `TR_${pendingData.transformerId}_${Date.now()}_${i + 1}.jpg`,
            `รูปถ่ายตรวจหม้อแปลง ${pendingData.transformerId} วันที่ ${pendingData.inspectionDateTime}`,
            GOOGLE_DRIVE_FOLDER_ID
          );

          driveLinks.push(res.directUrl);
          driveFileIds.push(res.fileId);
        }
      }

      // Step 2: Append row into Google Sheet
      setSubmitStage('กำลังบันทึกข้อมูลลงในตาราง Google Sheets...');
      await appendInspectionRecord(
        pendingData,
        driveLinks,
        driveFileIds,
        GOOGLE_SPREADSHEET_ID
      );

      // Success
      setIsConfirmOpen(false);
      setPendingData(null);

      const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`;
      const driveUrl = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

      setToast({
        type: 'success',
        title: 'บันทึกรายงานผลการตรวจสำเร็จเรียบร้อย! 🎉',
        message: `หมายเลขหม้อแปลง ${pendingData.transformerId} ถูกบันทึกลงใน Google Sheet และอัปโหลดภาพ ${driveLinks.length} รูปลง Google Drive เรียบร้อยแล้ว`,
        links: [
          { label: 'เปิดดูใน Google Sheet', url: sheetsUrl },
          { label: 'เปิดดูโฟลเดอร์ Google Drive', url: driveUrl },
        ],
      });

      // Reload history & switch to history tab to view newly saved record
      await loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Submission error:', err);
      const isScopeError = err.message?.includes('สิทธิ์') || err.message?.includes('scope') || err.message?.includes('403');
      setToast({
        type: 'error',
        title: isScopeError ? 'จำเป็นต้องอนุญาตสิทธิ์ Google Sheets และ Drive' : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        message: err.message || 'ไม่สามารถส่งข้อมูลไปยัง Google Sheets/Drive ได้',
        action: isScopeError
          ? {
              label: 'เข้าสู่ระบบและให้สิทธิ์ใหม่ (Re-authenticate)',
              onClick: () => handleLogin(),
            }
          : undefined,
      });
    } finally {
      setIsSubmitting(false);
      setSubmitStage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Header */}
      <Navbar
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConfig={() => setIsConfigOpen(true)}
        historyCount={historyRecords.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Unauthenticated Alert Banner */}
        {!user && (
          <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 sm:mt-0">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  เข้าสู่ระบบด้วย Google เพื่อบันทึกข้อมูล
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  ระบบจะบันทึกผลการตรวจสอบลงใน <strong>Google Sheet</strong> และส่งรูปภาพเข้า{' '}
                  <strong>Google Drive</strong> โดยอัตโนมัติ
                </p>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm shrink-0 active:scale-98"
            >
              {isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ทันที'}
            </button>
          </div>
        )}

        {/* Global Toast Alert */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-sky-50 border-sky-300 text-sky-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : toast.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="font-bold text-sm">{toast.title}</h4>
                <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>
                {toast.action && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={toast.action.onClick}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      {toast.action.label}
                    </button>
                  </div>
                )}
                {toast.links && toast.links.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    {toast.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white shadow-xs border border-current hover:opacity-80 transition-opacity"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-current opacity-60 hover:opacity-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'form' ? (
          <InspectionForm
            onSubmitRequest={handleFormSubmitRequest}
            isSubmitting={isSubmitting}
            userEmail={user?.email || ''}
            userName={user?.displayName || ''}
          />
        ) : (
          <InspectionHistory
            records={historyRecords}
            isLoading={isLoadingHistory}
            onRefresh={loadHistory}
            tabTitle={sheetTabTitle}
            sheetTab={sheetTabName}
          />
        )}
      </main>

      {/* Footer info */}
      <footer className="mt-auto py-6 border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ระบบรายงานผลการตรวจสอบหม้อแปลงไฟฟ้า (Transformer Inspection Reporter)</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-400">Sheet: 1uLDBo... | Drive: 1KCjYo...</span>
          </div>
        </div>
      </footer>

      {/* Confirmation Modal */}
      {pendingData && (
        <ConfirmSubmitModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleExecuteSubmission}
          data={pendingData}
          isSubmitting={isSubmitting}
          submitStage={submitStage}
        />
      )}

      {/* Config & Verification Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        isAuthenticated={!!user}
      />
    </div>
  );
}
