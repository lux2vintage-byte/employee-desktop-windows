import * as crypto from 'crypto'

/**
 * Password Utilities
 */
export class PasswordUtils {
  /**
   * Şifre hashleme (bcrypt yerine crypto kullanıyoruz - Electron uyumluluğu için)
   */
  static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex')
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(`${salt}:${derivedKey.toString('hex')}`)
      })
    })
  }

  /**
   * Şifre karşılaştırma
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hashedPassword.split(':')
      crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err)
        resolve(key === derivedKey.toString('hex'))
      })
    })
  }

  /**
   * Şifrenin hashlenmiş olup olmadığını kontrol et
   */
  static isPasswordHashed(password: string): boolean {
    if (!password) return false
    const parts = password.split(':')
    if (parts.length !== 2) return false
    return parts[0].length === 32 && parts[1].length === 128
  }

  /**
   * Rastgele token oluştur
   */
  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }
}

export default PasswordUtils
