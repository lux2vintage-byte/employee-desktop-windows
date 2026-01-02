// Electron API tip tanımları
// Tüm IPC kanalları için tip tanımları

// ==================== ORTAK TİPLER ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  errors?: string[];
}

export interface FilterOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

// ==================== DEPARTMAN TİPLERİ ====================
export interface Department {
  id: number;
  name: string;
  managerId: number | null;
  parentDepartmentId: number | null;
  costCenterCode: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
}

// ==================== POZİSYON TİPLERİ ====================
export interface Position {
  id: number;
  title: string;
  departmentId: number;
  jobDescription: string | null;
  baseSalaryMin: number | null;
  baseSalaryMax: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}


// ==================== PERSONEL TİPLERİ ====================
export interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  identityNumber: string;
  emailWork: string | null;
  emailPersonal: string | null;
  phonePrimary: string | null;
  photoUrl: string | null;
  departmentId: number;
  positionId: number;
  managerId: number | null;
  hireDate: string;
  contractType: 'Süreli' | 'Süresiz' | 'Stajyer' | 'Freelance';
  status: 'Active' | 'Passive' | 'OnLeave' | 'Terminated';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EmployeeDetails {
  id: number;
  employeeId: number;
  birthDate: string | null;
  bloodGroup: string | null;
  gender: string | null;
  maritalStatus: string | null;
  addressHome: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankName: string | null;
  iban: string | null;
  socialSecurityNumber: string | null;
  educationLevel: string | null;
  militaryStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  documentType: string;
  filePath: string;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ==================== DEVAMLILIK TİPLERİ ====================
export interface AttendanceLog {
  id: number;
  employeeId: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakDuration: number;
  status: 'Geldi' | 'Gelmedi' | 'İzinli' | 'Tatil';
  dailyNote: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Overtime {
  id: number;
  employeeId: number;
  date: string;
  hours: number;
  multiplier: number;
  description: string | null;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvedBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}


// ==================== İZİN TİPLERİ ====================
export interface LeaveType {
  id: number;
  name: string;
  isPaid: boolean;
  deductsFromAnnual: boolean;
  limitDays: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  dayCount: number;
  returnDate: string | null;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  year: number;
  annualLeaveEntitlement: number;
  transferredDays: number;
  usedDays: number;
  remainingDays: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== BORDRO TİPLERİ ====================
export interface SalaryHistory {
  id: number;
  employeeId: number;
  amount: number;
  currency: 'TRY' | 'USD' | 'EUR';
  periodType: 'Aylık' | 'Saatlik';
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payroll {
  id: number;
  employeeId: number;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  totalAdditions: number;
  totalDeductions: number;
  netSalary: number;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PayrollItem {
  id: number;
  payrollId: number;
  type: 'Income' | 'Deduction';
  category: string;
  description: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdvance {
  id: number;
  employeeId: number;
  requestDate: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Deducted';
  paymentDate: string | null;
  deductionPeriod: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ==================== MAAŞ PARAMETRELERİ TİPLERİ ====================
export interface SalaryParameter {
  id: number;
  year: number;
  month: number | null;
  parameterType: string;
  parameterName: string;
  value: number;
  minValue: number | null;
  maxValue: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ==================== PERSONEL EK ÖDEME/KESİNTİ TİPLERİ ====================
export interface EmployeeAllowance {
  id: number;
  employeeId: number;
  allowanceType: 'Allowance' | 'Deduction';
  name: string;
  amount: number;
  isPercentage: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  employee?: Employee;
}

// ==================== ÖDEME GEÇMİŞİ TİPLERİ ====================
export interface PaymentHistory {
  id: number;
  employeeId: number;
  payrollId: number | null;
  paymentType: 'Salary' | 'Advance' | 'Bonus' | 'Other';
  paymentMethod: 'Bank' | 'Cash' | 'Check';
  amount: number;
  currency: string;
  paymentDate: string;
  bankName: string | null;
  iban: string | null;
  referenceNo: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  employee?: Employee;
}


// ==================== PERFORMANS VE EĞİTİM TİPLERİ ====================
export interface PerformanceReview {
  id: number;
  employeeId: number;
  reviewerId: number;
  reviewPeriod: string;
  score: number | null;
  feedback: string | null;
  status: 'Draft' | 'Submitted' | 'Acknowledged';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Training {
  id: number;
  title: string;
  provider: string | null;
  durationHours: number;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EmployeeTraining {
  id: number;
  employeeId: number;
  trainingId: number;
  completionDate: string | null;
  status: 'Planned' | 'Completed' | 'Failed';
  certificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplinaryAction {
  id: number;
  employeeId: number;
  incidentDate: string;
  violationType: string;
  actionTaken: string;
  defense: string | null;
  documentPath: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ==================== İŞTEN AYRILMA TİPLERİ ====================
export interface Resignation {
  id: number;
  employeeId: number;
  requestDate: string;
  reasonCategory: 'İstifa' | 'Emeklilik' | 'Çıkarılma' | 'Sözleşme Bitimi';
  reasonDetail: string | null;
  lastWorkingDay: string | null;
  status: 'Pending' | 'Approved' | 'Completed';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExitInterview {
  id: number;
  resignationId: number;
  comments: string | null;
  wouldRehire: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinalSettlement {
  remainingLeaveDays: number;
  leavePayoutAmount: number;
  pendingAdvances: number;
  netSettlement: number;
}

// ==================== İŞE ALIM VE ORYANTASYON TİPLERİ ====================
export interface HiringRequest {
  id: number;
  requestCode: string;
  departmentId: number;
  positionId: number;
  requestedBy: number;
  requestDate: string;
  quantity: number;
  priority: 'Düşük' | 'Normal' | 'Yüksek' | 'Acil';
  employmentType: 'Tam Zamanlı' | 'Yarı Zamanlı' | 'Stajyer' | 'Sözleşmeli';
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  requirements: string | null;
  description: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'InProgress' | 'Completed' | 'Cancelled';
  approvedBy: number | null;
  approvalDate: string | null;
  targetDate: string | null;
  completedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Onboarding {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string | null;
  mentorId: number | null;
  status: 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
  welcomeKitGiven: boolean;
  itSetupCompleted: boolean;
  hrDocsCompleted: boolean;
  trainingCompleted: boolean;
  notes: string | null;
  completionRate: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OnboardingTask {
  id: number;
  onboardingId: number;
  title: string;
  description: string | null;
  category: 'HR' | 'IT' | 'Eğitim' | 'Departman' | 'Genel';
  assignedTo: number | null;
  dueDate: string | null;
  completedDate: string | null;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Skipped';
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== AYARLAR TİPLERİ ====================
export interface AppSetting {
  id: number;
  key: string;
  value: string;
  group: string | null;
  createdAt: string;
  updatedAt: string;
}


// ==================== ELECTRON API TİP TANIMLARI ====================
declare global {
  interface Window {
    electronAPI: {
      // Veritabanı işlemleri
      databaseOperation: (operation: any) => Promise<any>;
      healthCheck: () => Promise<boolean>;
      getStats: () => Promise<any>;
      getAllEmployees: () => Promise<any[]>;
      createEmployee: (data: any) => Promise<any>;
      updateEmployee: (id: number, data: any) => Promise<any>;
      deleteEmployee: (id: number) => Promise<any>;

      // Kullanıcı işlemleri
      user: {
        getAll: (options: any) => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        login: (email: string, password: string) => Promise<any>;
        forgotPassword: (email: string) => Promise<any>;
        changePassword: (id: number, currentPassword: string, newPassword: string) => Promise<any>;
      };

      // Şirket bilgileri işlemleri
      companyInfo: {
        get: () => Promise<any>;
        update: (data: any) => Promise<any>;
        updateGeneral: (data: any) => Promise<any>;
        updateContact: (data: any) => Promise<any>;
        updateTax: (data: any) => Promise<any>;
        updateBank: (data: any) => Promise<any>;
        updateLogo: (data: any) => Promise<any>;
      };

      // Email yapılandırma işlemleri
      emailConfig: {
        getAll: (options?: any) => Promise<any>;
        getActive: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        getPassword: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        setActive: (id: number) => Promise<any>;
      };

      // Departman işlemleri
      department: {
        getAll: (options?: any) => Promise<PaginatedResult<Department>>;
        getById: (id: number) => Promise<ApiResponse<Department>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<Department>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<Department>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<Department>>;
        restore: (id: number, userId?: number) => Promise<ApiResponse<Department>>;
        getHierarchy: () => Promise<ApiResponse<DepartmentTreeNode[]>>;
        getChildren: (parentId: number) => Promise<ApiResponse<Department[]>>;
        getRoots: () => Promise<ApiResponse<Department[]>>;
        assignManager: (departmentId: number, managerId: number | null, userId?: number) => Promise<ApiResponse<Department>>;
        findByName: (name: string) => Promise<ApiResponse<Department>>;
        findByCostCenter: (costCenterCode: string) => Promise<ApiResponse<Department>>;
      };

      // Pozisyon işlemleri
      position: {
        getAll: (options?: any) => Promise<PaginatedResult<Position>>;
        getById: (id: number) => Promise<ApiResponse<Position>>;
        getByDepartment: (departmentId: number) => Promise<ApiResponse<Position[]>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<Position>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<Position>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<Position>>;
        restore: (id: number, userId?: number) => Promise<ApiResponse<Position>>;
        validateSalaryRange: (positionId: number, salary: number) => Promise<ApiResponse<boolean>>;
      };


      // Personel işlemleri
      employee: {
        getAll: (options?: any) => Promise<PaginatedResult<Employee>>;
        getById: (id: number) => Promise<ApiResponse<Employee>>;
        getByCode: (employeeCode: string) => Promise<ApiResponse<Employee>>;
        getByIdDecrypted: (id: number) => Promise<ApiResponse<Employee>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<Employee>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<Employee>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<Employee>>;
        restore: (id: number, userId?: number) => Promise<ApiResponse<Employee>>;
        getByDepartment: (departmentId: number) => Promise<ApiResponse<Employee[]>>;
        getByManager: (managerId: number) => Promise<ApiResponse<Employee[]>>;
        changeStatus: (id: number, status: string, userId?: number) => Promise<ApiResponse<Employee>>;
        generateCode: () => Promise<ApiResponse<string>>;
        searchByName: (searchTerm: string) => Promise<ApiResponse<Employee[]>>;
        getActiveCount: () => Promise<ApiResponse<{ count: number }>>;
      };

      // Personel detay işlemleri
      employeeDetails: {
        getByEmployeeId: (employeeId: number) => Promise<EmployeeDetails | null>;
        getDecrypted: (employeeId: number) => Promise<EmployeeDetails | null>;
        create: (employeeId: number, data: any, userId?: number) => Promise<EmployeeDetails>;
        update: (employeeId: number, data: any, userId?: number) => Promise<EmployeeDetails>;
      };

      // Personel belge işlemleri
      employeeDocuments: {
        getByEmployeeId: (employeeId: number) => Promise<EmployeeDocument[]>;
        getByType: (employeeId: number, documentType: string) => Promise<EmployeeDocument[]>;
        upload: (employeeId: number, data: any, userId?: number) => Promise<EmployeeDocument>;
        delete: (documentId: number, userId?: number) => Promise<void>;
      };

      // Devamlılık/Puantaj işlemleri
      attendance: {
        getAll: (options?: any) => Promise<PaginatedResult<AttendanceLog>>;
        getById: (id: number) => Promise<ApiResponse<AttendanceLog>>;
        getByEmployee: (employeeId: number, dateRange?: any) => Promise<ApiResponse<AttendanceLog[]>>;
        getByDate: (date: string) => Promise<ApiResponse<AttendanceLog[]>>;
        checkIn: (employeeId: number, time?: string) => Promise<ApiResponse<AttendanceLog>>;
        checkOut: (employeeId: number, time?: string) => Promise<ApiResponse<AttendanceLog>>;
        setBreakDuration: (logId: number, minutes: number, userId?: number) => Promise<ApiResponse<AttendanceLog>>;
        setStatus: (logId: number, status: string, userId?: number) => Promise<ApiResponse<AttendanceLog>>;
        bulkCreate: (records: any[], userId?: number) => Promise<ApiResponse<AttendanceLog[]>>;
        getMonthlyReport: (employeeId: number, month: number, year: number) => Promise<ApiResponse<any>>;
      };

      // Fazla mesai işlemleri
      overtime: {
        getAll: (options?: any) => Promise<PaginatedResult<Overtime>>;
        getById: (id: number) => Promise<ApiResponse<Overtime>>;
        getByEmployee: (employeeId: number, dateRange?: any) => Promise<ApiResponse<Overtime[]>>;
        getPending: () => Promise<ApiResponse<Overtime[]>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<Overtime>>;
        approve: (id: number, approverId: number, userId?: number) => Promise<ApiResponse<Overtime>>;
        reject: (id: number, approverId: number, userId?: number) => Promise<ApiResponse<Overtime>>;
        calculatePay: (id: number, hourlyRate: number) => Promise<ApiResponse<number>>;
      };


      // İzin türü işlemleri
      leaveType: {
        getAll: (options?: any) => Promise<PaginatedResult<LeaveType>>;
        getById: (id: number) => Promise<LeaveType | null>;
        getByName: (name: string) => Promise<LeaveType | null>;
        getPaid: () => Promise<LeaveType[]>;
        getUnpaid: () => Promise<LeaveType[]>;
        getDeducting: () => Promise<LeaveType[]>;
        create: (data: any, userId?: number) => Promise<LeaveType>;
        update: (id: number, data: any, userId?: number) => Promise<LeaveType>;
        delete: (id: number, userId?: number) => Promise<LeaveType>;
        seedDefaults: (userId?: number) => Promise<LeaveType[]>;
      };

      // İzin talebi işlemleri
      leaveRequest: {
        getAll: (options?: any) => Promise<PaginatedResult<LeaveRequest>>;
        getById: (id: number) => Promise<LeaveRequest | null>;
        getByEmployee: (employeeId: number) => Promise<LeaveRequest[]>;
        getPending: () => Promise<LeaveRequest[]>;
        getByDateRange: (startDate: string, endDate: string) => Promise<LeaveRequest[]>;
        create: (data: any, userId?: number) => Promise<LeaveRequest>;
        update: (id: number, data: any, userId?: number) => Promise<LeaveRequest>;
        approve: (id: number, approverId: number, userId?: number) => Promise<LeaveRequest>;
        reject: (id: number, approverId: number, userId?: number) => Promise<LeaveRequest>;
        cancel: (id: number, userId?: number) => Promise<LeaveRequest>;
        delete: (id: number, userId?: number) => Promise<LeaveRequest>;
        calculateDayCount: (startDate: string, endDate: string, isHalfDay?: boolean) => Promise<number>;
        checkOverlap: (employeeId: number, startDate: string, endDate: string) => Promise<boolean>;
      };

      // İzin bakiyesi işlemleri
      leaveBalance: {
        getAll: (options?: any) => Promise<PaginatedResult<LeaveBalance>>;
        getById: (id: number) => Promise<LeaveBalance | null>;
        get: (employeeId: number, year: number) => Promise<LeaveBalance | null>;
        getByEmployee: (employeeId: number) => Promise<LeaveBalance[]>;
        getByYear: (year: number) => Promise<LeaveBalance[]>;
        create: (employeeId: number, year: number, userId?: number) => Promise<LeaveBalance>;
        update: (id: number, data: any, userId?: number) => Promise<LeaveBalance>;
        deductDays: (employeeId: number, year: number, days: number, userId?: number) => Promise<LeaveBalance>;
        addDays: (employeeId: number, year: number, days: number, userId?: number) => Promise<LeaveBalance>;
        transferToNextYear: (employeeId: number, fromYear: number, userId?: number) => Promise<LeaveBalance>;
        calculateEntitlement: (employeeId: number, year: number) => Promise<number>;
        initializeYearly: (year: number, userId?: number) => Promise<LeaveBalance[]>;
      };

      // Maaş geçmişi işlemleri
      salary: {
        getAll: (options?: any) => Promise<PaginatedResult<SalaryHistory>>;
        getById: (id: number) => Promise<SalaryHistory | null>;
        getCurrent: (employeeId: number) => Promise<SalaryHistory | null>;
        getHistory: (employeeId: number) => Promise<SalaryHistory[]>;
        create: (employeeId: number, data: any, userId?: number) => Promise<SalaryHistory>;
        update: (employeeId: number, newAmount: number, effectiveDate: string, userId?: number) => Promise<SalaryHistory>;
      };


      // Bordro işlemleri
      payroll: {
        getAll: (options?: any) => Promise<PaginatedResult<Payroll>>;
        getById: (id: number) => Promise<Payroll | null>;
        getByEmployeePeriod: (employeeId: number, periodMonth: number, periodYear: number) => Promise<Payroll | null>;
        getByEmployee: (employeeId: number, year?: number) => Promise<Payroll[]>;
        getByPeriod: (periodMonth: number, periodYear: number) => Promise<Payroll[]>;
        generate: (employeeId: number, periodMonth: number, periodYear: number, userId?: number) => Promise<Payroll>;
        generateBulk: (periodMonth: number, periodYear: number, userId?: number) => Promise<Payroll[]>;
        finalize: (payrollId: number, userId?: number) => Promise<Payroll>;
        addItem: (payrollId: number, item: any, userId?: number) => Promise<PayrollItem>;
        removeItem: (itemId: number, userId?: number) => Promise<void>;
        getItems: (payrollId: number) => Promise<PayrollItem[]>;
        getPeriodStatistics: (periodMonth: number, periodYear: number) => Promise<any>;
        calculateNetSalary: (baseSalary: number, totalAdditions: number, totalDeductions: number) => Promise<number>;
      };

      // Avans işlemleri
      advance: {
        getAll: (options?: any) => Promise<PaginatedResult<SalaryAdvance>>;
        getById: (id: number) => Promise<SalaryAdvance | null>;
        getByEmployee: (employeeId: number) => Promise<SalaryAdvance[]>;
        getPending: () => Promise<SalaryAdvance[]>;
        getByDeductionPeriod: (deductionPeriod: string) => Promise<SalaryAdvance[]>;
        request: (employeeId: number, data: any, userId?: number) => Promise<SalaryAdvance>;
        approve: (id: number, approverId: number, deductionPeriod: string, userId?: number) => Promise<SalaryAdvance>;
        reject: (id: number, approverId: number, userId?: number) => Promise<SalaryAdvance>;
        markAsPaid: (id: number, paymentDate: string, userId?: number) => Promise<SalaryAdvance>;
        markAsDeducted: (id: number, userId?: number) => Promise<SalaryAdvance>;
        hasPending: (employeeId: number) => Promise<boolean>;
        getMaxAmount: (employeeId: number) => Promise<number>;
        validateAmount: (employeeId: number, amount: number) => Promise<boolean>;
      };

      // Performans değerlendirme işlemleri
      performance: {
        getAll: (options?: any) => Promise<PaginatedResult<PerformanceReview>>;
        getById: (id: number) => Promise<PerformanceReview | null>;
        getByEmployee: (employeeId: number) => Promise<PerformanceReview[]>;
        getByReviewer: (reviewerId: number) => Promise<PerformanceReview[]>;
        getByPeriod: (period: string) => Promise<PerformanceReview[]>;
        create: (data: any, userId?: number) => Promise<PerformanceReview>;
        update: (id: number, data: any, userId?: number) => Promise<PerformanceReview>;
        submit: (id: number, userId?: number) => Promise<PerformanceReview>;
        acknowledge: (id: number, userId?: number) => Promise<PerformanceReview>;
        delete: (id: number, userId?: number) => Promise<PerformanceReview>;
      };

      // Eğitim işlemleri
      training: {
        getAll: (options?: any) => Promise<PaginatedResult<Training>>;
        getById: (id: number) => Promise<Training | null>;
        create: (data: any, userId?: number) => Promise<ApiResponse<Training>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<Training>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<Training>>;
        getByCategory: (category: string) => Promise<ApiResponse<Training[]>>;
        getByProvider: (provider: string) => Promise<ApiResponse<Training[]>>;
        getCategories: () => Promise<ApiResponse<string[]>>;
        getProviders: () => Promise<ApiResponse<string[]>>;
        assignEmployee: (trainingId: number, employeeId: number, userId?: number) => Promise<ApiResponse<EmployeeTraining>>;
        completeTraining: (employeeTrainingId: number, certificateUrl?: string, userId?: number) => Promise<ApiResponse<EmployeeTraining>>;
        failTraining: (employeeTrainingId: number, userId?: number) => Promise<ApiResponse<EmployeeTraining>>;
        removeEmployee: (employeeTrainingId: number, userId?: number) => Promise<ApiResponse<EmployeeTraining>>;
        getEmployeeTrainingById: (id: number) => Promise<ApiResponse<EmployeeTraining>>;
        getAllEmployeeTrainings: (options?: any) => Promise<PaginatedResult<EmployeeTraining>>;
        getEmployeeTrainings: (employeeId: number) => Promise<ApiResponse<EmployeeTraining[]>>;
        getTrainingParticipants: (trainingId: number) => Promise<ApiResponse<EmployeeTraining[]>>;
        getCompletedCount: (employeeId: number) => Promise<ApiResponse<{ count: number }>>;
        getPlannedCount: (employeeId: number) => Promise<ApiResponse<{ count: number }>>;
      };

      // Disiplin işlemleri
      disciplinary: {
        getAll: (options?: any) => Promise<PaginatedResult<DisciplinaryAction>>;
        getById: (id: number) => Promise<ApiResponse<DisciplinaryAction>>;
        getByEmployee: (employeeId: number) => Promise<ApiResponse<DisciplinaryAction[]>>;
        getByViolationType: (violationType: string) => Promise<ApiResponse<DisciplinaryAction[]>>;
        getByActionTaken: (actionTaken: string) => Promise<ApiResponse<DisciplinaryAction[]>>;
        getByDateRange: (startDate: string, endDate: string) => Promise<ApiResponse<DisciplinaryAction[]>>;
        getSalaryDeductions: () => Promise<ApiResponse<DisciplinaryAction[]>>;
        getCountByEmployee: (employeeId: number) => Promise<ApiResponse<{ count: number }>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<DisciplinaryAction>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<DisciplinaryAction>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<DisciplinaryAction>>;
      };


      // İşten ayrılma işlemleri
      offboarding: {
        // Resignation
        getAllResignations: (options?: any) => Promise<PaginatedResult<Resignation>>;
        getResignationById: (id: number) => Promise<Resignation | null>;
        getResignationByEmployee: (employeeId: number) => Promise<Resignation | null>;
        getPendingResignations: () => Promise<Resignation[]>;
        createResignation: (data: any, userId?: number) => Promise<Resignation>;
        updateResignation: (id: number, data: any, userId?: number) => Promise<Resignation>;
        approveResignation: (id: number, lastWorkingDay?: string, userId?: number) => Promise<Resignation>;
        completeResignation: (id: number, userId?: number) => Promise<Resignation>;
        deleteResignation: (id: number, userId?: number) => Promise<Resignation>;
        // Exit Interview
        getAllExitInterviews: () => Promise<ExitInterview[]>;
        getExitInterviewById: (id: number) => Promise<ExitInterview | null>;
        getExitInterviewByResignation: (resignationId: number) => Promise<ExitInterview | null>;
        createExitInterview: (resignationId: number, data: any, userId?: number) => Promise<ExitInterview>;
        updateExitInterview: (id: number, data: any, userId?: number) => Promise<ExitInterview>;
        deleteExitInterview: (id: number, userId?: number) => Promise<ExitInterview>;
        // Settlement
        calculateFinalSettlement: (resignationId: number) => Promise<FinalSettlement>;
      };

      // Maaş parametreleri işlemleri
      salaryParameter: {
        getAll: (options?: any) => Promise<PaginatedResult<SalaryParameter>>;
        getById: (id: number) => Promise<ApiResponse<SalaryParameter>>;
        getByYearAndType: (year: number, parameterType: string, month?: number) => Promise<ApiResponse<SalaryParameter[]>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<SalaryParameter>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<SalaryParameter>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<void>>;
        getMinimumWage: (year: number, month?: number) => Promise<ApiResponse<{ minimumWage: number }>>;
        getTaxBrackets: (year: number) => Promise<ApiResponse<SalaryParameter[]>>;
        getSGKRates: (year: number) => Promise<ApiResponse<SalaryParameter[]>>;
        seedDefaults: (year: number, userId?: number) => Promise<ApiResponse<SalaryParameter[]>>;
        copyFromYear: (sourceYear: number, targetYear: number, userId?: number) => Promise<ApiResponse<SalaryParameter[]>>;
      };

      // Personel ek ödeme/kesinti işlemleri
      employeeAllowance: {
        getAll: (options?: any) => Promise<PaginatedResult<EmployeeAllowance>>;
        getById: (id: number) => Promise<ApiResponse<EmployeeAllowance>>;
        getByEmployee: (employeeId: number, activeOnly?: boolean) => Promise<ApiResponse<EmployeeAllowance[]>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<EmployeeAllowance>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<EmployeeAllowance>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<void>>;
        toggleActive: (id: number, userId?: number) => Promise<ApiResponse<EmployeeAllowance>>;
        calculateTotals: (employeeId: number, baseSalary: number) => Promise<ApiResponse<{ totalAllowances: number; totalDeductions: number; net: number }>>;
      };

      // Ödeme geçmişi işlemleri
      paymentHistory: {
        getAll: (options?: any) => Promise<PaginatedResult<PaymentHistory>>;
        getById: (id: number) => Promise<ApiResponse<PaymentHistory>>;
        getByEmployee: (employeeId: number, year?: number) => Promise<ApiResponse<PaymentHistory[]>>;
        create: (data: any, userId?: number) => Promise<ApiResponse<PaymentHistory>>;
        update: (id: number, data: any, userId?: number) => Promise<ApiResponse<PaymentHistory>>;
        delete: (id: number, userId?: number) => Promise<ApiResponse<void>>;
        cancel: (id: number, userId?: number) => Promise<ApiResponse<PaymentHistory>>;
        getStatistics: (startDate?: string, endDate?: string) => Promise<ApiResponse<any>>;
        getEmployeeSummary: (employeeId: number, year: number) => Promise<ApiResponse<any>>;
        recordSalaryPayment: (employeeId: number, payrollId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number) => Promise<ApiResponse<PaymentHistory>>;
        recordAdvancePayment: (employeeId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number) => Promise<ApiResponse<PaymentHistory>>;
      };

      // Sistem ayarları işlemleri
      settings: {
        get: (key: string) => Promise<string | null>;
        getNumber: (key: string) => Promise<number | null>;
        getBoolean: (key: string) => Promise<boolean | null>;
        set: (key: string, value: string, group?: string, userId?: number) => Promise<AppSetting>;
        setNumber: (key: string, value: number, group?: string, userId?: number) => Promise<AppSetting>;
        setBoolean: (key: string, value: boolean, group?: string, userId?: number) => Promise<AppSetting>;
        getByGroup: (group: string) => Promise<AppSetting[]>;
        getAll: () => Promise<AppSetting[]>;
        getAllGroups: () => Promise<string[]>;
        delete: (key: string, userId?: number) => Promise<AppSetting | null>;
        seedDefaults: (userId?: number) => Promise<number>;
      };

      // Uygulama işlemleri
      getAppVersion: () => Promise<string>;
      closeApp: () => Promise<void>;
      minimizeApp: () => Promise<void>;
      maximizeApp: () => Promise<void>;

      // İşe alım talepleri işlemleri
      hiringRequest: {
        getAll: (options?: any) => Promise<PaginatedResult<HiringRequest>>;
        getById: (id: number) => Promise<HiringRequest | null>;
        getByStatus: (status: string) => Promise<HiringRequest[]>;
        getByDepartment: (departmentId: number) => Promise<HiringRequest[]>;
        create: (data: any, userId?: number) => Promise<HiringRequest>;
        update: (id: number, data: any, userId?: number) => Promise<HiringRequest>;
        approve: (id: number, approverId: number, userId?: number) => Promise<HiringRequest>;
        reject: (id: number, approverId: number, userId?: number) => Promise<HiringRequest>;
        start: (id: number, userId?: number) => Promise<HiringRequest>;
        complete: (id: number, userId?: number) => Promise<HiringRequest>;
        cancel: (id: number, userId?: number) => Promise<HiringRequest>;
        delete: (id: number, userId?: number) => Promise<HiringRequest>;
        getStats: () => Promise<{ total: number; pending: number; approved: number; inProgress: number; completed: number }>;
      };

      // Oryantasyon işlemleri
      onboarding: {
        getAll: (options?: any) => Promise<PaginatedResult<Onboarding>>;
        getById: (id: number) => Promise<Onboarding | null>;
        getByEmployee: (employeeId: number) => Promise<Onboarding | null>;
        getByStatus: (status: string) => Promise<Onboarding[]>;
        create: (data: any, userId?: number) => Promise<Onboarding>;
        createWithTasks: (data: any, userId?: number) => Promise<Onboarding>;
        update: (id: number, data: any, userId?: number) => Promise<Onboarding>;
        start: (id: number, userId?: number) => Promise<Onboarding>;
        complete: (id: number, userId?: number) => Promise<Onboarding>;
        cancel: (id: number, userId?: number) => Promise<Onboarding>;
        delete: (id: number, userId?: number) => Promise<Onboarding>;
        addTask: (onboardingId: number, data: any) => Promise<OnboardingTask>;
        updateTask: (taskId: number, data: any) => Promise<OnboardingTask>;
        completeTask: (taskId: number) => Promise<OnboardingTask>;
        deleteTask: (taskId: number) => Promise<void>;
        getStats: () => Promise<{ total: number; planned: number; inProgress: number; completed: number; avgCompletionRate: number }>;
      };

      // Rapor işlemleri
      report: {
        getEmployeeDistribution: () => Promise<ApiResponse<any>>;
        getDistributionByDepartment: () => Promise<ApiResponse<any[]>>;
        getDistributionByGender: () => Promise<ApiResponse<any[]>>;
        getDistributionByAge: () => Promise<ApiResponse<any[]>>;
        getMonthlyCost: (year: number, month: number) => Promise<ApiResponse<any>>;
        getYearlyCost: (year: number) => Promise<ApiResponse<any>>;
        getTurnover: (year: number) => Promise<ApiResponse<any>>;
        getLeaveUsage: (year: number) => Promise<ApiResponse<any>>;
        getPayrollSummary: (year: number, month?: number) => Promise<ApiResponse<any>>;
        getSGK: (year: number, month: number) => Promise<ApiResponse<any>>;
        getIskur: (year: number, month: number) => Promise<ApiResponse<any>>;
      };
    };
  }
}

export {};
