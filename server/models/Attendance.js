const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  rollNo: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    default: 'B.TECH CSE(AI)'
  },
  section: {
    type: String,
    default: 'Class 4'
  },
  course: {
    type: String,
    required: true,
    default: 'JavaScript Framework (PBL) - C2620A3',
    trim: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  time: {
    type: String, // HH:MM:SS
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Excused'],
    default: 'Present'
  },
  confidence: {
    type: Number,
    default: 100.0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Anti-proxy de-duplication: One attendance log per student per course per date
attendanceSchema.index({ rollNo: 1, date: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
