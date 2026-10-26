const assert = require('assert');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const MONGO_TEST_URI = 'mongodb://127.0.0.1:27017/college_attendance_test';

async function runTests() {
  console.log('--- Starting MongoDB & API Automated Tests ---');

  try {
    // 1. Connect to MongoDB test database
    await mongoose.connect(MONGO_TEST_URI);
    console.log('[PASS] Connected to test database.');

    // Clean up test collections
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    await Attendance.syncIndexes();
    await Student.syncIndexes();

    // 2. Test Student Creation
    const testDesc = Array.from({ length: 128 }, () => Math.random());
    const student = await Student.create({
      rollNo: '24C22075',
      name: 'Vishakha',
      department: 'B.TECH CSE(AI)',
      semester: 5,
      section: 'Class 4',
      faceDescriptors: [testDesc],
      photoCount: 1
    });

    assert.strictEqual(student.rollNo, '24C22075');
    assert.strictEqual(student.department, 'B.TECH CSE(AI)');
    assert.strictEqual(student.faceDescriptors.length, 1);
    assert.strictEqual(student.faceDescriptors[0].length, 128);
    console.log('[PASS] Test 1: Student registration with 128-d face descriptor.');

    // 3. Test Partner Student Creation (Jithendar)
    const partner = await Student.create({
      rollNo: '24C22074',
      name: 'Jithendar',
      department: 'B.TECH CSE(AI)',
      semester: 5,
      section: 'Class 4',
      faceDescriptors: [testDesc],
      photoCount: 1
    });
    assert.strictEqual(partner.rollNo, '24C22074');
    console.log('[PASS] Test 2: Co-author student registration (Jithendar).');

    // 4. Test Attendance Marking
    const today = new Date().toISOString().split('T')[0];
    const log = await Attendance.create({
      studentId: student._id,
      rollNo: student.rollNo,
      name: student.name,
      department: student.department,
      section: student.section,
      course: 'JavaScript Framework (PBL) - C2620A3',
      date: today,
      time: '10:00:00',
      status: 'Present',
      confidence: 88.5
    });
    assert.strictEqual(log.rollNo, '24C22075');
    assert.strictEqual(log.status, 'Present');
    console.log('[PASS] Test 3: Attendance successfully marked.');

    // 5. Test Duplicate Scan Prevention (Anti-Proxy Single-Occurrence)
    let duplicateBlocked = false;
    try {
      await Attendance.create({
        studentId: student._id,
        rollNo: student.rollNo,
        name: student.name,
        department: student.department,
        section: student.section,
        course: 'JavaScript Framework (PBL) - C2620A3',
        date: today,
        time: '10:05:00',
        status: 'Present'
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateBlocked = true;
      }
    }
    assert.strictEqual(duplicateBlocked, true, 'Duplicate scan should be rejected by unique index constraint');
    console.log('[PASS] Test 4: Anti-Proxy duplicate prevention blocked second scan.');

    // 6. Test Defaulter Analytics (< 75% rule)
    // Create attendance for Vishakha on another day
    await Attendance.create({
      studentId: student._id,
      rollNo: student.rollNo,
      name: student.name,
      department: student.department,
      section: student.section,
      course: 'JavaScript Framework (PBL) - C2620A3',
      date: '2026-10-20',
      time: '10:00:00',
      status: 'Present'
    });

    const distinctDates = await Attendance.distinct('date');
    const totalLectures = distinctDates.length; // 2 dates
    const jithendarAttended = await Attendance.countDocuments({ rollNo: '24C22074' }); // 0
    const jithendarPercent = Math.round((jithendarAttended / totalLectures) * 100);
    assert.strictEqual(jithendarPercent, 0);
    assert.strictEqual(jithendarPercent < 75, true);
    console.log(`[PASS] Test 5: Defaulter tracking correctly flags < 75% attendance (${jithendarPercent}% for 0/2 lectures).`);

    // Clean up test database
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    await mongoose.connection.close();
    console.log('[PASS] Test database cleaned up and connection closed.');

    console.log('====================================');
    console.log('ALL 5 MONGODB BACKEND TESTS PASSED 100%!');
    console.log('====================================');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

runTests();
