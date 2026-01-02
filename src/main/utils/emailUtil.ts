import * as nodemailer from 'nodemailer'
import { getEncryptionUtil } from './encryptionUtil'
import { PrismaClient } from '@prisma/client'

interface MailConfig {
  transport: {
    host: string | undefined
    port: number
    secure: boolean
    auth: {
      user: string | undefined
      pass: string | undefined
    }
  }
  defaults: {
    from: string
  }
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: any[]
  prisma?: PrismaClient | null
}

interface TempPasswordData {
  email: string
  firstName: string
  tempPassword: string
}

interface WelcomeEmailData {
  email: string
  name: string
  lastname: string
  password: string
}

/**
 * E-posta Gönderme Utility
 */
export class EmailUtil {
  private encryptionUtil = getEncryptionUtil()

  /**
   * Dinamik mail yapılandırması alır
   */
  async getDynamicMailerConfig(prisma: PrismaClient | null = null): Promise<MailConfig> {
    console.log('[EmailUtil] getDynamicMailerConfig: Dinamik e-posta yapılandırması alınıyor...')
    
    try {
      if (prisma && prisma.emailConfig) {
        const activeConfig = await prisma.emailConfig.findFirst({
          where: { isActive: true }
        })

        if (activeConfig) {
          console.log('[EmailUtil] getDynamicMailerConfig: Veritabanından aktif yapılandırma başarıyla alındı.')
          
          const decryptedPassword = this.encryptionUtil.safeDecrypt(activeConfig.password)
          
          if (!decryptedPassword) {
            console.error('[EmailUtil] getDynamicMailerConfig: E-posta şifresi çözülemedi!')
            throw new Error('E-posta şifresi çözülemedi.')
          }

          return {
            transport: {
              host: activeConfig.host,
              port: activeConfig.port,
              secure: activeConfig.secure,
              auth: {
                user: activeConfig.user,
                pass: decryptedPassword,
              },
            },
            defaults: {
              from: `"${activeConfig.fromName}" <${activeConfig.fromAddress}>`,
            },
          }
        }
      }
    } catch (error: any) {
      console.warn(`[EmailUtil] getDynamicMailerConfig: Hata oluştu, .env dosyasına fallback yapılıyor. Hata: ${error.message}`)
    }

    // .env'den yapılandırma al
    return {
      transport: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
      defaults: {
        from: `"${process.env.MAIL_FROM_NAME || 'Personel Yönetimi'}" <${process.env.MAIL_FROM_ADDRESS}>`,
      },
    }
  }

  /**
   * Genel e-posta gönderme fonksiyonu
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    const { to, subject, html, attachments, prisma = null } = options
    
    const config = await this.getDynamicMailerConfig(prisma)
    
    const transporter = nodemailer.createTransport({
      ...config.transport,
      requireTLS: true,
      tls: {
        ciphers: 'TLS_AES_256_GCM_SHA384',
        rejectUnauthorized: false
      }
    } as any)

    const mailOptions = {
      to,
      subject,
      html,
      attachments,
      from: config.defaults.from,
    }

    try {
      const info = await transporter.sendMail(mailOptions)
      console.log(`[EmailUtil] E-posta başarıyla gönderildi! To: ${to}, Message ID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } catch (error) {
      console.error('[EmailUtil] E-posta gönderme hatası:', error)
      throw new Error('E-posta gönderilirken bir hata oluştu.')
    }
  }

  /**
   * Geçici şifre e-postası gönderir
   */
  async sendTemporaryPasswordEmail(data: TempPasswordData, prisma: PrismaClient | null = null): Promise<void> {
    const config = await this.getDynamicMailerConfig(prisma)
    
    const transporter = nodemailer.createTransport({
      ...config.transport,
      requireTLS: true,
      tls: {
        ciphers: 'TLS_AES_256_GCM_SHA384',
        rejectUnauthorized: false
      }
    } as any)

    await transporter.sendMail({
      to: data.email,
      subject: 'Personel Yönetimi - Geçici Şifreniz',
      html: this.getTemporaryPasswordEmailTemplate(data.firstName, data.tempPassword),
      from: config.defaults.from,
    })
  }

  /**
   * Hoş geldiniz e-postası gönderir
   */
  async sendWelcomeEmail(data: WelcomeEmailData, prisma: PrismaClient | null = null): Promise<void> {
    console.log(`[EmailUtil] sendWelcomeEmail: ${data.email} adresine hoş geldiniz e-postası gönderiliyor...`)
    
    const config = await this.getDynamicMailerConfig(prisma)
    
    const transporter = nodemailer.createTransport({
      ...config.transport,
      requireTLS: true,
      tls: {
        ciphers: 'TLS_AES_256_GCM_SHA384',
        rejectUnauthorized: false
      }
    } as any)

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const htmlContent = this.getWelcomeEmailTemplate(data, frontendUrl)

    try {
      const info = await transporter.sendMail({
        to: data.email,
        subject: 'Hoş Geldiniz - Hesap Bilgileriniz',
        html: htmlContent,
        from: config.defaults.from,
      })
      console.log(`[EmailUtil] sendWelcomeEmail: E-posta başarıyla gönderildi! Message ID: ${info.messageId}`)
    } catch (error) {
      console.error('[EmailUtil] sendWelcomeEmail: E-posta gönderme hatası:', error)
      throw new Error('Hoş geldiniz e-postası gönderilirken bir hata oluştu.')
    }
  }

  // Email Templates
  getTemporaryPasswordEmailTemplate(firstName: string, tempPassword: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Geçici Şifre</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0466c8;">Geçici Şifreniz</h2>
          <p>Merhaba <strong>${firstName}</strong>,</p>
          <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
          <div style="background: #f8f9fa; border: 2px dashed #0466c8; padding: 15px; text-align: center; margin: 20px 0;">
            <span style="font-family: monospace; font-size: 24px; letter-spacing: 2px;">${tempPassword}</span>
          </div>
          <p><strong>Önemli:</strong> Bu şifre ile giriş yaptıktan sonra lütfen şifrenizi değiştiriniz.</p>
        </div>
      </body>
      </html>
    `
  }

  getWelcomeEmailTemplate(data: WelcomeEmailData, frontendUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hoş Geldiniz</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: #0466c8; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Hoş Geldiniz!</h1>
          </div>
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px;">Merhaba <strong>${data.name} ${data.lastname}</strong>,</p>
            <p>Hesabınız başarıyla oluşturuldu!</p>
            <div style="background: #f8f9fa; border-left: 4px solid #0466c8; padding: 20px; margin: 30px 0;">
              <h3 style="margin: 0 0 15px 0; color: #0466c8;">Giriş Bilgileriniz</h3>
              <p><strong>E-posta:</strong> ${data.email}</p>
              <p><strong>Şifre:</strong> <code style="background: #e9ecef; padding: 5px 10px;">${data.password}</code></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}" style="display: inline-block; background: #0466c8; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px;">Giriş Yap</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

// Singleton instance
let instance: EmailUtil | null = null

export function getEmailUtil(): EmailUtil {
  if (!instance) {
    instance = new EmailUtil()
  }
  return instance
}

export default EmailUtil
