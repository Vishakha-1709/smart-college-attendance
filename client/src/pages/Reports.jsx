import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, RefreshCw, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('summary');
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalLecturesHeld: 1,
    defaulterCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDefaultersOnly, setShowDefaultersOnly] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/attendance/stats'),
        fetch('/api/attendance')
      ]);

      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      if (statsData.success) {
        setReports(statsData.studentReports || []);
        setStats(statsData.stats);
      }
      if (logsData.success) {
        setLogs(logsData.records || []);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (showDefaultersOnly && !r.isDefaulter) return false;
    return true;
  });

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDefaulters = () => {
    const defaultersData = reports
      .filter(r => r.isDefaulter)
      .map(r => ({
        'Roll Number': r.rollNo,
        'Student Name': r.name,
        'Department': r.department,
        'Class': r.section,
        'Attended Lectures': r.attendedLectures,
        'Total Lectures': r.totalLectures,
        'Attendance %': `${r.percentage}%`,
        'University Eligibility': 'DEFAULTER (< 75%)'
      }));

    exportCSV(defaultersData, `ITM_SLS_Defaulter_Notice_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportFullLogs = () => {
    const logsData = logs.map(l => ({
      'Date': l.date,
      'Time': l.time,
      'Roll Number': l.rollNo,
      'Student Name': l.name,
      'Course': l.course,
      'Status': l.status,
      'Biometric Match %': `${l.confidence}%`
    }));

    exportCSV(logsData, `ITM_SLS_Attendance_Logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E0D3] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F172A] flex items-center gap-2.5">
            <FileSpreadsheet className="text-[#8B1E1E]" size={26} />
            <span>Attendance Reports & Defaulter Analytics</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            ITM SLS Baroda University compliance tracking. Automatically enforces the university 75% attendance threshold for semester examination eligibility.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDefaulters}
            className="btn-secondary text-xs text-[#991B1B] border-[#FECACA] hover:bg-[#FEF2F2]"
            title="Download Defaulter Notice for Notice Board"
          >
            <Download size={14} />
            <span>Defaulters List (&lt;75%)</span>
          </button>
          <button
            onClick={handleExportFullLogs}
            className="btn-primary text-xs"
            title="Export Complete Attendance Register"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Total Lectures Held</p>
            <p className="text-2xl font-black text-[#0F172A] mt-1">{stats.totalLecturesHeld}</p>
          </div>
          <Calendar className="text-blue-600" size={28} />
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Eligible Students (&ge; 75%)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {Math.max(0, stats.totalStudents - stats.defaulterCount)}
            </p>
          </div>
          <CheckCircle className="text-emerald-600" size={28} />
        </div>

        <div className="glass-card p-4 flex items-center justify-between border-[#FECACA] bg-[#FFF5F5]">
          <div>
            <p className="text-xs text-[#991B1B] uppercase font-bold">Defaulters List (&lt; 75%)</p>
            <p className="text-2xl font-black text-[#991B1B] mt-1">{stats.defaulterCount}</p>
          </div>
          <AlertTriangle className="text-[#991B1B]" size={28} />
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'summary'
                ? 'bg-[#8B1E1E] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-[#FAF6EE]'
            }`}
          >
            Student Eligibility Summary (<span className="text-xs">75% Rule</span>)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-[#8B1E1E] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-[#FAF6EE]'
            }`}
          >
            Raw Attendance Logs ({logs.length})
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-700 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={showDefaultersOnly}
                onChange={e => setShowDefaultersOnly(e.target.checked)}
                className="accent-[#8B1E1E] rounded cursor-pointer"
              />
              <span className="text-[#991B1B]">Show Defaulters Only (&lt; 75%)</span>
            </label>
            <button onClick={fetchReports} className="btn-secondary text-xs p-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Table Data View */}
      <div className="glass-card overflow-hidden">
        {activeTab === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#FAF6EE] text-xs uppercase text-slate-600 font-extrabold border-b border-[#EAE3D5]">
                <tr>
                  <th className="px-5 py-3.5">Roll No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Attended / Total</th>
                  <th className="px-5 py-3.5">Attendance %</th>
                  <th className="px-5 py-3.5">Exam Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3D5]">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400 font-medium">
                      No student records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((s) => (
                    <tr key={s.rollNo} className="hover:bg-[#FAF6EE]/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#0F172A]">{s.rollNo}</td>
                      <td className="px-5 py-3.5 font-bold text-[#0F172A]">{s.name}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-medium">{s.department} ({s.section})</td>
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                        {s.attendedLectures} / {s.totalLectures}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EAE3D5] rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full ${s.isDefaulter ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(s.percentage, 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold font-mono text-xs ${s.isDefaulter ? 'text-red-600' : 'text-emerald-700'}`}>
                            {s.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.isDefaulter ? (
                          <span className="badge-defaulter">Defaulter (&lt;75%)</span>
                        ) : (
                          <span className="badge-eligible">Eligible (&ge;75%)</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#FAF6EE] text-xs uppercase text-slate-600 font-extrabold border-b border-[#EAE3D5] sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5">Roll No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Match %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3D5]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400 font-medium">
                      No attendance logs recorded in MongoDB yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l._id} className="hover:bg-[#FAF6EE]/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 font-medium">{l.date}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 font-medium">{l.time}</td>
                      <td className="px-5 py-3 font-mono font-bold text-[#0F172A]">{l.rollNo}</td>
                      <td className="px-5 py-3 font-bold text-[#0F172A]">{l.name}</td>
                      <td className="px-5 py-3 text-xs text-slate-700 font-medium">{l.course}</td>
                      <td className="px-5 py-3">
                        <span className="badge-present">{l.status}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs font-bold text-emerald-700">{l.confidence}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
