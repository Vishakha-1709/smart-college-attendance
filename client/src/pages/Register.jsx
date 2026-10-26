import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, CheckCircle2, AlertCircle, RefreshCw, Trash2, ShieldCheck, Upload, Sparkles, Smile } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceApiModels, getFaceDescriptor } from '../utils/faceMatcher';

export default function Register({ setActivePage }) {
  const [formData, setFormData] = useState({
    rollNo: '',
    name: '',
    department: 'B.TECH CSE(AI)',
    semester: 5,
    section: 'Class 4',
    email: '',
    phone: ''
  });

  const [descriptors, setDescriptors] = useState([]);
  const [photoSamples, setPhotoSamples] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [liveFaceFound, setLiveFaceFound] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trackIntervalRef = useRef(null);

  const departments = [
    'B.TECH CSE(AI)',
    'Computer Science & Engineering',
    'Information Technology',
    'Artificial Intelligence & DS',
    'Electronics & Communication'
  ];

  const fetchEnrolledStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setEnrolledStudents(data.students);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadFaceApiModels();
    fetchEnrolledStudents();
    return () => {
      stopCamera();
    };
  }, []);

  const checkBiometricConflict = (descriptorArray, currentRoll) => {
    const targetRoll = (currentRoll || '').trim().toUpperCase();
    for (const student of enrolledStudents) {
      if (student.rollNo === targetRoll) continue;
      if (!student.faceDescriptors || student.faceDescriptors.length === 0) continue;
      for (const vec of student.faceDescriptors) {
        let sum = 0;
        for (let i = 0; i < 128; i++) {
          const diff = descriptorArray[i] - vec[i];
          sum += diff * diff;
        }
        const dist = Math.sqrt(sum);
        if (dist < 0.45) {
          return student;
        }
      }
    }
    return null;
  };

  const startCamera = async () => {
    try {
      setStatusMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);

        // Start live face tracking loop to give instant feedback
        if (trackIntervalRef.current) clearInterval(trackIntervalRef.current);
        trackIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const face = await faceapi.detectSingleFace(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.25 })
            );
            setLiveFaceFound(!!face);
          } catch (e) {
            // ignore frame skip
          }
        }, 400);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', message: 'Could not access webcam. Please check browser camera permissions.' });
    }
  };

  const stopCamera = () => {
    if (trackIntervalRef.current) {
      clearInterval(trackIntervalRef.current);
      trackIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setLiveFaceFound(false);
  };

  // Capture face directly from active webcam
  const captureFaceSample = async () => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;
    if (video.readyState < 2) {
      setStatusMessage({
        type: 'error',
        message: 'Camera feed is still initializing. Please wait a second and try again.'
      });
      return;
    }

    try {
      setCapturing(true);
      setStatusMessage(null);

      // Detect face directly on video element
      const detection = await getFaceDescriptor(video);

      if (!detection) {
        setStatusMessage({
          type: 'error',
          message: '❌ No face detected in camera view! Please sit directly in front of the lens with your full face visible inside the oval guide.'
        });
        setCapturing(false);
        return;
      }

      const descriptorArray = Array.from(detection.descriptor);

      // Check if this face is already registered to another student
      const conflict = checkBiometricConflict(descriptorArray, formData.rollNo);
      if (conflict) {
        setStatusMessage({
          type: 'error',
          message: `❌ Biometric Conflict: This face is already enrolled under ${conflict.name} (${conflict.rollNo})! Duplicate face enrollment is blocked to prevent proxy impersonation.`
        });
        setCapturing(false);
        return;
      }

      // Create snapshot thumbnail from video
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      // Mirror snapshot like webcam
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.8);

      setDescriptors(prev => [...prev, descriptorArray]);
      setPhotoSamples(prev => [...prev, thumbnailBase64]);

      setStatusMessage({
        type: 'success',
        message: `✅ Biometric snapshot #${descriptors.length + 1} captured! Extracted 128 facial coordinates.`
      });
    } catch (err) {
      setStatusMessage({ type: 'error', message: 'Face analysis error: ' + err.message });
    } finally {
      setCapturing(false);
    }
  };

  // Upload an image / selfie from file as an alternative to webcam
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCapturing(true);
      setStatusMessage(null);

      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = async () => {
        try {
          const detection = await getFaceDescriptor(img);
          if (!detection) {
            setStatusMessage({
              type: 'error',
              message: '❌ No face found in the uploaded photo. Please upload a clear front-facing selfie or passport photo.'
            });
            setCapturing(false);
            return;
          }

          const descriptorArray = Array.from(detection.descriptor);

          // Check if this face is already registered to another student
          const conflict = checkBiometricConflict(descriptorArray, formData.rollNo);
          if (conflict) {
            setStatusMessage({
              type: 'error',
              message: `❌ Biometric Conflict: This face is already enrolled under ${conflict.name} (${conflict.rollNo})! Duplicate face enrollment is blocked to prevent proxy impersonation.`
            });
            setCapturing(false);
            return;
          }

          // Generate square thumbnail
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 300, 300);
          const thumbnailBase64 = canvas.toDataURL('image/jpeg', 0.85);

          setDescriptors(prev => [...prev, descriptorArray]);
          setPhotoSamples(prev => [...prev, thumbnailBase64]);

          setStatusMessage({
            type: 'success',
            message: `✅ Face photo sample #${descriptors.length + 1} enrolled successfully from uploaded file!`
          });
        } catch (innerErr) {
          setStatusMessage({ type: 'error', message: 'Failed to process image: ' + innerErr.message });
        } finally {
          setCapturing(false);
        }
      };
    } catch (err) {
      setStatusMessage({ type: 'error', message: 'Upload error: ' + err.message });
      setCapturing(false);
    }
  };

  const removeSample = (idx) => {
    setDescriptors(prev => prev.filter((_, i) => i !== idx));
    setPhotoSamples(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rollNo.trim() || !formData.name.trim()) {
      setStatusMessage({ type: 'error', message: 'Roll Number and Student Name are required.' });
      return;
    }

    if (descriptors.length === 0) {
      setStatusMessage({
        type: 'error',
        message: 'Please capture or upload at least 1 facial biometric snapshot before enrolling.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      const payload = {
        ...formData,
        rollNo: formData.rollNo.trim().toUpperCase(),
        faceDescriptors: descriptors,
        photoSample: photoSamples[0] || ''
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 201) {
        setStatusMessage({
          type: 'success',
          message: `🎉 Student ${payload.rollNo} (${payload.name}) enrolled successfully in MongoDB!`
        });

        setFormData({
          rollNo: '',
          name: '',
          department: 'B.TECH CSE(AI)',
          semester: 5,
          section: 'Class 4',
          email: '',
          phone: ''
        });
        setDescriptors([]);
        setPhotoSamples([]);
        stopCamera();
        fetchEnrolledStudents();
      } else {
        setStatusMessage({ type: 'error', message: data.message || 'Failed to save student to database.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', message: 'Network error connecting to MongoDB server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12 space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#E7E0D3] pb-4">
        <h2 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
          <UserPlus className="text-[#8B1E1E]" size={26} />
          <span>Student Facial Biometric Enrollment</span>
        </h2>
        <p className="text-sm text-slate-600 mt-1 font-medium">
          Register new student details and capture 1 or 2 biometric snapshots (via webcam or photo upload). The AI computes 128-dimensional facial coordinates stored securely in MongoDB.
        </p>
      </div>

      {/* Global Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            statusMessage.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-semibold">{statusMessage.message}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold opacity-75 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Registration Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Student Details */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider border-b border-[#EAE3D5] pb-2">
            1. Student Academic Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Roll / Enrollment No *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 24C22075"
                value={formData.rollNo}
                onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 font-semibold rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Student Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vishakha"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Department
            </label>
            <select
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
              className="w-full bg-white border border-[#D6CEBE] text-slate-800 font-medium rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Semester
              </label>
              <select
                value={formData.semester}
                onChange={e => setFormData({ ...formData, semester: Number(e.target.value) })}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 font-medium rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Class / Section
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={e => setFormData({ ...formData, section: e.target.value })}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 font-medium rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white border border-[#D6CEBE] text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B1E1E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || descriptors.length === 0}
            className="w-full btn-primary text-sm justify-center py-3 mt-4"
          >
            {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <UserPlus size={18} />}
            <span>{isSubmitting ? 'Saving to MongoDB...' : 'Save & Enroll Student'}</span>
          </button>
        </div>

        {/* Right Column: Face Biometric Capture */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-2">
            <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-[#8B1E1E]" />
              <span>2. Biometric Capture</span>
            </h3>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
              descriptors.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-[#FAF6EE] text-[#8B1E1E] border-[#E7E0D3]'
            }`}>
              {descriptors.length} / 2 Samples Enrolled
            </span>
          </div>

          {/* Camera Viewport with Live Face Guide */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border-2 border-[#8B1E1E] shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* Live Face Centering Guide Oval */}
            {isCameraActive && (
              <>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center ${
                      liveFaceFound
                        ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(52,211,153,0.5)]'
                        : 'border-amber-400/80 border-dashed animate-pulse'
                    }`}
                  >
                    {!liveFaceFound && (
                      <Smile size={32} className="text-amber-300/40" />
                    )}
                  </div>
                </div>

                {/* Floating Live Indicator Badge */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-md ${
                      liveFaceFound
                        ? 'bg-emerald-700/90 text-white border border-emerald-500'
                        : 'bg-slate-900/85 text-amber-300 border border-amber-500/50'
                    }`}
                  >
                    {liveFaceFound ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-300" />
                        <span>Face Centered & Detected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={13} className="text-amber-400 animate-spin" />
                        <span>Move face into the oval frame</span>
                      </>
                    )}
                  </span>
                </div>
              </>
            )}

            {!isCameraActive && (
              <div className="text-center p-6 space-y-2">
                <Camera size={36} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-300 font-medium">Webcam inactive. Click below to start preview.</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn-primary text-xs"
                >
                  Turn On Webcam
                </button>
              </div>
            )}
          </div>

          {/* In-Place Alert (directly below camera for high visibility) */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="opacity-70 hover:opacity-100 text-[11px] underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Capture Controls (Webcam + Upload Options) */}
          <div className="space-y-2 pt-1">
            {isCameraActive ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={captureFaceSample}
                  disabled={capturing || descriptors.length >= 4}
                  className={`flex-1 text-xs justify-center py-2.5 font-bold rounded-lg flex items-center gap-2 transition-all ${
                    liveFaceFound
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md hover:brightness-110'
                      : 'btn-primary'
                  }`}
                >
                  {capturing ? <RefreshCw className="animate-spin" size={15} /> : <Camera size={15} />}
                  <span>{capturing ? 'Extracting Vector...' : 'Capture Face Snapshot'}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="btn-secondary text-xs"
                >
                  Turn Off
                </button>
              </div>
            ) : null}

            {/* Alternative: File Upload Option */}
            <div className="flex items-center gap-2">
              <label className="btn-secondary text-xs cursor-pointer flex-1 justify-center py-2 hover:bg-[#F5EFE3] transition-colors">
                <Upload size={14} className="text-[#8B1E1E]" />
                <span>Upload Selfie / Photo File</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={capturing || descriptors.length >= 4}
                />
              </label>
              {!isCameraActive && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn-primary text-xs"
                >
                  <Camera size={14} />
                  <span>Start Camera</span>
                </button>
              )}
            </div>
          </div>

          {/* Captured Samples Thumbnails */}
          {photoSamples.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#EAE3D5]">
              <p className="text-xs font-bold text-slate-700">Enrolled Face Samples ({photoSamples.length}):</p>
              <div className="flex gap-3">
                {photoSamples.map((thumb, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-emerald-500 w-20 h-20 bg-white shadow-xs">
                    <img src={thumb} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSample(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete sample"
                    >
                      <Trash2 size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/75 text-[10px] font-bold text-white px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#FAF6EE] p-3 rounded-lg border border-[#E7E0D3] text-[11px] text-slate-600 font-medium flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              The AI neural network computes 128 spatial coordinates (nose bridge, eye contours, jawline). Raw photos are not stored for privacy; only vector arrays are saved in MongoDB.
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
