import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn


def set_cell_border(cell, **kwargs):
    """Set cell borders: top, bottom, left, right."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="{kwargs.get("top", "single")}" w:sz="{kwargs.get("sz", "4")}" w:space="0" w:color="{kwargs.get("color", "CBD5E1")}"/>'
        f'<w:left w:val="{kwargs.get("left", "single")}" w:sz="{kwargs.get("sz", "4")}" w:space="0" w:color="{kwargs.get("color", "CBD5E1")}"/>'
        f'<w:bottom w:val="{kwargs.get("bottom", "single")}" w:sz="{kwargs.get("sz", "4")}" w:space="0" w:color="{kwargs.get("color", "CBD5E1")}"/>'
        f'<w:right w:val="{kwargs.get("right", "single")}" w:sz="{kwargs.get("sz", "4")}" w:space="0" w:color="{kwargs.get("color", "CBD5E1")}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)


def create_academic_docx():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_docx = os.path.join(base_dir, "Smart_College_Attendance_Project_Report.docx")
    logo_path = os.path.join(base_dir, "itm_logo.png")

    doc = Document()

    # Standard Page Margins: 1 inch all around
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.0)
        s.right_margin = Inches(1.0)

    # Base Style: Times New Roman, 12 pt, 1.5 line spacing
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    font.color.rgb = RGBColor(30, 41, 59)
    style.paragraph_format.line_spacing = 1.5
    style.paragraph_format.space_after = Pt(8)

    # ========================================================
    # COVER PAGE
    # ========================================================
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(2.2))

    p_univ = doc.add_paragraph()
    p_univ.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_univ = p_univ.add_run("ITM SLS BARODA UNIVERSITY, VADODARA\n")
    r_univ.font.size = Pt(18)
    r_univ.font.bold = True
    r_univ.font.color.rgb = RGBColor(139, 30, 30) # Maroon

    r_course = p_univ.add_run("Course: JavaScript Framework (PBL) - C2620A3\nProgram: BTech Semester 6 | Academic Year 2026–27")
    r_course.font.size = Pt(12)
    r_course.font.bold = True
    r_course.font.color.rgb = RGBColor(15, 23, 42)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(18)
    r_pre = p_title.add_run("PROJECT REPORT ON\n")
    r_pre.font.size = Pt(11)
    r_pre.font.bold = True
    r_pre.font.color.rgb = RGBColor(100, 116, 139)

    r_title = p_title.add_run("SMART COLLEGE ATTENDANCE SYSTEM WITH FACE RECOGNITION\n")
    r_title.font.size = Pt(18)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(139, 30, 30)

    r_sub = p_title.add_run("Automated Biometric Attendance Management & Defaulter Analytics Platform")
    r_sub.font.size = Pt(12)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Metadata Table
    table_meta = doc.add_table(rows=7, cols=2)
    table_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_info = [
        ("Project Title:", "Smart College Attendance System with Face Recognition"),
        ("Group Code:", "GRP-C2620A3-04 (Class 4)"),
        ("Submitted By:", "1. Vishakha (Enrollment No: 24C22075)\n2. Jithendar (Enrollment No: 24C22074)"),
        ("Department:", "Department of B.TECH CSE(AI)"),
        ("Semester & Section:", "5th sem class 4 (Academic Year 2026–27)"),
        ("Guided By:", "Faculty Guide & Project Coordinator\nDepartment of B.TECH CSE(AI)"),
        ("Institution:", "School of Computer Science & Engineering\nITM SLS Baroda University, Vadodara, Gujarat")
    ]
    for i, (k, v) in enumerate(meta_info):
        r = table_meta.rows[i]
        c0, c1 = r.cells[0], r.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        c0.text = k
        c1.text = v
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(11)
        c1.paragraphs[0].runs[0].font.size = Pt(11)
        set_cell_border(c0)
        set_cell_border(c1)

    doc.add_page_break()

    # ========================================================
    # CERTIFICATE
    # ========================================================
    p_c_head = doc.add_paragraph()
    p_c_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_c_univ = p_c_head.add_run("ITM SLS Baroda University, Vadodara\n")
    r_c_univ.font.size = Pt(16)
    r_c_univ.font.bold = True
    r_c_univ.font.color.rgb = RGBColor(139, 30, 30)
    r_c_title = p_c_head.add_run("CERTIFICATE")
    r_c_title.font.size = Pt(14)
    r_c_title.font.bold = True

    p_cert = doc.add_paragraph()
    p_cert.paragraph_format.line_spacing = 1.5
    p_cert.paragraph_format.space_before = Pt(14)
    p_cert.add_run(
        "This is to certify that the project report entitled “Smart College Attendance System with Face Recognition” "
        "submitted by the students of BTech Semester 6 for the course “JavaScript Framework (PBL) - C2620A3” "
        "during Academic Year 2026–27 is a record of project work carried out under the guidance of the undersigned "
        "and submitted in partial fulfilment of the academic requirements of the course."
    )

    p_c_sig = doc.add_paragraph()
    p_c_sig.paragraph_format.space_before = Pt(36)
    p_c_sig.paragraph_format.line_spacing = 1.5
    p_c_sig.add_run(
        "Guide: ______________________________         Date: ______________\n\n"
        "Department/School: Department of B.TECH CSE(AI)   Signature: __________\n\n"
        "Head of Department: __________________         Seal: ______________"
    )

    doc.add_page_break()

    # ========================================================
    # DECLARATION
    # ========================================================
    p_d_head = doc.add_paragraph()
    p_d_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_d_univ = p_d_head.add_run("ITM SLS Baroda University, Vadodara\n")
    r_d_univ.font.size = Pt(16)
    r_d_univ.font.bold = True
    r_d_univ.font.color.rgb = RGBColor(139, 30, 30)
    r_d_title = p_d_head.add_run("DECLARATION")
    r_d_title.font.size = Pt(14)
    r_d_title.font.bold = True

    p_dec = doc.add_paragraph()
    p_dec.paragraph_format.line_spacing = 1.5
    p_dec.paragraph_format.space_before = Pt(14)
    p_dec.add_run(
        "We hereby declare that the project entitled “Smart College Attendance System with Face Recognition” "
        "is our original academic work prepared for the course “JavaScript Framework (PBL) - C2620A3”. "
        "All external sources, libraries, frameworks, documentation, and other materials used in the project have been "
        "appropriately acknowledged. The report and implementation have not been copied or submitted elsewhere for academic credit."
    )

    p_d_sig = doc.add_paragraph()
    p_d_sig.paragraph_format.space_before = Pt(36)
    p_d_sig.paragraph_format.line_spacing = 1.5
    p_d_sig.add_run(
        "Date: October 2026\n"
        "Place: Vadodara, Gujarat\n\n"
        "1. Vishakha (Enrollment No: 24C22075)         Signature: ______________________\n\n"
        "2. Jithendar (Enrollment No: 24C22074)        Signature: ______________________"
    )

    doc.add_page_break()

    # ========================================================
    # ACKNOWLEDGEMENT & ABSTRACT
    # ========================================================
    h_ack = doc.add_heading(level=1)
    r_h_ack = h_ack.add_run("ACKNOWLEDGEMENT")
    r_h_ack.font.name = 'Times New Roman'
    r_h_ack.font.color.rgb = RGBColor(139, 30, 30)

    p_ack = doc.add_paragraph()
    p_ack.paragraph_format.line_spacing = 1.5
    p_ack.add_run(
        "We express our deepest gratitude to our respected Faculty Guide, Course Coordinator for JavaScript Framework (PBL) - C2620A3, "
        "and the Head of the Department of B.TECH CSE(AI), ITM SLS Baroda University, Vadodara, for their valuable mentorship, constructive feedback, "
        "and encouragement throughout this project. We also thank the university administration for providing the necessary computing resources "
        "and laboratory infrastructure to implement and verify this practical project."
    )

    h_abs = doc.add_heading(level=1)
    r_h_abs = h_abs.add_run("ABSTRACT")
    r_h_abs.font.name = 'Times New Roman'
    r_h_abs.font.color.rgb = RGBColor(139, 30, 30)

    p_abs = doc.add_paragraph()
    p_abs.paragraph_format.line_spacing = 1.5
    p_abs.add_run(
        "Traditional classroom attendance logging through paper rosters takes 10 to 15 minutes of lecture time and is "
        "severely compromised by proxy attendance. This project presents a practical, automated Smart College Attendance System "
        "developed as a project-based learning (PBL) initiative for the course JavaScript Framework (PBL) - C2620A3. "
        "The system is built as a complete full-stack JavaScript application using React 18 on the frontend, "
        "Node.js & Express.js on the backend, MongoDB as the NoSQL database, and face-api.js for "
        "real-time 128-dimensional biometric facial embedding extraction in the browser. "
        "It supports rapid 1 or 2 photo biometric enrollment, eliminates duplicate attendance logging within the same lecture, "
        "strictly rejects unauthorized individuals with a red alert HUD, and automates semester examination eligibility compliance "
        "(< 75% attendance threshold) with one-click Excel and CSV reporting."
    )

    doc.add_page_break()

    # ========================================================
    # MAIN CHAPTERS
    # ========================================================
    chapters = [
        ("1. INTRODUCTION & PROBLEM STATEMENT", [
            "In university classrooms, regular attendance monitoring is directly linked to academic performance and accreditation compliance (NAAC and NBA). University regulations require students to maintain at least 75% attendance to qualify for semester end examinations. However, traditional manual methods suffer from significant limitations:",
            "• Time Overhead: Calling 60+ roll numbers wastes 10 to 15 minutes of every lecture hour.",
            "• Proxy Attendance: Friends mark presence for absentees, making attendance records inaccurate.",
            "• Clerical Workload: Teachers manually calculate percentages at the end of every month.",
            "• Late Defaulter Warnings: Students only discover they have < 75% attendance just days before exams.",
            "Project Objective: Build a responsive biometric attendance system running on standard classroom computers that verifies student identity in under 1 second, prevents duplicate marking, and produces instant analytics without requiring cloud fees."
        ]),
        ("2. SYSTEM ARCHITECTURE & DATA FLOW", [
            "The application is engineered as a modern full-stack JavaScript architecture consisting of three layers:",
            "1. Frontend Layer (React 18 & Vite): A responsive Single Page Application (SPA) built with React, Tailwind CSS, Lucide Icons, and HTML5 <video> / <canvas> rendering real-time biometric HUD bounding boxes directly in the browser.",
            "2. Biometric Face Recognition Engine: Built with @vladmandic/face-api (TensorFlow.js) computing 128-dimensional facial embedding vectors locally with sub-50ms latency per frame.",
            "3. Backend API & Persistence Layer: A Node.js & Express REST API communicating with a local MongoDB database via Mongoose ODM, utilizing compound unique indexes to guarantee anti-proxy duplicate prevention."
        ]),
        ("3. METHODOLOGY & BIOMETRIC ENGINE", [
            "The face recognition pipeline is engineered around deep neural network embeddings executing 100% in JavaScript:",
            "• SSD MobileNet V1 & Tiny Face Detector: Neural network weights loaded from local models directory localize faces in video streams at 25+ frames per second.",
            "• 68-Point Facial Landmark Mapping: Pinpoints facial geometry across nose bridge, eye pupils, lips, and jaw contours for rotation-invariant tracking.",
            "• 128-Dimensional Deep Descriptor Extraction: Converts biometric facial features into a 128-element normalized vector stored directly in MongoDB.",
            "• Euclidean Distance Matching: Compares live video descriptors against MongoDB student vectors using Euclidean distance. Distance < 0.55 triggers a genuine match (>= 65% confidence) with green HUD box; distance >= 0.55 triggers red 'Unknown Face' rejection."
        ]),
        ("4. TESTING, EXPERIMENTAL RESULTS & EVIDENCE", [
            "The project was verified using automated Node.js test suites testing MongoDB connections, student registration, 128-d descriptor persistence, duplicate suppression, and 75% defaulter aggregation. All 5 tests passed with 100% success rate.",
            "Live face scanning experiments conducted with registered student faces and unknown individuals produced the following results:",
            "• Registered Student (Vishakha - Front View): 100.0% Match • Green Box • Correct Match [Pass]",
            "• Registered Student (Vishakha - Angle View): 76.5% Match • Green Box • Correct Match [Pass]",
            "• Registered Student (Jithendar - Front View): 92.4% Match • Green Box • Correct Match [Pass]",
            "• Duplicate Scan in Same Class Period: 76.5% Match • Blocked (409 Already Marked) • Anti-Duplicate [Pass]",
            "• Unregistered Individual / Stranger: 54.0% Match • Red Box • 'Unknown Face' • Rejected Proxy [Pass]"
        ]),
        ("5. TEAM CONTRIBUTION & INDIVIDUAL ROLES", [
            "• Vishakha (Enrollment No: 24C22075): React 18 SPA Architecture & UI Component Design (Tailwind, Lucide, Canvas), Face Recognition Engine integration via @vladmandic/face-api (128-d vectors), and automated testing.",
            "• Jithendar (Enrollment No: 24C22074): Node.js & Express.js REST API server endpoints (Port 5000), MongoDB Mongoose schema design with UNIQUE(rollNo, date, course) constraint, and attendance aggregation logic for university 75% examination compliance and CSV export."
        ]),
        ("6. DEPLOYMENT & CONCLUSION", [
            "1. Saves Teaching Time: Eliminates 10 to 15 minutes of wasted time per lecture, giving faculty more time to instruct.",
            "2. Zero Hardware Expense: Runs directly on standard laptops or desktop PCs with built-in or USB webcams. No costly biometric terminals required.",
            "3. Zero Cloud Fees: 100% offline edge processing without monthly subscription fees or third-party cloud data risks.",
            "4. Audit & Accreditation Compliance: Generates instant timestamped attendance logs ready for university examinations and NAAC/NBA inspections.",
            "Conclusion: The Smart College Attendance System with Face Recognition successfully demonstrates how computer vision and modern JavaScript frameworks can be integrated to resolve practical campus challenges. Developed as part of JavaScript Framework (PBL) - C2620A3 at ITM SLS Baroda University, Vadodara, the system achieves sub-50ms recognition latency, blocks proxy attendance, and automates defaulter tracking cleanly and effectively."
        ])
    ]

    for title, paras in chapters:
        h = doc.add_heading(level=1)
        r_h = h.add_run(title)
        r_h.font.name = 'Times New Roman'
        r_h.font.color.rgb = RGBColor(139, 30, 30)

        for p_text in paras:
            p = doc.add_paragraph()
            p.paragraph_format.line_spacing = 1.5
            p.paragraph_format.space_after = Pt(6)
            p.add_run(p_text)

    doc.save(output_docx)
    print(f"Successfully generated ITM SLS DOCX report: {output_docx}")


if __name__ == "__main__":
    create_academic_docx()
