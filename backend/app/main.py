from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi.responses import HTMLResponse
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid
from pathlib import Path

from .config import settings
from .events import WebSocketManager
from .services.scoring import ScoringService
from .services.audio_processor import AudioProcessor
from .services.video_processor import VideoProcessor
from .models.schemas import ExamSession, SuspiciousEvent, EventType
from .db import Database


# Initialize services
ws_manager = WebSocketManager()
scoring_service = ScoringService()
audio_processor = AudioProcessor()
video_processor = VideoProcessor()
db = Database()

# Store active sessions
active_sessions: Dict[str, ExamSession] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.init_db()
    print("🚀 AI Proctoring System started successfully!")
    yield
    # Shutdown (optional cleanup code can go here)
    print("🔄 AI Proctoring System shutting down...")

app = FastAPI(
    title="AI Proctoring System", 
    version="1.0.0",
    lifespan=lifespan
)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await ws_manager.connect(websocket, session_id)
    
    # Create new session if not exists
    if session_id not in active_sessions:
        active_sessions[session_id] = ExamSession(
            id=session_id,
            student_name=f"Student_{session_id[:8]}",
            start_time=datetime.now(),
            risk_score=0,
            status="ACTIVE",
            events=[]
        )
        print(f"📝 Created new session: {session_id}")
    else: 
        active_sessions[session_id].status = "ACTIVE"
        print(f"🔄 Reusing existing session {session_id}")
    
    # Send session initialization to client
    init_message = {
        "type": "session_initialized",
        "session_id": session_id,
        "student_name": active_sessions[session_id].student_name,
        "timestamp": datetime.now().isoformat(),
        "status": "connected"
    }
    await websocket.send_text(json.dumps(init_message))
    print(f"📤 Sent session initialization for {session_id}")
    
    try:
        while True:
            # Receive event from client
            data = await websocket.receive_text()
            
            try:
                event_data = json.loads(data)
                message_type = event_data.get('type', 'unknown')
                print(f"📥 Received message: {message_type} for {session_id}")
                
                # Handle different message types
                if message_type == 'heartbeat':
                    # Respond to heartbeat
                    pong_message = {
                        "type": "pong",
                        "session_id": session_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(pong_message))
                    print(f"💓 Sent pong to {session_id}")
                    continue
                
                elif message_type == 'ping':
                    # Respond to ping
                    pong_message = {
                        "type": "pong",
                        "session_id": session_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(pong_message))
                    print(f"🏓 Sent pong response to {session_id}")
                    continue
                
                elif message_type == 'pong':
                    # Just acknowledge pong
                    print(f"🏓 Received pong from {session_id}")
                    continue
                
                elif message_type in ['suspicious_event', 'MULTIPLE_FACES', 'HEAD_MOVEMENT', 'AUDIO_DETECTION', 'FACE_NOT_DETECTED', 'UNKNOWN']:
                    # Process suspicious event
                    print(f"⚠️ Processing suspicious event: {message_type}")
                    await process_event(session_id, event_data)
                    
                    # 🔧 FIX: Send acknowledgment to client
                    ack_message = {
                        "type": "event_processed",
                        "event_type": message_type,
                        "session_id": session_id,
                        "timestamp": datetime.now().isoformat(),
                        "current_risk_score": active_sessions[session_id].risk_score
                    }
                    await websocket.send_text(json.dumps(ack_message))
                    print(f"✅ Processed and acknowledged event: {message_type}")
                
                else:
                    print(f"⚠️ Unknown message type: {message_type}")
                    # Still acknowledge unknown messages
                    ack_message = {
                        "type": "message_received",
                        "original_type": message_type,
                        "session_id": session_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(ack_message))
                    
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                error_message = {
                    "type": "error",
                    "message": "Invalid JSON format",
                    "session_id": session_id,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(error_message))
                
            except Exception as e:
                print(f"❌ Error processing message: {e}")
                import traceback
                traceback.print_exc()
                error_message = {
                    "type": "error", 
                    "message": f"Processing error: {str(e)}",
                    "session_id": session_id,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(error_message))
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected for session: {session_id}")
        # 🔧 FIX: Use correct method name
        await ws_manager.disconnect(session_id, websocket)
        if session_id in active_sessions:
            active_sessions[session_id].status = "DISCONNECTED"
        print(f"🧹 Cleaned up session {session_id}")
    except Exception as e:
        print(f"❌ WebSocket error for {session_id}: {e}")
        import traceback
        traceback.print_exc()
        # 🔧 FIX: Use correct method name
        await ws_manager.disconnect(session_id, websocket)
        if session_id in active_sessions:
            active_sessions[session_id].status = "ERROR"


async def process_event(session_id: str, event_data: Dict[str, Any]):
    """Process incoming suspicious event and update risk score"""
    try:
        session = active_sessions.get(session_id)
        if not session:
            print(f"⚠️ Session {session_id} not found for event processing")
            return
        
        # Create suspicious event
        event = SuspiciousEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            timestamp=datetime.now(),
            event_type=EventType(event_data.get('type', 'UNKNOWN')),
            confidence=event_data.get('confidence', 0.5),
            details=event_data.get('details', {}),
            severity=event_data.get('severity', 'LOW')
        )
        
        # Add to session events
        session.events.append(event)
        print(f"➕ Added event {event.event_type.value} to session {session_id}")
        
        # Update risk score
        old_score = session.risk_score
        new_score = scoring_service.calculate_risk_score(session.events)
        session.risk_score = new_score
        
        # Update status based on risk score
        old_status = session.status
        if new_score > 15:
            session.status = "HIGH_RISK"
        elif new_score > 8:
            session.status = "MODERATE_RISK"
        else:
            session.status = "LOW_RISK"
        
        print(f"📊 Session {session_id}: Risk score {old_score} → {new_score}, Status: {old_status} → {session.status}")
        
        # Store in database
        try:
            await db.store_event(event)
            await db.update_session(session)
            print(f"💾 Stored event and updated session in database: {session_id}")
        except Exception as e:
            print(f"❌ Database error for session {session_id}: {e}")
        
        # Broadcast update to all connected clients
        try:
            update_data = {
                "type": "session_update",
                "session": {
                    "id": session.id,
                    "student_name": session.student_name,
                    "risk_score": session.risk_score,
                    "status": session.status,
                    "event_count": len(session.events),
                    "last_event": {
                        "type": event.event_type.value,
                        "timestamp": event.timestamp.isoformat(),
                        "confidence": event.confidence,
                        "severity": event.severity
                    }
                },
                "timestamp": datetime.now().isoformat()
            }
            
            await ws_manager.broadcast(json.dumps(update_data))
            print(f"📡 Broadcast session update for {session_id}")
        except Exception as e:
            print(f"❌ Broadcast error: {e}")
            
    except Exception as e:
        print(f"❌ Error in process_event for session {session_id}: {e}")
        import traceback
        traceback.print_exc()

@app.get("/api/sessions")
async def get_active_sessions():
    """Get all active exam sessions"""
    sessions_data = []
    for session in active_sessions.values():
        sessions_data.append({
            "id": session.id,
            "student_name": session.student_name,
            "start_time": session.start_time.isoformat(),
            "risk_score": session.risk_score,
            "status": session.status,
            "event_count": len(session.events),
            "is_connected": ws_manager.is_connected(session.id) if hasattr(ws_manager, 'is_connected') else False
        })
    return {"sessions": sessions_data, "total": len(sessions_data)}

@app.get("/api/sessions/{session_id}/events")
async def get_session_events(session_id: str):
    """Get events for a specific session"""
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    events_data = []
    for event in session.events[-20:]:  # Last 20 events
        events_data.append({
            "id": event.id,
            "timestamp": event.timestamp.isoformat(),
            "type": event.event_type.value,
            "confidence": event.confidence,
            "severity": event.severity,
            "details": event.details
        })
    
    return {
        "events": events_data, 
        "total": len(session.events),
        "session_id": session_id
    }

@app.post("/api/sessions/{session_id}/flag")
async def flag_session(session_id: str):
    """Manually flag a session"""
    session = active_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    old_status = session.status
    session.status = "FLAGGED"
    await db.update_session(session)
    
    print(f"🚩 Session {session_id} manually flagged (was: {old_status})")
    
    # Broadcast update
    update_data = {
        "type": "session_flagged",
        "session_id": session_id,
        "status": "FLAGGED",
        "timestamp": datetime.now().isoformat()
    }
    await ws_manager.broadcast(json.dumps(update_data))
    
    return {"message": "Session flagged successfully", "session_id": session_id}

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "active_sessions": len(active_sessions),
        "websocket_connections": ws_manager.get_connection_count() if hasattr(ws_manager, 'get_connection_count') else 0,
        "timestamp": datetime.now().isoformat()
    }

# Serve frontend static files in production
frontend_dist = Path("../frontend/dist")
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)