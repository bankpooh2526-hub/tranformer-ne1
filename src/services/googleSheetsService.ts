import { getAccessToken } from './firebaseAuth';
import { TransformerInspectionData, SheetRowRecord } from '../types';
import { getGoogleMapsUrl } from '../utils/geoUtils';

export const GOOGLE_SPREADSHEET_ID = '1uLDBoYKdUue2xAooje7W5DO9ab5psH4E_0656hc4BeU';

const HEADERS = [
  'ลำดับ',
  'วันที่-เวลาบันทึกเข้าระบบ',
  'วันและเวลาตรวจหน้างาน',
  'หมายเลขหม้อแปลง',
  'ผลการตรวจสอบ',
  'รายละเอียดผลการตรวจ',
  'รายการเช็คลิสต์ย่อย',
  'พิกัด ละติจูด',
  'พิกัด ลองจิจูด',
  'ลิงก์ Google Maps',
  'ลิงก์รูปถ่าย Google Drive',
  'ID ไฟล์ Drive',
  'ผู้รายงาน/ผู้ตรวจสอบ',
];

// Resilient fetch with Exponential Backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if ((res.status === 429 || res.status >= 500) && retries > 0) {
      console.warn(`Sheets API rate limited or server error (${res.status}). Retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}

/**
 * Gets sheet tab name dynamically to avoid assuming 'Sheet1'
 */
export async function getFirstSheetTabName(spreadsheetId = GOOGLE_SPREADSHEET_ID): Promise<{ tabName: string; title: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อเข้าถึง Google Sheets');
  }

  const res = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const rawMsg = err?.error?.message || '';
    if (res.status === 403 && (rawMsg.includes('insufficient') || rawMsg.includes('scope'))) {
      throw new Error('สิทธิ์การเข้าถึง Google Sheets ไม่เพียงพอ กรุณากดปุ่มออกจากระบบแล้วเข้าสู่ระบบ Google ใหม่อีกครั้งพร้อมกดยินยอมให้สิทธิ์จัดการ Google Sheets และ Drive');
    }
    throw new Error(`ไม่สามารถเปิด Google Sheet (${res.status}): ${rawMsg || 'ข้อผิดพลาดในการเชื่อมต่อ'}`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'หม้อแปลงไฟฟ้า';
  const tabName = data.sheets?.[0]?.properties?.title || 'Sheet1';

  return { tabName, title };
}

/**
 * Ensures header row exists in the spreadsheet tab
 */
export async function ensureHeaderRow(tabName: string, spreadsheetId = GOOGLE_SPREADSHEET_ID): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const range = `${encodeURIComponent(tabName)}!A1:M1`;
  const checkRes = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (checkRes.ok) {
    const data = await checkRes.json();
    if (!data.values || data.values.length === 0 || !data.values[0] || data.values[0].length === 0) {
      // Write headers
      await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [HEADERS],
          }),
        }
      );
    }
  }
}

/**
 * Appends a new transformer inspection record to Google Sheets
 */
export async function appendInspectionRecord(
  data: TransformerInspectionData,
  driveLinks: string[],
  driveFileIds: string[],
  spreadsheetId = GOOGLE_SPREADSHEET_ID
): Promise<{ success: boolean; updatedRange?: string; rowNumber?: number }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อบันทึกข้อมูล');
  }

  const { tabName } = await getFirstSheetTabName(spreadsheetId);
  await ensureHeaderRow(tabName, spreadsheetId);

  // Format checklist summary
  const passedItems = data.checklist.filter((i) => i.checked).map((i) => i.label);
  const failedItems = data.checklist.filter((i) => !i.checked).map((i) => `❌ ${i.label}`);
  const checklistSummary = [
    passedItems.length > 0 ? `ผ่าน: ${passedItems.join(', ')}` : '',
    failedItems.length > 0 ? `ไม่ผ่าน: ${failedItems.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' | ') || 'ไม่มีรายการเช็คลิสต์';

  const systemTimestamp = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedInspectionTime = data.inspectionDateTime.includes('T')
    ? new Date(data.inspectionDateTime).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : data.inspectionDateTime;

  const latStr = data.location ? data.location.latitude.toFixed(6) : '';
  const lngStr = data.location ? data.location.longitude.toFixed(6) : '';
  const mapsUrl = data.location ? getGoogleMapsUrl(data.location.latitude, data.location.longitude) : '';
  const photoUrlStr = driveLinks.join('\n');
  const photoIdsStr = driveFileIds.join(', ');

  const statusLabel =
    data.status === 'PASS'
      ? '✅ ปกติ (Normal)'
      : data.status === 'WARNING'
      ? '⚠️ ผิดปกติ-เฝ้าระวัง (Warning)'
      : data.status === 'FAIL'
      ? '🚨 ชำรุด-ต้องแก้ไขด่วน (Defective)'
      : '🛠️ ต้องบำรุงรักษา (Maintenance Required)';

  const rowValues = [
    `=ROW()-1`, // Row formula for sequential numbering
    systemTimestamp,
    formattedInspectionTime,
    data.transformerId.trim(),
    statusLabel,
    data.statusDescription ? `${data.statusDescription} - ${data.detailedNotes || ''}`.trim() : data.detailedNotes || '-',
    checklistSummary,
    latStr,
    lngStr,
    mapsUrl,
    photoUrlStr || '-',
    photoIdsStr || '-',
    `${data.inspectorName} (${data.inspectorEmail || 'Guest'})`,
  ];

  const appendRange = `${encodeURIComponent(tabName)}!A:M`;
  const res = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const rawMsg = err?.error?.message || '';
    if (res.status === 403 && (rawMsg.includes('insufficient') || rawMsg.includes('scope'))) {
      throw new Error('สิทธิ์การเข้าถึง Google Sheets ไม่เพียงพอ กรุณากดปุ่มออกจากระบบแล้วเข้าสู่ระบบ Google ใหม่อีกครั้งพร้อมกดยินยอมให้สิทธิ์จัดการ Google Sheets และ Drive');
    }
    throw new Error(`บันทึกข้อมูลลง Google Sheets ล้มเหลว (${res.status}): ${rawMsg || 'ข้อผิดพลาด'}`);
  }

  const result = await res.json();
  const updatedRange = result.updates?.updatedRange || '';

  return {
    success: true,
    updatedRange,
  };
}

/**
 * Reads existing inspection history from the Google Sheet
 */
export async function fetchRecentInspectionRecords(
  spreadsheetId = GOOGLE_SPREADSHEET_ID,
  maxRows = 30
): Promise<{ records: SheetRowRecord[]; title: string; tabName: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { records: [], title: '', tabName: '' };
  }

  const { tabName, title } = await getFirstSheetTabName(spreadsheetId);
  const range = `${encodeURIComponent(tabName)}!A2:M100`;

  const res = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    return { records: [], title, tabName };
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  const records: SheetRowRecord[] = rows
    .map((row, idx) => ({
      rowNumber: idx + 2,
      timestamp: row[1] || '',
      inspectionDateTime: row[2] || '',
      transformerId: row[3] || '',
      status: row[4] || '',
      statusNotes: row[5] || '',
      checklistSummary: row[6] || '',
      latitude: row[7] || '',
      longitude: row[8] || '',
      mapsUrl: row[9] || '',
      driveImageUrl: row[10] || '',
      driveFileId: row[11] || '',
      inspector: row[12] || '',
    }))
    .filter((r) => r.transformerId.trim() !== '')
    .reverse() // Show latest first
    .slice(0, maxRows);

  return { records, title, tabName };
}
