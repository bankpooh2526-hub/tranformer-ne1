export type InspectionStatus = 'PASS' | 'WARNING' | 'FAIL' | 'MAINTENANCE_REQUIRED';

export interface InspectionChecklistItem {
  id: string;
  label: string;
  category: 'physical' | 'oil' | 'electrical' | 'environment';
  checked: boolean;
  notes?: string;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  timestamp?: number;
  address?: string;
}

export interface AttachedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  fileName: string;
  fileSize: number;
  timestamp: string;
  caption?: string;
  driveFileId?: string;
  driveViewLink?: string;
}

export interface TransformerInspectionData {
  id?: string;
  transformerId: string; // 1. หมายเลขหม้อแปลง
  inspectionDateTime: string; // 2. วันและเวลาในการกรอก (ISO string / formatted)
  status: InspectionStatus; // 3. ผลการตรวจสอบ
  statusDescription: string;
  detailedNotes: string;
  checklist: InspectionChecklistItem[];
  location: GpsLocation | null; // 4. พิกัดตำแหน่ง
  photos: AttachedPhoto[]; // 5. รูปถ่ายหน้างานจริง
  inspectorName: string;
  inspectorEmail: string;
  transformerSubstation?: string;
  transformerCapacityKVA?: string;
  oilLevelStatus?: 'NORMAL' | 'LOW' | 'CRITICAL';
  oilTempCelsius?: number | string;
  windingTempCelsius?: number | string;
}

export interface SheetRowRecord {
  rowNumber: number;
  timestamp: string;
  inspectionDateTime: string;
  transformerId: string;
  status: string;
  statusNotes: string;
  checklistSummary: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  driveImageUrl: string;
  driveFileId: string;
  inspector: string;
}

export interface InspectionDraft {
  transformerId: string;
  inspectionDateTime: string;
  status: InspectionStatus;
  statusDescription: string;
  detailedNotes: string;
  checklist: { id: string; checked: boolean; notes?: string }[];
  location: GpsLocation | null;
  savedAt: string;
}
