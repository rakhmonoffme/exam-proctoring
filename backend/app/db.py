from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models.db_models import Base, SessionModel, EventModel
from .models.schemas import ExamSession, SuspiciousEvent
from .config import settings
from typing import List

class Database:
    def __init__(self):
        self.engine = create_engine(settings.DATABASE_URL, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    async def init_db(self):
        """Initialize database tables"""
        Base.metadata.create_all(bind=self.engine)
        print("📊 Database initialized successfully")
    
    def store_event(self, event: SuspiciousEvent):
        """Store suspicious event in database"""
        db = self.SessionLocal()
        try:
            db_event = EventModel(
                id=event.id,
                session_id=event.session_id,
                timestamp=event.timestamp,
                event_type=event.event_type.value,
                confidence=event.confidence,
                severity=event.severity,
                details=event.details
            )
            db.add(db_event)
            db.commit()
        except Exception as e:
            print(f"❌ Error storing event: {e}")
            db.rollback()
        finally:
            db.close()
    
    def update_session(self, session: ExamSession):
        """Update exam session in database"""
        db = self.SessionLocal()
        try:
            db_session = db.query(SessionModel).filter(SessionModel.id == session.id).first()
            if db_session:
                db_session.risk_score = session.risk_score
                db_session.status = session.status
                if session.end_time:
                    db_session.end_time = session.end_time
            else:
                db_session = SessionModel(
                    id=session.id,
                    student_name=session.student_name,
                    start_time=session.start_time,
                    risk_score=session.risk_score,
                    status=session.status
                )
                db.add(db_session)
            db.commit()
        except Exception as e:
            print(f"❌ Error updating session: {e}")
            db.rollback()
        finally:
            db.close()
    
    def get_session_events(self, session_id: str, limit: int = 50) -> List[SuspiciousEvent]:
        """Get events for a specific session"""
        db = self.SessionLocal()
        try:
            events = db.query(EventModel).filter(
                EventModel.session_id == session_id
            ).order_by(EventModel.timestamp.desc()).limit(limit).all()
            
            return [
                SuspiciousEvent(
                    id=event.id,
                    session_id=event.session_id,
                    timestamp=event.timestamp,
                    event_type=event.event_type,
                    confidence=event.confidence,
                    details=event.details or {},
                    severity=event.severity
                ) for event in events
            ]
        finally:
            db.close()
    
    def store_session(self, session: ExamSession):
        """Store new exam session in database"""
        db = self.SessionLocal()
        try:
            db_session = SessionModel(
                id=session.id,
                student_name=session.student_name,
                start_time=session.start_time,
                risk_score=session.risk_score,
                status=session.status
            )
            db.add(db_session)
            db.commit()
        except Exception as e:
            print(f"❌ Error storing session: {e}")
            db.rollback()
        finally:
            db.close()
    
    def close(self):
        """Optional close method (does nothing for sync)"""
        pass
