import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import WebcamStream from '../components/WebcamStream';
import AudioTracker from '../components/AudioTracker';
import ScreenTracker from '../components/ScreenTracker';
import StatusPanel from '../components/StatusPanel';
import { Camera, Mic, Monitor, Shield, AlertTriangle } from 'lucide-react';

const ExamPage: React.FC = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const studentName = searchParams.get('student') || 'Unknown Student';
  const { connect, disconnect, isConnected, sendMessage } = useWebSocket();
  
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    screen: false
  });
  
  const [riskScore, setRiskScore] = useState(0);
  const [status, setStatus] = useState('LOW_RISK');
  const [isExamStarted, setIsExamStarted] = useState(false);

  useEffect(() => {
    if (sessionId) {
      connect(sessionId);
    }
    
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  const requestPermissions = async () => {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setPermissions(prev => ({
        ...prev,
        camera: true,
        microphone: true
      }));
      
      // Stop the stream as components will request their own
      stream.getTracks().forEach(track => track.stop());
      
      // Request screen sharing permission
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: false 
        });
        setPermissions(prev => ({ ...prev, screen: true }));
        screenStream.getTracks().forEach(track => track.stop());
      } catch (screenError) {
        console.warn('Screen sharing not available:', screenError);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      alert('Camera and microphone permissions are required to start the exam.');
    }
  };

  const startExam = async () => {
    if (!permissions.camera || !permissions.microphone) {
      await requestPermissions();
    }
    
    if (permissions.camera && permissions.microphone) {
      setIsExamStarted(true);
    }
  };

  const handleSuspiciousEvent = (eventData: any) => {
    sendMessage({
      type: eventData.type,
      confidence: eventData.confidence,
      severity: eventData.severity || 'MEDIUM',
      details: eventData.details || {}
    });
  };

  const getRiskColor = (score: number) => {
    if (score < 5) return 'text-green-400';
    if (score < 10) return 'text-yellow-400';
    if (score < 15) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOW_RISK': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'MODERATE_RISK': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'HIGH_RISK': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'FLAGGED': return 'bg-red-600/30 text-red-200 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (!isExamStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8">
            <div className="text-center mb-8">
              <div className="p-4 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl inline-block mb-6">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Exam Setup</h1>
              <p className="text-gray-300">Welcome, {studentName}</p>
              <p className="text-sm text-gray-400 mt-1">Session ID: {sessionId}</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div className={`p-2 rounded-lg mr-4 ${permissions.camera ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Camera className={`w-5 h-5 ${permissions.camera ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h3 className="text-white font-medium">Camera Access</h3>
                  <p className="text-sm text-gray-400">Required for face and gaze tracking</p>
                </div>
                {permissions.camera && <div className="ml-auto text-green-400 text-sm">✓ Granted</div>}
              </div>

              <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div className={`p-2 rounded-lg mr-4 ${permissions.microphone ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Mic className={`w-5 h-5 ${permissions.microphone ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <div>
                  <h3 className="text-white font-medium">Microphone Access</h3>
                  <p className="text-sm text-gray-400">Required for audio monitoring</p>
                </div>
                {permissions.microphone && <div className="ml-auto text-green-400 text-sm">✓ Granted</div>}
              </div>

              <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div className={`p-2 rounded-lg mr-4 ${permissions.screen ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                  <Monitor className={`w-5 h-5 ${permissions.screen ? 'text-green-400' : 'text-yellow-400'}`} />
                </div>
                <div>
                  <h3 className="text-white font-medium">Screen Monitoring</h3>
                  <p className="text-sm text-gray-400">Optional but recommended</p>
                </div>
                {permissions.screen && <div className="ml-auto text-green-400 text-sm">✓ Granted</div>}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-400 mr-3 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-300 font-medium mb-1">Important Notice</p>
                  <p className="text-amber-200">
                    This exam session will be monitored using AI-powered proctoring technology. 
                    Please ensure you're in a quiet, well-lit environment and avoid looking away 
                    from the screen unnecessarily.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={startExam}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start Exam Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{studentName}</h1>
            <p className="text-gray-400">Session: {sessionId}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-xl border ${getStatusColor(status)}`}>
              {status.replace('_', ' ')}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Risk Score</div>
              <div className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
                {riskScore}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} 
                 title={isConnected ? 'Connected' : 'Disconnected'}></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Video and Controls */}
          <div className="lg:col-span-2 space-y-6">
            <WebcamStream onSuspiciousEvent={handleSuspiciousEvent} />
            
            <div className="grid md:grid-cols-2 gap-4">
              <AudioTracker onSuspiciousEvent={handleSuspiciousEvent} />
              <ScreenTracker onSuspiciousEvent={handleSuspiciousEvent} />
            </div>
          </div>

          {/* Right Column - Status Panel */}
          <div className="lg:col-span-1">
            <StatusPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPage;