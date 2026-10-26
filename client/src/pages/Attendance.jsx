import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { loadFaceApiModels, getAllFacesWithDescriptors, buildLabeledFaceDescriptors, findBestMatch } from '../utils/faceMatcher';

export default function Attendance() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);
  const processedRollsRef = useRef(new Map()); // rollNo -> timestamp of last notification

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [students, setStudents] = useState([]);
  const [labeledDescriptors, setLabeledDescriptors] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('JavaScript Framework (PBL) - C2620A3');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [notification, setNotification] = useState(null);
  const [lastMarked, setLastMarked] = useState(null);
  const [manualRoll, setManualRoll] = useState('');

  // Course Options
  const courses = [
    'JavaScript Framework (PBL) - C2620A3',
    'Machine Learning & Deep Learning Lab',
    'Computer Vision & Image Processing',
    'Full Stack Web Development',
    'Software Engineering & Agile'
  ];

  // Fetch enrolled students from MongoDB
  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        const labeled = buildLabeledFaceDescriptors(data.students);
        setLabeledDescriptors(labeled);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoadingModels(true);
      await loadFaceApiModels();
      await fetchStudents();
      setLoadingModels(false);
    }
    init();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        scanningRef.current = true;
        scanLoop();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Could not access webcam. Please ensure camera permissions are allowed in your browser.'
      });
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    processedRollsRef.current.clear();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const markAttendance = async (rollNo, matchConfidence) => {
    const now = Date.now();
    const lastAttempt = processedRollsRef.current.get(rollNo) || 0;

    // Throttle repeated triggers: only process once every 15 seconds per student
    if (now - lastAttempt < 15000) {
      return;
    }
    processedRollsRef.current.set(rollNo, now);

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNo,
          course: selectedCourse,
          confidence: matchConfidence,
          status: 'Present'
        })
      });

      const data = await res.json();

      if (res.status === 201) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        setNotification({
          type: 'success',
          message: `✅ Attendance Marked: ${data.record.name} (${data.record.rollNo}) - Present`
        });
        setLastMarked(data.record);
      } else if (res.status === 409) {
        setNotification({
          type: 'warning',
          message: `ℹ️ ${data.record?.name || rollNo} is already marked Present for this lecture.`
        });
      } else {
        setNotification({
          type: 'error',
          message: data.message || 'Failed to mark attendance.'
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Network error communicating with MongoDB API.'
      });
    }
  };

  const scanLoop = async () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === 4) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        const detections = await getAllFacesWithDescriptors(video);

        // Strict distance mapping: 60% -> 0.44, 70% -> 0.40, 80% -> 0.36
        const distanceGate = Math.max(0.32, Math.min(0.46, 0.44 - ((confidenceThreshold - 60) / 30) * 0.12));

        detections.forEach(det => {
          const { x, y, width, height } = det.detection.box;
          // Invert horizontal position to align with mirrored webcam video without reversing text
          const mirroredX = canvas.width - (x + width);
          const match = findBestMatch(det.descriptor, labeledDescriptors, distanceGate);

          if (match.isMatch && match.confidence >= confidenceThreshold) {
            const studentInfo = students.find(s => s.rollNo === match.rollNo);
            const studentName = studentInfo ? studentInfo.name : match.rollNo;

            // Green HUD Box for genuine enrolled student
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 3;
            ctx.strokeRect(mirroredX, y, width, height);

            ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
            ctx.fillRect(mirroredX, Math.max(0, y - 28), width, 28);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 13px system-ui';
            ctx.fillText(`${studentName} • ${match.confidence}% (d: ${match.distance})`, mirroredX + 6, Math.max(18, y - 9));

            markAttendance(match.rollNo, match.confidence);
          } else {
            // Red HUD Box for different person / stranger
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(mirroredX, y, width, height);

            ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
            ctx.fillRect(mirroredX, Math.max(0, y - 28), width, 28);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 13px system-ui';
            ctx.fillText(`Unknown Face (${match.confidence}%, d: ${match.distance})`, mirroredX + 6, Math.max(18, y - 9));
          }
        });
      } catch (err) {
        // Frame processing drop - continue loop
      }
    }

    if (scanningRef.current) {
      setTimeout(scanLoop, 250);
    }
  };

  const handleManualMark = (e) => {
    e.preventDefault();
    if (!manualRoll.trim()) return;
    markAttendance(manualRoll.trim().toUpperCase(), 100.0);
    setManualRoll('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E0D3] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
            <Camera className="text-[#8B1E1E]" size={26} />
            <span>Live Face Recognition Attendance Kiosk</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Stand in front of the camera. The neural engine detects face biometrics, validates registered students, and writes directly to MongoDB.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#FAF6EE] text-slate-700 font-bold px-3 py-1 rounded-full border border-[#E7E0D3]">
            {labeledDescriptors.length} Biometric Vectors Active
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : notification.type === 'warning'
              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video Viewport & Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4 flex flex-col items-center">
            {/* Camera Viewport Container */}
            <div className="scanner-viewport relative flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video"
              />
              <canvas
                ref={canvasRef}
                className="scanner-canvas"
              />

              {!isCameraActive && (
                <div className="text-center p-6 space-y-3 z-10">
                  <div className="h-16 w-16 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <Camera size={32} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Camera is Standby</h4>
                    <p className="text-xs text-slate-400 mt-1">Click the button below to turn on the live webcam scanner.</p>
                  </div>
                  <button
                    onClick={startCamera}
                    disabled={loadingModels}
                    className="btn-primary text-sm shadow-md"
                  >
                    {loadingModels ? <RefreshCw className="animate-spin" size={16} /> : <Camera size={16} />}
                    <span>{loadingModels ? 'Loading AI Models...' : 'Start Camera Scanner'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="w-full flex items-center justify-between mt-4 pt-3 border-t border-[#EAE3D5]">
              <div className="flex items-center gap-2">
                {isCameraActive ? (
                  <button onClick={stopCamera} className="btn-secondary text-xs text-red-600 hover:text-red-700">
                    Stop Scanner
                  </button>
                ) : (
                  <button onClick={startCamera} disabled={loadingModels} className="btn-primary text-xs">
                    Start Scanner
                  </button>
                )}
                <button onClick={fetchStudents} className="btn-secondary text-xs" title="Refresh Student Biometrics">
                  <RefreshCw size={14} />
                  <span>Sync DB</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Anti-Proxy De-Duplication Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Lecture Session Settings & Manual Fallback */}
        <div className="space-y-5">
          {/* Settings Box */}
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-[#EAE3D5] pb-2">
              Lecture Configuration
            </h3>

            {/* Course Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Current Subject / Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 font-medium rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
              >
                {courses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Confidence Threshold */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium mb-1">
                <span>Recognition Confidence Gate</span>
                <span className="font-bold text-[#8B1E1E]">{confidenceThreshold}% (Strict)</span>
              </div>
              <input
                type="range"
                min="60"
                max="88"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-[#8B1E1E] bg-[#EAE3D5] rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Biometric Gate: &ge; {confidenceThreshold}% match required. Different faces are rejected as "Unknown Face".
              </p>
            </div>

            {/* Student Counts */}
            <div className="bg-[#FAF6EE] p-3 rounded-lg border border-[#E7E0D3] text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Class:</span>
                <span className="text-[#0F172A] font-bold">B.TECH CSE(AI) Class 4</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Enrolled Biometrics:</span>
                <span className="text-[#0F172A] font-bold">{labeledDescriptors.length} students</span>
              </div>
            </div>
          </div>

          {/* Manual Attendance Fallback */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Manual Override / Absentee Pass
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              If a student is on official college duty or has face camera injury, enter Roll Number manually:
            </p>
            <form onSubmit={handleManualMark} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 24C22075"
                value={manualRoll}
                onChange={(e) => setManualRoll(e.target.value)}
                className="flex-1 bg-white border border-[#D6CEBE] text-slate-800 font-semibold rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#8B1E1E]"
              />
              <button type="submit" className="btn-secondary text-xs">
                Mark
              </button>
            </form>
          </div>

          {/* Last Marked Student Card */}
          {lastMarked && (
            <div className="glass-card p-4 border-[#A7F3D0] bg-[#ECFDF5] space-y-1.5">
              <div className="flex items-center gap-2 text-[#065F46] text-xs font-bold uppercase">
                <UserCheck size={16} />
                <span>Just Marked Present</span>
              </div>
              <p className="text-base font-extrabold text-[#065F46]">{lastMarked.name}</p>
              <p className="text-xs text-slate-600 font-mono font-medium">
                {lastMarked.rollNo} • {lastMarked.time} • Match {lastMarked.confidence}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
