import React from 'react';

// PunchCard is now primarily used within the Admin view when the "Punch In" tab is selected.
// The employee-facing punch logic and UI has been moved to UserAttendance.tsx for the new modern UI.
const PunchCard: React.FC = () => {
  // This component is now largely defunct for the employee view.
  // The UserAttendance component now handles its own punch card display when isAdmin is false.
  // This component only renders if called in an Admin context.
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-sm mx-auto mt-4 transition-all hover:shadow-2xl border border-gray-100 p-8 text-center text-gray-500">
      <p>This PunchCard component is now deprecated for the employee view.</p>
      <p>Please use the new modern UI on the My Attendance page.</p>
    </div>
  );
};

export default PunchCard;