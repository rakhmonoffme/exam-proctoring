from typing import List
from datetime import datetime, timedelta
from ..models.schemas import SuspiciousEvent, EventType

class ScoringService:
    def __init__(self):
        # Event type weights for risk calculation
        self.event_weights = {
            EventType.GAZE_LEFT: 2,
            EventType.GAZE_RIGHT: 2,
            EventType.GAZE_DOWN: 3,
            EventType.GAZE_UP: 1,
            EventType.HEAD_TURN_LEFT: 2,
            EventType.HEAD_TURN_RIGHT: 2,
            EventType.MULTIPLE_FACES: 8,
            EventType.NO_FACE: 5,
            EventType.PHONE_DETECTED: 10,
            EventType.SPEECH_DETECTED: 3,
            EventType.MULTIPLE_VOICES: 7,
            EventType.BANNED_KEYWORDS: 15,
            EventType.TAB_SWITCH: 6,
            EventType.WINDOW_BLUR: 4,
            EventType.COPY_PASTE: 8,
            EventType.RIGHT_CLICK: 3,
            EventType.KEYBOARD_SHORTCUT: 5,
            EventType.SCREEN_SHARE_STOPPED: 12,
            EventType.SUSPICIOUS_MOVEMENT: 4
        }
        
        # Time decay factor (events become less important over time)
        self.time_decay_minutes = 10
    
    def calculate_risk_score(self, events: List[SuspiciousEvent]) -> int:
        """Calculate current risk score based on recent events"""
        if not events:
            return 0
        
        current_time = datetime.now()
        total_score = 0
        
        # Filter events from last 10 minutes
        recent_events = [
            event for event in events 
            if current_time - event.timestamp <= timedelta(minutes=self.time_decay_minutes)
        ]
        
        # Calculate base score
        for event in recent_events:
            base_weight = self.event_weights.get(event.event_type, 1)
            
            # Apply confidence multiplier
            confidence_multiplier = event.confidence
            
            # Apply severity multiplier
            severity_multiplier = {
                "LOW": 0.5,
                "MEDIUM": 1.0,
                "HIGH": 1.5,
                "CRITICAL": 2.0
            }.get(event.severity, 1.0)
            
            # Apply time decay
            time_diff = current_time - event.timestamp
            time_factor = max(0.3, 1 - (time_diff.total_seconds() / (self.time_decay_minutes * 60)))
            
            event_score = base_weight * confidence_multiplier * severity_multiplier * time_factor
            total_score += event_score
        
        # Apply frequency penalties for repeated behaviors
        total_score += self._calculate_frequency_penalties(recent_events)
        
        return min(int(total_score), 100)  # Cap at 100
    
    def _calculate_frequency_penalties(self, events: List[SuspiciousEvent]) -> float:
        """Apply penalties for frequently repeated suspicious behaviors"""
        event_counts = {}
        
        for event in events:
            event_type = event.event_type
            if event_type not in event_counts:
                event_counts[event_type] = 0
            event_counts[event_type] += 1
        
        penalty = 0
        for event_type, count in event_counts.items():
            if count > 3:  # If same event type occurs more than 3 times
                base_penalty = self.event_weights.get(event_type, 1)
                # Exponential penalty for repeated behavior
                frequency_penalty = base_penalty * (count - 3) * 0.5
                penalty += frequency_penalty
        
        return penalty
    
    def get_risk_level(self, score: int) -> str:
        """Convert numeric score to risk level"""
        if score < 5:
            return "LOW"
        elif score < 10:
            return "MODERATE" 
        elif score < 20:
            return "HIGH"
        else:
            return "CRITICAL"
    
    def get_recommendations(self, events: List[SuspiciousEvent]) -> List[str]:
        """Get recommendations based on detected events"""
        recommendations = []
        event_types = set(event.event_type for event in events[-10:])  # Last 10 events
        
        if EventType.GAZE_LEFT in event_types or EventType.GAZE_RIGHT in event_types:
            recommendations.append("Student frequently looking away from screen")
        
        if EventType.MULTIPLE_FACES in event_types:
            recommendations.append("Multiple people detected in camera view")
        
        if EventType.SPEECH_DETECTED in event_types or EventType.MULTIPLE_VOICES in event_types:
            recommendations.append("Audio activity detected - possible communication")
        
        if EventType.TAB_SWITCH in event_types or EventType.WINDOW_BLUR in event_types:
            recommendations.append("Student switching between applications/tabs")
        
        if EventType.COPY_PASTE in event_types:
            recommendations.append("Copy-paste activity detected")
        
        if EventType.PHONE_DETECTED in event_types:
            recommendations.append("Mobile device detected in view")
        
        if EventType.BANNED_KEYWORDS in event_types:
            recommendations.append("Suspicious keywords detected in audio")
        
        return recommendations[:5]