import { getAccessToken } from './firebaseAuth';

export const GOOGLE_DRIVE_FOLDER_ID = '1KCjYoaq5BgTTvhYULvqi_jXDI-ElxthR';

interface UploadResult {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  directUrl: string;
}

// Resilient fetch with Exponential Backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if ((res.status === 429 || res.status >= 500) && retries > 0) {
      console.warn(`Drive API rate limited or server error (${res.status}). Retrying in ${backoff}ms...`);
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
 * Uploads an image blob to the configured Google Drive folder using multipart upload
 */
export async function uploadImageToDrive(
  blob: Blob,
  fileName: string,
  description?: string,
  folderId = GOOGLE_DRIVE_FOLDER_ID
): Promise<UploadResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่ออนุญาตการอัปโหลดไฟล์ไปยัง Google Drive');
  }

  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : [],
    description: description || 'รูปถ่ายผลการตรวจสอบหม้อแปลงไฟฟ้าหน้างานจริง',
    mimeType: blob.type || 'image/jpeg',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  form.append('file', blob, fileName);

  const res = await fetchWithRetry(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(`เกิดข้อผิดพลาดในการอัปโหลดภาพขึ้น Google Drive (${res.status}): ${errorDetail}`);
  }

  const data = await res.json();
  const fileId = data.id;
  const webViewLink = data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  const directUrl = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

  return {
    fileId,
    name: data.name || fileName,
    webViewLink,
    webContentLink: data.webContentLink,
    directUrl,
  };
}

/**
 * Validates access to the specified Google Drive folder
 */
export async function checkDriveFolderAccess(folderId = GOOGLE_DRIVE_FOLDER_ID): Promise<{ accessible: boolean; folderName?: string; error?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { accessible: false, error: 'ยังไม่ได้เข้าสู่ระบบ Google' };
  }

  try {
    const res = await fetchWithRetry(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,capabilities`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      return { accessible: true, folderName: data.name };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        accessible: false,
        error: errData?.error?.message || `HTTP ${res.status}: ไม่สามารถเข้าถึงโฟลเดอร์ได้`,
      };
    }
  } catch (err: any) {
    return { accessible: false, error: err.message || 'การเชื่อมต่อขัดข้อง' };
  }
}
