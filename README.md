# 🎓 Smart College Attendance System with Face Biometrics (MERN Stack)
### **ITM SLS Baroda University, Vadodara**
**Course**: JavaScript Framework (PBL) - C2620A3  
**Program**: B.Tech Semester 6 | Academic Year 2026–27  
**Department**: Department of B.TECH CSE(AI) (5th sem class 4)  
**Project Team**:
- **Vishakha** (Enrollment No: `24C22075`)
- **Jithendar** (Enrollment No: `24C22074`)

---

## 🌟 Technology Stack (100% Full-Stack JavaScript)
- **Frontend Framework**: **React 18** (Vite), Tailwind CSS, Lucide Icons, Canvas-Confetti
- **Biometric Computer Vision**: `@vladmandic/face-api` (128-dimensional deep face descriptors running directly in browser via WebGL)
- **Backend Runtime & API**: **Node.js** & **Express.js** REST API (Port 5000)
- **Database**: **MongoDB** (`mongodb://127.0.0.1:27017/college_attendance`) via **Mongoose**
- **Security & Integrity**: 
  - Compound unique index `UNIQUE(rollNo, date, course)` preventing proxy attendance
  - Real-time Euclidean distance validation ($\le 0.45$) blocking duplicate face enrollment under multiple names

---

## 💡 Key Features
1. **Live Facial Biometric Attendance**: Real-time 4-FPS camera scanning with live green/red bounding boxes, matching percentage, and Euclidean distance display (`d`).
2. **Anti-Proxy Duplicate Prevention**: Database-level atomic constraint stops students from scanning twice in the same lecture session.
3. **Biometric Uniqueness & Anti-Impersonation**: Prevents registering the same face under different student names or roll numbers.
4. **Single-Scan Confirmation**: 15-second per-student cooldown ensures one clean confirmation without warning spam.
5. **Multi-Source Enrollment**: Enroll students via live webcam centering guide or direct selfie/photo file upload.
6. **University 75% Defaulter Compliance**: Automated calculation of student attendance percentages with 1-click Defaulter CSV notice export.
7. **1-Click Windows Launch**: [`run_project.bat`](run_project.bat) automatically clears previous ports, starts backend & frontend, and opens the browser.

---

## 📁 System Architecture
```
smart_college_attendance/
├── package.json               # Root scripts to run backend and client concurrently
├── run_project.bat            # 1-Click Windows launcher with port auto-cleanup
├── server/                    # Node.js + Express + Mongoose Backend
│   ├── server.js              # Express app, CORS, MongoDB connection (Port 5000)
│   ├── models/
│   │   ├── Student.js         # Mongoose schema (rollNo, name, department, faceDescriptors)
│   │   └── Attendance.js      # Mongoose schema with UNIQUE(rollNo, date, course)
│   ├── routes/
│   │   ├── studentRoutes.js   # CRUD & biometric duplicate face check
│   │   └── attendanceRoutes.js# Mark attendance, duplicate check, 75% defaulters
│   └── tests/
│       └── api.test.js        # Automated API test suite (100% test pass)
├── client/                    # React 18 (Vite) Frontend
│   ├── public/
│   │   ├── itm_logo.png       # University Logo
│   │   └── models/            # face-api.js neural weights (TinyFaceDetector, Landmark68, Recognition)
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx     # Header with ITM SLS Logo & Course C2620A3
│       │   └── StatCard.jsx   # Metrics KPI card
│       ├── utils/
│       │   └── faceMatcher.js # 128-d vector matching, Euclidean metric calculation
│       └── pages/
│           ├── Dashboard.jsx  # Real-time KPIs (Total Students, Present Today, Defaulters <75%)
│           ├── Attendance.jsx # Live face recognition kiosk with HUD metric overlay
│           ├── Register.jsx   # Biometric enrollment (Webcam oval guide + Photo Upload)
│           ├── Reports.jsx    # Daily & Course logs, Defaulters notice (<75%), CSV export
│           └── Students.jsx   # Biometric directory, vector inspector, profile removal
└── Smart_College_Attendance_Project_Report.pdf # Official 7-Page Academic Report
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js 18+** (Tested on v24.17.0)
- **MongoDB** running on `127.0.0.1:27017`

### 2. 1-Click Launch (Windows)
Double-click **`run_project.bat`** in the root directory.  
It automatically frees ports 5000 and 5173, starts both services, and opens `http://localhost:5173`.

### 3. Manual Launch via Terminal
```bash
# Terminal 1: Backend Server (Port 5000)
cd server
npm start

# Terminal 2: React Frontend (Port 5173)
cd client
npm run dev
```

### 4. Running Automated Tests
```bash
cd server
node tests/api.test.js
```
*(Runs 5 automated integration tests validating schema constraints, registration, attendance marking, anti-proxy blocking, and defaulter tracking with 100% pass rate).*

---

## 🎯 Tech Stack Justification (For Viva)

> **"We chose the MERN + face-api.js stack to build an end-to-end JavaScript architecture that executes privacy-preserving AI facial recognition directly in the browser while leveraging MongoDB's native array storage for 128-dimensional biometric vectors."**

* **Client-Side AI vs Python Server**: Raw camera frames never leave the device; only numerical 128-d vectors are stored, eliminating server GPU bottlenecks and preserving student privacy.
* **MongoDB vs SQL**: Native BSON array storage handles 128-dimensional floating-point vectors without serialization overhead or complex SQL vector extensions.
* **React 18 + Vite**: Virtual DOM and `useRef` enable 30-FPS video HUD rendering without UI freezing, while Vite provides instant hot-module reloading.
