import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface ScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

export function Scanner({ onScan, isActive }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // required to tell iOS safari we don't want fullscreen
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err: any) {
        setError(`Camera error: ${err.message}`);
      }
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !isActive) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code) {
            onScan(code.data);
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, onScan]);

  if (!isActive) return null;

  return (
    <div className="ui-relative ui-w-full ui-h-64 ui-bg-gray-200 ui-rounded-md ui-overflow-hidden ui-flex ui-items-center ui-justify-center">
      {error ? (
        <div className="ui-text-red-600 ui-text-center ui-p-4">{error}</div>
      ) : (
        <>
          <video ref={videoRef} className="ui-absolute ui-w-full ui-h-full ui-object-cover" muted />
          <canvas ref={canvasRef} className="ui-hidden" />
          <div className="ui-absolute ui-inset-0 ui-border-4 ui-border-blue-500 ui-opacity-50 ui-m-8 ui-rounded-md" />
        </>
      )}
    </div>
  );
}
