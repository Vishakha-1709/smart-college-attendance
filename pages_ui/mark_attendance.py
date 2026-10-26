import streamlit as st
import cv2
import numpy as np
import pandas as pd
from datetime import datetime
from PIL import Image

from database.db_manager import DatabaseManager
from engine.detector import FaceDetector
from engine.recognizer import FaceRecognizerEngine


def render_mark_attendance_page(db: DatabaseManager, recognizer: FaceRecognizerEngine, detector: FaceDetector):
    st.title("📸 Live Face Attendance Scanner")
    st.caption("Point the camera at students to identify faces and automatically record attendance.")

    if not recognizer.is_trained:
        st.warning("⚠️ Face recognition model is not trained yet. Please register students and train the model first.")
        st.info("👉 Head over to **Register Student** to enroll faces, or **Model Training** to rebuild.")
        return

    # Configuration Bar
    c_subj, c_thresh, c_mode = st.columns([1.5, 1, 1.2])

    with c_subj:
        course_list = [
            "Computer Networks",
            "Machine Learning",
            "Database Systems",
            "Operating Systems",
            "Software Engineering",
            "Artificial Intelligence",
            "General Assembly"
        ]
        selected_course = st.selectbox("Select Subject / Lecture", course_list)

    with c_thresh:
        conf_threshold = st.slider("Match Confidence Threshold (%)", min_value=50, max_value=90, value=65, step=5)

    with c_mode:
        input_mode = st.radio("Scanner Mode", ["Instant Camera Snapshot", "Continuous OpenCV Stream", "Upload Photo"], horizontal=False)

    st.write("---")

    col_cam, col_feed = st.columns([1.3, 1])

    with col_cam:
        if input_mode == "Instant Camera Snapshot":
            st.subheader("📷 Take Snapshot")
            camera_image = st.camera_input("Look at the camera and snap")

            if camera_image is not None:
                # Convert uploaded file to cv2 BGR image ensuring RGB color space
                image_pil = Image.open(camera_image).convert("RGB")
                frame = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)

                # Process image
                process_frame_and_mark(frame, selected_course, conf_threshold, db, recognizer, detector)

        elif input_mode == "Upload Photo":
            st.subheader("📁 Upload Photo for Verification")
            uploaded_file = st.file_uploader("Upload an image (JPG, PNG)", type=["jpg", "jpeg", "png"])
            if uploaded_file is not None:
                image_pil = Image.open(uploaded_file).convert("RGB")
                frame = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
                process_frame_and_mark(frame, selected_course, conf_threshold, db, recognizer, detector)

        elif input_mode == "Continuous OpenCV Stream":
            st.subheader("🎥 Real-Time OpenCV Video Stream")
            st.info("Click 'Start Camera Stream' to initiate live video recognition. Press 'Stop' to release the camera.")

            run_stream = st.checkbox("🟢 Start Camera Stream", value=False)
            frame_placeholder = st.empty()
            status_placeholder = st.empty()

            if run_stream:
                cap = cv2.VideoCapture(0)
                if not cap.isOpened():
                    st.error("❌ Could not access webcam. Please check your camera connection or permissions.")
                else:
                    marked_in_session = set()
                    while run_stream:
                        ret, frame = cap.read()
                        if not ret:
                            status_placeholder.error("Failed to read video frame from camera.")
                            break

                        # Detect faces
                        faces = detector.detect_faces(frame)
                        for bbox in faces:
                            face_crop = detector.crop_face(frame, bbox)
                            if face_crop is not None:
                                roll_no, similarity, is_confident = recognizer.predict(face_crop)

                                if is_confident and similarity >= conf_threshold and roll_no != "Unknown":
                                    student = db.get_student_by_roll(roll_no)
                                    student_name = student["name"] if student else roll_no
                                    label_text = f"{student_name} ({roll_no})"
                                    frame = detector.draw_annotation(
                                        frame, bbox, label_text, color=(0, 220, 100),
                                        subtitle=f"{similarity:.1f}% Match"
                                    )

                                    if roll_no not in marked_in_session:
                                        success, msg, rec = db.mark_attendance(
                                            roll_no=roll_no,
                                            course=selected_course,
                                            confidence=similarity
                                        )
                                        if success:
                                            status_placeholder.success(f"✅ {msg}")
                                            marked_in_session.add(roll_no)
                                        else:
                                            status_placeholder.info(f"ℹ️ {msg}")
                                            marked_in_session.add(roll_no)
                                else:
                                    frame = detector.draw_annotation(
                                        frame, bbox, "Unknown Face", color=(0, 0, 220),
                                        subtitle=f"Conf: {similarity:.1f}%"
                                    )

                        # Display in Streamlit
                        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        frame_placeholder.image(rgb_frame, channels="RGB", use_container_width=True)

                    cap.release()

    with col_feed:
        st.subheader("📝 Today's Logs for this Lecture")
        today = datetime.now().strftime("%Y-%m-%d")
        records = db.get_attendance_records(date_from=today, date_to=today, course=selected_course)

        if records:
            df = pd.DataFrame(records)[["roll_no", "name", "time", "confidence"]]
            df.columns = ["Roll No", "Student", "Time", "Match %"]
            st.dataframe(df, use_container_width=True, hide_index=True)
            st.metric("Total Present in this class", len(records))
        else:
            st.caption("No attendance entries recorded yet for this lecture today.")


def process_frame_and_mark(frame: np.ndarray, course: str, conf_thresh: float,
                           db: DatabaseManager, recognizer: FaceRecognizerEngine, detector: FaceDetector):
    """Processes a single snapshot image, detects faces, predicts identity, and marks attendance."""
    faces = detector.detect_faces(frame)
    annotated = frame.copy()

    if len(faces) == 0:
        st.warning("🔍 No face detected in the snapshot. Ensure you are well-lit and facing forward.")
        rgb_disp = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
        st.image(rgb_disp, caption="Processed Image", use_container_width=True)
        return

    st.success(f"Detected {len(faces)} face(s) in frame.")
    recognized_any = False

    for bbox in faces:
        face_crop = detector.crop_face(frame, bbox)
        if face_crop is None:
            continue

        roll_no, similarity, is_confident = recognizer.predict(face_crop)

        if is_confident and similarity >= conf_thresh and roll_no != "Unknown":
            student = db.get_student_by_roll(roll_no)
            name_str = student["name"] if student else roll_no
            dept_str = student["department"] if student else "N/A"

            annotated = detector.draw_annotation(
                annotated, bbox, f"{name_str}", color=(0, 210, 80),
                subtitle=f"{roll_no} • {similarity:.1f}%"
            )

            # Record attendance in DB
            success, msg, rec = db.mark_attendance(
                roll_no=roll_no,
                course=course,
                confidence=similarity
            )

            if success:
                st.balloons()
                st.success(f"🎉 **Attendance Recorded!**\n\n**Student:** {name_str} ({roll_no})\n\n**Department:** {dept_str}\n\n**Course:** {course} • **Confidence:** {similarity:.1f}%")
            else:
                st.info(f"ℹ️ **Status:** {msg}")

            recognized_any = True
        else:
            annotated = detector.draw_annotation(
                annotated, bbox, "Unknown Face", color=(0, 0, 220),
                subtitle="Not Registered"
            )

    if not recognized_any:
        st.error("❌ **Face Not Recognized!** This person is not registered in the system (or biometric match confidence was below threshold). Attendance was **not** marked.")

    rgb_disp = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
    st.image(rgb_disp, caption="Recognition Result", use_container_width=True)
