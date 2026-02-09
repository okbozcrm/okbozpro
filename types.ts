
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CORPORATE = 'CORPORATE', 
  SUB_ADMIN = 'SUB_ADMIN'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  PAID_LEAVE = 'PAID_LEAVE',
  WEEK_OFF = 'WEEK_OFF',
  HOLIDAY = 'HOLIDAY',
  ALTERNATE_DAY = 'ALTERNATE_DAY',
  NOT_MARKED = 'NOT_MARKED'
}

export interface CallSignal {
  id: string;
  callerId: string;
  callerName: string;
  recipientId: string;
  status: 'ringing' | 'connected' | 'busy' | 'declined' | 'ended';
  timestamp: number;
}

export interface PunchRecord {
  in: string;
  out?: string;
  durationMinutes?: number;
}

export interface DailyAttendance {
  date: string; 
  status: AttendanceStatus;
  isLate?: boolean;
  punches?: PunchRecord[]; // Supported for multiple punch-ins/outs
  checkIn?: string; // Kept for legacy/quick reference (first punch)
  checkOut?: string; // Kept for legacy/quick reference (last punch)
  totalWorkMinutes?: number;
}

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface SubAdmin {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string; // Designation e.g. "Manager"
  context: string; // 'Head Office' or Corporate Email
  branchAccess: 'All' | 'None' | string[];
  status: 'Active' | 'Inactive';
  permissions: Record<string, ModulePermission>;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  joiningDate: string;
  email: string;
  phone: string;
  password: string;
  branch?: string;
  paymentCycle?: string;
  salary?: string;
  status: string;
  workingHours?: string;
  weekOff?: string;
  aadhar?: string;
  pan?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  liveTracking?: boolean;
  profileEditCount?: number;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  address?: string; 
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  shift?: string;
  attendanceConfig: {
    punchMethod: 'Manual' | 'QR' | 'Disabled';
    locationRestriction: 'Branch' | 'Anywhere';
    gpsGeofencing?: boolean;
    qrScan?: boolean;
    manualPunch?: boolean;
    workMode?: 'Remote' | 'Office';
  };
  moduleAccess: string[]; 
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  corporateId: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  appliedOn: string;
}

export interface TravelAllowanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  corporateId: string;
  date: string;
  startOdometer: number;
  endOdometer: number;
  totalKm: number;
  ratePerKm: number;
  totalAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  remarks: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  radius: number;
  lat: number;
  lng: number;
  owner?: string; // Add owner field
  ownerName?: string; // Add ownerName field
}

export interface CalendarStats {
  present: number;
  absent: number;
  halfDay: number;
  paidLeave: number;
  weekOff: number;
}

export interface Partner {
  name: string;
  share: number;
}

export interface CorporateAccount {
  id: string;
  companyName: string;
  email: string; 
  password: string;
  phone: string;
  city: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  profitSharingPercentage?: number; 
  partners?: Partner[]; 
}

export interface HistoryLog {
  id: number;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Note' | 'Meeting';
  message: string;
  date: string;
  duration?: string;
  outcome?: string; 
}

export interface Enquiry {
  id: string;
  type: 'Customer' | 'Vendor';
  initialInteraction: 'Incoming' | 'Outgoing';
  name: string;
  phone: string;
  city: string;
  email?: string;
  details: string; 
  status: 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked' | 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled';
  isExistingVendor?: boolean; 
  vendorId?: string; 
  assignedTo?: string; 
  createdAt: string;
  nextFollowUp?: string;
  history: HistoryLog[];
  date?: string; 
  enquiryCategory?: 'Transport' | 'General';
  tripType?: 'Local' | 'Rental' | 'Outstation';
  vehicleType?: 'Sedan' | 'SUV';
  outstationSubType?: 'RoundTrip' | 'OneWay'; 
  transportData?: {
    drop?: string;
    // FIX: Added 'drops' property to support multi-drop data structures used in CustomerCare.tsx line 795
    drops?: { address: string; coords: { lat: number; lng: number } | null }[];
    estKm?: string;
    waitingMins?: string;
    packageId?: string;
    destination?: string;
    days?: string;
    estTotalKm?: string;
    nights?: string;
  };
  estimatedPrice?: number;
  priority?: 'Hot' | 'Warm' | 'Cold';
  assignedCorporate?: string;
  assignedBranch?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string; 
  size: string;
  category: 'General' | 'Contract' | 'ID Proof' | 'Report' | 'Policy';
  uploadedBy: string;
  uploadDate: string;
  url: string; 
  visibility: 'Public' | 'Private' | 'AdminOnly';
  ownerId?: string; 
}

export interface SalaryAdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amountRequested: number;
  amountApproved: number; 
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  requestDate: string;
  paymentDate?: string;
  paymentMode?: string; 
  corporateId?: string; 
}

export interface BozNotification {
  id: string;
  type: 'system' | 'login' | 'leave_request' | 'advance_request' | 'task_assigned' | 'custom_message' | 'new_enquiry' | 'leave_approval';
  title: string;
  message: string;
  timestamp: string; 
  read: boolean;
  targetRoles: UserRole[]; 
  corporateId?: string; 
  employeeId?: string;  
  link?: string;        
}

export interface DriverActivityLog {
  id: string; 
  driverId: string;
  driverName: string;
  date: string; 
  onlineMinutes: number; 
  offlineMinutes: number; 
  totalShiftMinutes: number; 
}

// NEW: PayrollEntry (moved from Payroll.tsx)
export interface PayrollEntry {
  employeeId: string;
  basicSalary: number;
  allowances: number;
  travelAllowance: number; // Linked to KM Claims
  bonus: number;
  manualDeductions: number; // Replaced 'deductions' with explicit manual deductions
  manualDeductionReason?: string; // NEW: Reason for manual deduction
  advanceDeduction: number; // Auto-calculated from advances
  payableDays: number;
  totalDays: number;
  status: 'Paid' | 'Pending'; 
  paidDate?: string;          
  paymentMode?: string;       
  remarks?: string;           // NEW: Added remarks field
}

// NEW: PartnerPayoutRecord (moved from Reports.tsx)
export enum PartnerPayoutStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  REJECTED = 'Rejected', // Added for completeness if needed
}

export interface PartnerPayoutRecord {
  id: string;
  partnerId: string;
  partnerName: string;
  corporateId: string;
  monthYear: string;
  shareAmountCalculated: number;
  balanceCarriedOverFromPrev: number;
  totalPayable: number;
  status: PartnerPayoutStatus;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  generatedAt: string;
  sharePercentage: number;
}


declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    google: any; 
    gm_authFailure?: () => void;
    gm_authFailure_detected?: boolean;
    aistudio?: AIStudio;
  }
}
