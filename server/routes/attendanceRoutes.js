const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// Helper to format date YYYY-MM-DD in local time
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format time HH:MM:SS
function getLocalTimeString(d = new Date()) {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// POST Mark Attendance (with anti-proxy duplicate prevention)
router.post('/mark', async (req, res) => {
  try {
    const {
      rollNo,
      course = 'JavaScript Framework (PBL) - C2620A3',
      confidence = 100.0,
      status = 'Present'
    } = req.body;

    if (!rollNo) {
      return res.status(400).json({ success: false, message: 'Roll Number is required' });
    }

    const cleanRollNo = rollNo.trim().toUpperCase();
    const today = getLocalDateString();
    const nowTime = getLocalTimeString();

    // 1. Find the student
    const student = await Student.findOne({ rollNo: cleanRollNo });
    if (!student) {
      return res.status(404).json({ success: false, message: `Student with Roll No ${cleanRollNo} is not registered.` });
    }

    // 2. Check for duplicate scan
    const existing = await Attendance.findOne({
      rollNo: cleanRollNo,
      date: today,
      course: course.trim()
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        alreadyMarked: true,
        message: `${student.name} (${cleanRollNo}) is already marked Present at ${existing.time}. Duplicate blocked.`,
        record: existing
      });
    }

    // 3. Create attendance log
    const log = new Attendance({
      studentId: student._id,
      rollNo: cleanRollNo,
      name: student.name,
      department: student.department,
      section: student.section,
      course: course.trim(),
      date: today,
      time: nowTime,
      status,
      confidence: Math.round(confidence * 10) / 10
    });

    await log.save();

    res.status(201).json({
      success: true,
      message: `Marked Present: ${student.name} (${cleanRollNo}) for ${course}`,
      record: log
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        alreadyMarked: true,
        message: 'Duplicate scan blocked by database constraint.'
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Attendance Records (with filters)
router.get('/', async (req, res) => {
  try {
    const { date, course, department, section, rollNo } = req.query;
    const filter = {};

    if (date) filter.date = date;
    if (course) filter.course = course;
    if (department) filter.department = department;
    if (section) filter.section = section;
    if (rollNo) filter.rollNo = rollNo.toUpperCase();

    const records = await Attendance.find(filter).sort({ date: -1, time: -1 });
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Today's Attendance Stream
router.get('/today', async (req, res) => {
  try {
    const today = getLocalDateString();
    const records = await Attendance.find({ date: today }).sort({ time: -1 });
    res.json({ success: true, count: records.length, date: today, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Dashboard Stats & 75% Defaulter Analytics
router.get('/stats', async (req, res) => {
  try {
    const today = getLocalDateString();
    const totalStudents = await Student.countDocuments();
    const distinctPresentToday = await Attendance.distinct('rollNo', { date: today });
    const presentToday = distinctPresentToday.length;
    const attendanceRate = totalStudents > 0 ? Math.min(100, Math.round((presentToday / totalStudents) * 100)) : 0;

    // Calculate Defaulter list (< 75%)
    // Get total distinct lecture sessions held
    const distinctDates = await Attendance.distinct('date');

    // Count attendance per student
    const studentAgg = await Attendance.aggregate([
      { $group: { _id: '$rollNo', attendedCount: { $sum: 1 }, name: { $first: '$name' }, department: { $first: '$department' }, section: { $first: '$section' } } }
    ]);

    const maxAttended = studentAgg.reduce((max, a) => Math.max(max, a.attendedCount), 0);
    const totalLectures = Math.max(distinctDates.length, maxAttended, 1);

    const attendanceMap = {};
    studentAgg.forEach(a => {
      attendanceMap[a._id] = a;
    });

    const allStudents = await Student.find().sort({ rollNo: 1 });
    const studentReports = allStudents.map(s => {
      const attended = attendanceMap[s.rollNo]?.attendedCount || 0;
      const percentage = Math.min(100, Math.round((attended / totalLectures) * 100));
      const isDefaulter = percentage < 75;
      return {
        rollNo: s.rollNo,
        name: s.name,
        department: s.department,
        semester: s.semester,
        section: s.section,
        attendedLectures: attended,
        totalLectures,
        percentage,
        isDefaulter,
        status: isDefaulter ? 'Defaulter' : 'Eligible'
      };
    });

    const defaulters = studentReports.filter(s => s.isDefaulter);

    res.json({
      success: true,
      stats: {
        totalStudents,
        presentToday,
        attendanceRate,
        totalLecturesHeld: totalLectures,
        defaulterCount: defaulters.length
      },
      defaulters,
      studentReports
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE clear all attendance logs
router.delete('/clear-all', async (req, res) => {
  try {
    await Attendance.deleteMany({});
    res.json({ success: true, message: 'All attendance history records successfully cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
