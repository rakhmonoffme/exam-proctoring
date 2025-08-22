import React from 'react';
import { User, AlertTriangle, Flag, Clock } from 'lucide-react';

interface Session {
  id: string;
  student_name: string;
  start_time: string;
  risk_score: number;
  status: string;
  event_count: number;
  last_event?: {
    type: string;
    timestamp: string;
    confidence: number;
    severity: string;
  };
}

interface SessionCardProps {
  session: Session;
  isSelected: boolean;
  onClick: () => void;
  onFlag: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, isSelected, onClick, onFlag }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOW_RISK': return { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/30' };
      case 'MODERATE_RISK': return { bg: 'bg-yellow-500/10', text: 'text-yellow-300', border: 'border-yellow-500/30' };
      case 'HIGH_RISK': return { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30' };
      case 'FLAGGED': return { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30' };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-300', border: 'border-gray-500/30' };
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 5) return 'text-green-400';
    if (score < 10) return 'text-yellow-400';
    if (score < 15) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventType = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'No events';
  };

  const statusColors = getStatusColor(session.status);

  return (
    <div 
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.02] ${
        isSelected 
          ? 'bg-primary-500/20 border-primary-500/50 shadow-lg' 
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="p-2 bg-white/10 rounded-lg mr-3">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm">{session.student_name}</h4>
            <p className="text-gray-400 text-xs">ID: {session.id.slice(0, 8)}...</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-xl font-bold ${getRiskScoreColor(session.risk_score)}`}>
            {session.risk_score}
          </div>
          <div className="text-xs text-gray-400">Risk</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className={`px-2 py-1 rounded-lg border text-xs ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
          {session.status.replace('_', ' ')}
        </div>
        
        <div className="flex items-center text-xs text-gray-400">
          <Clock className="w-3 h-3 mr-1" />
          {formatTime(session.start_time)}
        </div>
      </div>

      {session.last_event && (
        <div className="bg-white/5 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">
              {formatEventType(session.last_event.type)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${{
              'LOW': 'bg-blue-500/20 text-blue-300',
              'MEDIUM': 'bg-yellow-500/20 text-yellow-300',
              'HIGH': 'bg-orange-500/20 text-orange-300',
              'CRITICAL': 'bg-red-500/20 text-red-300'
            }[session.last_event.severity] || 'bg-gray-500/20 text-gray-300'}`}>
              {session.last_event.severity}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {session.event_count} events
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlag();
          }}
          className="flex items-center px-2 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
        >
          <Flag className="w-3 h-3 mr-1" />
          Flag
        </button>
      </div>
    </div>
  );
};

export default SessionCard;