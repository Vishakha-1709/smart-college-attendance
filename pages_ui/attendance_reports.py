import io
import streamlit as st
import pandas as pd
from datetime import datetime, timedelta

from database.db_manager import DatabaseManager


def render_attendance_reports_page(db: DatabaseManager):
    st.title("📈 Attendance Reports & Analytics")
    st.caption("Generate comprehensive attendance reports, monitor low-attendance defaulters, and export data.")

    # Date defaults: last 30 days up to today
    today = datetime.now().date()
    month_ago = today - timedelta(days=30)

    # Filter controls
    col_f1, col_f2, col_f3, col_f4 = st.columns(4)

    with col_f1:
        date_from = st.date_input("From Date", month_ago).strftime("%Y-%m-%d")
    with col_f2:
        date_to = st.date_input("To Date", today).strftime("%Y-%m-%d")
    with col_f3:
        all_students = db.get_all_students()
        dept_options = ["All"] + sorted(list(set(s["department"] for s in all_students))) if all_students else ["All"]
        sel_dept = st.selectbox("Department", dept_options)
    with col_f4:
        course_options = [
            "All",
            "Computer Networks",
            "Machine Learning",
            "Database Systems",
            "Operating Systems",
            "Software Engineering",
            "Artificial Intelligence",
            "General Assembly"
        ]
        sel_course = st.selectbox("Course / Subject", course_options)

    records = db.get_attendance_records(
        date_from=date_from,
        date_to=date_to,
        department=sel_dept,
        course=sel_course
    )

    tab_logs, tab_analytics, tab_defaulters = st.tabs(["📄 Detailed Log Sheet", "📊 Visual Analytics", "⚠️ Defaulter Watchlist (<75%)"])

    with tab_logs:
        if not records:
            st.info("No attendance records found matching the selected filter criteria.")
        else:
            df = pd.DataFrame(records)
            cols = ["date", "time", "roll_no", "name", "department", "course", "status", "confidence"]
            df_show = df[cols].copy()
            df_show.columns = ["Date", "Time", "Roll No", "Student Name", "Department", "Course", "Status", "Confidence %"]

            st.dataframe(df_show, use_container_width=True, hide_index=True)

            # Export options
            c_exp1, c_exp2 = st.columns(2)
            with c_exp1:
                csv_data = df_show.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Report as CSV",
                    data=csv_data,
                    file_name=f"attendance_report_{date_from}_to_{date_to}.csv",
                    mime="text/csv",
                    use_container_width=True
                )
            with c_exp2:
                excel_buffer = io.BytesIO()
                with pd.ExcelWriter(excel_buffer, engine='xlsxwriter') as writer:
                    df_show.to_excel(writer, index=False, sheet_name='Attendance')
                st.download_button(
                    label="📥 Download Report as Excel (.xlsx)",
                    data=excel_buffer.getvalue(),
                    file_name=f"attendance_report_{date_from}_to_{date_to}.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True
                )

    with tab_analytics:
        if not records:
            st.info("No data available to plot analytics.")
        else:
            df = pd.DataFrame(records)

            c_met1, c_met2, c_met3 = st.columns(3)
            with c_met1:
                st.metric("Total Records in Filter", len(df))
            with c_met2:
                st.metric("Unique Students Present", df["roll_no"].nunique())
            with c_met3:
                st.metric("Active Class Dates", df["date"].nunique())

            st.write("")
            col_g1, col_g2 = st.columns(2)

            with col_g1:
                st.subheader("Attendance by Date")
                date_counts = df.groupby("date")["roll_no"].count().reset_index()
                date_counts.columns = ["Date", "Present Count"]
                st.bar_chart(data=date_counts, x="Date", y="Present Count")

            with col_g2:
                st.subheader("Attendance by Course")
                course_counts = df.groupby("course")["roll_no"].count().reset_index()
                course_counts.columns = ["Course", "Attendees"]
                st.bar_chart(data=course_counts, x="Course", y="Attendees")

    with tab_defaulters:
        st.subheader("Student Eligibility & Shortage Report")
        st.caption("College regulation mandates a minimum of 75% attendance to sit for semester examinations.")

        summary = db.get_student_attendance_summary(course=sel_course)
        if not summary:
            st.info("No student attendance data calculated yet.")
        else:
            df_sum = pd.DataFrame(summary)
            if sel_dept != "All":
                df_sum = df_sum[df_sum["department"] == sel_dept]

            # Defaulter metric cards
            total_students = len(df_sum)
            defaulter_count = len(df_sum[df_sum["is_defaulter"]])
            eligible_count = total_students - defaulter_count

            cd1, cd2, cd3 = st.columns(3)
            with cd1:
                st.metric("Total Enrolled Students", total_students)
            with cd2:
                st.metric("Eligible Students (≥ 75%)", eligible_count)
            with cd3:
                st.metric("Defaulters (< 75%)", defaulter_count, delta=f"-{defaulter_count}", delta_color="inverse")

            st.write("")
            display_sum_cols = ["roll_no", "name", "department", "classes_held", "classes_attended", "percentage", "status"]
            df_def_show = df_sum[display_sum_cols].copy()
            df_def_show.columns = ["Roll No", "Name", "Department", "Classes Held", "Attended", "Attendance %", "Eligibility Status"]

            # Style dataframe or display with conditional highlighting
            def highlight_shortage(row):
                if "<75%" in row["Eligibility Status"]:
                    return ['background-color: #451a1a; color: #fca5a5'] * len(row)
                return ['background-color: #143521; color: #86efac'] * len(row)

            st.dataframe(df_def_show.style.apply(highlight_shortage, axis=1), use_container_width=True, hide_index=True)

            # Export Defaulter list
            defaulters_only = df_def_show[df_def_show["Eligibility Status"].str.contains("<75%")]
            if not defaulters_only.empty:
                csv_def = defaulters_only.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="🚨 Download Defaulter Notification Sheet (CSV)",
                    data=csv_def,
                    file_name=f"attendance_defaulters_{today}.csv",
                    mime="text/csv"
                )
