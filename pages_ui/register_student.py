import streamlit as st
import cv2
import numpy as np
from PIL import Image

from database.db_manager import DatabaseManager
from engine.detector import FaceDetector
from engine.recognizer import FaceRecognizerEngine
from engine.dataset_collector import DatasetCollector


def render_register_student_page(db: DatabaseManager, recognizer: FaceRecognizerEngine,
                                 collector: DatasetCollector, detector: FaceDetector):
    st.title("➕ Student Face Registration")
    st.caption("Enroll a student with facial biometrics. Students will only appear in the roster once face registration is completed.")

    c_left, c_right = st.columns([1.1, 1.2])

    with c_left:
        st.subheader("1. Student Information")
        roll_no = st.text_input("Roll Number *", placeholder="e.g. 24C22075", key="reg_roll_no").strip().upper()
        name = st.text_input("Full Name *", placeholder="e.g. Vishakha", key="reg_name").strip()

        dept_list = [
            "B.TECH CSE(AI)",
            "Computer Science & Engineering",
            "Information Technology",
            "Electronics & Communication",
            "Artificial Intelligence & DS",
            "Mechanical Engineering",
            "Civil Engineering",
            "Electrical Engineering"
        ]
        department = st.selectbox("Department", dept_list, key="reg_dept")

        c_sem, c_sec = st.columns(2)
        with c_sem:
            semester = st.selectbox("Semester", list(range(1, 9)), index=4, key="reg_sem")
        with c_sec:
            section = st.selectbox("Class / Section", ["Class 4", "Class 1", "Class 2", "Class 3", "A", "B", "C", "D"], key="reg_sec")

        email = st.text_input("Email Address", placeholder="student@college.edu", key="reg_email").strip()
        phone = st.text_input("Phone Number", placeholder="+91 9876543210", key="reg_phone").strip()

    with c_right:
        st.subheader("2. Face Biometric Capture")
        if not roll_no or not name:
            st.info("👈 Please enter Roll Number and Full Name on the left to activate face capture.")
            return

        current_samples = collector.get_sample_count(roll_no)

        col_s1, col_s2 = st.columns([2.5, 1])
        with col_s1:
            if current_samples == 0:
                st.warning("⚠️ **0 samples captured.** Face capture is required (1 or 2 photos).")
            else:
                st.success(f"✅ **{current_samples} sample(s) captured.** Ready to complete registration!")
        with col_s2:
            if current_samples > 0:
                if st.button("🗑️ Reset Samples", key=f"reset_{roll_no}", help="Clear captured photos for this student"):
                    collector.clear_student_samples(roll_no)
                    st.rerun()

        capture_tab1, capture_tab2, capture_tab3 = st.tabs([
            "📸 Webcam Snapshot",
            "🎥 Rapid 2-Shot Capture",
            "📁 Upload Photos"
        ])

        with capture_tab1:
            st.write("Take 1 or 2 quick snaps facing the camera:")
            cam_img = st.camera_input("Take Snapshot", key=f"cam_input_{roll_no}")
            if cam_img is not None:
                if st.button("💾 Save Snapshot as Face Sample", type="secondary", key=f"save_btn_{roll_no}"):
                    pil_img = Image.open(cam_img)
                    bgr_frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

                    success, msg, new_count = collector.save_sample_from_frame(bgr_frame, roll_no)
                    if success:
                        st.success(f"✅ Sample #{new_count} saved! You can take 1 more or click 'Register Student' below.")
                        st.rerun()
                    else:
                        st.error(f"⚠️ {msg}")

        with capture_tab2:
            st.write("Automatically captures 2 quick face crops in 1 second from local camera.")
            if st.button("Start 2-Shot Capture", key="burst_btn"):
                cap = cv2.VideoCapture(0)
                if not cap.isOpened():
                    st.error("Could not access camera. Please ensure webcam is connected.")
                else:
                    prog_bar = st.progress(0)
                    status_txt = st.empty()
                    saved = 0
                    target = 2

                    while saved < target:
                        ret, frame = cap.read()
                        if not ret:
                            break
                        faces = detector.detect_faces(frame)
                        if len(faces) == 1:
                            success, _, new_count = collector.save_sample_from_frame(frame, roll_no)
                            if success:
                                saved += 1
                                prog_bar.progress(saved / target)
                                status_txt.text(f"Capturing frame {saved}/{target}...")
                                cv2.waitKey(200)

                    cap.release()
                    prog_bar.empty()
                    status_txt.empty()
                    st.success(f"🎉 Captured {saved} sample(s)! Total: {collector.get_sample_count(roll_no)}")
                    st.rerun()

        with capture_tab3:
            uploaded_files = st.file_uploader(
                "Upload portrait photos of student",
                type=["jpg", "jpeg", "png"],
                accept_multiple_files=True,
                key=f"upload_{roll_no}"
            )
            if uploaded_files:
                upload_hash = hash(tuple(f.name + str(f.size) for f in uploaded_files))
                last_up_key = f"last_up_hash_{roll_no}"
                if st.session_state.get(last_up_key) != upload_hash:
                    st.session_state[last_up_key] = upload_hash
                    saved_upload = 0
                    for up in uploaded_files:
                        pil_img = Image.open(up)
                        bgr_frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                        faces = detector.detect_faces(bgr_frame)
                        if faces:
                            crop = detector.crop_face(bgr_frame, faces[0])
                            if crop is not None:
                                folder = collector.get_student_folder(roll_no)
                                cur = collector.get_sample_count(roll_no)
                                cv2.imwrite(f"{folder}/face_{cur+1:03d}.jpg", crop)
                                saved_upload += 1
                    if saved_upload > 0:
                        st.success(f"Saved {saved_upload} photos from upload. Total: {collector.get_sample_count(roll_no)}")

        st.write("---")
        st.subheader("3. Complete Enrollment")

        if st.button("🚀 Register Student & Train AI Model", type="primary", use_container_width=True):
            if current_samples < 1:
                st.error("❌ Please capture at least 1 face photo above before completing registration.")
            else:
                with st.spinner("Saving student profile and training face recognition model..."):
                    # Add / update student with confirmed photo count
                    success, msg, _ = db.add_student(
                        roll_no=roll_no,
                        name=name,
                        department=department,
                        semester=semester,
                        section=section,
                        email=email,
                        phone=phone,
                        photo_count=current_samples,
                        allow_update=True
                    )

                    if success:
                        train_ok, train_msg, faces_n, stu_n = recognizer.train(collector.dataset_dir)
                        st.balloons()
                        st.success(f"🎉 **Registration Complete!**\n\n**Student:** {name} ({roll_no})\n\n**Biometrics:** {current_samples} face samples registered and trained.\n\nThis student is now officially enrolled and will appear in the **Student Roster**.")
                    else:
                        st.error(f"Failed to save student: {msg}")
