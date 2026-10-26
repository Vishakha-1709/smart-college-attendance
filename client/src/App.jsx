import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Register from './pages/Register';
import Reports from './pages/Reports';
import Students from './pages/Students';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isDbConnected, setIsDbConnected] = useState(true);

  // Check health and MongoDB connection
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setIsDbConnected(data.dbState === 'Connected');
      } catch (err) {
        setIsDbConnected(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6EE] flex flex-col justify-between text-slate-800">
      <div>
        <Navbar
          activePage={activePage}
          setActivePage={setActivePage}
          isDbConnected={isDbConnected}
        />

        <main className="pt-2">
          {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
          {activePage === 'attendance' && <Attendance />}
          {activePage === 'register' && <Register setActivePage={setActivePage} />}
          {activePage === 'reports' && <Reports />}
          {activePage === 'students' && <Students setActivePage={setActivePage} />}
        </main>
      </div>

      {/* Academic University Footer */}
      <footer className="border-t border-[#E7E0D3] bg-white/90 py-4 px-6 text-center text-xs text-slate-500 shadow-sm mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            ITM SLS Baroda University, Vadodara • <span className="text-[#8B1E1E] font-semibold">JavaScript Framework (PBL) - C2620A3</span>
          </p>
          <p>
            Project Team: <span className="text-slate-800 font-semibold">Vishakha (24C22075) & Jithendar (24C22074)</span> • B.TECH CSE(AI) Class 4
          </p>
        </div>
      </footer>
    </div>
  );
}
