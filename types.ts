
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  CORPORATE = 'CORPORATE', // Franchise/Reseller Role
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
  // Optional detailed fields
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
  allowRemotePunch?: boolean;
  
  // Profile Management
  profileEditCount?: number; // Tracks number of times employee edited profile

  // Personal Details
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  address?: string; // Home Address
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  attendanceConfig?: {
    gpsGeofencing: boolean;
    qrScan: boolean;
    manualPunch: boolean;
    manualPunchMode?: 'Branch' | 'Anywhere'; // New configuration
  };

  // Access Permissions
  moduleAccess?: string[]; // Array of module IDs (e.g., ['reports', 'trips'])
}

export interface DailyAttendance {
  date: string; // ISO date string YYYY-MM-DD
  status: AttendanceStatus;
  isLate?: boolean;
  checkIn?: string;
  checkOut?: string;
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
  email: string; // Used as username
  password: string;
  phone: string;
  city: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  profitSharingPercentage?: number; // Added for Profit Sharing Logic (0-100)
  partners?: Partner[]; // Added for multiple partners
}

export interface HistoryLog {
  id: number;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Note' | 'Meeting';
  message: string;
  date: string;
  duration?: string;
  outcome?: string; // Connected, Missed, Voicemail, etc.
}

// Re-using common types from CustomerCare/VehicleEnquiries for Enquiry interface
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type EnquiryCategory = 'Transport' | 'General';


export interface Enquiry {
  id: string;
  type: 'Customer' | 'Vendor';
  initialInteraction: 'Incoming' | 'Outgoing'; // New: To distinguish between incoming calls vs. employee-initiated outgoing
  name: string;
  phone: string;
  city: string;
  email?: string;
  details: string; // The query/requirement
  status: 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked' | 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled';
  isExistingVendor?: boolean; // If they were found in the vendor DB
  vendorId?: string; // Link to vendor if exists
  assignedTo?: string; // Employee ID
  createdAt: string;
  nextFollowUp?: string;
  history: HistoryLog[];
  date?: string; // ADDED
  // New fields for structured transport data
  enquiryCategory?: EnquiryCategory;
  tripType?: TripType;
  vehicleType?: VehicleType;
  outstationSubType?: OutstationSubType; // Only for Outstation
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
  // Added priority field to Enquiry interface
  priority?: 'Hot' | 'Warm' | 'Cold';
  assignedCorporate?: string;
  assignedBranch?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string; // 'pdf', 'image', 'doc', etc.
  size: string;
  category: 'General' | 'Contract' | 'ID Proof' | 'Report' | 'Policy';
  uploadedBy: string;
  uploadDate: string;
  url: string; // Mock URL or Base64
  visibility: 'Public' | 'Private' | 'AdminOnly';
  ownerId?: string; // Corporate ID or Employee ID ownership
}

export interface SalaryAdvanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  amountRequested: number;
  amountApproved: number; // Editable by Admin
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  requestDate: string;
  paymentDate?: string;
  paymentMode?: string; // Cash, Bank Transfer, UPI
  corporateId?: string; // For syncing to correct dashboard
}

// NEW: Notification Interface
export interface Notification {
  id: string;
  type: 'system' | 'login' | 'leave_request' | 'advance_request' | 'task_assigned' | 'custom_message' | 'new_enquiry';
  title: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  targetRoles: UserRole[]; // e.g., [UserRole.ADMIN, UserRole.CORPORATE]
  corporateId?: string; // Optional: target a specific corporate (email)
  employeeId?: string;  // Optional: target a specific employee (id)
  link?: string;        // Optional: path to navigate to
}

// NEW: Driver Activity Log Interface
export interface DriverActivityLog {
  id: string; // Unique ID for the log entry (e.g., driverId-date)
  driverId: string;
  driverName: string;
  date: string; // YYYY-MM-DD
  onlineMinutes: number; // Total minutes online for that day
  offlineMinutes: number; // Total minutes offline for that day (rest of shift, or gap)
  totalShiftMinutes: number; // Configured total shift duration for that day in minutes (e.g., 9 hours = 540 mins)
}


declare global {
  namespace google {
    namespace maps {
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      // Add minimal declarations for other Google Maps classes used directly or for type inference
      class Geocoder {}
      class Map {}
      class Marker {}
      enum Animation {}
      class InfoWindow {}
      class LatLng {} // For e.latLng methods
    }
  }
  interface Window {
    google: any; // Keep this for broader compatibility with runtime access to window.google
    gm_authFailure?: () => void;
    gm_authFailure_detected?: boolean;
  }
}
