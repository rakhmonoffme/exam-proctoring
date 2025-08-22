import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Shield, Users, Activity, ChevronRight, Zap, Camera, Mic } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [sessionId, setSessionId] = useState('');

  const startExam = () => {
    if (studentName.trim()) {
      const id = sessionId || `session_${Date.now()}`;
      navigate(`/exam/${id}?student=${encodeURIComponent(studentName)}`);
    }
  };

  const openAdmin = () => {
    navigate('/admin');
  };

  const features = [
    {
      icon: Eye,
      title: 'Advanced Eye Tracking',
      description: 'Real-time gaze detection using MediaPipe FaceMesh technology',
      color: 'from-primary-500 to-primary-600'
    },
    {
      icon: Mic,
      title: 'Audio Monitoring',
      description: 'Voice activity detection and keyword spotting',
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      icon: Shield,
      title: 'Screen Protection',
      description: 'Detects tab switching, copy-paste, and suspicious activities',
      color: 'from-accent-500 to-accent-600'
    },
    {
      icon: Activity,
      title: 'Real-time Analytics',
      description: 'Live risk scoring and behavioral analysis',
      color: 'from-green-500 to-emerald-600'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl shadow-lg animate-glow">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold font-poppins bg-gradient-to-r from-white via-primary-100 to-secondary-100 bg-clip-text text-transparent mb-6">
            AI Proctoring System
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Advanced real-time exam monitoring with AI-powered behavioral analysis, 
            eye tracking, and comprehensive academic integrity protection.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Student Portal */}
          <div className="group relative p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl mr-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white font-poppins">Student Portal</h2>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Student Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Session ID (Optional)</label>
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Leave blank for auto-generated"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <button
                onClick={startExam}
                disabled={!studentName.trim()}
                className="w-full group/btn relative px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="flex items-center justify-center">
                  Start Exam Session
                  <ChevronRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform duration-200" />
                </span>
              </button>
            </div>
          </div>

          {/* Admin Portal */}
          <div className="group relative p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/10 to-accent-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl mr-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white font-poppins">Admin Dashboard</h2>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <Zap className="w-5 h-5 text-yellow-400 mr-3" />
                  <span className="text-gray-300 text-sm">Real-time monitoring</span>
                </div>
                <div className="flex items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <Camera className="w-5 h-5 text-green-400 mr-3" />
                  <span className="text-gray-300 text-sm">Live video feeds</span>
                </div>
                <div className="flex items-center p-3 bg-white/5 rounded-lg border border-white/10">
                  <Activity className="w-5 h-5 text-blue-400 mr-3" />
                  <span className="text-gray-300 text-sm">Risk analytics</span>
                </div>
              </div>
              
              <button
                onClick={openAdmin}
                className="w-full group/btn relative px-6 py-4 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl font-semibold hover:from-secondary-600 hover:to-secondary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="flex items-center justify-center">
                  Open Dashboard
                  <Activity className="w-5 h-5 ml-2 group-hover/btn:scale-110 transition-transform duration-200" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;