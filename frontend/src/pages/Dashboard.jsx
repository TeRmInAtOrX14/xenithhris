import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ProfileStrip from '../components/ProfileStrip';
import QuickActionTiles from '../components/QuickActionTiles';
import WidgetColumn from '../components/WidgetColumn';
import EmployeeDashboard from './EmployeeDashboard';
import TeamLeadDashboard from './TeamLeadDashboard';
import AdminDashboard from './AdminDashboard';
import DesignerDashboard from './DesignerDashboard';

export default function Dashboard() {
  const userString = localStorage.getItem('user');
  const currentUser = userString ? JSON.parse(userString) : { email: 'mary@bizhaven.com', name: 'Mary W. Jackson', role: 'Sales Executive' };

  // State to support live interactive role switching across Sales Executive, Team Lead, Designer, CEO
  const [activeRole, setActiveRole] = useState(() => {
    return currentUser.role || 'Sales Executive';
  });

  const renderRoleCenterContent = () => {
    switch (activeRole) {
      case 'Sales Executive':
        return <EmployeeDashboard />;
      case 'Team Lead':
        return <TeamLeadDashboard />;
      case 'Designer':
        return <DesignerDashboard />;
      case 'CEO':
      case 'Admin':
      case 'COO':
        return <AdminDashboard stats={{ totalEmployees: 23, presentToday: 22, lateToday: 1 }} />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 text-left"
    >
      {/* 1. Top Center Profile Strip Card (Reference UI Format) */}
      <ProfileStrip
        currentUser={currentUser}
        activeRole={activeRole}
        onRoleSwitch={(newRole) => setActiveRole(newRole)}
      />

      {/* 2. Grid of Colorful Quick-Action Stat Tiles */}
      <QuickActionTiles activeRole={activeRole} />

      {/* 3. 2-Column Split: Center Main Workspace Cards + Right Widget Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Center Main Workspace Cards (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {renderRoleCenterContent()}
        </div>

        {/* Right Sidebar Widget Column (Announcements + Mini Calendar + Donut Chart) */}
        <div className="lg:col-span-1">
          <WidgetColumn />
        </div>
      </div>
    </motion.div>
  );
}

