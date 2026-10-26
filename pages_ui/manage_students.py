import streamlit as st
import pandas as pd
from datetime import datetime

from database.db_manager import DatabaseManager
from engine.recognizer import FaceRecognizerEngine
from engine.dataset_collector import DatasetCollector


def render_manage_students_page(db: DatabaseManager, recognizer: FaceRecognizerEngine, collector: DatasetCollector):
    st.title("👥 Student Directory & Management")
    st.caption("View enrolled students with registered face biometrics. Only students with enrolled faces appear here.")

    students = db.get_all_students(only_enrolled_faces=True)

    tab_roster, tab_manual, tab_train = st.tabs(["📋 Student Roster", "✏️ Manual Attendance Adjust", "⚙️ Diagnostics & Reset"])

    with tab_roster:
        if not students:
            st.info("ℹ️ **No registered students yet. The roster is currently blank.**\n\nTo enroll a student, go to **Register Student & Face Samples** on the left menu. Once their face biometrics are registered, their name will automatically appear here.")
        else:
            df_students = pd.DataFrame(students)

            # Search & Filter
            c_search, c_dept = st.columns([1.5, 1])
            with c_search:
                search_query = st.text_input("🔍 Search by Name or Roll No", "").strip().lower()
            with c_dept:
                depts = ["All"] + sorted(list(df_students["department"].unique()))
                selected_dept = st.selectbox("Filter Department", depts)

            filtered_df = df_students.copy()
            if search_query:
                filtered_df = filtered_df[
                    filtered_df["name"].str.lower().str.contains(search_query) |
                    filtered_df["roll_no"].str.lower().str.contains(search_query)
                ]
            if selected_dept != "All":
                filtered_df = filtered_df[filtered_df["department"] == selected_dept]

            display_cols = ["roll_no", "name", "department", "semester", "section", "photo_count", "email", "phone"]
            show_df = filtered_df[display_cols].copy()
            show_df.columns = ["Roll No", "Full Name", "Department", "Semester", "Sec", "Samples", "Email", "Phone"]

            st.dataframe(show_df, use_container_width=True, hide_index=True)
            st.caption(f"Showing {len(filtered_df)} of {len(students)} enrolled students.")

            st.write("---")
            st.subheader("🗑️ Delete Student Record")
            col_del1, col_del2 = st.columns([2, 1])
            with col_del1:
                roll_to_delete = st.selectbox("Select Student to Delete", [f"{s['roll_no']} - {s['name']}" for s in students])
            with col_del2:
                st.write("")
                st.write("")
                if st.button("Delete Student", type="secondary"):
                    roll = roll_to_delete.split(" - ")[0]
                    target_student = db.get_student_by_roll(roll)
                    if target_student:
                        collector.clear_student_samples(roll)
                        success, msg = db.delete_student(target_student["id"])
                        if success:
                            st.success(f"Deleted student {roll} and cleared their face samples.")
                            recognizer.train(collector.dataset_dir)
                            st.rerun()
                        else:
                            st.error(msg)

    with tab_manual:
        st.subheader("Manual Attendance Record Override")
        st.caption("Use this to record attendance for students on medical leave, official duty, or camera exceptions.")

        if not students:
            st.info("No students enrolled yet. Register students first to record manual attendance.")
        else:
            with st.form("manual_att_form"):
                roll_options = [f"{s['roll_no']} - {s['name']}" for s in students]
                selected_student_str = st.selectbox("Select Student", roll_options)

                c_date, c_course, c_status = st.columns(3)
                with c_date:
                    att_date = st.date_input("Date", datetime.now()).strftime("%Y-%m-%d")
                with c_course:
                    course = st.selectbox("Course / Subject", [
                        "Computer Networks",
                        "Machine Learning",
                        "Database Systems",
                        "Operating Systems",
                        "Software Engineering",
                        "Artificial Intelligence",
                        "General Assembly"
                    ])
                with c_status:
                    status = st.selectbox("Status", ["Present", "Late", "Excused (Medical/Duty)"])

                submit_manual = st.form_submit_button("Submit Attendance Override")
                if submit_manual and students:
                    target_roll = selected_student_str.split(" - ")[0]
                    success, msg, rec = db.mark_attendance(
                        roll_no=target_roll,
                        course=course,
                        confidence=100.0,
                        date_str=att_date,
                        status=status
                    )
                    if success:
                        st.success(f"✅ {msg}")
                    else:
                        st.warning(f"ℹ️ {msg}")

    with tab_train:
        st.subheader("AI Model Diagnostics & Database Reset")
        st.write(f"**Model Weights File:** `{recognizer.model_path}`")
        st.write(f"**Model Status:** {'🟢 Trained & Active' if recognizer.is_trained else '🔴 Untrained (No faces registered yet)'}")
        st.write(f"**Recognized Registered IDs:** {len(recognizer.roll_to_label)}")

        if recognizer.roll_to_label:
            st.json(recognizer.roll_to_label)

        if st.button("🔄 Retrain Face Recognition Model", type="primary"):
            with st.spinner("Retraining model on enrolled student folders..."):
                success, msg, total_faces, student_count = recognizer.train(collector.dataset_dir)
                if success:
                    st.success(f"✅ {msg}")
                else:
                    st.warning(f"ℹ️ {msg}")

        st.write("---")
        st.subheader("⚠️ Factory Reset / Clear All Data")
        st.caption("Erase all students, attendance records, face datasets, and trained model files so the system starts completely blank.")

        if st.button("🧹 Clear All Records & Start Blank", type="secondary"):
            db.clear_all_data()
            import os, shutil
            # Clean dataset
            if os.path.exists(collector.dataset_dir):
                for item in os.listdir(collector.dataset_dir):
                    item_path = os.path.join(collector.dataset_dir, item)
                    if os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                    else:
                        os.remove(item_path)
            # Remove trained model files
            for p in [recognizer.model_path, recognizer.label_path]:
                if os.path.exists(p):
                    os.remove(p)
            recognizer.is_trained = False
            recognizer.label_to_roll = {}
            recognizer.roll_to_label = {}
            st.success("✅ System successfully reset to completely blank!")
            st.rerun()
