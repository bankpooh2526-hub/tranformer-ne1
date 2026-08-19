import React, { useState } from 'react';
import { SheetRowRecord } from '../types';
import { GOOGLE_SPREADSHEET_ID } from '../services/googleSheetsService';
import { GOOGLE_DRIVE_FOLDER_ID } from '../services/googleDriveService';
import {
  ExternalLink,
  Search,
  RefreshCw,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileSpreadsheet,
  Folder,
  Calendar,
  User,
  Zap,
} from 'lucide-react';

interface InspectionHistoryProps {
  records: SheetRowRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  tabTitle: string;
  sheetTab: string;
}

export const InspectionHistory: React.FC<InspectionHistoryProps> = ({
  records,
  isLoading,
  onRefresh,
  tabTitle,
  sheetTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.transformerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.statusNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.inspector.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PASS'
        ? r.status.includes('ปกติ') || r.status.includes('Normal') || r.status.includes('PASS')
        : statusFilter === 'WARNING'
        ? r.status.includes('เฝ้าระวัง') || r.status.includes('Warning')
        : statusFilter === 'FAIL'
        ? r.status.includes('ชำรุด') || r.status.includes('Defective') || r.status.includes('FAIL')
        : true;

    return matchesSearch && matchesStatus;
  });

  const totalCount = records.length;
  const passCount = records.filter(
    (r) => r.status.includes('ปกติ') || r.status.includes('Normal') || r.status.includes('PASS')
  ).length;
  const warnCount = records.filter(
    (r) => r.status.includes('เฝ้าระวัง') || r.status.includes('Warning')
  ).length;
  const failCount = records.filter(
    (r) => r.status.includes('ชำรุด') || r.status.includes('Defective') || r.status.includes('FAIL')
  ).length;

  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`;
  const driveFolderUrl = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>ประวัติการรายงานผลการตรวจสอบหม้อแปลง</span>
            {records.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {records.length} รายการ
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ข้อมูลดึงสดจาก Google Sheet: <strong>{tabTitle || 'ตารางรายงาน'}</strong> (แผ่นงาน: {sheetTab || 'Sheet1'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
          <a
            href={sheetsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>เปิด Google Sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 transition-colors"
          >
            <Folder className="w-4 h-4 text-sky-600" />
            <span>เปิดโฟลเดอร์ภาพ Drive</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">รายงานทั้งหมด</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">ปกติ (Normal)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{passCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">เฝ้าระวัง (Warning)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-1">{warnCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700">ชำรุด/แก้ไขด่วน</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-900 mt-1">{failCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยหมายเลขหม้อแปลง, รายละเอียด หรือผู้ตรวจ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            ทั้งหมด ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('PASS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'PASS'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            ปกติ ({passCount})
          </button>
          <button
            onClick={() => setStatusFilter('WARNING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'WARNING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            เฝ้าระวัง ({warnCount})
          </button>
          <button
            onClick={() => setStatusFilter('FAIL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'FAIL'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            ชำรุด ({failCount})
          </button>
        </div>
      </div>

      {/* History List / Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">กำลังโหลดรายการจาก Google Sheet...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">ยังไม่พบรายการรายงานที่ตรงกัน</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองสถานะ'
              : 'เริ่มต้นกรอกแบบฟอร์มตรวจสอบหม้อแปลงเพื่อบันทึกแถวแรก'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const isPass = rec.status.includes('ปกติ') || rec.status.includes('Normal') || rec.status.includes('PASS');
            const isWarn = rec.status.includes('เฝ้าระวัง') || rec.status.includes('Warning');
            const isFail = rec.status.includes('ชำรุด') || rec.status.includes('Defective') || rec.status.includes('FAIL');

            const statusBadgeClass = isPass
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isWarn
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200';

            const photoLinks = rec.driveImageUrl ? rec.driveImageUrl.split('\n').filter(Boolean) : [];

            return (
              <div
                key={rec.rowNumber}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-3"
              >
                {/* Header: Transformer ID + Status + Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-base text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {rec.transformerId}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass}`}>
                      {rec.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>ตรวจเมื่อ: {rec.inspectionDateTime || rec.timestamp}</span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Notes and Checklist */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 font-medium block mb-0.5">ผลการตรวจ / อาการ:</span>
                      <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        {rec.statusNotes || 'ไม่มีบันทึกเพิ่มเติม'}
                      </p>
                    </div>

                    {rec.checklistSummary && rec.checklistSummary !== 'ไม่มีรายการเช็คลิสต์' && (
                      <div>
                        <span className="text-slate-400 font-medium block mb-0.5">รายการตรวจ:</span>
                        <p className="text-slate-600 bg-slate-50/60 p-2 rounded-lg border border-slate-100/80 text-[11px]">
                          {rec.checklistSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: GPS Location, Photos, Inspector */}
                  <div className="space-y-2.5">
                    {/* Location */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="text-slate-700 font-mono">
                          {rec.latitude && rec.longitude ? `${rec.latitude}, ${rec.longitude}` : 'ไม่มีพิกัด'}
                        </span>
                      </div>
                      {rec.mapsUrl && (
                        <a
                          href={rec.mapsUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                        >
                          <span>เปิดแผนที่</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Drive Photos */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="text-slate-700">
                          {photoLinks.length > 0 ? `แนบรูปภาพ (${photoLinks.length} ไฟล์)` : 'ไม่มีรูปภาพแนบ'}
                        </span>
                      </div>
                      {photoLinks.length > 0 && (
                        <div className="flex items-center gap-2">
                          {photoLinks.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px] font-semibold hover:bg-sky-200 transition-colors"
                            >
                              <span>รูปที่ {i + 1}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inspector */}
                    <div className="flex items-center gap-2 text-slate-500 pt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>ผู้ตรวจ: {rec.inspector || 'ไม่ได้ระบุ'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
