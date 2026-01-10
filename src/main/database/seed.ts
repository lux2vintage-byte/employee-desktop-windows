import { PrismaDatabaseManager, getPrismaClient } from './prisma-manager';
import { DatabaseService } from './database-service';
import * as log from 'electron-log';

// Services
import { LeaveTypeService } from '../services/LeaveTypeService';
import { SettingsService } from '../services/SettingsService';
import { LeaveTypeRepository } from '../repositories/LeaveTypeRepository';
import { ParameterTypeRepository } from '../repositories/ParameterTypeRepository';
import { SalaryParameterRepository } from '../repositories/SalaryParameterRepository';
import { PayrollColumnMappingRepository } from '../repositories/PayrollColumnMappingRepository';
import { PayrollFormulaVariableRepository } from '../repositories/PayrollFormulaVariableRepository';

/**
 * Veritabanı seed işlemleri
 * Geliştirme ve test için örnek veriler oluşturur
 * 
 * Requirements: 9.6, 20.4
 */
async function seed() {
  try {
    log.info('Veritabanı seed işlemi başlatılıyor...');

    // Database Manager'ı başlat
    const dbManager = PrismaDatabaseManager.getInstance();
    await dbManager.initialize();

    const prisma = getPrismaClient();
    const dbService = new DatabaseService();

    // Mevcut verileri temizle (sadece geliştirme modunda)
    if (process.env.NODE_ENV === 'development') {
      await dbManager.clearDatabase();
      log.info('Mevcut veriler temizlendi');
    }

    // ==================== VARSAYILAN İZİN TÜRLERİ ====================
    // Requirements: 9.6
    log.info('Varsayılan izin türleri oluşturuluyor...');
    const leaveTypeRepo = new LeaveTypeRepository(prisma);
    const leaveTypeService = new LeaveTypeService(leaveTypeRepo);
    
    const createdLeaveTypes = await leaveTypeService.seedDefaults();
    log.info(`${createdLeaveTypes.length} varsayılan izin türü oluşturuldu`);

    // ==================== VARSAYILAN AYARLAR ====================
    // Requirements: 20.4
    log.info('Varsayılan sistem ayarları oluşturuluyor...');
    const settingsService = new SettingsService(prisma);
    
    const seededSettingsCount = await settingsService.seedDefaults();
    log.info(`${seededSettingsCount} varsayılan ayar oluşturuldu`);

    // ==================== PARAMETRE TÜRLERİ ====================
    log.info('Varsayılan parametre türleri oluşturuluyor...');
    const parameterTypeRepo = new ParameterTypeRepository(prisma);
    const createdParameterTypes = await parameterTypeRepo.seedDefaults();
    log.info(`${createdParameterTypes.length} varsayılan parametre türü oluşturuldu`);

    // ==================== BORDRO PARAMETRELERİ (2025) ====================
    log.info('2025 yılı bordro parametreleri oluşturuluyor...');
    const salaryParameterRepo = new SalaryParameterRepository(prisma);
    const createdSalaryParameters = await salaryParameterRepo.seedDefaultParameters(2025);
    log.info(`${createdSalaryParameters.length} varsayılan bordro parametresi oluşturuldu`);

    // ==================== BORDRO KOLON MAPPING'LERİ ====================
    log.info('Bordro kolon eşleştirmeleri oluşturuluyor...');
    const columnMappingRepo = new PayrollColumnMappingRepository(prisma);
    const createdMappings = await columnMappingRepo.seedDefaultMappings();
    log.info(`${createdMappings.length} varsayılan kolon eşleştirmesi oluşturuldu`);

    // ==================== BORDRO FORMÜL DEĞİŞKENLERİ ====================
    log.info('Bordro formül değişkenleri oluşturuluyor...');
    const formulaVariableRepo = new PayrollFormulaVariableRepository(prisma);
    const createdVariables = await formulaVariableRepo.seedDefaultVariables();
    log.info(`${createdVariables.length} varsayılan formül değişkeni oluşturuldu`);

    // ==================== SİSTEM KONFİGÜRASYONLARI ====================
    await dbService.setConfig('app_version', '1.0.0');
    await dbService.setConfig('app_name', 'Personel Yönetimi');
    await dbService.setConfig('company_name', 'Örnek Şirket A.Ş.');
    await dbService.setConfig('theme', 'light');
    await dbService.setConfig('language', 'tr');
    
    log.info('Sistem konfigürasyonları oluşturuldu');

    // ==================== ÖRNEK VERİLER (OPSIYONEL) ====================
    if (process.env.SEED_TEST_DATA === 'true' || process.env.NODE_ENV === 'development') {
      await seedTestData(prisma);
    }

    // İstatistikleri göster
    const stats = await dbService.getStats();
    log.info('Seed işlemi tamamlandı:', stats);

    // Bağlantıyı kapat
    await dbManager.close();

  } catch (error) {
    log.error('Seed işlemi hatası:', error);
    process.exit(1);
  }
}

/**
 * Test verileri oluştur (opsiyonel)
 */
async function seedTestData(prisma: any) {
  log.info('Test verileri oluşturuluyor...');

  // ==================== DEPARTMANLAR ====================
  const departments = await prisma.department.createMany({
    data: [
      { name: 'Bilgi İşlem', costCenterCode: 'IT001' },
      { name: 'İnsan Kaynakları', costCenterCode: 'HR001' },
      { name: 'Muhasebe', costCenterCode: 'FIN001' },
      { name: 'Pazarlama', costCenterCode: 'MKT001' },
      { name: 'Satış', costCenterCode: 'SLS001' }
    ],
    skipDuplicates: true
  });
  log.info(`${departments.count} departman oluşturuldu`);

  // Departmanları getir
  const deptList = await prisma.department.findMany();
  const itDept = deptList.find((d: any) => d.name === 'Bilgi İşlem');
  const hrDept = deptList.find((d: any) => d.name === 'İnsan Kaynakları');
  const finDept = deptList.find((d: any) => d.name === 'Muhasebe');
  const mktDept = deptList.find((d: any) => d.name === 'Pazarlama');

  // ==================== POZİSYONLAR ====================
  if (itDept && hrDept && finDept && mktDept) {
    const positions = await prisma.position.createMany({
      data: [
        { title: 'Yazılım Geliştirici', departmentId: itDept.id, baseSalaryMin: 12000, baseSalaryMax: 25000 },
        { title: 'Kıdemli Yazılım Geliştirici', departmentId: itDept.id, baseSalaryMin: 20000, baseSalaryMax: 40000 },
        { title: 'Proje Yöneticisi', departmentId: itDept.id, baseSalaryMin: 25000, baseSalaryMax: 50000 },
        { title: 'İK Uzmanı', departmentId: hrDept.id, baseSalaryMin: 10000, baseSalaryMax: 20000 },
        { title: 'İK Müdürü', departmentId: hrDept.id, baseSalaryMin: 20000, baseSalaryMax: 35000 },
        { title: 'Muhasebe Uzmanı', departmentId: finDept.id, baseSalaryMin: 10000, baseSalaryMax: 18000 },
        { title: 'Pazarlama Uzmanı', departmentId: mktDept.id, baseSalaryMin: 12000, baseSalaryMax: 22000 }
      ],
      skipDuplicates: true
    });
    log.info(`${positions.count} pozisyon oluşturuldu`);
  }

  // ==================== EĞİTİMLER ====================
  const trainings = await prisma.training.createMany({
    data: [
      { title: 'İş Güvenliği Eğitimi', provider: 'İç Eğitim', durationHours: 8, category: 'Zorunlu' },
      { title: 'TypeScript İleri Seviye', provider: 'Udemy', durationHours: 20, category: 'Teknik' },
      { title: 'Proje Yönetimi', provider: 'PMI', durationHours: 40, category: 'Yönetim' },
      { title: 'İletişim Becerileri', provider: 'İç Eğitim', durationHours: 4, category: 'Soft Skills' }
    ],
    skipDuplicates: true
  });
  log.info(`${trainings.count} eğitim oluşturuldu`);

  log.info('Test verileri başarıyla oluşturuldu');
}

/**
 * Sadece varsayılan verileri seed et (izin türleri ve ayarlar)
 * Production ortamı için güvenli
 */
async function seedDefaultsOnly() {
  try {
    log.info('Varsayılan veriler seed ediliyor...');

    const dbManager = PrismaDatabaseManager.getInstance();
    await dbManager.initialize();

    const prisma = getPrismaClient();

    // Varsayılan izin türleri
    const leaveTypeRepo = new LeaveTypeRepository(prisma);
    const leaveTypeService = new LeaveTypeService(leaveTypeRepo);
    const createdLeaveTypes = await leaveTypeService.seedDefaults();
    log.info(`${createdLeaveTypes.length} varsayılan izin türü oluşturuldu`);

    // Varsayılan ayarlar
    const settingsService = new SettingsService(prisma);
    const seededSettingsCount = await settingsService.seedDefaults();
    log.info(`${seededSettingsCount} varsayılan ayar oluşturuldu`);

    // Varsayılan parametre türleri
    const parameterTypeRepo = new ParameterTypeRepository(prisma);
    const createdParameterTypes = await parameterTypeRepo.seedDefaults();
    log.info(`${createdParameterTypes.length} varsayılan parametre türü oluşturuldu`);

    // Varsayılan bordro parametreleri (güncel yıl)
    const currentYear = new Date().getFullYear();
    const salaryParameterRepo = new SalaryParameterRepository(prisma);
    const createdSalaryParameters = await salaryParameterRepo.seedDefaultParameters(currentYear);
    log.info(`${createdSalaryParameters.length} varsayılan bordro parametresi oluşturuldu (${currentYear} yılı)`);

    // Varsayılan bordro kolon eşleştirmeleri
    const columnMappingRepo = new PayrollColumnMappingRepository(prisma);
    const createdMappings = await columnMappingRepo.seedDefaultMappings();
    log.info(`${createdMappings.length} varsayılan kolon eşleştirmesi oluşturuldu`);

    // Varsayılan formül değişkenleri
    const formulaVariableRepo = new PayrollFormulaVariableRepository(prisma);
    const createdVariables = await formulaVariableRepo.seedDefaultVariables();
    log.info(`${createdVariables.length} varsayılan formül değişkeni oluşturuldu`);

    await dbManager.close();
    log.info('Varsayılan veriler başarıyla seed edildi');

  } catch (error) {
    log.error('Varsayılan veri seed hatası:', error);
    process.exit(1);
  }
}

// Eğer bu dosya doğrudan çalıştırılıyorsa seed işlemini başlat
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--defaults-only')) {
    seedDefaultsOnly();
  } else {
    seed();
  }
}

export { seed, seedDefaultsOnly, seedTestData };
