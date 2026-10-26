import os
import streamlit as st
import cv2

from database.db_manager import DatabaseManager
from engine.detector import FaceDetector
from engine.recognizer import FaceRecognizerEngine
from engine.dataset_collector import DatasetCollector

from pages_ui.home import render_home_page
from pages_ui.mark_attendance import render_mark_attendance_page
from pages_ui.register_student import render_register_student_page
from pages_ui.manage_students import render_manage_students_page
from pages_ui.attendance_reports import render_attendance_reports_page

# Configure Page Settings
st.set_page_config(
    page_title="Smart College Attendance | Face Recognition",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS theme
st.markdown("""
<style>
    /* Main container styling */
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 3rem;
    }
    /* Sidebar header */
    .sidebar-header {
        font-size: 1.25rem;
        font-weight: 700;
        color: #38bdf8;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 1rem;
    }
    .badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 9999px;
    }
    .badge-success {
        background-color: #064e3b;
        color: #6ee7b7;
        border: 1px solid #059669;
    }
    .badge-warning {
        background-color: #78350f;
        color: #fde68a;
        border: 1px solid #d97706;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_system_components():
    """Singleton instances for DB, detector, collector, and recognizer."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "database", "attendance.db")
    dataset_dir = os.path.join(base_dir, "data", "dataset")
    model_path = os.path.join(base_dir, "data", "models", "face_trainer.yml")
    label_path = os.path.join(base_dir, "data", "models", "label_map.json")

    db = DatabaseManager(db_path=db_path)
    detector = FaceDetector()
    collector = DatasetCollector(dataset_dir=dataset_dir)
    recognizer = FaceRecognizerEngine(model_path=model_path, label_path=label_path)

    return db, detector, collector, recognizer


NAV_PAGES = [
    "📊 Dashboard Overview",
    "📸 Mark Attendance (Live Scanner)",
    "➕ Register Student & Face Samples",
    "👥 Manage Students & Roster",
    "📈 Attendance Reports & Defaulters"
]


def main():
    db, detector, collector, recognizer = get_system_components()
    recognizer.load_model()  # Keep model state synchronized with disk

    if "nav_radio_choice" not in st.session_state:
        st.session_state["nav_radio_choice"] = NAV_PAGES[0]

    # Sidebar Navigation & System Monitor
    with st.sidebar:
        st.markdown("""
            <div class="sidebar-header">
                🎓 Campus Vision AI
            </div>
            <div style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.5rem;">
                Smart College Attendance System v2.0
            </div>
        """, unsafe_allow_html=True)

        page = st.radio(
            "Navigation",
            NAV_PAGES,
            key="nav_radio_choice"
        )

        st.write("---")
        st.subheader("🖥️ Engine Diagnostics")

        # Live engine status
        status_cls = "badge-success" if recognizer.is_trained else "badge-warning"
        status_lbl = "ACTIVE & TRAINED" if recognizer.is_trained else "UNTRAINED"
        st.markdown(f"**Face Model:** <span class='badge {status_cls}'>{status_lbl}</span>", unsafe_allow_html=True)
        st.caption(f"OpenCV: `{cv2.__version__}` • LBPH Engine")

        stats = db.get_stats_overview()
        st.markdown(f"**Enrolled Students:** `{stats['total_students']}`")
        st.markdown(f"**Classes Today:** `{stats['today_present']}` marked")

        st.write("---")
        st.caption("College Attendance Portal © 2026")

    # Page Routing
    if page == "📊 Dashboard Overview":
        render_home_page(db, recognizer)
    elif page == "📸 Mark Attendance (Live Scanner)":
        render_mark_attendance_page(db, recognizer, detector)
    elif page == "➕ Register Student & Face Samples":
        render_register_student_page(db, recognizer, collector, detector)
    elif page == "👥 Manage Students & Roster":
        render_manage_students_page(db, recognizer, collector)
    elif page == "📈 Attendance Reports & Defaulters":
        render_attendance_reports_page(db)


if __name__ == "__main__":
    main()
