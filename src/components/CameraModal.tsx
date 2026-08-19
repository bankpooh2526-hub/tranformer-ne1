import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, Zap } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, fileName: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedUrl(null);
      setCapturedBlob(null);
      setCameraError(null);
      return;
    }

    startCamera();

    // Check device camera count
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      });
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopStream();
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'ไม่สามารถเปิดกล้องได้';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'กรุณาอนุญาตการเข้าถึงกล้องถ่ายภาพบนเบราว์เซอร์ของคุณ';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'ไม่พบอุปกรณ์กล้องบนเครื่องนี้';
      }
      setCameraError(message);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(url);
      },
      'image/jpeg',
      0.9
    );
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const fileName = `transformer_photo_${timestamp}.jpg`;
      onCapture(capturedBlob, fileName);
      onClose();
    }
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl(null);
    setCapturedBlob(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold">ถ่ายภาพหน้างานจริง</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-neutral-300">
              <Zap className="w-10 h-10 text-amber-500 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-medium text-red-400 mb-2">{cameraError}</p>
              <p className="text-xs text-neutral-400">คุณสามารถเลือกแนบไฟล์รูปภาพจากอุปกรณ์แทนได้</p>
            </div>
          ) : capturedUrl ? (
            <img src={capturedUrl} alt="Captured preview" className="h-full w-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}

          {/* Guide Overlay Grid */}
          {!capturedUrl && !cameraError && (
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/10 opacity-40">
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
              <div className="border border-white/10" />
            </div>
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-neutral-950 flex items-center justify-around">
          {capturedUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                ถ่ายใหม่
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 shadow-md transition-colors"
              >
                <Check className="w-4 h-4" />
                ใช้รูปนี้
              </button>
            </>
          ) : (
            <>
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-3 rounded-full text-neutral-400 bg-neutral-800 hover:text-white transition-colors"
                  title="สลับกล้องหน้า/หลัง"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleCapture}
                disabled={!!cameraError}
                className="h-16 w-16 rounded-full border-4 border-amber-500 bg-white/90 p-1 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center shadow-lg"
                title="กดเพื่อถ่ายภาพ"
              >
                <div className="h-12 w-12 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors" />
              </button>

              <div className="w-10" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
