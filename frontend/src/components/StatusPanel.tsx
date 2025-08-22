import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface Event {
  id: string;
  timestamp: string;
  type: string;
  confidence: number;
  severity: string;
  details: any;
}

const StatusPanel: React.FC = () => {
  const { lastMessage } = useWebSocket();
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [sessionStatus, setSessionStatus] = useState('LOW_RISK');

  useEffect(() => {
    if (lastMessage?.type === 'session_update' && lastMessage.session) {
      setRiskScore(lastMessage.session.risk_score || 0);
      setSessionStatus(lastMessage.session.status || 'LOW_RISK');
      
      if (lastMessage.session.last_event) {
        const newEvent: Event = {
          id: Date.now().toString(),
          timestamp: lastMessage.session.last_event.timestamp,
          type: lastMessage.session.last_event.type,
          confidence: lastMessage.session.last_event.confidence,
          severity: lastMessage.session.last_event.severity,
          details: {}
        };
        
        setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 events
      }
    }
  }, [lastMessage]);

  const getRiskColor = (score: number) => {
    if (score < 5) return { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' };
    if (score < 10) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' };
    if (score < 15) return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' };
    return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' };
  };

  const getEventIcon = (type: string) => {
    if (type.includes('gaze') || type.includes('head')) return '👀';
    if (type.includes('face')) return '👤';
    if (type.includes('speech') || type.includes('voice')) return '🎤';
    if (type.includes('tab') || type.includes('window') || type.includes('screen')) return '💻';
    if (type.includes('copy') || type.includes('paste')) return '📋';
    if (type.includes('phone')) return '📱';
    return '⚠️';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-blue-300';
      case 'MEDIUM': return 'text-yellow-300';
      case 'HIGH': return 'text-orange-300';
      case 'CRITICAL': return 'text-red-300';
      default: return 'text-gray-300';
    }
  };

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const riskColors = getRiskColor(riskScore);

  return (
    <div className="space-y-6">
      {/* Risk Score Gauge */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-primary-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Risk Assessment</h3>
          </div>
        </div>

        {/* Circular Progress */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="8" 
                fill="transparent"
              />
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                stroke={riskScore < 5 ? '#10b981' : riskScore < 10 ? '#f59e0b' : riskScore < 15 ? '#f97316' : '#ef4444'}
                strokeWidth="8" 
                fill="transparent"
                strokeDasharray={`${Math.PI * 2 * 50}`}
                strokeDashoffset={`${Math.PI * 2 * 50 * (1 - Math.min(riskScore, 100) / 100)}`}
                className="transition-all duration-500 ease-in-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${riskColors.text}`}>
                  {riskScore}
                </div>
                <div className="text-xs text-gray-400">Risk Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center justify-center p-3 rounded-xl border ${riskColors.bg} ${riskColors.border}`}>
          <Activity className="w-4 h-4 mr-2" />
          <span className={`font-semibold ${riskColors.text}`}>
            {sessionStatus.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-secondary-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Recent Events</h3>
          </div>
          <span className="text-sm text-gray-400">{recentEvents.length}/10</span>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No events detected yet</p>
            </div>
          ) : (
            recentEvents.map((event, index) => (
              <div 
                key={event.id}
                className="flex items-start p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="text-lg mr-3 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-white truncate">
                      {formatEventType(event.type)}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full bg-white/10 ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Confidence: {Math.round(event.confidence * 100)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Session Statistics</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Total Events</span>
            <span className="text-white font-semibold">{recentEvents.length}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">High Severity</span>
            <span className="text-orange-300 font-semibold">
              {recentEvents.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Avg Confidence</span>
            <span className="text-white font-semibold">
              {recentEvents.length > 0 
                ? Math.round((recentEvents.reduce((sum, e) => sum + e.confidence, 0) / recentEvents.length) * 100)
                : 0
              }%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;