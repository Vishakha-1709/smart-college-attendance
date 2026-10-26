# Roadmap: Smart College Attendance System (React & MongoDB)

## Execution Phases & Milestones

### Phase 1: Backend Architecture & MongoDB Schema
- [ ] Task 1.1: Setup `server/` with `package.json`, Express, Mongoose, CORS, and dotenv.
- [ ] Task 1.2: Implement `models/Student.js` and `models/Attendance.js` with composite unique index (`rollNo, date, course`).
- [ ] Task 1.3: Build REST API endpoints:
  - `POST /api/students`: Register student and store 128-d face descriptors.
  - `GET /api/students`: Fetch all students with descriptor data.
  - `DELETE /api/students/:id`: Remove student and associated attendance logs.
  - `POST /api/attendance/mark`: Mark attendance with anti-duplicate validation.
  - `GET /api/attendance/today`: Today's attendance stream.
  - `GET /api/attendance/stats`: Dashboard summary counts and defaulters (<75%).
  - `GET /api/attendance/export`: Export attendance records.
- [ ] Task 1.4: Write and run automated API test suite (`server/tests/api.test.js`) verifying 100% pass rate.

### Phase 2: React Frontend Setup & Biometric Engine
- [ ] Task 2.1: Initialize React + Vite app in `client/` with Tailwind CSS and Lucide icons.
- [ ] Task 2.2: Add ITM SLS Baroda University branding, logo, and theme colors.
- [ ] Task 2.3: Integrate `@vladmandic/face-api` (or lightweight face descriptor matcher) with model weights in `client/public/models/`.
- [ ] Task 2.4: Build reusable components: `Navbar.jsx`, `StatCard.jsx`, `FaceScanner.jsx` (with HTML5 `<video>` and real-time bounding box HUD `<canvas>`).

### Phase 3: React Pages & Full Feature Integration
- [ ] Task 3.1: Build `Dashboard.jsx`: Live KPIs (Total Students, Present Today, Attendance Rate %, Defaulter Count).
- [ ] Task 3.2: Build `Attendance.jsx`: Live camera scanner with sound effects, green HUD match, red unknown rejection, and duplicate block.
- [ ] Task 3.3: Build `Register.jsx`: 1-2 snapshot webcam capture, instant 128-d descriptor extraction, and enrollment form (prefilled with `B.TECH CSE(AI)`, `5th sem class 4`).
- [ ] Task 3.4: Build `Reports.jsx`: Date & subject filters, 75% defaulter alert watchlist in red, and one-click Excel/CSV download.
- [ ] Task 3.5: Build `Students.jsx`: Student directory, sample count, and profile actions.

### Phase 4: End-to-End Verification, Packaging & Desktop Sync
- [ ] Task 4.1: Run end-to-end integration test (Student enrollment $\rightarrow$ face recognition $\rightarrow$ MongoDB log $\rightarrow$ duplicate lock $\rightarrow$ report export).
- [ ] Task 4.2: Create root `package.json` with `concurrently` and `run_project.bat` for one-click startup.
- [ ] Task 4.3: Mirror complete React + MongoDB project to user's Desktop at `C:\Users\Vishakha\OneDrive\Desktop\smart_college_attendance`.
- [ ] Task 4.4: Update `.planning/STATE.md` and project documentation.
