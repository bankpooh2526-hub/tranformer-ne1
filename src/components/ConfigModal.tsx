import React, { useState } from 'react';
import { GOOGLE_DRIVE_FOLDER_ID, checkDriveFolderAccess } from '../services/googleDriveService';
import { GOOGLE_SPREADSHEET_ID, getFirstSheetTabName } from '../services/googleSheetsService';
import { ExternalLink, FileSpreadsheet, Folder, CheckCircle2, XCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, isAuthenticated }) => {
  const [testing, setTesting] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ tested: boolean; ok: boolean; msg: string }>({
    tested: false,
    ok: false,
    msg: '',
  });
  const [sheetsStatus, setSheetsStatus] = useState<{ tested: boolean; ok: boolean; msg: string }>({
    tested: false,
    ok: false,
    msg: '',
  });

  if (!isOpen) return null;

  const handleTestConnections = async () => {
    if (!isAuthenticated) {
      alert('กรุณาลงชื่อเข้าใช้ด้วย Google ก่อนทดสอบการเชื่อมต่อ');
      return;
    }
    setTesting(true);
    setDriveStatus({ tested: false, ok: false, msg: '' });
    setSheetsStatus({ tested: false, ok: false, msg: '' });

    try {
      // Test Sheets
      try {
        const sheetInfo = await getFirstSheetTabName(GOOGLE_SPREADSHEET_ID);
        setSheetsStatus({
          tested: true,
          ok: true,
          msg: `เชื่อมต่อสำเร็จ: แผ่นงาน "${sheetInfo.tabName}" ในสเปรดชีต "${sheetInfo.title}"`,
        });
      } catch (err: any) {
        setSheetsStatus({
          tested: true,
          ok: false,
          msg: err.message || 'ไม่สามารถเปิดอ่าน Google Sheets ได้',
        });
      }

      // Test Drive
      try {
        const driveInfo = await checkDriveFolderAccess(GOOGLE_DRIVE_FOLDER_ID);
        setDriveStatus({
          tested: true,
          ok: driveInfo.accessible,
          msg: driveInfo.accessible
            ? `เข้าถึงโฟลเดอร์สำเร็จ: "${driveInfo.folderName || 'โฟลเดอร์จัดเก็บภาพถ่าย'}"`
            : driveInfo.error || 'ไม่สามารถเข้าถึงโฟลเดอร์ได้',
        });
      } catch (err: any) {
        setDriveStatus({
          tested: true,
          ok: false,
          msg: err.message || 'ไม่สามารถติดต่อ Google Drive ได้',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const driveFolderUrl = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">การตั้งค่า Google Sheets & Drive</h3>
            <p className="text-xs text-slate-500">ปลายทางจัดเก็บข้อมูลและรูปถ่ายการตรวจสอบ</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* Google Sheets Destination Card */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-slate-900">Google Sheet ปลายทาง</span>
              </div>
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                เปิดในชีต <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="font-mono text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-200/60 break-all select-all">
              ID: {GOOGLE_SPREADSHEET_ID}
            </div>
            {sheetsStatus.tested && (
              <div
                className={`text-xs p-2 rounded-md flex items-center gap-1.5 ${
                  sheetsStatus.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {sheetsStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{sheetsStatus.msg}</span>
              </div>
            )}
          </div>

          {/* Google Drive Folder Destination Card */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-sky-600" />
                <span className="font-semibold text-slate-900">Google Drive โฟลเดอร์รูปภาพ</span>
              </div>
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 hover:underline"
              >
                เปิดโฟลเดอร์ <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="font-mono text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-sky-200/60 break-all select-all">
              Folder ID: {GOOGLE_DRIVE_FOLDER_ID}
            </div>
            {driveStatus.tested && (
              <div
                className={`text-xs p-2 rounded-md flex items-center gap-1.5 ${
                  driveStatus.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {driveStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{driveStatus.msg}</span>
              </div>
            )}
          </div>

          {!isAuthenticated && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>โปรดกดปุ่ม <strong>Sign in with Google</strong> เพื่อให้ระบบมีสิทธิ์เขียนไฟล์ลงชีตและไดรฟ์</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnections}
            disabled={testing || !isAuthenticated}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
