import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface Event {
  id: string;
  timestamp: string;
  type: string;
  confidence: number;
  severity: string;
  details?: any;
}

interface EventsTableProps {
  events: Event[];
}

const EventsTable: React.FC<EventsTableProps> = ({ events }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'CRITICAL': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
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

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">No events recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {events.map((event, index) => (
        <div 
          key={event.id || index}
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center">
              <span className="text-sm mr-2">{getEventIcon(event.type)}</span>
              <div>
                <h4 className="text-sm font-medium text-white">
                  {formatEventType(event.type)}
                </h4>
                <p className="text-xs text-gray-400">
                  {formatTimestamp(event.timestamp)}
                </p>
              </div>
            </div>
            
            <div className={`px-2 py-1 rounded-lg border text-xs ${getSeverityColor(event.severity)}`}>
              {event.severity}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Confidence: {Math.round(event.confidence * 100)}%
            </div>
            
            {event.details && Object.keys(event.details).length > 0 && (
              <div className="text-xs text-gray-500">
                {Object.entries(event.details).slice(0, 2).map(([key, value]) => (
                  <span key={key} className="mr-2">
                    {key}: {String(value).substring(0, 10)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EventsTable;