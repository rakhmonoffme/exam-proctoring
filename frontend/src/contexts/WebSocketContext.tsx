import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastMessage: any;
  sendMessage: (message: any) => void;
  connect: (sessionId: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);

  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSessionId = useRef<string | null>(null);

  const clearTimers = () => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
  };

  const startHeartbeat = useCallback((ws: WebSocket) => {
    clearTimers();
    heartbeatInterval.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
      }
    }, 30000); // every 30s
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts && currentSessionId.current) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      console.log(`[WebSocket] Reconnect attempt #${reconnectAttempts.current + 1} in ${delay}ms`);
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current += 1;
        connect(currentSessionId.current!);
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached or no session ID');
      setConnectionState('error');
    }
  }, []);

  const connect = useCallback((sessionId: string) => {
    // Close old socket if exists
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close(1000, 'Reconnect');
    clearTimers();
    currentSessionId.current = sessionId;
    setConnectionState('connecting');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_REACT_APP_WS_URL || `${window.location.hostname}:8000`;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/${sessionId}`;
    console.log(`[WebSocket] Connecting to ${wsUrl}`);

    try {
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        startHeartbeat(newSocket);
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          setLastMessage(data);
          if (data.type === 'ping') newSocket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      newSocket.onclose = (event) => {
        console.warn('[WebSocket] Closed:', event.code, event.reason);
        setIsConnected(false);
        clearTimers();
        if (event.code !== 1000) attemptReconnect(); // reconnect if not clean close
        else setConnectionState('disconnected');
      };

      newSocket.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setConnectionState('error');
      };

      setSocket(newSocket);
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setConnectionState('error');
      attemptReconnect();
    }
  }, [socket, startHeartbeat, attemptReconnect]);

  const disconnect = useCallback(() => {
    console.log('[WebSocket] Manual disconnect');
    setConnectionState('disconnected');
    clearTimers();
    reconnectAttempts.current = maxReconnectAttempts; // stop reconnecting
    if (socket) socket.close(1000, 'Manual disconnect');
    setSocket(null);
    setIsConnected(false);
    currentSessionId.current = null;
  }, [socket]);

  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected && socket.readyState === WebSocket.OPEN) {
      const msgWithTimestamp = { ...message, timestamp: new Date().toISOString() };
      socket.send(JSON.stringify(msgWithTimestamp));
      console.log('[WebSocket] Sent message:', msgWithTimestamp);
    } else {
      console.warn('[WebSocket] Cannot send, socket not connected', { isConnected, socketReadyState: socket?.readyState });
    }
  }, [socket, isConnected]);

  // Cleanup on unmount
  useEffect(() => () => { clearTimers(); if (socket) socket.close(); }, []);

  const value = { socket, isConnected, connectionState, lastMessage, sendMessage, connect, disconnect };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
