import os
import random
from datetime import datetime, timedelta
from database.db_manager import DatabaseManager


def seed_database():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "database", "attendance.db")
    db = DatabaseManager(db_path=db_path)

    print("Seeding sample college students...")

    students = [
        ("CS202401", "Aarav Sharma", "Computer Science & Engineering", 6, "A", "aarav@college.edu", "+91 9876543210"),
        ("CS202402", "Priya Patel", "Computer Science & Engineering", 6, "A", "priya@college.edu", "+91 9876543211"),
        ("IT202403", "Rohan Gupta", "Information Technology", 4, "B", "rohan@college.edu", "+91 9876543212"),
        ("EC202404", "Sneha Reddy", "Electronics & Communication", 4, "A", "sneha@college.edu", "+91 9876543213"),
        ("AI202405", "Vikram Singh", "Artificial Intelligence & DS", 6, "A", "vikram@college.edu", "+91 9876543214"),
        ("ME202406", "Ananya Verma", "Mechanical Engineering", 2, "C", "ananya@college.edu", "+91 9876543215"),
    ]

    for roll, name, dept, sem, sec, email, phone in students:
        success, msg, _ = db.add_student(roll, name, dept, sem, sec, email, phone)
        if success:
            print(f"  Added student: {name} ({roll})")

    print("\nSeeding past attendance records (last 10 class sessions)...")
    courses = ["Computer Networks", "Machine Learning", "Database Systems"]
    today = datetime.now()

    # Pre-determined attendance probability to create realistic distribution & defaulters
    attendance_weights = {
        "CS202401": 0.90,  # 90%
        "CS202402": 0.85,  # 85%
        "IT202403": 0.50,  # 50% (Defaulter)
        "EC202404": 0.95,  # 95%
        "AI202405": 0.60,  # 60% (Defaulter)
        "ME202406": 0.45,  # 45% (Defaulter)
    }

    total_marked = 0
    for day_offset in range(12, 0, -1):
        target_date = today - timedelta(days=day_offset)
        # Skip weekends (Saturday=5, Sunday=6)
        if target_date.weekday() >= 5:
            continue

        date_str = target_date.strftime("%Y-%m-%d")
        course = courses[day_offset % len(courses)]

        for roll, prob in attendance_weights.items():
            if random.random() <= prob:
                time_str = f"09:{random.randint(5, 15):02d}:{random.randint(10, 59):02d}"
                conf = round(random.uniform(78.5, 96.0), 1)
                success, _, _ = db.mark_attendance(
                    roll_no=roll,
                    course=course,
                    confidence=conf,
                    date_str=date_str,
                    time_str=time_str
                )
                if success:
                    total_marked += 1

    print(f"Successfully generated {total_marked} realistic historical attendance records.")
    print("Database is ready with comprehensive test data!")


if __name__ == "__main__":
    seed_database()
