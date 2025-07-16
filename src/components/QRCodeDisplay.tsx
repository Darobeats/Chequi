import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  value, 
  size = 64, 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(console.error);
    }
  }, [value, size]);

  if (!value) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-800 rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-red-400">Sin QR</span>
      </div>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <canvas 
        ref={canvasRef}
        className="border border-gray-600 rounded"
        width={size}
        height={size}
      />
    </div>
  );
};

export default QRCodeDisplay;