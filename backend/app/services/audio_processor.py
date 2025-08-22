import numpy as np
import librosa
import scipy.signal
from typing import Dict, List, Optional, Tuple
import re

class AudioProcessor:
    def __init__(self):
        # Voice Activity Detection parameters
        self.sample_rate = 16000
        self.frame_length = 1024
        self.hop_length = 512
        self.energy_threshold = 0.01
        self.zero_crossing_threshold = 0.1
        
        # Banned keywords for academic integrity
        self.banned_keywords = [
            "google", "search", "answer", "help", "cheat", "solution",
            "homework", "assignment", "test", "quiz", "exam", "grade",
            "copy", "paste", "wikipedia", "chatgpt", "ai", "assistant"
        ]
        
        # Simple speaker diarization parameters
        self.speaker_models = {}
        self.min_speaker_duration = 1.0  # seconds
    
    def process_audio_chunk(self, audio_data: np.ndarray) -> Dict:
        """Process audio chunk and detect suspicious activities"""
        results = {
            "speech_detected": False,
            "multiple_voices": False,
            "banned_keywords": [],
            "voice_activity_score": 0.0,
            "estimated_speakers": 1,
            "audio_quality": "GOOD",
            "confidence": 0.0
        }
        
        if audio_data is None or len(audio_data) == 0:
            return results
        
        # Ensure audio is in correct format
        if audio_data.dtype != np.float32:
            audio_data = audio_data.astype(np.float32)
        
        # Normalize audio
        if np.max(np.abs(audio_data)) > 0:
            audio_data = audio_data / np.max(np.abs(audio_data))
        
        # Voice Activity Detection
        vad_result = self._voice_activity_detection(audio_data)
        results.update(vad_result)
        
        if results["speech_detected"]:
            # Speaker diarization (simplified)
            speaker_info = self._simple_speaker_diarization(audio_data)
            results.update(speaker_info)
            
            # Keyword detection (placeholder - would use STT in production)
            keyword_info = self._detect_banned_keywords_placeholder(audio_data)
            results.update(keyword_info)
            
            # Audio quality assessment
            quality = self._assess_audio_quality(audio_data)
            results["audio_quality"] = quality
            
            results["confidence"] = 0.8
        
        return results
    
    def _voice_activity_detection(self, audio_data: np.ndarray) -> Dict:
        """Simple Voice Activity Detection using energy and zero-crossing rate"""
        # Calculate frame-wise energy
        frame_length = min(self.frame_length, len(audio_data))
        hop_length = min(self.hop_length, frame_length // 2)
        
        frames = librosa.util.frame(audio_data, frame_length=frame_length, 
                                  hop_length=hop_length, axis=0)
        
        # Energy calculation
        energy = np.sum(frames ** 2, axis=0)
        energy_normalized = energy / np.max(energy) if np.max(energy) > 0 else energy
        
        # Zero crossing rate
        zcr = np.array([
            np.sum(np.abs(np.diff(np.sign(frame)))) / (2 * len(frame))
            for frame in frames.T
        ])
        
        # Voice activity score
        voice_frames = (energy_normalized > self.energy_threshold) & \
                      (zcr > self.zero_crossing_threshold)
        
        voice_activity_ratio = np.sum(voice_frames) / len(voice_frames) if len(voice_frames) > 0 else 0
        speech_detected = voice_activity_ratio > 0.3
        
        return {
            "speech_detected": speech_detected,
            "voice_activity_score": float(voice_activity_ratio)
        }
    
    def _simple_speaker_diarization(self, audio_data: np.ndarray) -> Dict:
        """Simplified speaker diarization using spectral clustering"""
        # Extract MFCC features
        try:
            mfccs = librosa.feature.mfcc(y=audio_data, sr=self.sample_rate, n_mfcc=13)
            
            # Simple clustering based on MFCC variance
            mfcc_var = np.var(mfccs, axis=1)
            
            # Estimate number of speakers based on spectral diversity
            # This is a very simplified approach
            spectral_diversity = np.std(mfcc_var)
            
            if spectral_diversity > 0.5:
                estimated_speakers = 2
                multiple_voices = True
            else:
                estimated_speakers = 1
                multiple_voices = False
            
        except Exception:
            estimated_speakers = 1
            multiple_voices = False
        
        return {
            "estimated_speakers": estimated_speakers,
            "multiple_voices": multiple_voices
        }
    
    def _detect_banned_keywords_placeholder(self, audio_data: np.ndarray) -> Dict:
        """Placeholder for keyword detection - would use Vosk/Whisper STT in production"""
        # In a real implementation, this would:
        # 1. Use speech-to-text (Vosk, Whisper, etc.)
        # 2. Process the transcript for banned keywords
        # 3. Return detected keywords with timestamps
        
        # For demo purposes, randomly detect keywords based on audio characteristics
        detected_keywords = []
        
        # Simulate keyword detection based on audio patterns
        if len(audio_data) > self.sample_rate * 2:  # If audio > 2 seconds
            # Simple heuristic: longer audio segments might contain speech
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=audio_data, sr=self.sample_rate))
            
            # Simulate keyword detection with low probability
            if spectral_centroid > 2000:  # High frequency content might indicate speech
                import random
                if random.random() < 0.1:  # 10% chance to detect a keyword
                    detected_keywords.append(random.choice(self.banned_keywords))
        
        return {
            "banned_keywords": detected_keywords
        }
    
    def _assess_audio_quality(self, audio_data: np.ndarray) -> str:
        """Assess audio quality based on various metrics"""
        # Signal-to-noise ratio estimation
        signal_power = np.mean(audio_data ** 2)
        
        if signal_power > 0.1:
            return "GOOD"
        elif signal_power > 0.01:
            return "FAIR"
        else:
            return "POOR"