import React, { useState, useEffect } from 'react';
import { Users, UserCheck, AlertTriangle, Percent, ArrowRight, Camera, UserPlus, RefreshCw, Clock } from 'lucide-react';
import StatCard from '../components/StatCard';

export default function Dashboard({ setActivePage }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    attendanceRate: 0,
    defaulterCount: 0,
    totalLecturesHeld: 1
  });
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, todayRes] = await Promise.all([
        fetch('/api/attendance/stats'),
        fetch('/api/attendance/today')
      ]);

      const statsData = await statsRes.json();
      const todayData = await todayRes.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (todayData.success) {
        setTodayLogs(todayData.records || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-[#FFF5F5] via-white to-white border-[#E7E0D3]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#FDE8E8] text-[#8B1E1E] border border-[#F8B4B4] mb-2.5">
              <span>ITM SLS Baroda University, Vadodara</span>
              <span>•</span>
              <span>JavaScript Framework (PBL)</span>
            </div>
            <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Smart College Attendance Dashboard</h2>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              Real-time facial biometric attendance, anti-proxy verification & university examination compliance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="btn-secondary text-xs"
              title="Refresh Stats"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setActivePage('attendance')}
              className="btn-primary text-xs"
            >
              <Camera size={15} />
              <span>Open Scanner</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          subtitle="Enrolled in B.TECH CSE(AI)"
          badgeText="Active Roster"
          badgeColor="blue"
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={UserCheck}
          subtitle={`Out of ${stats.totalStudents} registered`}
          badgeText="Live Session"
          badgeColor="emerald"
        />
        <StatCard
          title="Today's Attendance"
          value={`${stats.attendanceRate}%`}
          icon={Percent}
          subtitle="Class attendance rate"
          badgeText={stats.attendanceRate >= 75 ? 'Healthy' : 'Below Target'}
          badgeColor={stats.attendanceRate >= 75 ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Defaulters (< 75%)"
          value={stats.defaulterCount}
          icon={AlertTriangle}
          subtitle="Ineligible for Semester Exams"
          badgeText={stats.defaulterCount > 0 ? 'Action Required' : 'All Clear'}
          badgeColor={stats.defaulterCount > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* Quick Shortcuts & Today's Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Cards */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Shortcuts</h3>

          <div
            onClick={() => setActivePage('attendance')}
            className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-[#8B1E1E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#FDE8E8] text-[#8B1E1E] border border-[#F8B4B4] shadow-xs">
                <Camera size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] group-hover:text-[#8B1E1E] transition-colors">
                  Take Live Attendance
                </h4>
                <p className="text-xs text-slate-500 font-medium">Scan webcam for face matching</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:text-[#8B1E1E] group-hover:translate-x-1 transition-all" />
          </div>

          <div
            onClick={() => setActivePage('register')}
            className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-[#8B1E1E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] shadow-xs">
                <UserPlus size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] group-hover:text-[#8B1E1E] transition-colors">
                  Enroll New Student
                </h4>
                <p className="text-xs text-slate-500 font-medium">1-2 webcam snapshots with descriptors</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:text-[#8B1E1E] group-hover:translate-x-1 transition-all" />
          </div>

          <div
            onClick={() => setActivePage('reports')}
            className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-[#8B1E1E] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] shadow-xs">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] group-hover:text-[#8B1E1E] transition-colors">
                  Check Defaulters List
                </h4>
                <p className="text-xs text-slate-500 font-medium">Export &lt; 75% notice sheet</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:text-[#8B1E1E] group-hover:translate-x-1 transition-all" />
          </div>

          {/* Academic Info Box */}
          <div className="glass-card p-4 bg-[#FAF6EE] border-[#E7E0D3] text-xs space-y-2">
            <p className="font-bold text-[#0F172A]">Project Metadata:</p>
            <p className="text-slate-600 font-medium">• Program: <span className="text-[#0F172A] font-semibold">BTech Semester 6 (Class 4)</span></p>
            <p className="text-slate-600 font-medium">• Course: <span className="text-[#0F172A] font-semibold">JavaScript Framework (PBL) - C2620A3</span></p>
            <p className="text-slate-600 font-medium">• Team: <span className="text-[#0F172A] font-semibold">Vishakha (24C22075) &amp; Jithendar (24C22074)</span></p>
            <p className="text-slate-600 font-medium">• Database: <span className="text-[#0F172A] font-semibold">MongoDB (Local 27017)</span></p>
          </div>
        </div>

        {/* Live Attendance Stream Today */}
        <div className="lg:col-span-2 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E0D3] pb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#8B1E1E]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">Live Attendance Stream Today</h3>
            </div>
            <span className="text-xs bg-[#FAF6EE] text-slate-700 px-2.5 py-1 rounded-full font-bold border border-[#E7E0D3]">
              {todayLogs.length} Marked
            </span>
          </div>

          {todayLogs.length === 0 ? (
            <div className="py-14 text-center text-slate-500 space-y-3">
              <Camera size={40} className="mx-auto text-slate-400 opacity-60" />
              <p className="text-sm font-medium">No student attendance recorded yet today.</p>
              <button
                onClick={() => setActivePage('attendance')}
                className="btn-primary text-xs"
              >
                Launch Camera Scanner
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#EAE3D5] max-h-[380px] overflow-y-auto pr-1">
              {todayLogs.map((log) => (
                <div key={log._id} className="py-3 flex items-center justify-between hover:bg-[#FAF6EE] px-2.5 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#FDE8E8] border border-[#F8B4B4] flex items-center justify-center font-bold text-xs text-[#8B1E1E]">
                      {log.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{log.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{log.rollNo} • {log.course}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="badge-present">
                      {log.status} ({log.confidence}%)
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-semibold">
                      {log.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
