const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    unique: true,
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
    default: 'B.TECH CSE(AI)',
    trim: true
  },
  semester: {
    type: Number,
    default: 5
  },
  section: {
    type: String,
    default: 'Class 4',
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // 128-dimensional biometric embeddings from face-api.js
  faceDescriptors: {
    type: [[Number]],
    default: []
  },
  photoCount: {
    type: Number,
    default: 0
  },
  // Small Base64 thumbnail preview for student card
  photoSample: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Student', studentSchema);
