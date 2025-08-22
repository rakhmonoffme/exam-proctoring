import React, { useState, useEffect } from 'react';
import { Monitor, Eye, Copy, MousePointer, AlertTriangle, Keyboard } from 'lucide-react';

interface ScreenTrackerProps {
  onSuspiciousEvent: (event: any) => void;
}

const ScreenTracker: React.FC<ScreenTrackerProps> = ({ onSuspiciousEvent }) => {
  const [isActive, setIsActive] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [windowBlurs, setWindowBlurs] = useState(0);
  const [copyPasteEvents, setCopyPasteEvents] = useState(0);
  const [rightClicks, setRightClicks] = useState(0);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    startTracking();
    return stopTracking;
  }, []);

  const startTracking = () => {
    // Visibility change detection (tab switching)
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (!visible) {
        setTabSwitches(prev => prev + 1);
        onSuspiciousEvent({
          type: 'tab_switch',
          confidence: 0.9,
          severity: 'HIGH',
          details: { timestamp: new Date().toISOString() }
        });
      }
    };

    // Window blur/focus detection
    const handleWindowBlur = () => {
      setWindowBlurs(prev => prev + 1);
      onSuspiciousEvent({
        type: 'window_blur',
        confidence: 0.8,
        severity: 'MEDIUM',
        details: { timestamp: new Date().toISOString() }
      });
    };

    // Copy/paste detection
    const handleCopy = () => {
      setCopyPasteEvents(prev => prev + 1);
      onSuspiciousEvent({
        type: 'copy_paste',
        confidence: 1.0,
        severity: 'HIGH',
        details: { action: 'copy', timestamp: new Date().toISOString() }
      });
    };

    const handlePaste = () => {
      setCopyPasteEvents(prev => prev + 1);
      onSuspiciousEvent({
        type: 'copy_paste',
        confidence: 1.0,
        severity: 'HIGH',
        details: { action: 'paste', timestamp: new Date().toISOString() }
      });
    };

    // Right click detection
    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      setRightClicks(prev => prev + 1);
      onSuspiciousEvent({
        type: 'right_click',
        confidence: 0.7,
        severity: 'LOW',
        details: { 
          x: e.clientX, 
          y: e.clientY, 
          timestamp: new Date().toISOString() 
        }
      });
    };

    // Keyboard shortcuts detection
    const handleKeyDown = (e: KeyboardEvent) => {
      const suspiciousShortcuts = [
        'F12', // DevTools
        'F5',  // Refresh
        'F11', // Fullscreen
      ];

      const ctrlShortcuts = [
        'KeyC', // Ctrl+C (Copy)
        'KeyV', // Ctrl+V (Paste)
        'KeyA', // Ctrl+A (Select All)
        'KeyF', // Ctrl+F (Find)
        'KeyT', // Ctrl+T (New Tab)
        'KeyN', // Ctrl+N (New Window)
        'KeyW', // Ctrl+W (Close Tab)
        'KeyR', // Ctrl+R (Refresh)
        'KeyU', // Ctrl+U (View Source)
        'KeyJ', // Ctrl+J (Downloads)
        'KeyH', // Ctrl+H (History)
      ];

      if (suspiciousShortcuts.includes(e.code)) {
        setKeyboardShortcuts(prev => prev + 1);
        onSuspiciousEvent({
          type: 'keyboard_shortcut',
          confidence: 0.8,
          severity: 'MEDIUM',
          details: { 
            key: e.code, 
            timestamp: new Date().toISOString() 
          }
        });
      }

      if (e.ctrlKey && ctrlShortcuts.includes(e.code)) {
        setKeyboardShortcuts(prev => prev + 1);
        onSuspiciousEvent({
          type: 'keyboard_shortcut',
          confidence: 0.9,
          severity: e.code === 'KeyC' || e.code === 'KeyV' ? 'HIGH' : 'MEDIUM',
          details: { 
            key: `Ctrl+${e.key}`, 
            timestamp: new Date().toISOString() 
          }
        });
      }

      // Alt+Tab detection
      if (e.altKey && e.code === 'Tab') {
        e.preventDefault();
        setTabSwitches(prev => prev + 1);
        onSuspiciousEvent({
          type: 'tab_switch',
          confidence: 0.9,
          severity: 'HIGH',
          details: { 
            method: 'Alt+Tab', 
            timestamp: new Date().toISOString() 
          }
        });
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);

    setIsActive(true);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('keydown', handleKeyDown);
      setIsActive(false);
    };
  };

  const stopTracking = () => {
    setIsActive(false);
  };

  const trackingStats = [
    {
      icon: Eye,
      label: 'Tab Switches',
      value: tabSwitches,
      color: tabSwitches > 3 ? 'text-red-400' : tabSwitches > 1 ? 'text-yellow-400' : 'text-green-400'
    },
    {
      icon: Monitor,
      label: 'Window Blurs',
      value: windowBlurs,
      color: windowBlurs > 2 ? 'text-red-400' : windowBlurs > 0 ? 'text-yellow-400' : 'text-green-400'
    },
    {
      icon: Copy,
      label: 'Copy/Paste',
      value: copyPasteEvents,
      color: copyPasteEvents > 1 ? 'text-red-400' : copyPasteEvents > 0 ? 'text-yellow-400' : 'text-green-400'
    },
    {
      icon: MousePointer,
      label: 'Right Clicks',
      value: rightClicks,
      color: rightClicks > 5 ? 'text-red-400' : rightClicks > 2 ? 'text-yellow-400' : 'text-green-400'
    },
    {
      icon: Keyboard,
      label: 'Shortcuts',
      value: keyboardShortcuts,
      color: keyboardShortcuts > 3 ? 'text-red-400' : keyboardShortcuts > 1 ? 'text-yellow-400' : 'text-green-400'
    }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Monitor className="w-5 h-5 text-accent-400 mr-2" />
          <h3 className="text-lg font-semibold text-white">Screen Monitor</h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full ${
          isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}>
          <Monitor className="w-4 h-4 mr-1" />
          <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {/* Visibility Status */}
      <div className={`flex items-center justify-between p-3 rounded-xl border mb-4 ${
        isVisible 
          ? 'bg-green-500/10 border-green-500/30 text-green-300'
          : 'bg-red-500/10 border-red-500/30 text-red-300'
      }`}>
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-2" />
          <span className="text-sm">Window Visibility</span>
        </div>
        <span className="text-sm font-semibold">
          {isVisible ? 'Focused' : 'Hidden'}
        </span>
      </div>

      {/* Tracking Statistics */}
      <div className="space-y-3">
        {trackingStats.map((stat, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
          >
            <div className="flex items-center">
              <stat.icon className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-300">{stat.label}</span>
            </div>
            <div className="flex items-center">
              <span className={`text-sm font-bold ${stat.color}`}>
                {stat.value}
              </span>
              {stat.value > 0 && (
                <AlertTriangle className="w-3 h-3 ml-1 text-yellow-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Warning Message */}
      {(tabSwitches > 0 || copyPasteEvents > 0) && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-300 font-medium">Suspicious Activity Detected</p>
              <p className="text-yellow-200 mt-1">
                Multiple screen interactions detected. Please focus on the exam content.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenTracker;