import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "attendance.db")


class DatabaseManager:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def init_db(self):
        """Initialize SQLite database tables with necessary schema and indexes."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Students table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    roll_no TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    department TEXT NOT NULL,
                    semester INTEGER NOT NULL,
                    section TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    photo_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Attendance table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    roll_no TEXT NOT NULL,
                    date TEXT NOT NULL,
                    time TEXT NOT NULL,
                    course TEXT DEFAULT 'General',
                    status TEXT DEFAULT 'Present',
                    confidence REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                    UNIQUE(student_id, date, course)
                )
            """)

            # Indexes for fast search
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_roll ON students(roll_no)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_att_roll_date ON attendance(roll_no, date)")
            conn.commit()

    # --- Student Management Methods ---

    def add_student(self, roll_no: str, name: str, department: str, semester: int,
                    section: str, email: str = "", phone: str = "", photo_count: int = 0,
                    allow_update: bool = False) -> Tuple[bool, str, Optional[int]]:
        """Add a new student to the database. If allow_update is True and student exists, updates record."""
        roll_no = roll_no.strip().upper()
        name = name.strip()
        department = department.strip()
        section = section.strip().upper()

        if not roll_no or not name:
            return False, "Roll number and name are required.", None

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO students (roll_no, name, department, semester, section, email, phone, photo_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (roll_no, name, department, semester, section, email, phone, photo_count))
                conn.commit()
                return True, "Student added successfully.", cursor.lastrowid
        except sqlite3.IntegrityError:
            if allow_update:
                with self.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE students
                        SET name = ?, department = ?, semester = ?, section = ?, email = ?, phone = ?, photo_count = ?
                        WHERE roll_no = ?
                    """, (name, department, semester, section, email, phone, photo_count, roll_no))
                    conn.commit()
                    return True, "Student record updated.", None
            return False, f"Student with Roll No '{roll_no}' already exists.", None
        except Exception as e:
            return False, f"Database error: {str(e)}", None

    def get_student_by_roll(self, roll_no: str) -> Optional[Dict[str, Any]]:
        """Retrieve a student record by roll number."""
        roll_no = roll_no.strip().upper()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM students WHERE roll_no = ?", (roll_no,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_student_by_id(self, student_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve a student record by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_all_students(self, only_enrolled_faces: bool = False) -> List[Dict[str, Any]]:
        """Return all student records."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if only_enrolled_faces:
                cursor.execute("SELECT * FROM students WHERE photo_count > 0 ORDER BY roll_no ASC")
            else:
                cursor.execute("SELECT * FROM students ORDER BY roll_no ASC")
            return [dict(row) for row in cursor.fetchall()]

    def update_student(self, student_id: int, name: str, department: str,
                       semester: int, section: str, email: str = "", phone: str = "") -> Tuple[bool, str]:
        """Update existing student info."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE students
                    SET name = ?, department = ?, semester = ?, section = ?, email = ?, phone = ?
                    WHERE id = ?
                """, (name.strip(), department.strip(), semester, section.strip().upper(), email.strip(), phone.strip(), student_id))
                conn.commit()
                return True, "Student updated successfully."
        except Exception as e:
            return False, f"Failed to update student: {str(e)}"

    def update_photo_count(self, student_id: int, count: int) -> bool:
        """Update sample photo count for trained model tracking."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE students SET photo_count = ? WHERE id = ?", (count, student_id))
            conn.commit()
            return cursor.rowcount > 0

    def delete_student(self, student_id: int) -> Tuple[bool, str]:
        """Delete student and their attendance history."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
                cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
                conn.commit()
                return True, "Student deleted successfully."
        except Exception as e:
            return False, f"Error deleting student: {str(e)}"

    # --- Attendance Methods ---

    def is_already_marked(self, roll_no: str, date_str: str, course: str = "General") -> bool:
        """Check if student already marked attendance for specific date and course."""
        roll_no = roll_no.strip().upper()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 1 FROM attendance
                WHERE roll_no = ? AND date = ? AND course = ?
            """, (roll_no, date_str, course))
            return cursor.fetchone() is not None

    def mark_attendance(self, roll_no: str, course: str = "General",
                        confidence: float = 0.0, date_str: Optional[str] = None,
                        time_str: Optional[str] = None, status: str = "Present") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Mark student attendance preventing duplicate entries on the same day/course."""
        roll_no = roll_no.strip().upper()
        student = self.get_student_by_roll(roll_no)
        if not student:
            return False, f"Roll number '{roll_no}' not found in registered students.", None

        now = datetime.now()
        date_val = date_str if date_str else now.strftime("%Y-%m-%d")
        time_val = time_str if time_str else now.strftime("%H:%M:%S")

        if self.is_already_marked(roll_no, date_val, course):
            return False, f"Attendance already marked today ({date_val}) for {student['name']} ({roll_no}).", None

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO attendance (student_id, roll_no, date, time, course, status, confidence)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (student["id"], roll_no, date_val, time_val, course, status, round(float(confidence), 2)))
                conn.commit()
                record_id = cursor.lastrowid
                record = {
                    "id": record_id,
                    "student_id": student["id"],
                    "roll_no": roll_no,
                    "name": student["name"],
                    "department": student["department"],
                    "course": course,
                    "date": date_val,
                    "time": time_val,
                    "status": status,
                    "confidence": round(float(confidence), 2)
                }
                return True, f"Attendance recorded for {student['name']} ({roll_no}).", record
        except sqlite3.IntegrityError:
            return False, f"Attendance already marked for {student['name']} on {date_val}.", None
        except Exception as e:
            return False, f"Error recording attendance: {str(e)}", None

    def get_attendance_records(self, date_from: Optional[str] = None,
                               date_to: Optional[str] = None,
                               department: Optional[str] = None,
                               course: Optional[str] = None,
                               roll_no: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve attendance records with optional filtering."""
        query = """
            SELECT a.id, a.student_id, a.roll_no, s.name, s.department, s.semester, s.section,
                   a.date, a.time, a.course, a.status, a.confidence
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE 1=1
        """
        params: List[Any] = []

        if date_from:
            query += " AND a.date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND a.date <= ?"
            params.append(date_to)
        if department and department != "All":
            query += " AND s.department = ?"
            params.append(department)
        if course and course != "All":
            query += " AND a.course = ?"
            params.append(course)
        if roll_no:
            query += " AND a.roll_no LIKE ?"
            params.append(f"%{roll_no.strip().upper()}%")

        query += " ORDER BY a.date DESC, a.time DESC"

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_student_attendance_summary(self, course: Optional[str] = None) -> List[Dict[str, Any]]:
        """Calculate attendance count and percentage for all registered students."""
        students = self.get_all_students()
        if not students:
            return []

        # Find total distinct dates marked for classes
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if course and course != "All":
                cursor.execute("SELECT COUNT(DISTINCT date) FROM attendance WHERE course = ?", (course,))
            else:
                cursor.execute("SELECT COUNT(DISTINCT date) FROM attendance")
            total_days_row = cursor.fetchone()
            total_days = total_days_row[0] if total_days_row and total_days_row[0] > 0 else 1

            summary = []
            for st in students:
                if course and course != "All":
                    cursor.execute("""
                        SELECT COUNT(*) FROM attendance
                        WHERE student_id = ? AND course = ? AND status = 'Present'
                    """, (st["id"], course))
                else:
                    cursor.execute("""
                        SELECT COUNT(*) FROM attendance
                        WHERE student_id = ? AND status = 'Present'
                    """, (st["id"],))

                attended = cursor.fetchone()[0]
                percentage = round((attended / total_days) * 100, 1)
                is_defaulter = percentage < 75.0

                summary.append({
                    "id": st["id"],
                    "roll_no": st["roll_no"],
                    "name": st["name"],
                    "department": st["department"],
                    "semester": st["semester"],
                    "section": st["section"],
                    "classes_held": total_days,
                    "classes_attended": attended,
                    "percentage": percentage,
                    "is_defaulter": is_defaulter,
                    "status": "Shortage (<75%)" if is_defaulter else "Eligible"
                })

            return summary

    def clear_all_data(self) -> Tuple[bool, str]:
        """Completely reset all students and attendance history."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM attendance")
                cursor.execute("DELETE FROM students")
                try:
                    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('students', 'attendance')")
                except Exception:
                    pass
                conn.commit()
                return True, "All student and attendance data has been successfully cleared."
        except Exception as e:
            return False, f"Failed to reset data: {str(e)}"

    def get_stats_overview(self) -> Dict[str, Any]:
        """Get high-level dashboard metrics."""
        today = datetime.now().strftime("%Y-%m-%d")
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM students WHERE photo_count > 0")
            total_students = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM attendance WHERE date = ?", (today,))
            today_present = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT department) FROM students WHERE photo_count > 0")
            total_depts = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM students WHERE photo_count > 0")
            trained_students = cursor.fetchone()[0]

            rate = round((today_present / total_students * 100), 1) if total_students > 0 else 0.0

            return {
                "total_students": total_students,
                "today_present": today_present,
                "total_departments": total_depts,
                "trained_students": trained_students,
                "today_rate": rate
            }
