import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue'),
    },
    {
      path: '/email-settings',
      name: 'email-settings',
      component: () => import('../views/EmailSettings.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/Users.vue'),
    },
    // Organizasyon - Departmanlar
    {
      path: '/departments',
      name: 'departments',
      component: () => import('../views/organization/DepartmentList.vue'),
    },
    // Organizasyon - Pozisyonlar
    {
      path: '/positions',
      name: 'positions',
      component: () => import('../views/organization/PositionList.vue'),
    },
    // Personel Kartları
    {
      path: '/employees',
      name: 'employees',
      component: () => import('../views/employees/EmployeeList.vue'),
    },
    {
      path: '/employees/new',
      name: 'employee-new',
      component: () => import('../views/employees/EmployeeForm.vue'),
    },
    {
      path: '/employees/:id',
      name: 'employee-detail',
      component: () => import('../views/employees/EmployeeDetail.vue'),
    },
    {
      path: '/employees/:id/edit',
      name: 'employee-edit',
      component: () => import('../views/employees/EmployeeForm.vue'),
    },
    {
      path: '/employees/archive',
      name: 'employees-archive',
      component: () => import('../views/employees/EmployeeArchive.vue'),
    },
    // İşe Alım ve Oryantasyon
    {
      path: '/hiring-requests',
      name: 'hiring-requests',
      component: () => import('../views/recruitment/HiringRequestList.vue'),
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/recruitment/OnboardingList.vue'),
    },
    // Devamlılık ve Takip
    {
      path: '/attendance',
      name: 'attendance',
      component: () => import('../views/attendance/AttendanceList.vue'),
    },
    {
      path: '/attendance/monthly',
      name: 'attendance-monthly',
      component: () => import('../views/attendance/MonthlyAttendance.vue'),
    },
    {
      path: '/overtime',
      name: 'overtime',
      component: () => import('../views/attendance/OvertimeList.vue'),
    },
    {
      path: '/attendance/lateness-report',
      name: 'lateness-report',
      component: () => import('../views/attendance/LatenessReport.vue'),
    },
    // İzin Yönetimi
    {
      path: '/leave-requests',
      name: 'leave-requests',
      component: () => import('../views/leave/LeaveRequestList.vue'),
    },
    {
      path: '/leave-types',
      name: 'leave-types',
      component: () => import('../views/leave/LeaveTypeList.vue'),
    },
    {
      path: '/day-types',
      name: 'day-types',
      component: () => import('../views/leave/DayTypeList.vue'),
    },
    {
      path: '/leave-balances',
      name: 'leave-balances',
      component: () => import('../views/leave/LeaveBalanceList.vue'),
    },
    {
      path: '/leave-reports',
      name: 'leave-reports',
      component: () => import('../views/leave/LeaveReports.vue'),
    },
    // Bordro İşlemleri
    {
      path: '/payroll/generate',
      name: 'payroll-generate',
      component: () => import('../views/payroll/PayrollGenerate.vue'),
    },
    {
      path: '/payroll/list',
      name: 'payroll-list',
      component: () => import('../views/payroll/PayrollList.vue'),
    },
    {
      path: '/payroll/:id',
      name: 'payroll-detail',
      component: () => import('../views/payroll/PayrollDetail.vue'),
    },
    {
      path: '/advances',
      name: 'advances',
      component: () => import('../views/payroll/AdvanceList.vue'),
    },
    {
      path: '/payroll/bonuses',
      name: 'payroll-bonuses',
      component: () => import('../views/payroll/BonusList.vue'),
    },
    // Maaş ve Ödeme Takibi
    {
      path: '/salary/parameters',
      name: 'salary-parameters',
      component: () => import('../views/salary/SalaryParameterList.vue'),
    },
    {
      path: '/salary/allowances',
      name: 'salary-allowances',
      component: () => import('../views/salary/EmployeeAllowanceList.vue'),
    },
    {
      path: '/salary/payments',
      name: 'salary-payments',
      component: () => import('../views/salary/PaymentHistoryList.vue'),
    },
    // Performans ve Değerlendirme
    {
      path: '/performance/reviews',
      name: 'performance-reviews',
      component: () => import('../views/performance/PerformanceReviewList.vue'),
    },
    {
      path: '/performance/reviews/:id',
      name: 'performance-review-detail',
      component: () => import('../views/performance/PerformanceReviewDetail.vue'),
    },
    {
      path: '/performance/calendar',
      name: 'performance-calendar',
      component: () => import('../views/performance/PerformanceCalendar.vue'),
    },
    {
      path: '/performance/reports',
      name: 'performance-reports',
      component: () => import('../views/performance/PerformanceReports.vue'),
    },
    // Eğitim ve Gelişim
    {
      path: '/training/requests',
      name: 'training-requests',
      component: () => import('../views/training/TrainingRequests.vue'),
    },
    {
      path: '/training/list',
      name: 'training-list',
      component: () => import('../views/training/TrainingList.vue'),
    },
    {
      path: '/training/certificates',
      name: 'training-certificates',
      component: () => import('../views/training/CertificateTracking.vue'),
    },
    // Disiplin ve Uyarı
    {
      path: '/disciplinary/records',
      name: 'disciplinary-records',
      component: () => import('../views/disciplinary/DisciplinaryRecords.vue'),
    },
    {
      path: '/disciplinary/tracking',
      name: 'disciplinary-tracking',
      component: () => import('../views/disciplinary/DisciplinaryTracking.vue'),
    },
    // İşten Ayrılma
    {
      path: '/offboarding/requests',
      name: 'offboarding-requests',
      component: () => import('../views/offboarding/ResignationRequests.vue'),
    },
    {
      path: '/offboarding/severance',
      name: 'offboarding-severance',
      component: () => import('../views/offboarding/SeveranceCalculator.vue'),
    },
    {
      path: '/offboarding/checklist',
      name: 'offboarding-checklist',
      component: () => import('../views/offboarding/ExitChecklist.vue'),
    },
    // Raporlar ve Analizler
    {
      path: '/reports/personnel',
      name: 'reports-personnel',
      component: () => import('../views/reports/PersonnelDistribution.vue'),
    },
    {
      path: '/reports/cost',
      name: 'reports-cost',
      component: () => import('../views/reports/PersonnelCost.vue'),
    },
    {
      path: '/reports/turnover',
      name: 'reports-turnover',
      component: () => import('../views/reports/TurnoverReport.vue'),
    },
    {
      path: '/reports/leave',
      name: 'reports-leave',
      component: () => import('../views/reports/LeaveUsageReport.vue'),
    },
    {
      path: '/reports/payroll',
      name: 'reports-payroll',
      component: () => import('../views/reports/PayrollSummary.vue'),
    },
    {
      path: '/reports/sgk',
      name: 'reports-sgk',
      component: () => import('../views/reports/SGKReports.vue'),
    },
    // Ayarlar - Rol ve Yetki
    {
      path: '/settings/roles',
      name: 'settings-roles',
      component: () => import('../views/settings/RolePermissions.vue'),
    },
    // Ayarlar - İzin Hakları
    {
      path: '/settings/leave-rights',
      name: 'settings-leave-rights',
      component: () => import('../views/settings/LeaveRights.vue'),
    },
    // Ayarlar - Genel Modül Ayarları
    {
      path: '/settings/modules',
      name: 'settings-modules',
      component: () => import('../views/settings/ModuleSettings.vue'),
    },
  ],
})

export default router
