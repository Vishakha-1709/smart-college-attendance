import streamlit as st
import pandas as pd
from datetime import datetime
from database.db_manager import DatabaseManager
from engine.recognizer import FaceRecognizerEngine


def navigate_to(page_name: str):
    """Callback to switch active sidebar page."""
    st.session_state["nav_radio_choice"] = page_name


def render_home_page(db: DatabaseManager, recognizer: FaceRecognizerEngine):
    st.markdown("""
        <style>
        .metric-card {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 18px 22px;
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        }
        .metric-val {
            font-size: 2.2rem;
            font-weight: 700;
            color: #38bdf8;
            margin: 4px 0;
        }
        .metric-label {
            font-size: 0.9rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        </style>
    """, unsafe_allow_html=True)

    st.title("🎓 Smart College Attendance System")
    st.caption(f"Real-Time Face Recognition & Automated Record Management • {datetime.now().strftime('%A, %d %B %Y')}")

    # Metrics Overview
    stats = db.get_stats_overview()
    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Total Students</div>
                <div class="metric-val">{stats['total_students']}</div>
                <small style="color: #64748b;">Registered in system</small>
            </div>
        """, unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Present Today</div>
                <div class="metric-val" style="color: #4ade80;">{stats['today_present']}</div>
                <small style="color: #64748b;">Daily attendance: {stats['today_rate']}%</small>
            </div>
        """, unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Trained Faces</div>
                <div class="metric-val" style="color: #fbbf24;">{stats['trained_students']}</div>
                <small style="color: #64748b;">Ready for recognition</small>
            </div>
        """, unsafe_allow_html=True)

    with c4:
        status_color = "#4ade80" if recognizer.is_trained else "#f87171"
        status_text = "READY" if recognizer.is_trained else "UNTRAINED"
        st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">AI Engine Status</div>
                <div class="metric-val" style="color: {status_color}; font-size: 1.8rem; padding-top: 5px;">{status_text}</div>
                <small style="color: #64748b;">OpenCV LBPH Model</small>
            </div>
        """, unsafe_allow_html=True)

    st.write("")
    st.write("")

    # Today's Live Attendance Feed
    st.subheader("📋 Today's Attendance Activity")
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_records = db.get_attendance_records(date_from=today_str, date_to=today_str)

    if today_records:
        df_today = pd.DataFrame(today_records)
        display_cols = ["roll_no", "name", "department", "course", "time", "status", "confidence"]
        df_display = df_today[display_cols].copy()
        df_display.columns = ["Roll No", "Student Name", "Department", "Course / Subject", "Timestamp", "Status", "Confidence %"]
        st.dataframe(df_display, use_container_width=True, hide_index=True)
    else:
        st.info("ℹ️ No attendance logged yet today. Click below to start scanning faces with your webcam:")
        st.button(
            "📸 Open Live Attendance Scanner Now",
            type="primary",
            key="btn_hero_scan",
            on_click=navigate_to,
            args=("📸 Mark Attendance (Live Scanner)",)
        )

    st.write("")
    col_a, col_b = st.columns([1.1, 1])

    with col_a:
        st.subheader("⚡ Quick Shortcuts")
        c_btn1, c_btn2 = st.columns(2)
        with c_btn1:
            st.button(
                "📸 Mark Attendance",
                use_container_width=True,
                key="btn_shortcut_mark",
                on_click=navigate_to,
                args=("📸 Mark Attendance (Live Scanner)",)
            )
            st.button(
                "➕ Register Student",
                use_container_width=True,
                key="btn_shortcut_reg",
                on_click=navigate_to,
                args=("➕ Register Student & Face Samples",)
            )
        with c_btn2:
            st.button(
                "👥 Student Roster",
                use_container_width=True,
                key="btn_shortcut_mgmt",
                on_click=navigate_to,
                args=("👥 Manage Students & Roster",)
            )
            st.button(
                "📈 Attendance Reports",
                use_container_width=True,
                key="btn_shortcut_rep",
                on_click=navigate_to,
                args=("📈 Attendance Reports & Defaulters",)
            )

    with col_b:
        st.subheader("💡 System Tips")
        st.info("""
        - Ensure good lighting facing the student's face for maximum recognition accuracy.
        - For best results, capture 1 or 2 clear face photos facing the camera.
        - The system automatically blocks duplicate scans for the same student on the same day.
        """)
