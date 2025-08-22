import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import SessionCard from '../components/SessionCard';
import EventsTable from '../components/EventsTable';
import { Users, Activity, AlertTriangle, Shield, TrendingUp } from 'lucide-react';

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

const AdminPanel: React.FC = () => {
  const { connect, disconnect, isConnected, lastMessage } = useWebSocket();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    highRiskSessions: 0,
    flaggedSessions: 0
  });

  useEffect(() => {
    // Connect to admin WebSocket
    connect('admin_dashboard');
    loadSessions();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
      updateStats(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadSessionEvents = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/events`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    if (message.type === 'session_update' && message.session) {
      setSessions(prev => {
        const updated = prev.map(session => 
          session.id === message.session.id ? message.session : session
        );
        
        // Add new session if not exists
        if (!prev.find(s => s.id === message.session.id)) {
          updated.push(message.session);
        }
        
        updateStats(updated);
        return updated;
      });

      // If this is the selected session, refresh its events
      if (selectedSession === message.session.id) {
        loadSessionEvents(selectedSession);
      }
    }
  };

  const updateStats = (sessionList: Session[]) => {
    const total = sessionList.length;
    const active = sessionList.filter(s => s.status === 'ACTIVE').length;
    const highRisk = sessionList.filter(s => s.status === 'HIGH_RISK').length;
    const flagged = sessionList.filter(s => s.status === 'FLAGGED').length;

    setStats({
      totalSessions: total,
      activeSessions: active,
      highRiskSessions: highRisk,
      flaggedSessions: flagged
    });
  };

  const handleSessionClick = (sessionId: string) => {
    setSelectedSession(sessionId);
    loadSessionEvents(sessionId);
  };

  const flagSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}/flag`, { method: 'POST' });
      loadSessions(); // Refresh sessions
    } catch (error) {
      console.error('Error flagging session:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions,
      icon: Activity,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'High Risk',
      value: stats.highRiskSessions,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Flagged',
      value: stats.flaggedSessions,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10'
    }
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white font-poppins">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Monitor and manage exam sessions in real-time</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-4 py-2 rounded-xl ${
              isConnected 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className={`p-6 ${stat.bgColor} backdrop-blur-sm border border-white/10 rounded-2xl hover:scale-105 transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sessions List */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
                <button
                  onClick={loadSessions}
                  className="px-4 py-2 bg-primary-500/20 text-primary-300 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-all duration-200"
                >
                  Refresh
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No active sessions</p>
                  </div>
                ) : (
                  sessions.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isSelected={selectedSession === session.id}
                      onClick={() => handleSessionClick(session.id)}
                      onFlag={() => flagSession(session.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Events Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-full">
              <h2 className="text-xl font-semibold text-white mb-6">
                {selectedSession ? 'Session Events' : 'Select a Session'}
              </h2>
              
              {selectedSession ? (
                <EventsTable events={events} />
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Select a session to view events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;