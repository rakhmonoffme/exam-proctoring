import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Users, AlertTriangle } from 'lucide-react';

interface AudioTrackerProps {
  onSuspiciousEvent: (event: any) => void;
}

const AudioTracker: React.FC<AudioTrackerProps> = ({ onSuspiciousEvent }) => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speechDetected, setSpeechDetected] = useState(false);
  const [multipleVoices, setMultipleVoices] = useState(false);
  const [bannedKeywords, setBannedKeywords] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const bannedWordsList = [
    'google', 'search', 'answer', 'help', 'cheat', 'solution',
    'homework', 'assignment', 'test', 'quiz', 'exam', 'grade'
  ];

  useEffect(() => {
    startAudioCapture();
    
    return () => {
      stopAudioCapture();
    };
  }, []);

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      setIsActive(true);
      setError(null);
      startAnalysis();
    } catch (err) {
      setError('Microphone access denied or not available');
      console.error('Audio error:', err);
    }
  };

  const stopAudioCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsActive(false);
  };

  const startAnalysis = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!isActive || !analyser) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate audio level (0-100)
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const level = (average / 255) * 100;
      setAudioLevel(level);

      // Voice activity detection
      const speechThreshold = 15;
      const isSpeaking = level > speechThreshold;
      setSpeechDetected(isSpeaking);

      if (isSpeaking) {
        // Simulate speech detection event
        onSuspiciousEvent({
          type: 'speech_detected',
          confidence: Math.min(level / 50, 1),
          severity: 'LOW',
          details: { audio_level: level }
        });

        // Simulate multiple voice detection (random for demo)
        if (Math.random() < 0.1) { // 10% chance
          setMultipleVoices(true);
          onSuspiciousEvent({
            type: 'multiple_voices',
            confidence: 0.7,
            severity: 'HIGH',
            details: { estimated_speakers: 2 }
          });
          
          setTimeout(() => setMultipleVoices(false), 3000);
        }

        // Simulate banned keyword detection (very low probability for demo)
        if (Math.random() < 0.05) { // 5% chance
          const keyword = bannedWordsList[Math.floor(Math.random() * bannedWordsList.length)];
          setBannedKeywords(prev => [...prev, keyword]);
          
          onSuspiciousEvent({
            type: 'banned_keywords',
            confidence: 0.8,
            severity: 'CRITICAL',
            details: { keywords: [keyword] }
          });

          setTimeout(() => {
            setBannedKeywords(prev => prev.filter(k => k !== keyword));
          }, 5000);
        }
      }

      animationRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  const getAudioLevelColor = () => {
    if (audioLevel < 10) return 'bg-gray-500';
    if (audioLevel < 30) return 'bg-green-500';
    if (audioLevel < 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Mic className="w-5 h-5 text-secondary-400 mr-2" />
          <h3 className="text-lg font-semibold text-white">Audio Monitor</h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full ${
          isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {isActive ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
          <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={startAudioCapture}
            className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors"
          >
            Retry Audio Access
          </button>
        </div>
      ) : (
        <>
          {/* Audio Level Meter */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Audio Level</span>
              <span className="text-sm text-white">{Math.round(audioLevel)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-150 ${getAudioLevelColor()}`}
                style={{ width: `${Math.min(audioLevel, 100)}%` }}
              />
            </div>
          </div>

          {/* Status Indicators */}
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              speechDetected 
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              <div className="flex items-center">
                <Volume2 className="w-4 h-4 mr-2" />
                <span className="text-sm">Speech Activity</span>
              </div>
              <span className="text-sm font-semibold">
                {speechDetected ? 'Detected' : 'None'}
              </span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              multipleVoices 
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <span className="text-sm">Multiple Voices</span>
              </div>
              <span className="text-sm font-semibold">
                {multipleVoices ? 'Detected' : 'None'}
              </span>
            </div>

            {bannedKeywords.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                  <span className="text-sm text-red-300 font-semibold">Banned Keywords</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {bannedKeywords.map((keyword, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded-lg"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AudioTracker;