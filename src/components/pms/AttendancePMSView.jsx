import React from 'react';
import { CalendarCheck, CheckCircle, Clock } from 'lucide-react';

export default function AttendancePMSView() {
  const staff = [
    { name: 'Krushil Gadhiya', role: 'CFO / Partner', status: 'Present', inTime: '09:30 AM', outTime: '06:30 PM' },
    { name: 'Alex Sterling', role: 'Senior Tax Associate', status: 'Present', inTime: '09:40 AM', outTime: '06:30 PM' },
    { name: 'Sarah Jenkins', role: 'Staff Accountant', status: 'Present', inTime: '09:45 AM', outTime: '06:30 PM' },
    { name: 'Marcus Vance', role: 'Audit Lead', status: 'On Leave', inTime: '-', outTime: '-' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f3f4f6] min-h-screen text-gray-800">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold font-outfit text-[#1e1e2d]">Staff Attendance Matrix</h1>
        <p className="text-xs text-gray-500 mt-1">Biometric laser and live attendance tracking register.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase">
              <th className="p-4">Staff Name</th>
              <th className="p-4">Role</th>
              <th className="p-4">Check-In</th>
              <th className="p-4">Check-Out</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {staff.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-4 font-bold text-gray-900">{s.name}</td>
                <td className="p-4 text-gray-600">{s.role}</td>
                <td className="p-4 font-mono text-emerald-600">{s.inTime}</td>
                <td className="p-4 font-mono text-gray-600">{s.outTime}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    s.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
