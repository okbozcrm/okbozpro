export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CORPORATE = 'CORPORATE', 
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  PAID_LEAVE = 'PAID_LEAVE',
  WEEK_OFF = 'WEEK_OFF',
  HOLIDAY = 'HOLIDAY',
  NOT_MARKED = 'NOT_MARKED'
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  joiningDate: string;
  email?: string;
  phone?: string;
  branch?: string;
  paymentCycle?: string;
  salary?: string;
  status?: string;
  workingHours?: string;
  weekOff?: string;
  aadhar?: string;
  pan?: string;
  accountNumber?: string;
  ifsc?: string;
  password?: string;
  liveTracking?: boolean;
  profileEditCount?: number;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  address?: string; 
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  shift?: string;
  attendanceConfig?: {
    punchMethod: 'Manual' | 'QR' | 'Disabled';
    locationRestriction: 'Branch' | 'Anywhere';
    gpsGeofencing?: boolean;
    qrScan?: boolean;
    manualPunch?: boolean;
  };
  moduleAccess?: string[]; 
}

export interface DailyAttendance {
  date: string; 
  status: AttendanceStatus;
  isLate?: boolean;
  checkIn?: string;
  checkOut?: string;
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
  type: 'system' | 'login' | 'leave_request' | 'advance_request' | 'task_assigned' | 'custom_message' | 'new_enquiry';
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