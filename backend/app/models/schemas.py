from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any, Optional
from enum import Enum

class EventType(str, Enum):
    # Gaze tracking events
    GAZE_LEFT = "gaze_left"
    GAZE_RIGHT = "gaze_right"
    GAZE_UP = "gaze_up"
    GAZE_DOWN = "gaze_down"
    
    # Head pose events
    HEAD_TURN_LEFT = "head_turn_left"
    HEAD_TURN_RIGHT = "head_turn_right"
    HEAD_TILT = "head_tilt"
    
    # Face detection events
    MULTIPLE_FACES = "multiple_faces"
    NO_FACE = "no_face"
    PHONE_DETECTED = "phone_detected"
    
    # Audio events
    SPEECH_DETECTED = "speech_detected"
    MULTIPLE_VOICES = "multiple_voices"
    BANNED_KEYWORDS = "banned_keywords"
    
    # Screen events
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    COPY_PASTE = "copy_paste"
    RIGHT_CLICK = "right_click"
    KEYBOARD_SHORTCUT = "keyboard_shortcut"
    SCREEN_SHARE_STOPPED = "screen_share_stopped"
    
    # Movement events
    SUSPICIOUS_MOVEMENT = "suspicious_movement"
    
    # Unknown
    UNKNOWN = "unknown"

class SuspiciousEvent(BaseModel):
    id: str
    session_id: str
    timestamp: datetime
    event_type: EventType
    confidence: float
    details: Dict[str, Any]
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL

class ExamSession(BaseModel):
    id: str
    student_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    risk_score: int
    status: str  # ACTIVE, LOW_RISK, MODERATE_RISK, HIGH_RISK, FLAGGED, DISCONNECTED
    events: List[SuspiciousEvent]

class SessionResponse(BaseModel):
    id: str
    student_name: str
    start_time: datetime
    risk_score: int
    status: str
    event_count: int