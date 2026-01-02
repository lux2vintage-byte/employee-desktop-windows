import * as fc from 'fast-check'
import { ValidationUtils } from '../../../src/main/utils/validation'

/**
 * Feature: personel-veritabani-modulleri
 * Property 11: Enum Value Enforcement
 * Validates: Requirements 4.6, 4.7, 5.5-5.8, 6.2, 7.3, 8.2, 10.2, 15.2, 16.2, 17.3, 18.2, 18.3, 19.2, 19.3
 * 
 * Herhangi bir enum alanı için (contract_type, status, blood_group, gender, marital_status, 
 * military_status, document_type, attendance_status, approval_status, leave_status, 
 * violation_type, action_taken, reason_category), sadece tanımlı değerler kabul edilmelidir.
 */
describe('Enum Validation Property Tests', () => {
  /**
   * Helper to generate invalid enum values
   * Generates random strings that are NOT in the valid values array
   */
  function invalidEnumArbitrary(validValues: readonly string[]): fc.Arbitrary<string> {
    return fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => !validValues.includes(s))
  }

  /**
   * Generic test for enum validation
   */
  function testEnumValidation(
    enumName: string,
    validValues: readonly string[],
    validateFn: (value: string) => { isValid: boolean; error?: string },
    isValidFn: (value: string) => boolean
  ) {
    describe(`${enumName} Validation`, () => {
      /**
       * Property 11: All valid enum values should pass validation
       */
      it(`should accept all valid ${enumName} values`, () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...validValues),
            (value) => {
              const result = validateFn(value)
              return result.isValid === true
            }
          ),
          { numRuns: validValues.length * 2 }
        )
      })

      /**
       * Property 11: Invalid enum values should be rejected
       */
      it(`should reject invalid ${enumName} values`, () => {
        fc.assert(
          fc.property(
            invalidEnumArbitrary(validValues),
            (value) => {
              const result = validateFn(value)
              return result.isValid === false
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * Property 11: Empty values should be rejected
       */
      it(`should reject empty ${enumName} values`, () => {
        fc.assert(
          fc.property(
            fc.constantFrom('', null as unknown as string, undefined as unknown as string),
            (value) => {
              const result = validateFn(value)
              return result.isValid === false
            }
          ),
          { numRuns: 3 }
        )
      })

      /**
       * Property 11: isValid function should match validate function
       */
      it(`should have consistent results between validate and isValid for ${enumName}`, () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.constantFrom(...validValues),
              fc.string({ minLength: 0, maxLength: 50 })
            ),
            (value) => {
              const validateResult = validateFn(value)
              const isValidResult = isValidFn(value)
              return validateResult.isValid === isValidResult
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  }

  // ==================== CONTRACT TYPE (Requirement 4.6) ====================
  testEnumValidation(
    'ContractType',
    ValidationUtils.ENUMS.CONTRACT_TYPE,
    ValidationUtils.validateContractType.bind(ValidationUtils),
    ValidationUtils.isValidContractType.bind(ValidationUtils)
  )

  // ==================== EMPLOYEE STATUS (Requirement 4.7) ====================
  testEnumValidation(
    'EmployeeStatus',
    ValidationUtils.ENUMS.EMPLOYEE_STATUS,
    ValidationUtils.validateEmployeeStatus.bind(ValidationUtils),
    ValidationUtils.isValidEmployeeStatus.bind(ValidationUtils)
  )

  // ==================== BLOOD GROUP (Requirement 5.5) ====================
  testEnumValidation(
    'BloodGroup',
    ValidationUtils.ENUMS.BLOOD_GROUP,
    ValidationUtils.validateBloodGroup.bind(ValidationUtils),
    ValidationUtils.isValidBloodGroup.bind(ValidationUtils)
  )

  // ==================== GENDER (Requirement 5.6) ====================
  testEnumValidation(
    'Gender',
    ValidationUtils.ENUMS.GENDER,
    ValidationUtils.validateGender.bind(ValidationUtils),
    ValidationUtils.isValidGender.bind(ValidationUtils)
  )

  // ==================== MARITAL STATUS (Requirement 5.7) ====================
  testEnumValidation(
    'MaritalStatus',
    ValidationUtils.ENUMS.MARITAL_STATUS,
    ValidationUtils.validateMaritalStatus.bind(ValidationUtils),
    ValidationUtils.isValidMaritalStatus.bind(ValidationUtils)
  )

  // ==================== MILITARY STATUS (Requirement 5.8) ====================
  testEnumValidation(
    'MilitaryStatus',
    ValidationUtils.ENUMS.MILITARY_STATUS,
    ValidationUtils.validateMilitaryStatus.bind(ValidationUtils),
    ValidationUtils.isValidMilitaryStatus.bind(ValidationUtils)
  )

  // ==================== DOCUMENT TYPE (Requirement 6.2) ====================
  testEnumValidation(
    'DocumentType',
    ValidationUtils.ENUMS.DOCUMENT_TYPE,
    ValidationUtils.validateDocumentType.bind(ValidationUtils),
    ValidationUtils.isValidDocumentType.bind(ValidationUtils)
  )

  // ==================== ATTENDANCE STATUS (Requirement 7.3) ====================
  testEnumValidation(
    'AttendanceStatus',
    ValidationUtils.ENUMS.ATTENDANCE_STATUS,
    ValidationUtils.validateAttendanceStatus.bind(ValidationUtils),
    ValidationUtils.isValidAttendanceStatus.bind(ValidationUtils)
  )

  // ==================== APPROVAL STATUS (Requirement 8.2) ====================
  testEnumValidation(
    'ApprovalStatus',
    ValidationUtils.ENUMS.APPROVAL_STATUS,
    ValidationUtils.validateApprovalStatus.bind(ValidationUtils),
    ValidationUtils.isValidApprovalStatus.bind(ValidationUtils)
  )

  // ==================== LEAVE REQUEST STATUS (Requirement 10.2) ====================
  testEnumValidation(
    'LeaveRequestStatus',
    ValidationUtils.ENUMS.LEAVE_REQUEST_STATUS,
    ValidationUtils.validateLeaveRequestStatus.bind(ValidationUtils),
    ValidationUtils.isValidLeaveRequestStatus.bind(ValidationUtils)
  )

  // ==================== CURRENCY (Requirement 12.2) ====================
  testEnumValidation(
    'Currency',
    ValidationUtils.ENUMS.CURRENCY,
    ValidationUtils.validateCurrency.bind(ValidationUtils),
    ValidationUtils.isValidCurrency.bind(ValidationUtils)
  )

  // ==================== PERIOD TYPE (Requirement 12.3) ====================
  testEnumValidation(
    'PeriodType',
    ValidationUtils.ENUMS.PERIOD_TYPE,
    ValidationUtils.validatePeriodType.bind(ValidationUtils),
    ValidationUtils.isValidPeriodType.bind(ValidationUtils)
  )

  // ==================== PAYROLL ITEM TYPE (Requirement 14.2) ====================
  testEnumValidation(
    'PayrollItemType',
    ValidationUtils.ENUMS.PAYROLL_ITEM_TYPE,
    ValidationUtils.validatePayrollItemType.bind(ValidationUtils),
    ValidationUtils.isValidPayrollItemType.bind(ValidationUtils)
  )

  // ==================== INCOME CATEGORY (Requirement 14.3) ====================
  testEnumValidation(
    'IncomeCategory',
    ValidationUtils.ENUMS.INCOME_CATEGORY,
    ValidationUtils.validateIncomeCategory.bind(ValidationUtils),
    ValidationUtils.isValidIncomeCategory.bind(ValidationUtils)
  )

  // ==================== DEDUCTION CATEGORY (Requirement 14.4) ====================
  testEnumValidation(
    'DeductionCategory',
    ValidationUtils.ENUMS.DEDUCTION_CATEGORY,
    ValidationUtils.validateDeductionCategory.bind(ValidationUtils),
    ValidationUtils.isValidDeductionCategory.bind(ValidationUtils)
  )

  // ==================== ADVANCE STATUS (Requirement 15.2) ====================
  testEnumValidation(
    'AdvanceStatus',
    ValidationUtils.ENUMS.ADVANCE_STATUS,
    ValidationUtils.validateAdvanceStatus.bind(ValidationUtils),
    ValidationUtils.isValidAdvanceStatus.bind(ValidationUtils)
  )

  // ==================== PERFORMANCE STATUS (Requirement 16.2) ====================
  testEnumValidation(
    'PerformanceStatus',
    ValidationUtils.ENUMS.PERFORMANCE_STATUS,
    ValidationUtils.validatePerformanceStatus.bind(ValidationUtils),
    ValidationUtils.isValidPerformanceStatus.bind(ValidationUtils)
  )

  // ==================== TRAINING STATUS (Requirement 17.3) ====================
  testEnumValidation(
    'TrainingStatus',
    ValidationUtils.ENUMS.TRAINING_STATUS,
    ValidationUtils.validateTrainingStatus.bind(ValidationUtils),
    ValidationUtils.isValidTrainingStatus.bind(ValidationUtils)
  )

  // ==================== VIOLATION TYPE (Requirement 18.2) ====================
  testEnumValidation(
    'ViolationType',
    ValidationUtils.ENUMS.VIOLATION_TYPE,
    ValidationUtils.validateViolationType.bind(ValidationUtils),
    ValidationUtils.isValidViolationType.bind(ValidationUtils)
  )

  // ==================== ACTION TAKEN (Requirement 18.3) ====================
  testEnumValidation(
    'ActionTaken',
    ValidationUtils.ENUMS.ACTION_TAKEN,
    ValidationUtils.validateActionTaken.bind(ValidationUtils),
    ValidationUtils.isValidActionTaken.bind(ValidationUtils)
  )

  // ==================== REASON CATEGORY (Requirement 19.2) ====================
  testEnumValidation(
    'ReasonCategory',
    ValidationUtils.ENUMS.REASON_CATEGORY,
    ValidationUtils.validateReasonCategory.bind(ValidationUtils),
    ValidationUtils.isValidReasonCategory.bind(ValidationUtils)
  )

  // ==================== RESIGNATION STATUS (Requirement 19.3) ====================
  testEnumValidation(
    'ResignationStatus',
    ValidationUtils.ENUMS.RESIGNATION_STATUS,
    ValidationUtils.validateResignationStatus.bind(ValidationUtils),
    ValidationUtils.isValidResignationStatus.bind(ValidationUtils)
  )

  // ==================== GENERIC ENUM VALIDATOR TESTS ====================
  describe('Generic Enum Validator', () => {
    /**
     * Property 11: Generic validator should work with any enum
     */
    it('should validate any enum using generic validateEnum', () => {
      const testEnums = [
        ValidationUtils.ENUMS.CONTRACT_TYPE,
        ValidationUtils.ENUMS.EMPLOYEE_STATUS,
        ValidationUtils.ENUMS.BLOOD_GROUP,
        ValidationUtils.ENUMS.GENDER,
      ]

      fc.assert(
        fc.property(
          fc.constantFrom(...testEnums),
          (enumValues) => {
            // Test valid value
            const validValue = enumValues[0]
            const validResult = ValidationUtils.validateEnum(validValue, enumValues, 'Test')
            
            // Test invalid value
            const invalidResult = ValidationUtils.validateEnum('INVALID_VALUE_XYZ', enumValues, 'Test')
            
            return validResult.isValid === true && invalidResult.isValid === false
          }
        ),
        { numRuns: 10 }
      )
    })

    /**
     * Property 11: isValidEnum should match validateEnum.isValid
     */
    it('should have consistent results between validateEnum and isValidEnum', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }),
          (value) => {
            const enumValues = ValidationUtils.ENUMS.CONTRACT_TYPE
            const validateResult = ValidationUtils.validateEnum(value, enumValues, 'Test')
            const isValidResult = ValidationUtils.isValidEnum(value, enumValues)
            return validateResult.isValid === isValidResult
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
