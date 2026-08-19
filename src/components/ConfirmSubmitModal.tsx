import React from 'react';
import { TransformerInspectionData } from '../types';
import { GOOGLE_DRIVE_FOLDER_ID } from '../services/googleDriveService';
import { GOOGLE_SPREADSHEET_ID } from '../services/googleSheetsService';
import { AlertTriangle, CheckCircle2, CloudUpload, FileSpreadsheet, FolderGit2, MapPin, X } from 'lucide-react';

interface ConfirmSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: TransformerInspectionData;
  isSubmitting: boolean;
  submitStage: string;
}

export const ConfirmSubmitModal: React.FC<ConfirmSubmitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  isSubmitting,
  submitStage,
}) => {
  if (!isOpen) return null;

  const statusColor =
    data.status === 'PASS'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : data.status === 'WARNING'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';

  const statusLabel =
    data.status === 'PASS'
      ? 'ปกติ (Normal)'
      : data.status === 'WARNING'
      ? 'ผิดปกติ - เฝ้าระวัง (Warning)'
      : data.status === 'FAIL'
      ? 'ชำรุด - ต้องแก้ไขด่วน (Defective)'
      : 'ต้องบำรุงรักษา (Maintenance)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">ยืนยันการบันทึกรายงานผลการตรวจ</h3>
              <p className="text-xs text-slate-500">ข้อมูลจะถูกส่งไปยัง Google Sheets และ Google Drive</p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-4 text-sm">
          {/* Summary Box */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">1. หมายเลขหม้อแปลง:</span>
              <span className="font-bold text-slate-900 font-mono text-base">{data.transformerId}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">2. วันและเวลาตรวจสอบ:</span>
              <span className="font-medium text-slate-800">
                {new Date(data.inspectionDateTime).toLocaleString('th-TH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">3. ผลการตรวจสอบ:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">4. พิกัดตำแหน่ง (GPS):</span>
              <span className="font-medium text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {data.location
                  ? `${data.location.latitude.toFixed(5)}, ${data.location.longitude.toFixed(5)}`
                  : 'ไม่ได้ระบุพิกัด'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">5. ภาพถ่ายหน้างาน:</span>
              <span className="font-semibold text-slate-900">
                {data.photos.length > 0 ? `${data.photos.length} รูปภาพ` : 'ไม่มีรูปภาพแนบ'}
              </span>
            </div>
          </div>

          {/* Destinations */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                บันทึกแถวใหม่ลง <strong>Google Sheets</strong> (ID: <code className="font-mono text-slate-500">{GOOGLE_SPREADSHEET_ID.substring(0, 12)}...</code>)
              </span>
            </div>
            {data.photos.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <FolderGit2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  อัปโหลด {data.photos.length} รูปไปยัง <strong>Google Drive</strong> (โฟลเดอร์ ID: <code className="font-mono text-slate-500">{GOOGLE_DRIVE_FOLDER_ID.substring(0, 12)}...</code>)
                </span>
              </div>
            )}
          </div>

          {/* Progress Banner during submission */}
          {isSubmitting && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 animate-pulse">
              <div className="h-4 w-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin shrink-0" />
              <span className="text-xs font-medium">{submitStage || 'กำลังส่งข้อมูล...'}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200/70 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all disabled:opacity-50 active:scale-98"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันและส่งรายงาน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
