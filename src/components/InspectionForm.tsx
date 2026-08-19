import React, { useState, useEffect, useRef } from 'react';
import {
  TransformerInspectionData,
  InspectionStatus,
  InspectionChecklistItem,
  GpsLocation,
  AttachedPhoto,
} from '../types';
import { getCurrentLocation, getGoogleMapsUrl } from '../utils/geoUtils';
import { compressAndWatermarkImage } from '../utils/imageCompressor';
import { CameraModal } from './CameraModal';
import {
  Camera,
  Upload,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Trash2,
  Crosshair,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Sparkles,
  Save,
} from 'lucide-react';

interface InspectionFormProps {
  onSubmitRequest: (data: TransformerInspectionData) => void;
  isSubmitting: boolean;
  userEmail?: string;
  userName?: string;
}

const DEFAULT_CHECKLIST: InspectionChecklistItem[] = [
  { id: 'c1', label: 'สภาพตัวถังภายนอก (ไม่มีสนิม ไม่บุบ รอยเชื่อมสมบูรณ์)', category: 'physical', checked: true },
  { id: 'c2', label: 'ระดับน้ำมันหม้อแปลง (อยู่ในระดับปกติที่เกจวัด)', category: 'oil', checked: true },
  { id: 'c3', label: 'การรั่วซึมของน้ำมัน (ไม่พบรอยรั่วซึมตามซีลและวาล์ว)', category: 'oil', checked: true },
  { id: 'c4', label: 'อุณหภูมิผิวหม้อแปลง / ข้อต่อ (ไม่ร้อนผิดปกติ)', category: 'physical', checked: true },
  { id: 'c5', label: 'บุชชิ่งแรงสูงและแรงต่ำ (สะอาด ไม่แตกร้าว ไม่มีคราบเขม่า)', category: 'electrical', checked: true },
  { id: 'c6', label: 'ระบบสายดินและขั้วกราวด์ (ยึดแน่นหนา ไม่ขาดชำรุด)', category: 'electrical', checked: true },
  { id: 'c7', label: 'เสียงการทำงาน (Humming สม่ำเสมอ ไม่มีเสียง Arcing)', category: 'physical', checked: true },
  { id: 'c8', label: 'สารดูดความชื้นซิลิกาเจล (Silica Gel สียังปกติ ไม่เสื่อมสภาพ)', category: 'environment', checked: true },
];

export const InspectionForm: React.FC<InspectionFormProps> = ({
  onSubmitRequest,
  isSubmitting,
  userEmail = '',
  userName = '',
}) => {
  // 1. หมายเลขหม้อแปลง
  const [transformerId, setTransformerId] = useState('');
  const [transformerSubstation, setTransformerSubstation] = useState('');
  const [transformerCapacity, setTransformerCapacity] = useState('');

  // 2. วันและเวลาในการกรอก
  const [inspectionDateTime, setInspectionDateTime] = useState<string>(() => {
    const now = new Date();
    // Format to YYYY-MM-DDTHH:mm
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  // 3. ผลการตรวจสอบ
  const [status, setStatus] = useState<InspectionStatus>('PASS');
  const [statusDescription, setStatusDescription] = useState('สภาพทั่วไปปกติพร้อมใช้งาน');
  const [detailedNotes, setDetailedNotes] = useState('');
  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>(DEFAULT_CHECKLIST);

  // 4. พิกัดตำแหน่ง
  const [location, setLocation] = useState<GpsLocation | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 5. รูปถ่ายหน้างานจริง
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [applyWatermark, setApplyWatermark] = useState(true);

  // Inspector details
  const [inspectorName, setInspectorName] = useState(userName || '');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update inspector name if user prop changes
  useEffect(() => {
    if (userName && !inspectorName) {
      setInspectorName(userName);
    }
  }, [userName]);

  // Quick auto-fetch GPS on component mount for convenience
  useEffect(() => {
    handleGetGps(false);
  }, []);

  const handleSetCurrentDateTime = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setInspectionDateTime(local.toISOString().slice(0, 16));
  };

  const handleGetGps = async (showErrorAlert = true) => {
    setIsFetchingGps(true);
    setGpsError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err: any) {
      setGpsError(err.message || 'ไม่สามารถรับพิกัดตำแหน่งได้');
      if (showErrorAlert) {
        console.warn('GPS Error:', err.message);
      }
    } finally {
      setIsFetchingGps(false);
    }
  };

  const handleChecklistToggle = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextChecked = !item.checked;
          // Auto adjust status recommendation if unchecked
          if (!nextChecked && status === 'PASS') {
            setStatus('WARNING');
            setStatusDescription('พบรายการตรวจเช็คที่ไม่ผ่านเกณฑ์');
          }
          return { ...item, checked: nextChecked };
        }
        return item;
      })
    );
  };

  const processAndAddPhoto = async (fileOrBlob: File | Blob, rawFileName: string) => {
    setIsProcessingPhoto(true);
    try {
      const watermarkData = applyWatermark
        ? {
            transformerId: transformerId || 'TR-UNSPECIFIED',
            dateTime: new Date(inspectionDateTime).toLocaleString('th-TH'),
            coordinates: location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : undefined,
            inspector: inspectorName || userEmail || 'Inspector',
          }
        : undefined;

      const result = await compressAndWatermarkImage(
        fileOrBlob,
        rawFileName,
        watermarkData,
        1600,
        1600,
        0.82
      );

      const newPhoto: AttachedPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        blob: result.blob,
        previewUrl: result.previewUrl,
        fileName: rawFileName.endsWith('.jpg') ? rawFileName : `${rawFileName}.jpg`,
        fileSize: result.size,
        timestamp: new Date().toISOString(),
      };

      setPhotos((prev) => [...prev, newPhoto]);
    } catch (err: any) {
      alert(`ประมวลผลรูปภาพไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = `TR_${transformerId ? transformerId.replace(/\s+/g, '_') : 'PHOTO'}_${Date.now()}_${i + 1}.jpg`;
      await processAndAddPhoto(file, name);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transformerId.trim()) {
      alert('กรุณากรอก "หมายเลขหม้อแปลง"');
      return;
    }

    if (!inspectionDateTime) {
      alert('กรุณาระบุ "วันและเวลาในการกรอก"');
      return;
    }

    const payload: TransformerInspectionData = {
      transformerId: transformerId.trim().toUpperCase(),
      inspectionDateTime,
      status,
      statusDescription,
      detailedNotes,
      checklist,
      location,
      photos,
      inspectorName: inspectorName || userName || 'เจ้าหน้าที่ตรวจสอบ',
      inspectorEmail: userEmail,
      transformerSubstation,
      transformerCapacityKVA: transformerCapacity,
    };

    onSubmitRequest(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---------------- 1. หมายเลขหม้อแปลง ---------------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">หมายเลขหม้อแปลงไฟฟ้า (Transformer ID)</h2>
            <p className="text-xs text-slate-500">ระบุรหัสประจำตัวของหม้อแปลง หรือชื่อสถานีที่ติดตั้ง</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              หมายเลขหม้อแปลง <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="เช่น TR-2024-089 หรือ TX-กฟภ-04"
                value={transformerId}
                onChange={(e) => setTransformerId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all uppercase placeholder:font-sans placeholder:font-normal"
              />
              <Zap className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ขนาดพิกัด (kVA / kVolt)
            </label>
            <input
              type="text"
              placeholder="เช่น 100 kVA, 22 kV"
              value={transformerCapacity}
              onChange={(e) => setTransformerCapacity(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            สถานีไฟฟ้า / จุดติดตั้ง / ซอย (Substation / Location Name)
          </label>
          <input
            type="text"
            placeholder="เช่น สถานีย่อยสุขุมวิท 71, เสาต้นที่ 14 หน้านิคมฯ"
            value={transformerSubstation}
            onChange={(e) => setTransformerSubstation(e.target.value)}
            className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
      </section>

      {/* ---------------- 2. วันและเวลาในการกรอก ---------------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">วันและเวลาในการตรวจ (Date & Time)</h2>
              <p className="text-xs text-slate-500">วันเวลาที่ลงตรวจจริงหน้างาน</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSetCurrentDateTime}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ใช้เวลาปัจจุบัน</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              วันและเวลาที่ตรวจสอบ <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={inspectionDateTime}
              onChange={(e) => setInspectionDateTime(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อผู้ตรวจสอบ / ผู้รายงาน
            </label>
            <input
              type="text"
              placeholder="ชื่อ-นามสกุล หรือรหัสพนักงาน"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>
      </section>

      {/* ---------------- 3. ผลการตรวจสอบ ---------------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">ผลการตรวจสอบ (Inspection Result)</h2>
            <p className="text-xs text-slate-500">ประเมินสถานะความพร้อมและรายการตรวจเช็คทางกายภาพ</p>
          </div>
        </div>

        {/* Status Selection Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            สถานะผลการตรวจภาพรวม <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* PASS */}
            <button
              type="button"
              onClick={() => {
                setStatus('PASS');
                setStatusDescription('สภาพทั่วไปปกติพร้อมใช้งาน ไม่มีข้อบกพร่อง');
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                status === 'PASS'
                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  status === 'PASS' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">ปกติ (Normal)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">หม้อแปลงสมบูรณ์ พร้อมจ่ายไฟ</p>
              </div>
            </button>

            {/* WARNING */}
            <button
              type="button"
              onClick={() => {
                setStatus('WARNING');
                setStatusDescription('พบความผิดปกติเล็กน้อย ควรเฝ้าระวังหรือวางแผนตรวจซ้ำ');
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                status === 'WARNING'
                  ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  status === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">ผิดปกติ - เฝ้าระวัง (Warning)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">มีสัญญาณเริ่มเสื่อมสภาพหรือรั่วซึมเล็กน้อย</p>
              </div>
            </button>

            {/* FAIL */}
            <button
              type="button"
              onClick={() => {
                setStatus('FAIL');
                setStatusDescription('พบจุดชำรุดรุนแรง ต้องแก้ไขด่วนเพื่อป้องกันหม้อแปลงระเบิด/ดับ');
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                status === 'FAIL'
                  ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  status === 'FAIL' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">ชำรุด - ต้องแก้ไขด่วน (Defective)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">มีความเสี่ยงสูง ต้องส่งทีมบำรุงรักษาทันที</p>
              </div>
            </button>
          </div>
        </div>

        {/* Checklist Section */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>รายการตรวจเช็คมาตรฐาน (Standard Inspection Checklist)</span>
            <span className="text-[11px] text-slate-500 font-normal">
              ผ่าน {checklist.filter((i) => i.checked).length}/{checklist.length} รายการ
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
            {checklist.map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer select-none transition-colors ${
                  item.checked ? 'hover:bg-white' : 'bg-rose-50/60 border border-rose-200/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleChecklistToggle(item.id)}
                  className="mt-0.5 h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 rounded-sm"
                />
                <span
                  className={`text-xs leading-relaxed ${
                    item.checked ? 'text-slate-700' : 'text-rose-700 font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary Description & Detailed Notes */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              สรุปข้อวินิจฉัย / สาเหตุ
            </label>
            <input
              type="text"
              value={statusDescription}
              onChange={(e) => setStatusDescription(e.target.value)}
              placeholder="ระบุข้อความสรุปสั้นๆ เช่น ระดับน้ำมันต่ำกว่าเกณฑ์ หรือ อุณหภูมิปกติ"
              className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รายละเอียดเพิ่มเติม / ข้อเสนอแนะในการซ่อมบำรุง
            </label>
            <textarea
              rows={2}
              value={detailedNotes}
              onChange={(e) => setDetailedNotes(e.target.value)}
              placeholder="ระบุอาการผิดปกติเพิ่มเติม เช่น พบคราบน้ำมันซึมที่บุชชิ่ง H2, ได้ยินเสียง Humming ดังผิดปกติ, จำเป็นต้องเปลี่ยน Silica gel..."
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>
      </section>

      {/* ---------------- 4. พิกัดตำแหน่ง ---------------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">พิกัดตำแหน่ง (GPS Location)</h2>
              <p className="text-xs text-slate-500">บันทึกตำแหน่งทางภูมิศาสตร์ของหม้อแปลง</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGetGps(true)}
            disabled={isFetchingGps}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200/80 transition-colors disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
            <span>{isFetchingGps ? 'กำลังระบุพิกัด...' : 'ตรวจจับ GPS ปัจจุบัน'}</span>
          </button>
        </div>

        {location ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                {location.accuracy && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    ความแม่นยำ ±{Math.round(location.accuracy)} เมตร
                  </span>
                )}
              </div>

              <a
                href={getGoogleMapsUrl(location.latitude, location.longitude)}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
              >
                <span>เปิดดูใน Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {location.address && (
              <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                📍 {location.address}
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 bg-slate-50/50">
            {gpsError ? (
              <p className="text-xs text-rose-600 font-medium mb-2">{gpsError}</p>
            ) : (
              <p className="text-xs mb-2">ยังไม่มีพิกัดตำแหน่ง กดปุ่มตรวจจับ GPS เพื่อบันทึกพิกัดอัตโนมัติ</p>
            )}
            <button
              type="button"
              onClick={() => handleGetGps(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              <span>กดเพื่อรับพิกัดดาวเทียม</span>
            </button>
          </div>
        )}
      </section>

      {/* ---------------- 5. แนบรูปถ่ายหน้างานจริง ---------------- */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
              5
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">แนบรูปถ่ายหน้างานจริง (On-Site Photos)</h2>
              <p className="text-xs text-slate-500">ภาพจะถูกอัปโหลดเข้า Google Drive โฟลเดอร์ที่กำหนดโดยอัตโนมัติ</p>
            </div>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyWatermark}
              onChange={(e) => setApplyWatermark(e.target.checked)}
              className="h-3.5 w-3.5 text-amber-600 rounded"
            />
            <span>ฝังลายน้ำ ID / พิกัด / วันเวลา</span>
          </label>
        </div>

        {/* Photo Upload Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            disabled={isProcessingPhoto}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-98 disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>เปิดกล้องถ่ายภาพ</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingPhoto}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all active:scale-98 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>เลือกรูปจากอุปกรณ์</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {isProcessingPhoto && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
            <span>กำลังปรับขนาดภาพและเพิ่มลายน้ำข้อมูล...</span>
          </div>
        )}

        {/* Photos Grid Display */}
        {photos.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs"
                >
                  <img
                    src={photo.previewUrl}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                  {/* Photo Index Badge */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    #{index + 1}
                  </span>

                  {/* File size info */}
                  <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white/90">
                    {(photo.fileSize / 1024).toFixed(0)} KB
                  </span>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-2 right-2 p-1 rounded-md bg-rose-600/90 text-white hover:bg-rose-600 transition-colors shadow-xs"
                    title="ลบรูปนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              แนบแล้ว {photos.length} รูป (รูปภาพจะถูกบีบอัดอัตโนมัติเพื่อประหยัดเน็ตภาคสนามและส่งข้อมูลได้รวดเร็ว)
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
            ยังไม่ได้แนบรูปถ่ายหน้างาน สามารถกดเปิดกล้องถ่ายภาพ หรือเลือกรูปจากอัลบั้มได้
          </div>
        )}
      </section>

      {/* ---------------- Final Submit Button ---------------- */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !transformerId.trim()}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-base font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Save className="w-5 h-5" />
          <span>บันทึกผลการตรวจและส่งข้อมูล</span>
        </button>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(blob, fileName) => processAndAddPhoto(blob, fileName)}
      />
    </form>
  );
};
