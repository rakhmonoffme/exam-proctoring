from fastapi import WebSocket
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        # Store active connections by session_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store session_id by websocket for reverse lookup
        self.connection_sessions: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        
        # Add to active connections
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        
        self.active_connections[session_id].add(websocket)
        self.connection_sessions[websocket] = session_id
        
        connection_count = self.get_connection_count()
        logger.info(f"🔌 WebSocket connected for session: {session_id}")
        logger.info(f"📊 Total active connections: {connection_count}")
        
        # Don't send welcome message here - let main.py handle session initialization
        # This prevents duplicate/conflicting messages
    
    async def disconnect(self, session_id: str = None, websocket: WebSocket = None):
        """Disconnect WebSocket - can be called with session_id only or both parameters"""
        if websocket and session_id:
            # Remove specific connection
            if session_id in self.active_connections:
                self.active_connections[session_id].discard(websocket)
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
            
            if websocket in self.connection_sessions:
                del self.connection_sessions[websocket]
                
        elif session_id and not websocket:
            # Remove all connections for session (find websocket from session_id)
            if session_id in self.active_connections:
                for ws in list(self.active_connections[session_id]):
                    if ws in self.connection_sessions:
                        del self.connection_sessions[ws]
                del self.active_connections[session_id]
                
        elif websocket and not session_id:
            # Remove connection by websocket (lookup session_id)
            if websocket in self.connection_sessions:
                session_id = self.connection_sessions[websocket]
                del self.connection_sessions[websocket]
                
                if session_id in self.active_connections:
                    self.active_connections[session_id].discard(websocket)
                    if not self.active_connections[session_id]:
                        del self.active_connections[session_id]
        
        connection_count = self.get_connection_count()
        logger.info(f"🔌 WebSocket disconnected for session: {session_id}")
        logger.info(f"📊 Remaining connections: {connection_count}")
    
    async def disconnect_websocket(self, websocket: WebSocket):
        """Disconnect by websocket instance (for compatibility with main.py)"""
        session_id = self.connection_sessions.get(websocket)
        if session_id:
            await self.disconnect(session_id, websocket)
        else:
            # If websocket not found in sessions, just remove it
            logger.warning("🔌 Websocket not found in sessions during disconnect")
    
    async def send_personal_message(self, message: str, session_id: str):
        """Send message to specific session"""
        if session_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[session_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"❌ Error sending message to {session_id}: {e}")
                    disconnected.append(websocket)
            
            # Clean up disconnected websockets
            for ws in disconnected:
                await self.disconnect(session_id, ws)
    
    async def broadcast(self, message: str):
        """Broadcast message to all connected sessions"""
        disconnected = []
        
        for session_id, connections in self.active_connections.items():
            for websocket in list(connections):
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"❌ Error broadcasting to {session_id}: {e}")
                    disconnected.append((session_id, websocket))
        
        # Clean up disconnected websockets
        for session_id, ws in disconnected:
            await self.disconnect(session_id, ws)
    
    def get_session_count(self) -> int:
        """Get number of active sessions"""
        return len(self.active_connections)
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def is_session_connected(self, session_id: str) -> bool:
        """Check if session has active connections"""
        return session_id in self.active_connections and len(self.active_connections[session_id]) > 0