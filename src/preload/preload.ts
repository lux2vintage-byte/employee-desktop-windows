import { contextBridge, ipcRenderer } from 'electron'

// Güvenli API'yi renderer process'e expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== VERİTABANI İŞLEMLERİ ====================
  databaseOperation: (operation: any) => ipcRenderer.invoke('database-operation', operation),
  healthCheck: () => ipcRenderer.invoke('health-check'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getAllEmployees: () => ipcRenderer.invoke('get-all-employees'),
  createEmployee: (data: any) => ipcRenderer.invoke('create-employee', data),
  updateEmployee: (id: number, data: any) => ipcRenderer.invoke('update-employee', id, data),
  deleteEmployee: (id: number) => ipcRenderer.invoke('delete-employee', id),

  // ==================== KULLANICI İŞLEMLERİ ====================
  user: {
    getAll: (options: any) => ipcRenderer.invoke('user-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('user-get-by-id', id),
    create: (data: any) => ipcRenderer.invoke('user-create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('user-update', id, data),
    delete: (id: number) => ipcRenderer.invoke('user-delete', id),
    login: (email: string, password: string) => ipcRenderer.invoke('user-login', email, password),
    forgotPassword: (email: string) => ipcRenderer.invoke('user-forgot-password', email),
    changePassword: (id: number, currentPassword: string, newPassword: string) => 
      ipcRenderer.invoke('user-change-password', id, currentPassword, newPassword),
  },

  // ==================== ŞİRKET BİLGİLERİ ====================
  companyInfo: {
    get: () => ipcRenderer.invoke('company-info-get'),
    update: (data: any) => ipcRenderer.invoke('company-info-update', JSON.parse(JSON.stringify(data))),
    updateGeneral: (data: any) => ipcRenderer.invoke('company-info-update-general', JSON.parse(JSON.stringify(data))),
    updateContact: (data: any) => ipcRenderer.invoke('company-info-update-contact', JSON.parse(JSON.stringify(data))),
    updateTax: (data: any) => ipcRenderer.invoke('company-info-update-tax', JSON.parse(JSON.stringify(data))),
    updateBank: (data: any) => ipcRenderer.invoke('company-info-update-bank', JSON.parse(JSON.stringify(data))),
    updateLogo: (data: any) => ipcRenderer.invoke('company-info-update-logo', JSON.parse(JSON.stringify(data))),
  },

  // ==================== EMAIL YAPILANDIRMA ====================
  emailConfig: {
    getAll: (options?: any) => ipcRenderer.invoke('email-config-get-all', options),
    getActive: () => ipcRenderer.invoke('email-config-get-active'),
    getById: (id: number) => ipcRenderer.invoke('email-config-get-by-id', id),
    getPassword: (id: number) => ipcRenderer.invoke('email-config-get-password', id),
    create: (data: any) => ipcRenderer.invoke('email-config-create', JSON.parse(JSON.stringify(data))),
    update: (id: number, data: any) => ipcRenderer.invoke('email-config-update', id, JSON.parse(JSON.stringify(data))),
    delete: (id: number) => ipcRenderer.invoke('email-config-delete', id),
    setActive: (id: number) => ipcRenderer.invoke('email-config-set-active', id),
  },

  // ==================== DEPARTMAN İŞLEMLERİ ====================
  department: {
    getAll: (options?: any) => ipcRenderer.invoke('department-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('department-get-by-id', id),
    create: (data: any, userId?: number) => ipcRenderer.invoke('department-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('department-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('department-delete', id, userId),
    restore: (id: number, userId?: number) => ipcRenderer.invoke('department-restore', id, userId),
    getHierarchy: () => ipcRenderer.invoke('department-get-hierarchy'),
    getChildren: (parentId: number) => ipcRenderer.invoke('department-get-children', parentId),
    getRoots: () => ipcRenderer.invoke('department-get-roots'),
    assignManager: (departmentId: number, managerId: number | null, userId?: number) => 
      ipcRenderer.invoke('department-assign-manager', departmentId, managerId, userId),
    findByName: (name: string) => ipcRenderer.invoke('department-find-by-name', name),
    findByCostCenter: (costCenterCode: string) => ipcRenderer.invoke('department-find-by-cost-center', costCenterCode),
  },

  // ==================== POZİSYON İŞLEMLERİ ====================
  position: {
    getAll: (options?: any) => ipcRenderer.invoke('position-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('position-get-by-id', id),
    getByDepartment: (departmentId: number) => ipcRenderer.invoke('position-get-by-department', departmentId),
    create: (data: any, userId?: number) => ipcRenderer.invoke('position-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('position-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('position-delete', id, userId),
    restore: (id: number, userId?: number) => ipcRenderer.invoke('position-restore', id, userId),
    validateSalaryRange: (positionId: number, salary: number) => 
      ipcRenderer.invoke('position-validate-salary-range', positionId, salary),
  },

  // ==================== PERSONEL İŞLEMLERİ ====================
  employee: {
    getAll: (options?: any) => ipcRenderer.invoke('employee-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('employee-get-by-id', id),
    getByCode: (employeeCode: string) => ipcRenderer.invoke('employee-get-by-code', employeeCode),
    getByIdDecrypted: (id: number) => ipcRenderer.invoke('employee-get-by-id-decrypted', id),
    create: (data: any, userId?: number) => ipcRenderer.invoke('employee-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('employee-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('employee-delete', id, userId),
    restore: (id: number, userId?: number) => ipcRenderer.invoke('employee-restore', id, userId),
    getByDepartment: (departmentId: number) => ipcRenderer.invoke('employee-get-by-department', departmentId),
    getByManager: (managerId: number) => ipcRenderer.invoke('employee-get-by-manager', managerId),
    changeStatus: (id: number, status: string, userId?: number) => 
      ipcRenderer.invoke('employee-change-status', id, status, userId),
    generateCode: () => ipcRenderer.invoke('employee-generate-code'),
    searchByName: (searchTerm: string) => ipcRenderer.invoke('employee-search-by-name', searchTerm),
    getActiveCount: () => ipcRenderer.invoke('employee-get-active-count'),
  },

  // ==================== PERSONEL DETAY İŞLEMLERİ ====================
  employeeDetails: {
    getByEmployeeId: (employeeId: number) => ipcRenderer.invoke('employee-details-get-by-employee', employeeId),
    getDecrypted: (employeeId: number) => ipcRenderer.invoke('employee-details-get-decrypted', employeeId),
    create: (employeeId: number, data: any, userId?: number) => 
      ipcRenderer.invoke('employee-details-create', employeeId, data, userId),
    update: (employeeId: number, data: any, userId?: number) => 
      ipcRenderer.invoke('employee-details-update', employeeId, data, userId),
  },

  // ==================== PERSONEL BELGE İŞLEMLERİ ====================
  employeeDocuments: {
    getByEmployeeId: (employeeId: number) => ipcRenderer.invoke('employee-documents-get-by-employee', employeeId),
    getByType: (employeeId: number, documentType: string) => 
      ipcRenderer.invoke('employee-documents-get-by-type', employeeId, documentType),
    upload: (employeeId: number, data: any, userId?: number) => 
      ipcRenderer.invoke('employee-documents-upload', employeeId, data, userId),
    delete: (documentId: number, userId?: number) => 
      ipcRenderer.invoke('employee-documents-delete', documentId, userId),
  },

  // ==================== DEVAMLILIK/PUANTAJ İŞLEMLERİ ====================
  attendance: {
    getAll: (options?: any) => ipcRenderer.invoke('attendance-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('attendance-get-by-id', id),
    getByEmployee: (employeeId: number, dateRange?: any) => 
      ipcRenderer.invoke('attendance-get-by-employee', employeeId, dateRange),
    getByDate: (date: string) => ipcRenderer.invoke('attendance-get-by-date', date),
    checkIn: (employeeId: number, time?: string) => ipcRenderer.invoke('attendance-check-in', employeeId, time),
    checkOut: (employeeId: number, time?: string) => ipcRenderer.invoke('attendance-check-out', employeeId, time),
    setBreakDuration: (logId: number, minutes: number, userId?: number) => 
      ipcRenderer.invoke('attendance-set-break-duration', logId, minutes, userId),
    setStatus: (logId: number, status: string, userId?: number) => 
      ipcRenderer.invoke('attendance-set-status', logId, status, userId),
    bulkCreate: (records: any[], userId?: number) => 
      ipcRenderer.invoke('attendance-bulk-create', records, userId),
    getMonthlyReport: (employeeId: number, month: number, year: number) => 
      ipcRenderer.invoke('attendance-get-monthly-report', employeeId, month, year),
  },

  // ==================== FAZLA MESAİ İŞLEMLERİ ====================
  overtime: {
    getAll: (options?: any) => ipcRenderer.invoke('overtime-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('overtime-get-by-id', id),
    getByEmployee: (employeeId: number, dateRange?: any) => 
      ipcRenderer.invoke('overtime-get-by-employee', employeeId, dateRange),
    getPending: () => ipcRenderer.invoke('overtime-get-pending'),
    create: (data: any, userId?: number) => ipcRenderer.invoke('overtime-create', data, userId),
    approve: (id: number, approverId: number, userId?: number) => 
      ipcRenderer.invoke('overtime-approve', id, approverId, userId),
    reject: (id: number, approverId: number, userId?: number) => 
      ipcRenderer.invoke('overtime-reject', id, approverId, userId),
    calculatePay: (id: number, hourlyRate: number) => 
      ipcRenderer.invoke('overtime-calculate-pay', id, hourlyRate),
  },

  // ==================== İZİN TÜRÜ İŞLEMLERİ ====================
  leaveType: {
    getAll: (options?: any) => ipcRenderer.invoke('leave-type-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('leave-type-get-by-id', id),
    getByName: (name: string) => ipcRenderer.invoke('leave-type-get-by-name', name),
    getPaid: () => ipcRenderer.invoke('leave-type-get-paid'),
    getUnpaid: () => ipcRenderer.invoke('leave-type-get-unpaid'),
    getDeducting: () => ipcRenderer.invoke('leave-type-get-deducting'),
    create: (data: any, userId?: number) => ipcRenderer.invoke('leave-type-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('leave-type-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('leave-type-delete', id, userId),
    seedDefaults: (userId?: number) => ipcRenderer.invoke('leave-type-seed-defaults', userId),
  },

  // ==================== İZİN TALEBİ İŞLEMLERİ ====================
  leaveRequest: {
    getAll: (options?: any) => ipcRenderer.invoke('leave-request-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('leave-request-get-by-id', id),
    getByEmployee: (employeeId: number) => ipcRenderer.invoke('leave-request-get-by-employee', employeeId),
    getPending: () => ipcRenderer.invoke('leave-request-get-pending'),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('leave-request-get-by-date-range', startDate, endDate),
    create: (data: any, userId?: number) => ipcRenderer.invoke('leave-request-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('leave-request-update', id, data, userId),
    approve: (id: number, approverId: number, userId?: number) => 
      ipcRenderer.invoke('leave-request-approve', id, approverId, userId),
    reject: (id: number, approverId: number, userId?: number) => 
      ipcRenderer.invoke('leave-request-reject', id, approverId, userId),
    cancel: (id: number, userId?: number) => ipcRenderer.invoke('leave-request-cancel', id, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('leave-request-delete', id, userId),
    calculateDayCount: (startDate: string, endDate: string, isHalfDay?: boolean) => 
      ipcRenderer.invoke('leave-request-calculate-day-count', startDate, endDate, isHalfDay),
    checkOverlap: (employeeId: number, startDate: string, endDate: string) => 
      ipcRenderer.invoke('leave-request-check-overlap', employeeId, startDate, endDate),
  },

  // ==================== İZİN BAKİYESİ İŞLEMLERİ ====================
  leaveBalance: {
    getAll: (options?: any) => ipcRenderer.invoke('leave-balance-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('leave-balance-get-by-id', id),
    get: (employeeId: number, year: number) => ipcRenderer.invoke('leave-balance-get', employeeId, year),
    getByEmployee: (employeeId: number) => ipcRenderer.invoke('leave-balance-get-by-employee', employeeId),
    getByYear: (year: number) => ipcRenderer.invoke('leave-balance-get-by-year', year),
    create: (employeeId: number, year: number, userId?: number) => 
      ipcRenderer.invoke('leave-balance-create', employeeId, year, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('leave-balance-update', id, data, userId),
    deductDays: (employeeId: number, year: number, days: number, userId?: number) => 
      ipcRenderer.invoke('leave-balance-deduct-days', employeeId, year, days, userId),
    addDays: (employeeId: number, year: number, days: number, userId?: number) => 
      ipcRenderer.invoke('leave-balance-add-days', employeeId, year, days, userId),
    transferToNextYear: (employeeId: number, fromYear: number, userId?: number) => 
      ipcRenderer.invoke('leave-balance-transfer-to-next-year', employeeId, fromYear, userId),
    calculateEntitlement: (employeeId: number, year: number) => 
      ipcRenderer.invoke('leave-balance-calculate-entitlement', employeeId, year),
    initializeYearly: (year: number, userId?: number) => 
      ipcRenderer.invoke('leave-balance-initialize-yearly', year, userId),
  },

  // ==================== MAAŞ GEÇMİŞİ İŞLEMLERİ ====================
  salary: {
    getAll: (options?: any) => ipcRenderer.invoke('salary-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('salary-get-by-id', id),
    getCurrent: (employeeId: number) => ipcRenderer.invoke('salary-get-current', employeeId),
    getHistory: (employeeId: number) => ipcRenderer.invoke('salary-get-history', employeeId),
    create: (employeeId: number, data: any, userId?: number) => 
      ipcRenderer.invoke('salary-create', employeeId, data, userId),
    update: (employeeId: number, newAmount: number, effectiveDate: string, userId?: number) => 
      ipcRenderer.invoke('salary-update', employeeId, newAmount, effectiveDate, userId),
  },

  // ==================== BORDRO İŞLEMLERİ ====================
  payroll: {
    getAll: (options?: any) => ipcRenderer.invoke('payroll-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('payroll-get-by-id', id),
    getByEmployeePeriod: (employeeId: number, periodMonth: number, periodYear: number) => 
      ipcRenderer.invoke('payroll-get-by-employee-period', employeeId, periodMonth, periodYear),
    getByEmployee: (employeeId: number, year?: number) => 
      ipcRenderer.invoke('payroll-get-by-employee', employeeId, year),
    getByPeriod: (periodMonth: number, periodYear: number) => 
      ipcRenderer.invoke('payroll-get-by-period', periodMonth, periodYear),
    generate: (employeeId: number, periodMonth: number, periodYear: number, userId?: number) => 
      ipcRenderer.invoke('payroll-generate', employeeId, periodMonth, periodYear, userId),
    generateBulk: (periodMonth: number, periodYear: number, userId?: number) => 
      ipcRenderer.invoke('payroll-generate-bulk', periodMonth, periodYear, userId),
    finalize: (payrollId: number, userId?: number) => ipcRenderer.invoke('payroll-finalize', payrollId, userId),
    addItem: (payrollId: number, item: any, userId?: number) => 
      ipcRenderer.invoke('payroll-add-item', payrollId, item, userId),
    removeItem: (itemId: number, userId?: number) => ipcRenderer.invoke('payroll-remove-item', itemId, userId),
    getItems: (payrollId: number) => ipcRenderer.invoke('payroll-get-items', payrollId),
    getPeriodStatistics: (periodMonth: number, periodYear: number) => 
      ipcRenderer.invoke('payroll-get-period-statistics', periodMonth, periodYear),
    calculateNetSalary: (baseSalary: number, totalAdditions: number, totalDeductions: number) => 
      ipcRenderer.invoke('payroll-calculate-net-salary', baseSalary, totalAdditions, totalDeductions),
  },

  // ==================== AVANS İŞLEMLERİ ====================
  advance: {
    getAll: (options?: any) => ipcRenderer.invoke('advance-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('advance-get-by-id', id),
    getByEmployee: (employeeId: number) => ipcRenderer.invoke('advance-get-by-employee', employeeId),
    getPending: () => ipcRenderer.invoke('advance-get-pending'),
    getByDeductionPeriod: (deductionPeriod: string) => 
      ipcRenderer.invoke('advance-get-by-deduction-period', deductionPeriod),
    request: (employeeId: number, data: any, userId?: number) => 
      ipcRenderer.invoke('advance-request', employeeId, data, userId),
    approve: (id: number, approverId: number, deductionPeriod: string, userId?: number) => 
      ipcRenderer.invoke('advance-approve', id, approverId, deductionPeriod, userId),
    reject: (id: number, approverId: number, userId?: number) => 
      ipcRenderer.invoke('advance-reject', id, approverId, userId),
    markAsPaid: (id: number, paymentDate: string, userId?: number) => 
      ipcRenderer.invoke('advance-mark-as-paid', id, paymentDate, userId),
    markAsDeducted: (id: number, userId?: number) => ipcRenderer.invoke('advance-mark-as-deducted', id, userId),
    hasPending: (employeeId: number) => ipcRenderer.invoke('advance-has-pending', employeeId),
    getMaxAmount: (employeeId: number) => ipcRenderer.invoke('advance-get-max-amount', employeeId),
    validateAmount: (employeeId: number, amount: number) => 
      ipcRenderer.invoke('advance-validate-amount', employeeId, amount),
  },

  // ==================== PERFORMANS DEĞERLENDİRME İŞLEMLERİ ====================
  performance: {
    getAll: (options?: any) => ipcRenderer.invoke('performance-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('performance-get-by-id', id),
    getByEmployee: (employeeId: number) => ipcRenderer.invoke('performance-get-by-employee', employeeId),
    getByReviewer: (reviewerId: number) => ipcRenderer.invoke('performance-get-by-reviewer', reviewerId),
    getByPeriod: (period: string) => ipcRenderer.invoke('performance-get-by-period', period),
    create: (data: any, userId?: number) => ipcRenderer.invoke('performance-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('performance-update', id, data, userId),
    submit: (id: number, userId?: number) => ipcRenderer.invoke('performance-submit', id, userId),
    acknowledge: (id: number, userId?: number) => ipcRenderer.invoke('performance-acknowledge', id, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('performance-delete', id, userId),
  },

  // ==================== EĞİTİM İŞLEMLERİ ====================
  training: {
    getAll: (options?: any) => ipcRenderer.invoke('training-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('training-get-by-id', id),
    create: (data: any, userId?: number) => ipcRenderer.invoke('training-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('training-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('training-delete', id, userId),
    getByCategory: (category: string) => ipcRenderer.invoke('training-get-by-category', category),
    getByProvider: (provider: string) => ipcRenderer.invoke('training-get-by-provider', provider),
    getCategories: () => ipcRenderer.invoke('training-get-categories'),
    getProviders: () => ipcRenderer.invoke('training-get-providers'),
    // Employee Training
    assignEmployee: (trainingId: number, employeeId: number, userId?: number) => 
      ipcRenderer.invoke('employee-training-assign', trainingId, employeeId, userId),
    completeTraining: (employeeTrainingId: number, certificateUrl?: string, userId?: number) => 
      ipcRenderer.invoke('employee-training-complete', employeeTrainingId, certificateUrl, userId),
    failTraining: (employeeTrainingId: number, userId?: number) => 
      ipcRenderer.invoke('employee-training-fail', employeeTrainingId, userId),
    removeEmployee: (employeeTrainingId: number, userId?: number) => 
      ipcRenderer.invoke('employee-training-remove', employeeTrainingId, userId),
    getEmployeeTrainingById: (id: number) => ipcRenderer.invoke('employee-training-get-by-id', id),
    getAllEmployeeTrainings: (options?: any) => ipcRenderer.invoke('employee-training-get-all', options),
    getEmployeeTrainings: (employeeId: number) => 
      ipcRenderer.invoke('employee-training-get-by-employee', employeeId),
    getTrainingParticipants: (trainingId: number) => 
      ipcRenderer.invoke('employee-training-get-participants', trainingId),
    getCompletedCount: (employeeId: number) => 
      ipcRenderer.invoke('employee-training-completed-count', employeeId),
    getPlannedCount: (employeeId: number) => 
      ipcRenderer.invoke('employee-training-planned-count', employeeId),
  },

  // ==================== DİSİPLİN İŞLEMLERİ ====================
  disciplinary: {
    getAll: (options?: any) => ipcRenderer.invoke('disciplinary-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('disciplinary-get-by-id', id),
    getByEmployee: (employeeId: number) => ipcRenderer.invoke('disciplinary-get-by-employee', employeeId),
    getByViolationType: (violationType: string) => 
      ipcRenderer.invoke('disciplinary-get-by-violation-type', violationType),
    getByActionTaken: (actionTaken: string) => 
      ipcRenderer.invoke('disciplinary-get-by-action-taken', actionTaken),
    getByDateRange: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('disciplinary-get-by-date-range', startDate, endDate),
    getSalaryDeductions: () => ipcRenderer.invoke('disciplinary-get-salary-deductions'),
    getCountByEmployee: (employeeId: number) => 
      ipcRenderer.invoke('disciplinary-get-count-by-employee', employeeId),
    create: (data: any, userId?: number) => ipcRenderer.invoke('disciplinary-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('disciplinary-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('disciplinary-delete', id, userId),
  },

  // ==================== İŞTEN AYRILMA İŞLEMLERİ ====================
  offboarding: {
    // Resignation
    getAllResignations: (options?: any) => ipcRenderer.invoke('resignation-get-all', options),
    getResignationById: (id: number) => ipcRenderer.invoke('resignation-get-by-id', id),
    getResignationByEmployee: (employeeId: number) => 
      ipcRenderer.invoke('resignation-get-by-employee', employeeId),
    getPendingResignations: () => ipcRenderer.invoke('resignation-get-pending'),
    createResignation: (data: any, userId?: number) => ipcRenderer.invoke('resignation-create', data, userId),
    updateResignation: (id: number, data: any, userId?: number) => 
      ipcRenderer.invoke('resignation-update', id, data, userId),
    approveResignation: (id: number, lastWorkingDay?: string, userId?: number) => 
      ipcRenderer.invoke('resignation-approve', id, lastWorkingDay, userId),
    completeResignation: (id: number, userId?: number) => 
      ipcRenderer.invoke('resignation-complete', id, userId),
    deleteResignation: (id: number, userId?: number) => ipcRenderer.invoke('resignation-delete', id, userId),
    // Exit Interview
    getAllExitInterviews: () => ipcRenderer.invoke('exit-interview-get-all'),
    getExitInterviewById: (id: number) => ipcRenderer.invoke('exit-interview-get-by-id', id),
    getExitInterviewByResignation: (resignationId: number) => 
      ipcRenderer.invoke('exit-interview-get-by-resignation', resignationId),
    createExitInterview: (resignationId: number, data: any, userId?: number) => 
      ipcRenderer.invoke('exit-interview-create', resignationId, data, userId),
    updateExitInterview: (id: number, data: any, userId?: number) => 
      ipcRenderer.invoke('exit-interview-update', id, data, userId),
    deleteExitInterview: (id: number, userId?: number) => 
      ipcRenderer.invoke('exit-interview-delete', id, userId),
    // Settlement
    calculateFinalSettlement: (resignationId: number) => 
      ipcRenderer.invoke('offboarding-calculate-settlement', resignationId),
  },

  // ==================== MAAŞ PARAMETRELERİ İŞLEMLERİ ====================
  salaryParameter: {
    getAll: (options?: any) => ipcRenderer.invoke('salary-parameter-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('salary-parameter-get-by-id', id),
    getByYearAndType: (year: number, parameterType: string, month?: number) => 
      ipcRenderer.invoke('salary-parameter-get-by-year-type', year, parameterType, month),
    create: (data: any, userId?: number) => ipcRenderer.invoke('salary-parameter-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('salary-parameter-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('salary-parameter-delete', id, userId),
    getMinimumWage: (year: number, month?: number) => 
      ipcRenderer.invoke('salary-parameter-get-minimum-wage', year, month),
    getTaxBrackets: (year: number) => ipcRenderer.invoke('salary-parameter-get-tax-brackets', year),
    getSGKRates: (year: number) => ipcRenderer.invoke('salary-parameter-get-sgk-rates', year),
    seedDefaults: (year: number, userId?: number) => 
      ipcRenderer.invoke('salary-parameter-seed-defaults', year, userId),
    copyFromYear: (sourceYear: number, targetYear: number, userId?: number) => 
      ipcRenderer.invoke('salary-parameter-copy-from-year', sourceYear, targetYear, userId),
  },

  // ==================== PERSONEL EK ÖDEME/KESİNTİ İŞLEMLERİ ====================
  employeeAllowance: {
    getAll: (options?: any) => ipcRenderer.invoke('employee-allowance-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('employee-allowance-get-by-id', id),
    getByEmployee: (employeeId: number, activeOnly?: boolean) => 
      ipcRenderer.invoke('employee-allowance-get-by-employee', employeeId, activeOnly),
    create: (data: any, userId?: number) => ipcRenderer.invoke('employee-allowance-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('employee-allowance-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('employee-allowance-delete', id, userId),
    toggleActive: (id: number, userId?: number) => ipcRenderer.invoke('employee-allowance-toggle-active', id, userId),
    calculateTotals: (employeeId: number, baseSalary: number) => 
      ipcRenderer.invoke('employee-allowance-calculate-totals', employeeId, baseSalary),
  },

  // ==================== ÖDEME GEÇMİŞİ İŞLEMLERİ ====================
  paymentHistory: {
    getAll: (options?: any) => ipcRenderer.invoke('payment-history-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('payment-history-get-by-id', id),
    getByEmployee: (employeeId: number, year?: number) => 
      ipcRenderer.invoke('payment-history-get-by-employee', employeeId, year),
    create: (data: any, userId?: number) => ipcRenderer.invoke('payment-history-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('payment-history-update', id, data, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('payment-history-delete', id, userId),
    cancel: (id: number, userId?: number) => ipcRenderer.invoke('payment-history-cancel', id, userId),
    getStatistics: (startDate?: string, endDate?: string) => 
      ipcRenderer.invoke('payment-history-get-statistics', startDate, endDate),
    getEmployeeSummary: (employeeId: number, year: number) => 
      ipcRenderer.invoke('payment-history-get-employee-summary', employeeId, year),
    recordSalaryPayment: (employeeId: number, payrollId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number) => 
      ipcRenderer.invoke('payment-history-record-salary', employeeId, payrollId, amount, paymentMethod, bankDetails, userId),
    recordAdvancePayment: (employeeId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number) => 
      ipcRenderer.invoke('payment-history-record-advance', employeeId, amount, paymentMethod, bankDetails, userId),
  },

  // ==================== SİSTEM AYARLARI İŞLEMLERİ ====================
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings-get', key),
    getNumber: (key: string) => ipcRenderer.invoke('settings-get-number', key),
    getBoolean: (key: string) => ipcRenderer.invoke('settings-get-boolean', key),
    set: (key: string, value: string, group?: string, userId?: number) => 
      ipcRenderer.invoke('settings-set', key, value, group, userId),
    setNumber: (key: string, value: number, group?: string, userId?: number) => 
      ipcRenderer.invoke('settings-set-number', key, value, group, userId),
    setBoolean: (key: string, value: boolean, group?: string, userId?: number) => 
      ipcRenderer.invoke('settings-set-boolean', key, value, group, userId),
    getByGroup: (group: string) => ipcRenderer.invoke('settings-get-by-group', group),
    getAll: () => ipcRenderer.invoke('settings-get-all'),
    getAllGroups: () => ipcRenderer.invoke('settings-get-all-groups'),
    delete: (key: string, userId?: number) => ipcRenderer.invoke('settings-delete', key, userId),
    seedDefaults: (userId?: number) => ipcRenderer.invoke('settings-seed-defaults', userId),
  },

  // ==================== UYGULAMA İŞLEMLERİ ====================
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  maximizeApp: () => ipcRenderer.invoke('maximize-app'),

  // ==================== İŞE ALIM TALEPLERİ ====================
  hiringRequest: {
    getAll: (options?: any) => ipcRenderer.invoke('hiring-request-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('hiring-request-get-by-id', id),
    getByStatus: (status: string) => ipcRenderer.invoke('hiring-request-get-by-status', status),
    getByDepartment: (departmentId: number) => ipcRenderer.invoke('hiring-request-get-by-department', departmentId),
    create: (data: any, userId?: number) => ipcRenderer.invoke('hiring-request-create', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('hiring-request-update', id, data, userId),
    approve: (id: number, approverId: number, userId?: number) => ipcRenderer.invoke('hiring-request-approve', id, approverId, userId),
    reject: (id: number, approverId: number, userId?: number) => ipcRenderer.invoke('hiring-request-reject', id, approverId, userId),
    start: (id: number, userId?: number) => ipcRenderer.invoke('hiring-request-start', id, userId),
    complete: (id: number, userId?: number) => ipcRenderer.invoke('hiring-request-complete', id, userId),
    cancel: (id: number, userId?: number) => ipcRenderer.invoke('hiring-request-cancel', id, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('hiring-request-delete', id, userId),
    getStats: () => ipcRenderer.invoke('hiring-request-get-stats'),
  },

  // ==================== ORYANTASYON ====================
  onboarding: {
    getAll: (options?: any) => ipcRenderer.invoke('onboarding-get-all', options),
    getById: (id: number) => ipcRenderer.invoke('onboarding-get-by-id', id),
    getByEmployee: (employeeId: number) => ipcRenderer.invoke('onboarding-get-by-employee', employeeId),
    getByStatus: (status: string) => ipcRenderer.invoke('onboarding-get-by-status', status),
    create: (data: any, userId?: number) => ipcRenderer.invoke('onboarding-create', data, userId),
    createWithTasks: (data: any, userId?: number) => ipcRenderer.invoke('onboarding-create-with-tasks', data, userId),
    update: (id: number, data: any, userId?: number) => ipcRenderer.invoke('onboarding-update', id, data, userId),
    start: (id: number, userId?: number) => ipcRenderer.invoke('onboarding-start', id, userId),
    complete: (id: number, userId?: number) => ipcRenderer.invoke('onboarding-complete', id, userId),
    cancel: (id: number, userId?: number) => ipcRenderer.invoke('onboarding-cancel', id, userId),
    delete: (id: number, userId?: number) => ipcRenderer.invoke('onboarding-delete', id, userId),
    addTask: (onboardingId: number, data: any) => ipcRenderer.invoke('onboarding-add-task', onboardingId, data),
    updateTask: (taskId: number, data: any) => ipcRenderer.invoke('onboarding-update-task', taskId, data),
    completeTask: (taskId: number) => ipcRenderer.invoke('onboarding-complete-task', taskId),
    deleteTask: (taskId: number) => ipcRenderer.invoke('onboarding-delete-task', taskId),
    getStats: () => ipcRenderer.invoke('onboarding-get-stats'),
  },

  // ==================== RAPORLAR ====================
  report: {
    // Personel Dağılım Raporu
    getEmployeeDistribution: () => ipcRenderer.invoke('report-employee-distribution'),
    getDistributionByDepartment: () => ipcRenderer.invoke('report-distribution-by-department'),
    getDistributionByGender: () => ipcRenderer.invoke('report-distribution-by-gender'),
    getDistributionByAge: () => ipcRenderer.invoke('report-distribution-by-age'),
    // Personel Maliyet Raporu
    getMonthlyCost: (year: number, month: number) => ipcRenderer.invoke('report-monthly-cost', year, month),
    getYearlyCost: (year: number) => ipcRenderer.invoke('report-yearly-cost', year),
    // Turnover Raporu
    getTurnover: (year: number) => ipcRenderer.invoke('report-turnover', year),
    // İzin Kullanım Raporu
    getLeaveUsage: (year: number) => ipcRenderer.invoke('report-leave-usage', year),
    // Bordro Özet Raporu
    getPayrollSummary: (year: number, month?: number) => ipcRenderer.invoke('report-payroll-summary', year, month),
    // SGK / İşkur Raporları
    getSGK: (year: number, month: number) => ipcRenderer.invoke('report-sgk', year, month),
    getIskur: (year: number, month: number) => ipcRenderer.invoke('report-iskur', year, month),
  },
})
