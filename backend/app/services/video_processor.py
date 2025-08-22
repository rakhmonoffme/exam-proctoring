import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, List, Tuple, Optional
import math

class VideoProcessor:
    def __init__(self):
        # Initialize MediaPipe
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=3,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Eye landmark indices for MediaPipe
        self.LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        self.RIGHT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        
        # Nose tip for head pose estimation
        self.NOSE_TIP_INDEX = 1
        self.FOREHEAD_INDEX = 10
        self.CHIN_INDEX = 152
        self.LEFT_CHEEK_INDEX = 234
        self.RIGHT_CHEEK_INDEX = 454
        
    def process_frame(self, frame: np.ndarray) -> Dict:
        """Process video frame and detect suspicious behaviors"""
        results = {
            "face_count": 0,
            "gaze_direction": "CENTER",
            "head_pose": {"yaw": 0, "pitch": 0, "roll": 0},
            "eye_aspect_ratio": 0,
            "phone_detected": False,
            "suspicious_objects": [],
            "confidence": 0.0
        }
        
        if frame is None:
            return results
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        mp_results = self.face_mesh.process(rgb_frame)
        
        if mp_results.multi_face_landmarks:
            results["face_count"] = len(mp_results.multi_face_landmarks)
            
            # Process first detected face
            face_landmarks = mp_results.multi_face_landmarks[0]
            landmarks = np.array([[lm.x, lm.y, lm.z] for lm in face_landmarks.landmark])
            
            # Calculate gaze direction
            gaze_info = self._calculate_gaze_direction(landmarks, frame.shape)
            results.update(gaze_info)
            
            # Calculate head pose
            head_pose = self._calculate_head_pose(landmarks, frame.shape)
            results["head_pose"] = head_pose
            
            # Calculate eye aspect ratio (for blink detection)
            ear = self._calculate_eye_aspect_ratio(landmarks)
            results["eye_aspect_ratio"] = ear
            
            # Set confidence based on face detection quality
            results["confidence"] = 0.8 if results["face_count"] == 1 else 0.6
        
        # Simple phone detection (placeholder - in reality would use trained model)
        phone_detected = self._detect_phone_placeholder(frame)
        results["phone_detected"] = phone_detected
        
        return results
    
    def _calculate_gaze_direction(self, landmarks: np.ndarray, frame_shape: Tuple[int, int, int]) -> Dict:
        """Calculate gaze direction from eye landmarks"""
        h, w = frame_shape[:2]
        
        # Get eye centers
        left_eye_center = np.mean(landmarks[self.LEFT_EYE_INDICES], axis=0)
        right_eye_center = np.mean(landmarks[self.RIGHT_EYE_INDICES], axis=0)
        
        # Convert to pixel coordinates
        left_eye_px = (int(left_eye_center[0] * w), int(left_eye_center[1] * h))
        right_eye_px = (int(right_eye_center[0] * w), int(right_eye_center[1] * h))
        
        # Calculate eye center
        eye_center = ((left_eye_px[0] + right_eye_px[0]) // 2, (left_eye_px[1] + right_eye_px[1]) // 2)
        
        # Calculate gaze direction based on eye position relative to frame center
        frame_center_x = w // 2
        frame_center_y = h // 2
        
        dx = eye_center[0] - frame_center_x
        dy = eye_center[1] - frame_center_y
        
        # Determine gaze direction
        gaze_direction = "CENTER"
        gaze_confidence = 0.5
        
        threshold_x = w * 0.15  # 15% of frame width
        threshold_y = h * 0.1   # 10% of frame height
        
        if abs(dx) > threshold_x:
            if dx > 0:
                gaze_direction = "RIGHT"
                gaze_confidence = min(0.9, 0.5 + abs(dx) / threshold_x * 0.4)
            else:
                gaze_direction = "LEFT"  
                gaze_confidence = min(0.9, 0.5 + abs(dx) / threshold_x * 0.4)
        elif abs(dy) > threshold_y:
            if dy > 0:
                gaze_direction = "DOWN"
                gaze_confidence = min(0.9, 0.5 + abs(dy) / threshold_y * 0.4)
            else:
                gaze_direction = "UP"
                gaze_confidence = min(0.9, 0.5 + abs(dy) / threshold_y * 0.4)
        
        return {
            "gaze_direction": gaze_direction,
            "gaze_confidence": gaze_confidence,
            "eye_center": eye_center
        }
    
    def _calculate_head_pose(self, landmarks: np.ndarray, frame_shape: Tuple[int, int, int]) -> Dict[str, float]:
        """Calculate head pose (yaw, pitch, roll) from facial landmarks"""
        h, w = frame_shape[:2]
        
        # Key points for head pose estimation
        nose_tip = landmarks[self.NOSE_TIP_INDEX]
        forehead = landmarks[self.FOREHEAD_INDEX]
        chin = landmarks[self.CHIN_INDEX]
        left_cheek = landmarks[self.LEFT_CHEEK_INDEX]
        right_cheek = landmarks[self.RIGHT_CHEEK_INDEX]
        
        # Convert to pixel coordinates
        points_2d = np.array([
            [nose_tip[0] * w, nose_tip[1] * h],
            [forehead[0] * w, forehead[1] * h],
            [chin[0] * w, chin[1] * h],
            [left_cheek[0] * w, left_cheek[1] * h],
            [right_cheek[0] * w, right_cheek[1] * h]
        ], dtype=np.float64)
        
        # 3D model points
        model_points = np.array([
            [0.0, 0.0, 0.0],          # Nose tip
            [0.0, -50.0, -50.0],      # Forehead
            [0.0, 50.0, -50.0],       # Chin
            [-50.0, 0.0, -30.0],      # Left cheek
            [50.0, 0.0, -30.0]        # Right cheek
        ], dtype=np.float64)
        
        # Camera matrix (approximate)
        focal_length = w
        center = (w // 2, h // 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)
        
        # Distortion coefficients (assuming no distortion)
        dist_coeffs = np.zeros((4, 1))
        
        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points, points_2d, camera_matrix, dist_coeffs
        )
        
        if not success:
            return {"yaw": 0, "pitch": 0, "roll": 0}
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Calculate Euler angles
        yaw = math.atan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
        pitch = math.atan2(-rotation_matrix[2, 0], 
                          math.sqrt(rotation_matrix[2, 1]**2 + rotation_matrix[2, 2]**2))
        roll = math.atan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
        
        # Convert to degrees
        return {
            "yaw": math.degrees(yaw),
            "pitch": math.degrees(pitch), 
            "roll": math.degrees(roll)
        }
    
    def _calculate_eye_aspect_ratio(self, landmarks: np.ndarray) -> float:
        """Calculate Eye Aspect Ratio for blink detection"""
        def eye_aspect_ratio(eye_landmarks):
            # Vertical eye landmarks
            A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
            B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
            # Horizontal eye landmark
            C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
            # EAR formula
            ear = (A + B) / (2.0 * C)
            return ear
        
        # Get eye landmark points
        left_eye = landmarks[self.LEFT_EYE_INDICES[:6]]
        right_eye = landmarks[self.RIGHT_EYE_INDICES[:6]]
        
        # Calculate EAR for both eyes
        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        
        # Return average EAR
        return (left_ear + right_ear) / 2.0
    
    def _detect_phone_placeholder(self, frame: np.ndarray) -> bool:
        """Placeholder phone detection - in production would use trained YOLO model"""
        # Simple placeholder logic based on rectangular objects
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 1000:  # Minimum area threshold
                # Check if contour is rectangular-ish
                epsilon = 0.02 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                if len(approx) == 4:
                    # Check aspect ratio (phones are typically 16:9 or similar)
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = max(w, h) / min(w, h)
                    if 1.5 < aspect_ratio < 3.0:
                        return True
        
        return False