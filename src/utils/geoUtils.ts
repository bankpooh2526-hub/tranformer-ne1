import { GpsLocation } from '../types';

export function getCurrentLocation(): Promise<GpsLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับการระบุพิกัด GPS (Geolocation)'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc: GpsLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          timestamp: position.timestamp,
        };

        // Try reverse geocoding via OpenStreetMap Nominatim with graceful fallback
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'th,en' },
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            loc.address = data.display_name;
          }
        } catch {
          // Ignore reverse geocode failures (offline/timeout)
        }

        resolve(loc);
      },
      (error) => {
        let msg = 'ไม่สามารถระบุพิกัดได้';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'ผู้ใช้งานปฏิเสธการเข้าถึงสิทธิ์ GPS / Location';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'ไม่พบสัญญาณดาวเทียมหรือไม่สามารถหาตำแหน่งได้ในขณะนี้';
            break;
          case error.TIMEOUT:
            msg = 'หมดเวลาในการค้นหาพิกัด GPS';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
