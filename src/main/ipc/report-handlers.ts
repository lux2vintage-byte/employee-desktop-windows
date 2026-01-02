import { ipcMain } from 'electron'
import { ReportController } from '../controllers/ReportController'

let reportController: ReportController | null = null

export function initializeReportController(): void {
  reportController = new ReportController()
}

export function setupReportHandlers(): void {
  if (!reportController) {
    initializeReportController()
  }

  // ==================== PERSONEL DAĞILIM RAPORU ====================
  
  ipcMain.handle('report-employee-distribution', async () => {
    return reportController!.getEmployeeDistribution()
  })

  ipcMain.handle('report-distribution-by-department', async () => {
    return reportController!.getDistributionByDepartment()
  })

  ipcMain.handle('report-distribution-by-gender', async () => {
    return reportController!.getDistributionByGender()
  })

  ipcMain.handle('report-distribution-by-age', async () => {
    return reportController!.getDistributionByAge()
  })

  // ==================== PERSONEL MALİYET RAPORU ====================

  ipcMain.handle('report-monthly-cost', async (_event, year: number, month: number) => {
    return reportController!.getMonthlyCostReport(year, month)
  })

  ipcMain.handle('report-yearly-cost', async (_event, year: number) => {
    return reportController!.getYearlyCostReport(year)
  })

  // ==================== TURNOVER RAPORU ====================

  ipcMain.handle('report-turnover', async (_event, year: number) => {
    return reportController!.getTurnoverReport(year)
  })

  // ==================== İZİN KULLANIM RAPORU ====================

  ipcMain.handle('report-leave-usage', async (_event, year: number) => {
    return reportController!.getLeaveUsageReport(year)
  })

  // ==================== BORDRO ÖZET RAPORU ====================

  ipcMain.handle('report-payroll-summary', async (_event, year: number, month?: number) => {
    return reportController!.getPayrollSummaryReport(year, month)
  })

  // ==================== SGK / İŞKUR RAPORLARI ====================

  ipcMain.handle('report-sgk', async (_event, year: number, month: number) => {
    return reportController!.getSGKReport(year, month)
  })

  ipcMain.handle('report-iskur', async (_event, year: number, month: number) => {
    return reportController!.getIskurReport(year, month)
  })
}
