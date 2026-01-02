import * as fc from 'fast-check'
import { ValidationUtils } from '../../../src/main/utils/validation'

/**
 * Feature: personel-veritabani-modulleri
 * Property 10: TC Identity Number Validation
 * Validates: Requirements 4.4
 * 
 * Herhangi bir geçerli TC Kimlik No için, 11 haneli olmalı ve checksum algoritması 
 * doğrulanmalıdır. Geçersiz numaralar reddedilmelidir.
 */
describe('TC Kimlik No Validation Property Tests', () => {
  /**
   * Helper function to generate a valid TC Kimlik No
   * TC Kimlik No rules:
   * 1. 11 digits
   * 2. First digit cannot be 0
   * 3. 10th digit = ((sum of odd positions * 7) - sum of even positions) mod 10
   * 4. 11th digit = sum of first 10 digits mod 10
   */
  function generateValidTCKimlikNo(first9Digits: number[]): string {
    // Calculate 10th digit
    const oddSum = first9Digits[0] + first9Digits[2] + first9Digits[4] + first9Digits[6] + first9Digits[8]
    const evenSum = first9Digits[1] + first9Digits[3] + first9Digits[5] + first9Digits[7]
    let tenthDigit = ((oddSum * 7) - evenSum) % 10
    if (tenthDigit < 0) tenthDigit += 10

    // Calculate 11th digit
    const first10Sum = first9Digits.reduce((sum, d) => sum + d, 0) + tenthDigit
    const eleventhDigit = first10Sum % 10

    return [...first9Digits, tenthDigit, eleventhDigit].join('')
  }

  /**
   * Arbitrary for generating valid TC Kimlik numbers
   */
  const validTCKimlikArbitrary = fc.tuple(
    fc.integer({ min: 1, max: 9 }), // First digit (1-9, cannot be 0)
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 }),
    fc.integer({ min: 0, max: 9 })
  ).map(digits => generateValidTCKimlikNo(digits))

  /**
   * Property 10: Valid TC Kimlik numbers should pass validation
   * For any valid TC Kimlik No generated with correct checksum, validation should return true
   */
  it('should accept all valid TC Kimlik numbers (Property 10)', () => {
    fc.assert(
      fc.property(validTCKimlikArbitrary, (tcKimlikNo) => {
        const result = ValidationUtils.validateTCKimlikNo(tcKimlikNo)
        return result.isValid === true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: TC Kimlik numbers with wrong length should be rejected
   */
  it('should reject TC Kimlik numbers with wrong length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }).filter(s => s.length !== 11),
        (invalidLength) => {
          const result = ValidationUtils.validateTCKimlikNo(invalidLength)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: TC Kimlik numbers starting with 0 should be rejected
   */
  it('should reject TC Kimlik numbers starting with 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
          .map(digits => '0' + digits.join('')),
        (startsWithZero) => {
          const result = ValidationUtils.validateTCKimlikNo(startsWithZero)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: TC Kimlik numbers with non-digit characters should be rejected
   */
  it('should reject TC Kimlik numbers with non-digit characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 11, maxLength: 11 }).filter(s => !/^\d{11}$/.test(s)),
        (nonDigit) => {
          const result = ValidationUtils.validateTCKimlikNo(nonDigit)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: TC Kimlik numbers with invalid 10th digit checksum should be rejected
   */
  it('should reject TC Kimlik numbers with invalid 10th digit checksum', () => {
    fc.assert(
      fc.property(
        validTCKimlikArbitrary,
        fc.integer({ min: 1, max: 9 }), // offset to corrupt the 10th digit
        (validTCKimlik, offset) => {
          const digits = validTCKimlik.split('').map(Number)
          // Corrupt the 10th digit
          digits[9] = (digits[9] + offset) % 10
          const corruptedTCKimlik = digits.join('')
          
          const result = ValidationUtils.validateTCKimlikNo(corruptedTCKimlik)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: TC Kimlik numbers with invalid 11th digit checksum should be rejected
   */
  it('should reject TC Kimlik numbers with invalid 11th digit checksum', () => {
    fc.assert(
      fc.property(
        validTCKimlikArbitrary,
        fc.integer({ min: 1, max: 9 }), // offset to corrupt the 11th digit
        (validTCKimlik, offset) => {
          const digits = validTCKimlik.split('').map(Number)
          // Corrupt the 11th digit
          digits[10] = (digits[10] + offset) % 10
          const corruptedTCKimlik = digits.join('')
          
          const result = ValidationUtils.validateTCKimlikNo(corruptedTCKimlik)
          return result.isValid === false
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10: Empty or null TC Kimlik numbers should be rejected
   */
  it('should reject empty or whitespace-only TC Kimlik numbers', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\t', '\n', '   '),
        (emptyOrWhitespace) => {
          const result = ValidationUtils.validateTCKimlikNo(emptyOrWhitespace)
          return result.isValid === false
        }
      ),
      { numRuns: 6 }
    )
  })

  /**
   * Property 10: isValidTCKimlikNo should return same result as validateTCKimlikNo.isValid
   */
  it('should have consistent results between validateTCKimlikNo and isValidTCKimlikNo', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validTCKimlikArbitrary,
          fc.string({ minLength: 0, maxLength: 20 })
        ),
        (tcKimlikNo) => {
          const validateResult = ValidationUtils.validateTCKimlikNo(tcKimlikNo)
          const isValidResult = ValidationUtils.isValidTCKimlikNo(tcKimlikNo)
          return validateResult.isValid === isValidResult
        }
      ),
      { numRuns: 100 }
    )
  })
})
