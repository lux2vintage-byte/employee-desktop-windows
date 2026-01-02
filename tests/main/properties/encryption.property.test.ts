import * as fc from 'fast-check'
import { EncryptionUtil, resetEncryptionUtil } from '../../../src/main/utils/encryptionUtil'

/**
 * Feature: personel-veritabani-modulleri
 * Property 4: Sensitive Data Encryption Round-Trip
 * Validates: Requirements 1.9, 4.5, 5.3, 5.4
 * 
 * Herhangi bir hassas veri (identity_number, iban, social_security_number) için,
 * şifreleme sonrası çözme işlemi orijinal değeri döndürmelidir: decrypt(encrypt(x)) == x
 */
describe('Encryption Round-Trip Property Tests', () => {
  let encryptionUtil: EncryptionUtil

  beforeEach(() => {
    resetEncryptionUtil()
    encryptionUtil = new EncryptionUtil()
  })

  /**
   * Property 4: Sensitive Data Encryption Round-Trip
   * For any string, decrypt(encrypt(x)) === x
   */
  it('should decrypt to original value for any string (Property 4)', () => {
    fc.assert(
      fc.property(fc.string(), (plainText) => {
        // Empty strings are returned as-is
        if (plainText === '') {
          const encrypted = encryptionUtil.encrypt(plainText)
          return encrypted === plainText
        }

        const encrypted = encryptionUtil.encrypt(plainText)
        const decrypted = encryptionUtil.decrypt(encrypted)
        return decrypted === plainText
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4: Round-trip for TC Kimlik No format (11 digits)
   * Validates: Requirements 4.5
   */
  it('should round-trip TC Kimlik No format correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 11, maxLength: 11 })
          .map((arr: string[]) => arr.join('')),
        (tcKimlikNo: string) => {
          const encrypted = encryptionUtil.encrypt(tcKimlikNo)
          const decrypted = encryptionUtil.decrypt(encrypted)
          return decrypted === tcKimlikNo
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4: Round-trip for IBAN format (TR + 24 digits)
   * Validates: Requirements 5.3
   */
  it('should round-trip IBAN format correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 24, maxLength: 24 })
          .map((arr: string[]) => `TR${arr.join('')}`),
        (iban: string) => {
          const encrypted = encryptionUtil.encrypt(iban)
          const decrypted = encryptionUtil.decrypt(encrypted)
          return decrypted === iban
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4: Round-trip for SGK No format
   * Validates: Requirements 5.4
   */
  it('should round-trip SGK No format correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 10, maxLength: 15 })
          .map((arr: string[]) => arr.join('')),
        (sgkNo: string) => {
          const encrypted = encryptionUtil.encrypt(sgkNo)
          const decrypted = encryptionUtil.decrypt(encrypted)
          return decrypted === sgkNo
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Encrypted text should be different from original
   */
  it('should produce different output than input for non-empty strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (plainText) => {
          const encrypted = encryptionUtil.encrypt(plainText)
          return encrypted !== plainText
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Each encryption should produce different ciphertext (due to random IV)
   */
  it('should produce different ciphertext for same plaintext (random IV)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (plainText) => {
          const encrypted1 = encryptionUtil.encrypt(plainText)
          const encrypted2 = encryptionUtil.encrypt(plainText)
          // Different ciphertexts due to random IV
          return encrypted1 !== encrypted2
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: isEncrypted should correctly identify encrypted text
   */
  it('should correctly identify encrypted text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (plainText) => {
          const encrypted = encryptionUtil.encrypt(plainText)
          return encryptionUtil.isEncrypted(encrypted) === true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: isEncrypted should return false for plain text
   */
  it('should return false for plain text in isEncrypted', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.includes(':')), // Exclude strings with colons
        (plainText) => {
          return encryptionUtil.isEncrypted(plainText) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Hash should be deterministic
   */
  it('should produce same hash for same input', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          if (text === '') return true
          const hash1 = encryptionUtil.hash(text)
          const hash2 = encryptionUtil.hash(text)
          return hash1 === hash2
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Different inputs should produce different hashes (collision resistance)
   */
  it('should produce different hashes for different inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (text1, text2) => {
          if (text1 === text2) return true
          const hash1 = encryptionUtil.hash(text1)
          const hash2 = encryptionUtil.hash(text2)
          return hash1 !== hash2
        }
      ),
      { numRuns: 100 }
    )
  })
})
