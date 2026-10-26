# Project Spec: Smart College Attendance System with Face Recognition (MERN Stack)

## 1. Overview
The **Smart College Attendance System with Face Recognition** is a full-stack JavaScript application built with **React**, **Node.js/Express**, and **MongoDB (Mongoose)** for **ITM SLS Baroda University, Vadodara** under the course **JavaScript Framework (PBL) - C2620A3**.

It completely eliminates proxy attendance, manual paper registers, and classroom time wastage by performing real-time biometric face identification directly in the React web interface and logging attendance to MongoDB.

## 2. Technology Stack
- **Frontend (JavaScript Framework)**: React 18 / Vite, Tailwind CSS, Lucide Icons, HTML5 `<video>` & `<canvas>` API
- **Biometric Face Recognition**: `@vladmandic/face-api` (TensorFlow.js-based 128-dimensional facial embedding engine running 100% in JavaScript)
- **Backend**: Node.js & Express.js REST API
- **Database**: MongoDB (Mongoose ODM) running locally on `mongodb://127.0.0.1:27017/college_attendance`
- **Analytics & Export**: SheetJS (`xlsx`) / CSV export for university compliance and defaulter watchlists (< 75%)
- **Testing**: Automated API and unit test suite with 100% pass rate

## 3. Core System Architecture
```
smart_college_attendance/
├── package.json               # Root scripts to run backend and client concurrently
├── server/                    # Node.js + Express + Mongoose Backend (Port 5000)
│   ├── package.json
│   ├── server.js              # Express app, CORS, MongoDB connection
│   ├── models/
│   │   ├── Student.js         # Mongoose Schema: rollNo, name, department, semester, section, faceDescriptors
│   │   └── Attendance.js      # Mongoose Schema: studentId, rollNo, name, course, date, time, status, confidence
│   ├── routes/
│   │   ├── studentRoutes.js   # Student registration, descriptor sync, list, delete
│   │   └── attendanceRoutes.js# Mark attendance with de-duplication, history query, defaulters (<75%), CSV/Excel export
│   └── tests/
│       └── api.test.js        # Automated API test suite
├── client/                    # React Frontend (Port 5173)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── itm_logo.png       # University Logo
│   │   └── models/            # face-api.js weights (SSD MobileNet, Landmark68, FaceRecognition)
│   └── src/
│       ├── App.jsx            # Router and navigation
│       ├── index.css          # Modern Tailwind / responsive styles
│       ├── components/
│       │   ├── Navbar.jsx     # Header with ITM SLS Logo, University info, Course C2620A3
│       │   ├── StatCard.jsx   # Metrics KPI card
│       │   └── FaceScanner.jsx# Webcam video stream + canvas bounding box HUD
│       └── pages/
│           ├── Dashboard.jsx  # Real-time metrics (Total Students, Present Today, Defaulters <75%)
│           ├── Attendance.jsx # Live camera attendance kiosk with de-duplication check
│           ├── Register.jsx   # Student enrollment form + webcam snap + descriptor extraction
│           ├── Reports.jsx    # Daily & Course logs, Defaulters list (<75% in red), CSV/Excel export
│           └── Students.jsx   # Student directory, profile management, delete / reset
├── run_project.bat            # One-click Windows startup script
└── documentation/             # Word Report (.docx), PDF Report, PPTX, Synopsis, Viva Guide
```

## 4. Key Functional Modules
1. **Live Face Recognition Attendance Kiosk**:
   - Streams webcam video inside React `<video>` component.
   - Computes 128-d face descriptor every 200ms using `@vladmandic/face-api`.
   - Matches descriptor against registered student embeddings via Euclidean distance ($\text{distance} < 0.55 \rightarrow \text{match} \ge 65\%$).
   - Draws dynamic HUD: Green bounding box with Student Name, Roll No, Match % for registered students; Red bounding box for `Unknown Face`.
   - Blocks duplicate attendance within the same course/date: MongoDB composite index `unique: [rollNo, date, course]`.
2. **Rapid 1–2 Photo Student Enrollment**:
   - Takes 1 or 2 webcam snapshots.
   - Extracts face descriptor vector and stores it in MongoDB alongside Roll No (`24C22075` / `24C22074`), Name, Department (`B.TECH CSE(AI)`), and Class (`5th sem class 4`).
3. **Automated Defaulter Analytics (< 75% Rule)**:
   - Aggregates lecture records per student.
   - Highlights students below 75% attendance in red badge.
   - Exports formatted Excel (`.xlsx`) and CSV files with one click for university notice boards.
4. **Student Directory & Management**:
   - View all registered students, their enrollment dates, and sample counts.
   - Edit profiles or unregister students with biometric cleanup.
