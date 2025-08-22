from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
from .config import settings
from .events import ConnectionManager, Event, SessionManager
from .services.scoring import RiskScorer
from .services.mock_generator import MockDataGenerator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Proctoring System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
connection_manager = ConnectionManager()
session_manager = SessionManager()
risk_scorer = RiskScorer()
mock_generator = MockDataGenerator()

@app.get("/")
async def root():
    return {"message": "AI Proctoring System API", "version": "1.0.0"}

@app.post("/api/sessions/start")
async def start_session(student_id: str = "test_student"):
    """Start a new proctoring session"""
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "student_id": student_id,
        "start_time": datetime.now().isoformat(),
        "status": "active",
        "events": [],
        "risk_score": 0,
        "flags": []
    }
    
    session_manager.create_session(session_id, session_data)
    logger.info(f"Started session {session_id} for student {student_id}")
    
    return {"session_id": session_id, "status": "started"}

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@app.get("/api/sessions/{session_id}/events")
async def get_session_events(session_id: str, limit: int = 100):
    """Get session events"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    events = session.get("events", [])[-limit:]
    return {"events": events, "total": len(session.get("events", []))}

@app.post("/api/sessions/{session_id}/end")
async def end_session(session_id: str):
    """End a proctoring session"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session["status"] = "completed"
    session["end_time"] = datetime.now().isoformat()
    
    # Disconnect all clients for this session
    await connection_manager.disconnect_session(session_id)
    
    return {"status": "session_ended", "session_id": session_id}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time communication"""
    await connection_manager.connect(websocket, session_id)
    
    # Get or create session
    session = session_manager.get_session(session_id)
    if not session:
        session_data = {
            "session_id": session_id,
            "student_id": "anonymous",
            "start_time": datetime.now().isoformat(),
            "status": "active",
            "events": [],
            "risk_score": 0,
            "flags": []
        }
        session_manager.create_session(session_id, session_data)
        session = session_data
    
    # Send initial session state
    await websocket.send_text(json.dumps({
        "type": "session_state",
        "data": session
    }))
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await handle_websocket_message(websocket, session_id, message)
            
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    finally:
        connection_manager.disconnect(websocket, session_id)

async def handle_websocket_message(websocket: WebSocket, session_id: str, message: dict):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    
    if message_type == "heartbeat":
        await websocket.send_text(json.dumps({
            "type": "heartbeat_ack",
            "timestamp": datetime.now().isoformat()
        }))
        return
    
    if message_type == "ping":
        await websocket.send_text(json.dumps({
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }))
        return
    
    # Handle proctoring events
    if message_type in ["gaze_event", "audio_event", "screen_event"]:
        await process_proctoring_event(session_id, message)

async def process_proctoring_event(session_id: str, event_data: dict):
    """Process and store proctoring events"""
    session = session_manager.get_session(session_id)
    if not session:
        return
    
    # Create event object
    event = Event(
        event_id=str(uuid.uuid4()),
        session_id=session_id,
        timestamp=datetime.now().isoformat(),
        event_type=event_data.get("type"),
        data=event_data.get("data", {}),
        severity=event_data.get("severity", "low")
    )
    
    # Add event to session
    session["events"].append(event.__dict__)
    
    # Update risk score
    new_score = risk_scorer.calculate_risk_score(session["events"][-20:])  # Last 20 events
    session["risk_score"] = new_score
    
    # Check for flags
    if new_score > 10:
        flag = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "type": "high_risk",
            "description": f"Risk score exceeded threshold: {new_score}",
            "events": session["events"][-5:]  # Include recent events
        }
        session["flags"].append(flag)
    
    # Broadcast to all connected clients for this session
    broadcast_data = {
        "type": "event_update",
        "data": {
            "event": event.__dict__,
            "risk_score": new_score,
            "total_events": len(session["events"]),
            "flags": session["flags"][-10:]  # Last 10 flags
        }
    }
    
    await connection_manager.broadcast_to_session(session_id, broadcast_data)

# Background task to generate mock data for demo
@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    asyncio.create_task(mock_data_generator())

async def mock_data_generator():
    """Generate mock events for demo purposes"""
    while True:
        await asyncio.sleep(5)  # Generate every 5 seconds
        
        # Generate mock events for active sessions
        active_sessions = session_manager.get_active_sessions()
        
        for session_id in active_sessions:
            if len(connection_manager.get_session_connections(session_id)) > 0:
                mock_event = mock_generator.generate_random_event()
                mock_message = {
                    "type": mock_event["type"],
                    "data": mock_event["data"],
                    "severity": mock_event["severity"]
                }
                await process_proctoring_event(session_id, mock_message)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)