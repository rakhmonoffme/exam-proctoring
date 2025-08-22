from typing import Dict, List, Optional, Set
from fastapi import WebSocket
from pydantic import BaseModel
from datetime import datetime
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class Event(BaseModel):
    event_id: str
    session_id: str
    timestamp: str
    event_type: str
    data: dict
    severity: str = "low"

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.connection_sessions: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        
        self.active_connections[session_id].append(websocket)
        self.connection_sessions[websocket] = session_id
        
        logger.info(f"Client connected to session {session_id}. Total connections: {len(self.active_connections[session_id])}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            try:
                self.active_connections[session_id].remove(websocket)
                if websocket in self.connection_sessions:
                    del self.connection_sessions[websocket]
                
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
                
                logger.info(f"Client disconnected from session {session_id}")
            except ValueError:
                pass

    async def disconnect_session(self, session_id: str):
        """Disconnect all clients from a session"""
        if session_id in self.active_connections:
            connections = self.active_connections[session_id].copy()
            for websocket in connections:
                try:
                    await websocket.close(code=1000, reason="Session ended")
                except:
                    pass
            del self.active_connections[session_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message: {e}")

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to broadcast to connection: {e}")
                    disconnected.append(connection)
            
            # Remove disconnected connections
            for connection in disconnected:
                self.disconnect(connection, session_id)

    def get_session_connections(self, session_id: str) -> List[WebSocket]:
        return self.active_connections.get(session_id, [])

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}

    def create_session(self, session_id: str, session_data: dict):
        self.sessions[session_id] = session_data
        logger.info(f"Created session {session_id}")

    def get_session(self, session_id: str) -> Optional[dict]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Deleted session {session_id}")

    def get_active_sessions(self) -> List[str]:
        return [sid for sid, session in self.sessions.items() 
                if session.get("status") == "active"]

    def update_session(self, session_id: str, updates: dict):
        if session_id in self.sessions:
            self.sessions[session_id].update(updates)