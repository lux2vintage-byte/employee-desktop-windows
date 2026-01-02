import * as crypto from 'crypto'

/**
 * Şifreleme ve Çözme İşlemleri Utility
 * AES-256-GCM algoritması kullanır (authenticated encryption)
 */
export class EncryptionUtil {
  private algorithm = 'aes-256-gcm'
  private key: Buffer
  private readonly IV_LENGTH = 12 // GCM için önerilen IV uzunluğu
  private readonly AUTH_TAG_LENGTH = 16 // GCM auth tag uzunluğu

  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY

    if (!keyHex) {
      console.warn('ENCRYPTION_KEY .env dosyasında tanımlanmalı')
      // Geliştirme için varsayılan değer (ÜRETİMDE DEĞİŞTİR!)
      this.key = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex')
    } else {
      if (keyHex.length !== 64) {
        throw new Error('ENCRYPTION_KEY 64 karakter (32 byte hex) uzunluğunda olmalı')
      }
      this.key = Buffer.from(keyHex, 'hex')
    }
  }

  /**
   * Metni şifreler
   * Format: iv:authTag:encryptedData (hex encoded)
   */
  encrypt(text: string): string {
    if (!text) return text
    try {
      // Her şifreleme için rastgele IV üret
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      
      // IV + AuthTag + EncryptedData formatında döndür
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
      throw new Error(`Şifreleme başarısız: ${message}`)
    }
  }

  /**
   * Şifrelenmiş metni çözer
   * Format: iv:authTag:encryptedData (hex encoded)
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) {
        throw new Error('Geçersiz şifreli veri formatı')
      }

      const [ivHex, authTagHex, encrypted] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
      throw new Error(`Çözme başarısız: ${message}`)
    }
  }

  /**
   * Bir metnin şifrelenmiş olup olmadığını kontrol eder
   * GCM formatı: iv:authTag:encryptedData
   */
  isEncrypted(text: string): boolean {
    if (!text) return false
    const parts = text.split(':')
    if (parts.length !== 3) return false
    
    const [ivHex, authTagHex, encrypted] = parts
    const hexRegex = /^[0-9a-fA-F]+$/
    
    return (
      hexRegex.test(ivHex) &&
      ivHex.length === this.IV_LENGTH * 2 &&
      hexRegex.test(authTagHex) &&
      authTagHex.length === this.AUTH_TAG_LENGTH * 2 &&
      hexRegex.test(encrypted) &&
      encrypted.length > 0
    )
  }

  /**
   * Güvenli çözme - çözme başarısız olursa orijinal metni döndürür
   */
  safeDecrypt(text: string): string {
    if (!text || !this.isEncrypted(text)) return text
    try {
      return this.decrypt(text)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
      console.error(`Çözme başarısız: ${text}. Hata: ${message}`)
      return text
    }
  }

  /**
   * Metni hash'ler (SHA-256)
   */
  hash(text: string): string {
    if (!text) return text
    return crypto.createHash('sha256').update(text).digest('hex')
  }

  /**
   * Rastgele encryption key üretir (32 byte = 64 hex karakter)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Rastgele IV üretir (12 byte = 24 hex karakter, GCM için)
   */
  static generateIV(): string {
    return crypto.randomBytes(12).toString('hex')
  }
}

// Singleton instance
let instance: EncryptionUtil | null = null

export function getEncryptionUtil(): EncryptionUtil {
  if (!instance) {
    instance = new EncryptionUtil()
  }
  return instance
}

// Test için instance'ı sıfırla
export function resetEncryptionUtil(): void {
  instance = null
}

export default EncryptionUtil
