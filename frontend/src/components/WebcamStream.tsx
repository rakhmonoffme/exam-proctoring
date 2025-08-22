import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Eye, User, AlertTriangle } from 'lucide-react';

interface WebcamStreamProps {
  onSuspiciousEvent: (event: any) => void;
}

const WebcamStream: React.FC<WebcamStreamProps> = ({ onSuspiciousEvent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [gazeDirection, setGazeDirection] = useState('CENTER');
  const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
  const [phoneDetected, setPhoneDetected] = useState(false);

  useEffect(() => {
    // Initialize eye tracking web worker
    initializeWorker();
    startCamera();
    
    return () => {
      stopCamera();
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initializeWorker = () => {
    // In a real implementation, this would load the MediaPipe worker
    // For demo purposes, we'll simulate the worker
    workerRef.current = new Worker('/src/workers/EyeTrackingWorker.js');
    
    workerRef.current.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'face_analysis':
          handleFaceAnalysis(data);
          break;
        case 'suspicious_event':
          onSuspiciousEvent(data);
          break;
      }
    };
  };

  const handleFaceAnalysis = (data: any) => {
    setFaceCount(data.face_count || 0);
    setGazeDirection(data.gaze_direction || 'CENTER');
    setHeadPose(data.head_pose || { yaw: 0, pitch: 0, roll: 0 });
    setPhoneDetected(data.phone_detected || false);

    // Generate suspicious events based on analysis
    if (data.face_count > 1) {
      onSuspiciousEvent({
        type: 'multiple_faces',
        confidence: 0.9,
        severity: 'HIGH',
        details: { face_count: data.face_count }
      });
    }

    if (data.face_count === 0) {
      onSuspiciousEvent({
        type: 'no_face',
        confidence: 0.8,
        severity: 'MEDIUM',
        details: {}
      });
    }

    if (data.gaze_direction !== 'CENTER') {
      const gazeEventType = `gaze_${data.gaze_direction.toLowerCase()}`;
      onSuspiciousEvent({
        type: gazeEventType,
        confidence: data.gaze_confidence || 0.6,
        severity: 'LOW',
        details: { direction: data.gaze_direction }
      });
    }

    if (data.phone_detected) {
      onSuspiciousEvent({
        type: 'phone_detected',
        confidence: 0.8,
        severity: 'CRITICAL',
        details: {}
      });
    }

    // Head pose events
    if (Math.abs(data.head_pose?.yaw) > 30) {
      onSuspiciousEvent({
        type: data.head_pose.yaw > 0 ? 'head_turn_right' : 'head_turn_left',
        confidence: 0.7,
        severity: 'MEDIUM',
        details: { yaw: data.head_pose.yaw }
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setError(null);
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            startProcessing();
          }
        };
      }
    } catch (err) {
      setError('Camera access denied or not available');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsActive(false);
  };

  const startProcessing = () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current) return;

    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current || !workerRef.current || !isActive) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Get image data and send to worker
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        workerRef.current.postMessage({
          type: 'process_frame',
          imageData: imageData
        });
      }

      if (isActive) {
        setTimeout(processFrame, 100); // Process at 10 FPS
      }
    };

    processFrame();
  };

  const getFaceStatusColor = () => {
    if (faceCount === 0) return 'text-red-400';
    if (faceCount === 1) return 'text-green-400';
    return 'text-orange-400';
  };

  const getGazeStatusColor = () => {
    return gazeDirection === 'CENTER' ? 'text-green-400' : 'text-yellow-400';
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Camera className="w-5 h-5 text-primary-400 mr-2" />
          <h3 className="text-lg font-semibold text-white">Camera Monitor</h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full ${
          isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {isActive ? <Camera className="w-4 h-4 mr-1" /> : <CameraOff className="w-4 h-4 mr-1" />}
          <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry Camera Access
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-64 object-cover rounded-xl bg-gray-800"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Overlay indicators */}
            {isActive && (
              <div className="absolute top-3 left-3 space-y-2">
                <div className={`flex items-center px-2 py-1 bg-black/50 rounded-lg ${getFaceStatusColor()}`}>
                  <User className="w-4 h-4 mr-1" />
                  <span className="text-xs">{faceCount} face(s)</span>
                </div>
                
                <div className={`flex items-center px-2 py-1 bg-black/50 rounded-lg ${getGazeStatusColor()}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="text-xs">{gazeDirection}</span>
                </div>
                
                {phoneDetected && (
                  <div className="flex items-center px-2 py-1 bg-red-500/70 rounded-lg text-white">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-xs">Phone detected</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Faces Detected</span>
                <span className={`font-semibold ${getFaceStatusColor()}`}>{faceCount}</span>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Gaze Direction</span>
                <span className={`font-semibold ${getGazeStatusColor()}`}>{gazeDirection}</span>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Head Yaw</span>
                <span className="text-white font-semibold">{Math.round(headPose.yaw)}°</span>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Head Pitch</span>
                <span className="text-white font-semibold">{Math.round(headPose.pitch)}°</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamStream;