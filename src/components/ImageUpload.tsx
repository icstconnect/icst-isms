import React, { useState, useRef, useEffect, TouchEvent } from 'react';
import { Camera, Image as ImageIcon, RotateCw, ZoomIn, ZoomOut, RotateCcw, Check, X, RefreshCw, AlertCircle, FlipHorizontal } from 'lucide-react';

interface ImageUploadProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  label?: string;
  aspectRatio?: number; // width / height, e.g. 0.75 for 3:4 portrait
  targetWidth?: number; // e.g. 600
  targetHeight?: number; // e.g. 800
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  photoUrl,
  onPhotoChange,
  label = "Upload Photograph",
  aspectRatio = 0.75,
  targetWidth = 600,
  targetHeight = 800
}) => {
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  
  // Cropper transform states
  const [cropScale, setCropScale] = useState(1.0);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  // In-App Camera states
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Upload/Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Drag state refs
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  
  // Touch Pinch Zoom refs
  const initialTouchDist = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Clean error after 5s
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

  // Clean camera permissions error
  useEffect(() => {
    if (cameraError) {
      const timer = setTimeout(() => setCameraError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [cameraError]);

  // Sync video stream when camera state changes
  useEffect(() => {
    if (showInAppCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showInAppCamera, cameraStream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Start in-app camera stream
  const startInAppCamera = async (mode: 'user' | 'environment' = 'user') => {
    setCameraError(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setFacingMode(mode);
      setShowInAppCamera(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Unable to open device camera. Falling back to default system capture.");
      // Fallback: trigger system capture input
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 500);
    }
  };

  const stopInAppCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowInAppCamera(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startInAppCamera(nextMode);
  };

  const captureFrame = () => {
    if (!videoRef.current || !cameraStream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, mirror image for natural selfie view
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Load file into cropper
      setTempImageSrc(dataUrl);
      setCropScale(1.0);
      setCropX(0);
      setCropY(0);
      setRotation(0);
      
      stopInAppCamera();
      setShowCropper(true);
    }
  };

  const validateAndLoadFile = (file: File) => {
    setValidationError(null);

    // 1. Format validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setValidationError("Unsupported file format! Only JPG, JPEG, PNG, and WEBP are accepted.");
      return;
    }

    // 2. Size validation (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationError("File is too large! Maximum limit is 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        // 3. Resolution validation (Min 300x400)
        if (img.width < 300 || img.height < 400) {
          setValidationError(`Resolution too low (${img.width}x${img.height}px). Minimum required is 300x400px.`);
          return;
        }

        // Initialize cropper states
        setTempImageSrc(reader.result as string);
        setCropScale(1.0);
        setCropX(0);
        setCropY(0);
        setRotation(0);
        setShowCropper(true);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndLoadFile(file);
    }
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  const handleCameraTrigger = () => {
    // Check if getUserMedia is supported
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      startInAppCamera('user');
    } else {
      // Direct fallback to default system camera capture input
      cameraInputRef.current?.click();
    }
  };

  // --- Drag & Pan Handlers ---
  const handleDragStart = (clientX: number, clientY: number) => {
    isDragging.current = true;
    startX.current = clientX - cropX;
    startY.current = clientY - cropY;
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;
    
    const maxBound = 200 * cropScale;
    setCropX(Math.max(-maxBound, Math.min(maxBound, deltaX)));
    setCropY(Math.max(-maxBound, Math.min(maxBound, deltaY)));
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  // Mouse drag events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleDragMove(e.clientX, e.clientY);
  };

  // Touch drag & pinch zoom events
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDist.current = dist;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && initialTouchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialTouchDist.current;
      const newScale = Math.max(1.0, Math.min(3.0, cropScale * factor));
      setCropScale(newScale);
      initialTouchDist.current = dist;
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
    initialTouchDist.current = null;
  };

  const zoomIn = () => setCropScale(prev => Math.min(3.0, prev + 0.1));
  const zoomOut = () => setCropScale(prev => Math.max(1.0, prev - 0.1));
  const rotateRight = () => setRotation(prev => (prev + 90) % 360);
  const rotateLeft = () => setRotation(prev => (prev + 270) % 360);
  const handleReset = () => {
    setCropScale(1.0);
    setCropX(0);
    setCropY(0);
    setRotation(0);
  };

  // Canvas Crop Drawing & Compression
  const handleCropSave = () => {
    if (!tempImageSrc) return;
    setIsProcessing(true);
    setProgress(10);

    const img = new Image();
    img.src = tempImageSrc;
    img.onload = () => {
      setProgress(40);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Translate context to center for rotation & scaling
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const scale = cropScale;
      const imgRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;
      
      let baseW = targetWidth;
      let baseH = targetHeight;
      if (imgRatio > targetRatio) {
        baseH = targetHeight;
        baseW = targetHeight * imgRatio;
      } else {
        baseW = targetWidth;
        baseH = targetWidth / imgRatio;
      }

      const dw = baseW * scale;
      const dh = baseH * scale;

      let dx = cropX * (targetWidth / 175);
      let dy = cropY * (targetHeight / 225);

      if (rotation === 90) {
        const temp = dx;
        dx = dy;
        dy = -temp;
      } else if (rotation === 180) {
        dx = -dx;
        dy = -dy;
      } else if (rotation === 270) {
        const temp = dx;
        dx = -dy;
        dy = temp;
      }

      ctx.drawImage(img, dx - dw / 2, dy - dh / 2, dw, dh);
      setProgress(70);

      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let sizeKb = Math.round((dataUrl.split(',')[1].length * 3) / 4 / 1024);

      while (sizeKb > 300 && quality > 0.3) {
        quality -= 0.05;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        sizeKb = Math.round((dataUrl.split(',')[1].length * 3) / 4 / 1024);
      }
      setProgress(95);

      setTimeout(() => {
        setProgress(100);
        onPhotoChange(dataUrl);
        setShowCropper(false);
        setIsProcessing(false);
      }, 500);
    };
  };

  return (
    <div className="space-y-4 w-full">
      {/* Hidden inputs */}
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp" 
        capture="user" 
        ref={cameraInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Main Image Upload Box */}
      <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-4 bg-slate-50/50 transition-all flex flex-col items-center justify-center space-y-3 relative group overflow-hidden">
        {photoUrl ? (
          <div className="relative flex flex-col items-center">
            <img 
              src={photoUrl} 
              alt="Cropped Preview" 
              className="w-32 h-40 object-cover rounded-xl shadow-md border-2 border-white ring-4 ring-slate-100" 
            />
            <div className="flex space-x-2 mt-3">
              <button 
                type="button" 
                onClick={handleCameraTrigger}
                className="flex items-center text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all"
              >
                <Camera className="w-3.5 h-3.5 mr-1 text-slate-500" /> Retake
              </button>
              <button 
                type="button" 
                onClick={triggerGallery}
                className="flex items-center text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1 text-slate-500" /> Change
              </button>
              <button 
                type="button" 
                onClick={() => onPhotoChange(null)}
                className="flex items-center text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 flex flex-col items-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-700">{label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">JPG, JPEG, PNG, WEBP. Max size: 5MB.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2.5 pt-1">
              <button
                type="button"
                onClick={handleCameraTrigger}
                className="flex items-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Take Photo
              </button>
              <button
                type="button"
                onClick={triggerGallery}
                className="flex items-center text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-colors"
              >
                <ImageIcon className="w-4 h-4 mr-1.5 text-slate-500" />
                Upload Gallery
              </button>
            </div>
          </div>
        )}

        {/* Validation Errors banner */}
        {validationError && (
          <div className="absolute inset-x-0 bottom-0 bg-red-50 border-t border-red-100 p-2 text-center text-[10px] font-semibold text-red-600 flex items-center justify-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Camera Permission Errors banner */}
        {cameraError && (
          <div className="absolute inset-x-0 bottom-0 bg-amber-50 border-t border-amber-100 p-2 text-center text-[10px] font-semibold text-amber-700 flex items-center justify-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* In-App Camera modal layout (Keeps user on page, prevents Android OOM tab reloads!) */}
      {showInAppCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-sm w-full flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Direct Camera Capture</h3>
                <p className="text-[10px] text-slate-400">Position candidate's face in the center view</p>
              </div>
              <button 
                type="button" 
                onClick={stopInAppCamera}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="bg-slate-950 flex items-center justify-center relative aspect-[3/4] max-h-[50vh]">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
              />
              
              {/* Target guidelines border indicator */}
              <div className="absolute inset-0 border-4 border-dashed border-white/20 m-8 rounded-2xl pointer-events-none"></div>
            </div>

            {/* Camera actions bar */}
            <div className="p-5 bg-slate-50 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={stopInAppCamera}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer shadow-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={captureFrame}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full border-4 border-white shadow-xl shadow-blue-500/20 cursor-pointer flex items-center justify-center transition-all transform active:scale-95"
              >
                <div className="w-6 h-6 rounded-full border-2 border-white bg-white/20 animate-pulse"></div>
              </button>

              <button
                type="button"
                onClick={toggleFacingMode}
                title="Switch Camera View"
                className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer shadow-sm"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Government Style Crop Dialog */}
      {showCropper && tempImageSrc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-sm w-full flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Verify & Crop Photo</h3>
                <p className="text-[10px] text-slate-400">Position image inside the crop borders</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCropper(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex justify-center bg-slate-950/5 relative">
              <div 
                ref={cropContainerRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="w-[175px] h-[225px] border-2 border-blue-500 rounded-xl overflow-hidden bg-slate-900 relative shadow-2xl cursor-move touch-none"
              >
                <img
                  ref={imageRef}
                  src={tempImageSrc}
                  alt="Crop Source"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) translate(${cropX}px, ${cropY}px) scale(${cropScale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'block',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[175px] h-[225px] border border-white/20 rounded-xl flex flex-col justify-between">
                  <div className="h-1/3 border-b border-white/10 w-full"></div>
                  <div className="h-1/3 border-b border-white/10 w-full"></div>
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="px-6 py-2 bg-blue-50 border-y border-blue-100 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-blue-700">
                  <span className="flex items-center">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Optimizing resolution...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200/50 rounded-full h-1">
                  <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                <div className="flex space-x-1">
                  <button 
                    type="button" 
                    onClick={zoomOut}
                    title="Zoom Out"
                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 cursor-pointer transition-all"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={zoomIn}
                    title="Zoom In"
                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 cursor-pointer transition-all"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="h-4 w-[1px] bg-slate-200"></div>

                <div className="flex space-x-1">
                  <button 
                    type="button" 
                    onClick={rotateLeft}
                    title="Rotate Left"
                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={rotateRight}
                    title="Rotate Right"
                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-700 cursor-pointer transition-all"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-slate-200"></div>

                <button 
                  type="button" 
                  onClick={handleReset}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:bg-white px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer transition-all"
                >
                  RESET
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>ZOOM SCALE multiplier:</span>
                  <span className="font-mono text-blue-600">{cropScale.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="3.0" 
                  step="0.02" 
                  value={cropScale} 
                  onChange={(e) => setCropScale(parseFloat(e.target.value))} 
                  className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCropper(false)}
                  disabled={isProcessing}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-md transition-colors flex justify-center items-center"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Save Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
