import { PrismaClient } from '@prisma/client'
import { PasswordUtils } from '../utils/password'

/**
 * Admin Seeder
 * Uygulama başladığında admin kullanıcısını kontrol eder ve yoksa oluşturur
 */
export class AdminSeeder {
  private prisma: PrismaClient
  private seedExecuted: boolean = false

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Uygulama başladığında çağrılır
   */
  async onApplicationBootstrap(): Promise<any> {
    if (!this.seedExecuted) {
      this.seedExecuted = true
      return await this.initializeAdmin()
    }
  }

  /**
   * Seed işlemini çağıran public metod
   */
  async seed(): Promise<any> {
    return await this.initializeAdmin()
  }

  /**
   * Admin kullanıcısını veritabanında oluşturur
   */
  async initializeAdmin(): Promise<any> {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@personel.com'
      const plainPassword = process.env.ADMIN_PASSWORD || 'Admin123!'
      const adminName = process.env.ADMIN_NAME || 'Admin'
      const adminLastName = process.env.ADMIN_LASTNAME || 'Kullanıcı'

      // Veritabanında herhangi bir admin rolüne sahip kullanıcı var mı kontrol et
      const existingAdmin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' }
      })

      if (existingAdmin) {
        console.log('✅ Sistemde zaten bir Admin kullanıcısı mevcut:', existingAdmin.email)
        return existingAdmin
      }

      // Veritabanında belirtilen email ile kullanıcı var mı kontrol et
      const existingUser = await this.prisma.user.findUnique({
        where: { email: adminEmail }
      })

      if (!existingUser) {
        console.log('Admin kullanıcısı bulunamadı, oluşturuluyor...')

        // Şifre hash'leme
        const hashedPassword = await PasswordUtils.hashPassword(plainPassword)

        // Admin kullanıcısı verilerini hazırla
        const adminData = {
          companyname: 'Personel Yönetimi Admin',
          name: adminName,
          lastname: adminLastName,
          taxoffice: 'Admin Vergi Dairesi',
          taxnumber: '1234567890',
          type: 'CORPORATE',
          email: adminEmail,
          password: hashedPassword,
          phone: '+90 555 000 00 00',
          role: 'ADMIN',
          isVerified: true,
          verified: new Date(),
          discountRate: 0
        }

        // Admin kullanıcısını oluştur
        const admin = await this.prisma.user.create({
          data: adminData
        })

        console.log(`✅ Admin kullanıcısı başarıyla oluşturuldu: ${adminEmail}`)
        console.log(`📧 E-posta: ${adminEmail}`)
        console.log(`🔑 Şifre: ${plainPassword}`)
        console.log('⚠️  Güvenlik için şifrenizi değiştirmeyi unutmayın!')

        return admin
      } else {
        console.log('✅ Admin kullanıcısı zaten mevcut:', adminEmail)
        return existingUser
      }
    } catch (error: any) {
      console.error('❌ Admin oluşturulurken hata:', error.message)
      throw error
    }
  }

  /**
   * Test kullanıcıları oluşturur (development için)
   */
  async createTestUsers(): Promise<void> {
    try {
      const testUsers = [
        {
          companyname: 'Test Şirketi A.Ş.',
          name: 'Test',
          lastname: 'Kullanıcı',
          taxoffice: 'Test Vergi Dairesi',
          taxnumber: '1111111111',
          type: 'CORPORATE',
          email: 'test@personel.com',
          password: await PasswordUtils.hashPassword('Test123!'),
          phone: '+90 555 111 11 11',
          role: 'USER',
          isVerified: true,
          verified: new Date(),
          discountRate: 5
        }
      ]

      for (const userData of testUsers) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: userData.email }
        })

        if (!existingUser) {
          await this.prisma.user.create({ data: userData })
          console.log(`✅ Test kullanıcısı oluşturuldu: ${userData.email}`)
        }
      }
    } catch (error: any) {
      console.error('❌ Test kullanıcıları oluşturulurken hata:', error.message)
    }
  }

  /**
   * Tüm seed işlemlerini çalıştırır
   */
  async runAllSeeds(): Promise<void> {
    console.log('🌱 Seed işlemleri başlatılıyor...')
    await this.initializeAdmin()

    if (process.env.NODE_ENV === 'development') {
      await this.createTestUsers()
    }

    console.log('✅ Tüm seed işlemleri tamamlandı')
  }
}

export default AdminSeeder
