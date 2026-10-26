import os
import unittest
import tempfile
import shutil
from database.db_manager import DatabaseManager


class TestDatabaseManager(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_attendance.db")
        self.db = DatabaseManager(self.db_path)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_add_and_get_student(self):
        success, msg, student_id = self.db.add_student(
            roll_no="CS101",
            name="Alice Smith",
            department="Computer Science",
            semester=5,
            section="A",
            email="alice@college.edu",
            phone="1234567890"
        )
        self.assertTrue(success)
        self.assertIsNotNone(student_id)

        student = self.db.get_student_by_roll("cs101")
        self.assertIsNotNone(student)
        self.assertEqual(student["name"], "Alice Smith")
        self.assertEqual(student["department"], "Computer Science")

        # Duplicate test
        dup_success, dup_msg, _ = self.db.add_student(
            roll_no="CS101",
            name="Alice Duplicate",
            department="CS",
            semester=5,
            section="A"
        )
        self.assertFalse(dup_success)
        self.assertIn("already exists", dup_msg)

    def test_mark_attendance_and_deduplication(self):
        # Add student first
        self.db.add_student("IT202", "Bob Johnson", "Information Technology", 3, "B")
        
        # Mark attendance
        success, msg, record = self.db.mark_attendance("IT202", course="Data Structures", confidence=85.5, date_str="2026-10-24")
        self.assertTrue(success)
        self.assertIsNotNone(record)
        self.assertEqual(record["roll_no"], "IT202")

        # Mark again on same day/course -> should be rejected as duplicate
        dup_success, dup_msg, dup_record = self.db.mark_attendance("IT202", course="Data Structures", date_str="2026-10-24")
        self.assertFalse(dup_success)
        self.assertIn("already marked", dup_msg)

    def test_attendance_records_filtering(self):
        self.db.add_student("EE301", "Charlie Brown", "Electrical", 1, "A")
        self.db.add_student("ME401", "Diana Prince", "Mechanical", 7, "A")

        self.db.mark_attendance("EE301", course="Circuits", date_str="2026-10-20")
        self.db.mark_attendance("ME401", course="Thermodynamics", date_str="2026-10-21")

        records_all = self.db.get_attendance_records()
        self.assertEqual(len(records_all), 2)

        records_dept = self.db.get_attendance_records(department="Electrical")
        self.assertEqual(len(records_dept), 1)
        self.assertEqual(records_dept[0]["roll_no"], "EE301")

    def test_student_attendance_summary(self):
        self.db.add_student("CS501", "Evan Wright", "Computer Science", 6, "A")
        self.db.add_student("CS502", "Fiona Gallagher", "Computer Science", 6, "A")

        # Class held on 2 dates
        self.db.mark_attendance("CS501", course="AI", date_str="2026-10-01")
        self.db.mark_attendance("CS501", course="AI", date_str="2026-10-02")
        self.db.mark_attendance("CS502", course="AI", date_str="2026-10-01")

        summary = self.db.get_student_attendance_summary(course="AI")
        self.assertEqual(len(summary), 2)
        evan = next(s for s in summary if s["roll_no"] == "CS501")
        fiona = next(s for s in summary if s["roll_no"] == "CS502")

        self.assertEqual(evan["classes_attended"], 2)
        self.assertEqual(evan["percentage"], 100.0)
        self.assertFalse(evan["is_defaulter"])

        self.assertEqual(fiona["classes_attended"], 1)
        self.assertEqual(fiona["percentage"], 50.0)
        self.assertTrue(fiona["is_defaulter"])


if __name__ == "__main__":
    unittest.main()
