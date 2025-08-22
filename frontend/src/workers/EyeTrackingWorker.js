// Eye Tracking Web Worker
// This worker would normally integrate with MediaPipe FaceMesh
// For demo purposes, we'll simulate the functionality

let isProcessing = false;
let faceCount = 0;
let lastGazeDirection = 'CENTER';
let gazeChangeTime = Date.now();

self.onmessage = function(event) {
  const { type, imageData } = event.data;
  
  if (type === 'process_frame' && !isProcessing) {
    isProcessing = true;
    processFrame(imageData);
  }
};

function processFrame(imageData) {
  // Simulate MediaPipe processing delay
  setTimeout(() => {
    // Simulate face detection results
    const results = simulateFaceDetection();
    
    // Send results back to main thread
    self.postMessage({
      type: 'face_analysis',
      data: results
    });
    
    isProcessing = false;
  }, 50);
}

function simulateFaceDetection() {
  const now = Date.now();
  
  // Simulate face count (mostly 1, sometimes 0 or 2+ for demo)
  const rand = Math.random();
  if (rand < 0.05) {
    faceCount = 0; // No face 5% of time
  } else if (rand < 0.1) {
    faceCount = 2; // Multiple faces 5% of time
  } else {
    faceCount = 1; // Normal case 90% of time
  }
  
  // Simulate gaze direction changes
  const gazeDirections = ['CENTER', 'LEFT', 'RIGHT', 'UP', 'DOWN'];
  
  // Change gaze direction occasionally
  if (now - gazeChangeTime > 2000 + Math.random() * 3000) { // 2-5 seconds
    lastGazeDirection = gazeDirections[Math.floor(Math.random() * gazeDirections.length)];
    gazeChangeTime = now;
  }
  
  // Simulate head pose
  const headPose = {
    yaw: (Math.random() - 0.5) * 60, // -30 to +30 degrees
    pitch: (Math.random() - 0.5) * 40, // -20 to +20 degrees
    roll: (Math.random() - 0.5) * 20   // -10 to +10 degrees
  };
  
  // Simulate phone detection (rare)
  const phoneDetected = Math.random() < 0.02; // 2% chance
  
  // Calculate gaze confidence based on direction
  const gazeConfidence = lastGazeDirection === 'CENTER' ? 0.9 : 0.6 + Math.random() * 0.3;
  
  // Simulate eye aspect ratio for blink detection
  const eyeAspectRatio = 0.25 + Math.random() * 0.1; // Normal range with some variation
  
  return {
    face_count: faceCount,
    gaze_direction: lastGazeDirection,
    gaze_confidence: gazeConfidence,
    head_pose: headPose,
    eye_aspect_ratio: eyeAspectRatio,
    phone_detected: phoneDetected,
    confidence: faceCount === 1 ? 0.9 : 0.6
  };
}

// Utility functions for real MediaPipe integration would go here
function calculateGazeVector(landmarks) {
  // This would implement actual gaze estimation using eye landmarks
  // Using 3D eye model and pupil detection
  return { x: 0, y: 0, z: 1 };
}

function calculateHeadPose(landmarks) {
  // This would implement PnP solver for head pose estimation
  // Using key facial landmarks like nose, chin, corners
  return { yaw: 0, pitch: 0, roll: 0 };
}

function detectPhoneInFrame(imageData) {
  // This would use a trained YOLO model to detect phones/devices
  // Or use MediaPipe Object Detection
  return false;
}

function calculateEyeAspectRatio(eyeLandmarks) {
  // This would calculate EAR from eye landmark coordinates
  // Used for blink detection
  return 0.3;
}