const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

// GET all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNo: 1 });
    res.json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single student by id or rollNo
router.get('/:idOrRoll', async (req, res) => {
  try {
    const query = req.params.idOrRoll.includes('-') || req.params.idOrRoll.length === 24
      ? { _id: req.params.idOrRoll }
      : { rollNo: req.params.idOrRoll.toUpperCase() };

    const student = await Student.findOne(query);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper for Euclidean distance between 128-d biometric vectors
function euclideanDistance(v1, v2) {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// POST register or update student
router.post('/', async (req, res) => {
  try {
    const {
      rollNo,
      name,
      department = 'B.TECH CSE(AI)',
      semester = 5,
      section = 'Class 4',
      email = '',
      phone = '',
      faceDescriptors = [],
      photoSample = ''
    } = req.body;

    if (!rollNo || !name) {
      return res.status(400).json({ success: false, message: 'Roll number and name are required' });
    }

    const cleanRollNo = rollNo.trim().toUpperCase();

    // Biometric Uniqueness Check: Prevent duplicate face enrollment under different names
    if (faceDescriptors && faceDescriptors.length > 0) {
      const otherStudents = await Student.find({ rollNo: { $ne: cleanRollNo } });
      for (const existing of otherStudents) {
        if (!existing.faceDescriptors || existing.faceDescriptors.length === 0) continue;
        for (const existingVec of existing.faceDescriptors) {
          for (const newVec of faceDescriptors) {
            const dist = euclideanDistance(newVec, existingVec);
            if (dist < 0.45) {
              return res.status(409).json({
                success: false,
                biometricConflict: true,
                message: `Biometric Conflict: This face is already registered to ${existing.name} (${existing.rollNo})! Duplicate face registration is blocked to prevent proxy impersonation.`
              });
            }
          }
        }
      }
    }

    // Check if student exists
    let student = await Student.findOne({ rollNo: cleanRollNo });

    if (student) {
      // Update existing student
      student.name = name.trim();
      student.department = department;
      student.semester = semester;
      student.section = section;
      student.email = email;
      student.phone = phone;

      if (faceDescriptors && faceDescriptors.length > 0) {
        student.faceDescriptors = faceDescriptors;
        student.photoCount = faceDescriptors.length;
      }
      if (photoSample) {
        student.photoSample = photoSample;
      }
      await student.save();
      return res.json({ success: true, message: `Student ${cleanRollNo} updated successfully`, student });
    } else {
      // Create new student
      student = new Student({
        rollNo: cleanRollNo,
        name: name.trim(),
        department,
        semester,
        section,
        email,
        phone,
        faceDescriptors: faceDescriptors || [],
        photoCount: (faceDescriptors && faceDescriptors.length) || 0,
        photoSample: photoSample || ''
      });

      await student.save();
      return res.status(201).json({ success: true, message: `Student ${cleanRollNo} registered successfully`, student });
    }
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A student with this Roll Number already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE student and their attendance history
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await Attendance.deleteMany({ rollNo: student.rollNo });
    await Student.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: `Student ${student.rollNo} and their attendance history deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
