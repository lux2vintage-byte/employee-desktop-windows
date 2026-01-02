import * as fc from 'fast-check'
import { ValidationUtils } from '../../../src/main/utils/validation'

/**
 * Feature: personel-veritabani-modulleri
 * Property 12: IBAN Format Validation
 * Validates: Requirements 5.9
 * 
 * Herhangi bir Türk IBAN'ı için, "TR" ile başlamalı ve ardından 24 rakam gelmelidir.
 * Geçersiz formatlar reddedilmelidir.
 */
describe('IBAN Validation Property Tests', () => {
  /**
   * Helper function to calculate IBAN check digits
   * Turkish IBAN structure: TR + 2 check digits + 22 BBAN = 26 characters
   * BBAN: 5 bank code + 1 reserved (0) + 16 account number = 22 digits
   */
  function calculateIBANCheckDigits(bban: string): string {
    // bban should be 22 digits
    const rearranged = bban + '292700' // TR = 29 27, 00 for check digits
    
    // Calculate mod 97
    let remainder = 0
    for (const digit of rearranged) {
      remainder = (remainder * 10 + parseInt(digit, 10)) % 97
    }
    
    const checkDigits = (98 - remainder).toString().padStart(2, '0')
    return 'TR' + checkDigits + bban
  }

  /**
   * Arbitrary for generating valid Turkish IBANs
   * BBAN = 22 digits (5 bank + 1 reserved + 16 account)
   */
  const validIBANArbitrary = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 22, maxLength: 22 })
    .map(arr => arr.join(''))
    .map(bban => calculateIBANCheckDigits(bban))

  /**
   * Property 12: Valid Turkish IBANs should pass validation
   */
  it('should accept all valid Turkish IBANs (Property 12)', () => {
    fc.assert(
      fc.property(validIBANArbitrary, (iban) => {
        const result = ValidationUtils.validateIBAN(iban)
        return result.isValid === true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: IBANs with wrong length should be rejected
   */
  it('should reject IBANs with wrong length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 }).filter(s => s.replace(/\s/g, '').length !== 26),
        (invalidLength) => {
          const result = ValidationUtils.validateIBAN(invalidLength)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: IBANs not starting with TR should be rejected
   */
  it('should reject IBANs not starting with TR', () => {
    const nonTRPrefixes = ['DE', 'FR', 'GB', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'PL']
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom(...nonTRPrefixes),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 24, maxLength: 24 }).map(arr => arr.join(''))
        ).map(([prefix, digits]) => prefix + digits),
        (nonTRIban) => {
          const result = ValidationUtils.validateIBAN(nonTRIban)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: IBANs with non-digit characters after TR should be rejected
   */
  it('should reject IBANs with non-digit characters after TR', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 24, maxLength: 24 }).filter(s => !/^\d{24}$/.test(s))
          .map(s => 'TR' + s),
        (invalidChars) => {
          const result = ValidationUtils.validateIBAN(invalidChars)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: IBANs with invalid checksum should be rejected
   * 
   * Instead of modifying check digits (which might accidentally create valid IBANs),
   * we modify the BBAN part while keeping the original check digits.
   * This guarantees an invalid checksum.
   */
  it('should reject IBANs with invalid checksum', () => {
    fc.assert(
      fc.property(
        validIBANArbitrary,
        fc.integer({ min: 0, max: 21 }), // Position in BBAN to modify
        fc.integer({ min: 1, max: 9 }),  // Amount to add (1-9 to ensure change)
        (validIBAN, position, delta) => {
          // Get the BBAN part (after TR and check digits)
          const checkDigits = validIBAN.substring(2, 4)
          const bban = validIBAN.substring(4)
          
          // Modify one digit in the BBAN
          const originalDigit = parseInt(bban[position], 10)
          const newDigit = (originalDigit + delta) % 10
          
          // If the digit didn't change, skip this test case
          if (newDigit === originalDigit) {
            return true
          }
          
          // Create corrupted BBAN
          const corruptedBBAN = bban.substring(0, position) + newDigit.toString() + bban.substring(position + 1)
          
          // Create corrupted IBAN with original check digits (now invalid)
          const corruptedIBAN = 'TR' + checkDigits + corruptedBBAN
          
          const result = ValidationUtils.validateIBAN(corruptedIBAN)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: Empty or null IBANs should be rejected
   */
  it('should reject empty or whitespace-only IBANs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\t', '\n', '   '),
        (emptyOrWhitespace) => {
          const result = ValidationUtils.validateIBAN(emptyOrWhitespace)
          return result.isValid === false
        }
      ),
      { numRuns: 6 }
    )
  })

  /**
   * Property 12: IBANs with spaces should be handled (spaces removed)
   */
  it('should accept valid IBANs with spaces', () => {
    fc.assert(
      fc.property(validIBANArbitrary, (iban) => {
        const withSpaces = iban.substring(0, 4) + ' ' + iban.substring(4, 8) + ' ' + 
                          iban.substring(8, 12) + ' ' + iban.substring(12, 16) + ' ' +
                          iban.substring(16, 20) + ' ' + iban.substring(20, 24) + ' ' +
                          iban.substring(24)
        const result = ValidationUtils.validateIBAN(withSpaces)
        return result.isValid === true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: Lowercase TR prefix should be accepted (case insensitive)
   */
  it('should accept valid IBANs with lowercase prefix', () => {
    fc.assert(
      fc.property(validIBANArbitrary, (iban) => {
        const lowercaseIBAN = 'tr' + iban.substring(2)
        const result = ValidationUtils.validateIBAN(lowercaseIBAN)
        return result.isValid === true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: isValidIBAN should return same result as validateIBAN.isValid
   */
  it('should have consistent results between validateIBAN and isValidIBAN', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validIBANArbitrary,
          fc.string({ minLength: 0, maxLength: 30 })
        ),
        (iban) => {
          const validateResult = ValidationUtils.validateIBAN(iban)
          const isValidResult = ValidationUtils.isValidIBAN(iban)
          return validateResult.isValid === isValidResult
        }
      ),
      { numRuns: 100 }
    )
  })
})
