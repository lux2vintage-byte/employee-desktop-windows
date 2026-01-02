# Gereksinimler Belgesi

## Giriş

Bu belge, Personel Yönetimi Sistemi için kapsamlı veritabanı modüllerinin tasarımını ve gereksinimlerini tanımlar. Sistem; organizasyonel yapı, personel yönetimi, devamlılık/puantaj, izin yönetimi, bordro/finans, performans/eğitim/disiplin ve işten ayrılma modüllerini içerir. Tüm modüller soft delete, audit log ve tarihçeli veri prensiplerini uygular.

## Sözlük

- **Database_System**: Prisma ORM ile yönetilen SQLite veritabanı sistemi
- **Soft_Delete_Manager**: Kayıtları fiziksel olarak silmek yerine `deleted_at` alanı ile işaretleyen mekanizma
- **Audit_Logger**: Tüm veri değişikliklerini (oluşturma, güncelleme, silme) kaydeden sistem
- **History_Tracker**: Maaş ve departman değişikliklerini tarihçe olarak tutan mekanizma
- **Department_Module**: Departman ve hiyerarşi yönetimi modülü
- **Position_Module**: Pozisyon/unvan yönetimi modülü
- **Employee_Module**: Personel ana bilgileri yönetimi modülü
- **Employee_Details_Module**: Personel hassas ve detay bilgileri modülü
- **Employee_Documents_Module**: Personel dosya/belge yönetimi modülü
- **Attendance_Module**: Günlük giriş-çıkış ve puantaj modülü
- **Overtime_Module**: Fazla mesai yönetimi modülü
- **Leave_Module**: İzin türleri, talepleri ve bakiye yönetimi modülü
- **Salary_Module**: Maaş geçmişi yönetimi modülü
- **Payroll_Module**: Aylık bordro hesaplama ve yönetimi modülü
- **Advance_Module**: Avans talep ve takip modülü
- **Performance_Module**: Performans değerlendirme modülü
- **Training_Module**: Eğitim kataloğu ve personel eğitim kayıtları modülü
- **Disciplinary_Module**: Disiplin kayıtları modülü
- **Offboarding_Module**: İşten ayrılma ve çıkış mülakatı modülü
- **Settings_Module**: Uygulama ayarları modülü

## Gereksinimler

### Gereksinim 1: Veritabanı Temel Prensipleri

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, tüm verilerin güvenli ve izlenebilir şekilde saklanmasını istiyorum, böylece yasal gereklilikleri karşılayabilir ve veri bütünlüğünü koruyabilirim.

#### Kabul Kriterleri

1. THE Database_System SHALL implement soft delete for all tables using a `deleted_at` timestamp field
2. WHEN a record is deleted, THE Soft_Delete_Manager SHALL set the `deleted_at` field to current timestamp instead of physically removing the record
3. WHEN querying records, THE Database_System SHALL exclude soft-deleted records by default
4. THE Audit_Logger SHALL record `created_at` and `updated_at` timestamps for all records
5. WHEN a record is created, THE Audit_Logger SHALL automatically set `created_at` to current timestamp
6. WHEN a record is updated, THE Audit_Logger SHALL automatically update `updated_at` to current timestamp
7. THE Audit_Logger SHALL log all data changes including old values, new values, user ID, and action type to the audit_log table
8. WHEN salary or department changes occur, THE History_Tracker SHALL create a new record with effective dates instead of overwriting existing data
9. THE Database_System SHALL encrypt sensitive fields including identity_number, iban, and social_security_number

### Gereksinim 2: Organizasyonel Yapı - Departman Yönetimi

**Kullanıcı Hikayesi:** Bir İK yöneticisi olarak, şirketin departman hiyerarşisini yönetmek istiyorum, böylece organizasyonel yapıyı doğru şekilde modelleyebilirim.

#### Kabul Kriterleri

1. THE Department_Module SHALL store department records with id, name, manager_id, parent_department_id, and cost_center_code fields
2. WHEN a department is created, THE Department_Module SHALL validate that the name is unique within the same parent department
3. THE Department_Module SHALL support hierarchical department structure through parent_department_id self-reference
4. WHEN a parent department is soft-deleted, THE Department_Module SHALL prevent deletion if child departments exist
5. THE Department_Module SHALL allow assigning a manager from the employees table via manager_id foreign key
6. WHEN retrieving department hierarchy, THE Department_Module SHALL return the complete tree structure with all nested children
7. THE Department_Module SHALL validate that cost_center_code is unique across all departments when provided

### Gereksinim 3: Organizasyonel Yapı - Pozisyon Yönetimi

**Kullanıcı Hikayesi:** Bir İK yöneticisi olarak, pozisyon/unvan tanımlarını ve maaş skalalarını yönetmek istiyorum, böylece işe alım ve maaş politikalarını uygulayabilirim.

#### Kabul Kriterleri

1. THE Position_Module SHALL store position records with id, title, department_id, job_description, base_salary_min, and base_salary_max fields
2. WHEN a position is created, THE Position_Module SHALL validate that title is unique within the same department
3. THE Position_Module SHALL enforce that base_salary_min is less than or equal to base_salary_max
4. WHEN a department is soft-deleted, THE Position_Module SHALL prevent deletion if positions are assigned to it
5. THE Position_Module SHALL allow nullable job_description for positions without detailed descriptions
6. WHEN retrieving positions, THE Position_Module SHALL include the associated department information

### Gereksinim 4: Personel Yönetimi - Ana Bilgiler

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, personel temel bilgilerini yönetmek istiyorum, böylece çalışan kayıtlarını tutabilir ve organizasyonel ilişkileri takip edebilirim.

#### Kabul Kriterleri

1. THE Employee_Module SHALL store employee records with id, employee_code, first_name, last_name, identity_number, email_work, email_personal, phone_primary, photo_url, department_id, position_id, manager_id, hire_date, contract_type, and status fields
2. WHEN an employee is created, THE Employee_Module SHALL generate a unique employee_code if not provided
3. THE Employee_Module SHALL validate that employee_code is unique across all employees including soft-deleted ones
4. THE Employee_Module SHALL validate that identity_number follows T.C. Kimlik No format (11 digits with checksum validation)
5. WHEN storing identity_number, THE Employee_Module SHALL encrypt the value before persisting
6. THE Employee_Module SHALL enforce valid contract_type values: Süreli, Süresiz, Stajyer, Freelance
7. THE Employee_Module SHALL enforce valid status values: Active, Passive, OnLeave, Terminated
8. WHEN an employee's department or position changes, THE History_Tracker SHALL create a history record with effective dates
9. THE Employee_Module SHALL validate that manager_id references an existing active employee
10. WHEN retrieving employees, THE Employee_Module SHALL include department, position, and manager information

### Gereksinim 5: Personel Yönetimi - Detay Bilgiler

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, personelin hassas ve detaylı bilgilerini güvenli şekilde saklamak istiyorum, böylece yasal gereklilikleri karşılayabilir ve acil durumlarda iletişim kurabileyim.

#### Kabul Kriterleri

1. THE Employee_Details_Module SHALL store detail records with employee_id, birth_date, blood_group, gender, marital_status, address_home, emergency_contact_name, emergency_contact_phone, bank_name, iban, social_security_number, education_level, and military_status fields
2. THE Employee_Details_Module SHALL enforce one-to-one relationship with employees table via unique employee_id
3. WHEN storing iban, THE Employee_Details_Module SHALL encrypt the value before persisting
4. WHEN storing social_security_number, THE Employee_Details_Module SHALL encrypt the value before persisting
5. THE Employee_Details_Module SHALL enforce valid blood_group values: A+, A-, B+, B-, AB+, AB-, 0+, 0-
6. THE Employee_Details_Module SHALL enforce valid gender values: Erkek, Kadın, Diğer
7. THE Employee_Details_Module SHALL enforce valid marital_status values: Bekar, Evli, Boşanmış, Dul
8. THE Employee_Details_Module SHALL enforce valid military_status values: Yapıldı, Muaf, Tecilli
9. THE Employee_Details_Module SHALL validate IBAN format according to Turkish IBAN standards (TR followed by 24 digits)

### Gereksinim 6: Personel Yönetimi - Belge Yönetimi

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, personel belgelerini dijital ortamda saklamak ve yönetmek istiyorum, böylece belgelere hızlı erişim sağlayabilir ve dosya takibini yapabilirim.

#### Kabul Kriterleri

1. THE Employee_Documents_Module SHALL store document records with id, employee_id, document_type, file_path, and upload_date fields
2. THE Employee_Documents_Module SHALL enforce valid document_type values: Sözleşme, Kimlik Fotokopisi, Diploma, Sağlık Raporu, Diğer
3. WHEN a document is uploaded, THE Employee_Documents_Module SHALL validate that file_path points to an existing file in the Electron file system
4. WHEN a document is uploaded, THE Employee_Documents_Module SHALL automatically set upload_date to current date
5. THE Employee_Documents_Module SHALL allow multiple documents per employee
6. WHEN an employee is soft-deleted, THE Employee_Documents_Module SHALL retain all associated documents for legal compliance

### Gereksinim 7: Devamlılık ve Puantaj - Günlük Hareketler

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, personelin günlük giriş-çıkış kayıtlarını tutmak istiyorum, böylece puantaj hesaplaması ve maaş bordrosu için veri sağlayabilirim.

#### Kabul Kriterleri

1. THE Attendance_Module SHALL store attendance records with id, employee_id, date, check_in_time, check_out_time, break_duration, status, and daily_note fields
2. THE Attendance_Module SHALL enforce unique constraint on employee_id and date combination
3. THE Attendance_Module SHALL enforce valid status values: Geldi, Gelmedi, İzinli, Tatil
4. WHEN check_out_time is provided, THE Attendance_Module SHALL validate that it is after check_in_time
5. THE Attendance_Module SHALL calculate and store break_duration in minutes
6. WHEN retrieving attendance records, THE Attendance_Module SHALL calculate total working hours excluding break duration
7. THE Attendance_Module SHALL allow bulk creation of attendance records for multiple employees on the same date

### Gereksinim 8: Devamlılık ve Puantaj - Fazla Mesai

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, fazla mesai kayıtlarını yönetmek ve onay sürecini takip etmek istiyorum, böylece mesai ücretlerini doğru hesaplayabilirim.

#### Kabul Kriterleri

1. THE Overtime_Module SHALL store overtime records with id, employee_id, date, hours, multiplier, description, approval_status, and approved_by fields
2. THE Overtime_Module SHALL enforce valid approval_status values: Pending, Approved, Rejected
3. THE Overtime_Module SHALL enforce multiplier values between 1.0 and 3.0
4. WHEN approval_status changes to Approved, THE Overtime_Module SHALL require approved_by to reference a valid employee with manager role
5. WHEN calculating overtime pay, THE Overtime_Module SHALL multiply hours by multiplier and hourly rate
6. THE Overtime_Module SHALL validate that hours is a positive number not exceeding 24

### Gereksinim 9: İzin Yönetimi - İzin Türleri

**Kullanıcı Hikayesi:** Bir İK yöneticisi olarak, izin türlerini tanımlamak ve yapılandırmak istiyorum, böylece farklı izin politikalarını uygulayabilirim.

#### Kabul Kriterleri

1. THE Leave_Module SHALL store leave type records with id, name, is_paid, deducts_from_annual, and limit_days fields
2. THE Leave_Module SHALL enforce unique name for leave types
3. THE Leave_Module SHALL support both paid (is_paid=true) and unpaid (is_paid=false) leave types
4. WHEN deducts_from_annual is true, THE Leave_Module SHALL deduct used days from annual leave balance
5. THE Leave_Module SHALL allow nullable limit_days for leave types without annual limits
6. THE Leave_Module SHALL provide default leave types: Yıllık İzin, Mazeret İzni, Rapor, Babalık İzni, Doğum İzni, Evlilik İzni, Ölüm İzni

### Gereksinim 10: İzin Yönetimi - İzin Talepleri

**Kullanıcı Hikayesi:** Bir personel olarak, izin talebinde bulunmak ve talebimin durumunu takip etmek istiyorum, böylece izin planlaması yapabilirim.

#### Kabul Kriterleri

1. THE Leave_Module SHALL store leave request records with id, employee_id, leave_type_id, start_date, end_date, day_count, return_date, reason, status, and approved_by fields
2. THE Leave_Module SHALL enforce valid status values: Pending, Approved, Rejected
3. WHEN a leave request is created, THE Leave_Module SHALL automatically calculate day_count based on start_date and end_date
4. THE Leave_Module SHALL support half-day leaves (day_count can be 0.5)
5. WHEN a leave request is approved, THE Leave_Module SHALL automatically calculate and set return_date
6. WHEN a leave request is approved, THE Leave_Module SHALL deduct day_count from the employee's leave balance
7. THE Leave_Module SHALL validate that start_date is not in the past when creating a new request
8. THE Leave_Module SHALL validate that end_date is greater than or equal to start_date
9. WHEN a leave request overlaps with existing approved leave, THE Leave_Module SHALL reject the request

### Gereksinim 11: İzin Yönetimi - İzin Bakiyeleri

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, personelin izin bakiyelerini yıllık olarak takip etmek istiyorum, böylece izin haklarını doğru yönetebilirim.

#### Kabul Kriterleri

1. THE Leave_Module SHALL store leave balance records with id, employee_id, year, annual_leave_entitlement, transferred_days, used_days, and remaining_days fields
2. THE Leave_Module SHALL enforce unique constraint on employee_id and year combination
3. WHEN a new year begins, THE Leave_Module SHALL automatically create balance records for active employees
4. THE Leave_Module SHALL calculate remaining_days as (annual_leave_entitlement + transferred_days - used_days)
5. WHEN calculating annual_leave_entitlement, THE Leave_Module SHALL consider employee's tenure (years of service)
6. THE Leave_Module SHALL allow transferring unused days to the next year up to a configurable limit
7. WHEN a leave request is approved, THE Leave_Module SHALL automatically update used_days in the corresponding balance record

### Gereksinim 12: Bordro ve Finans - Maaş Geçmişi

**Kullanıcı Hikayesi:** Bir İK yöneticisi olarak, personelin maaş geçmişini tarihsel olarak takip etmek istiyorum, böylece maaş değişikliklerini izleyebilir ve raporlayabilirim.

#### Kabul Kriterleri

1. THE Salary_Module SHALL store salary history records with id, employee_id, amount, currency, period_type, start_date, and end_date fields
2. THE Salary_Module SHALL enforce valid currency values: TRY, USD, EUR
3. THE Salary_Module SHALL enforce valid period_type values: Aylık, Saatlik
4. WHEN a new salary record is created, THE Salary_Module SHALL set end_date of the previous active record to the day before start_date
5. THE Salary_Module SHALL treat records with null end_date as the current active salary
6. THE Salary_Module SHALL validate that amount is a positive number
7. WHEN retrieving current salary, THE Salary_Module SHALL return the record where end_date is null
8. THE Salary_Module SHALL maintain complete salary history without overwriting previous records

### Gereksinim 13: Bordro ve Finans - Aylık Bordrolar

**Kullanıcı Hikayesi:** Bir muhasebe uzmanı olarak, aylık bordro hesaplamalarını yapmak ve yönetmek istiyorum, böylece personel maaşlarını doğru şekilde ödeyebilirim.

#### Kabul Kriterleri

1. THE Payroll_Module SHALL store payroll records with id, employee_id, period_month, period_year, base_salary, total_additions, total_deductions, net_salary, and is_finalized fields
2. THE Payroll_Module SHALL enforce unique constraint on employee_id, period_month, and period_year combination
3. THE Payroll_Module SHALL calculate net_salary as (base_salary + total_additions - total_deductions)
4. WHEN is_finalized is true, THE Payroll_Module SHALL prevent any modifications to the payroll record
5. THE Payroll_Module SHALL validate that period_month is between 1 and 12
6. THE Payroll_Module SHALL validate that period_year is a valid year (e.g., between 2000 and 2100)
7. WHEN generating payroll, THE Payroll_Module SHALL automatically include approved overtime payments in total_additions
8. WHEN generating payroll, THE Payroll_Module SHALL automatically include approved advance deductions in total_deductions

### Gereksinim 14: Bordro ve Finans - Bordro Kalemleri

**Kullanıcı Hikayesi:** Bir muhasebe uzmanı olarak, bordro kalemlerini detaylı şekilde kaydetmek istiyorum, böylece her gelir ve kesinti kalemini izleyebilirim.

#### Kabul Kriterleri

1. THE Payroll_Module SHALL store payroll item records with id, payroll_id, type, category, description, and amount fields
2. THE Payroll_Module SHALL enforce valid type values: Income, Deduction
3. THE Payroll_Module SHALL enforce valid category values for Income: Overtime, Bonus, Transport, Food, Other
4. THE Payroll_Module SHALL enforce valid category values for Deduction: Tax, Insurance, Advance, Absence, Other
5. WHEN payroll items are added, THE Payroll_Module SHALL automatically recalculate total_additions and total_deductions in the parent payroll
6. THE Payroll_Module SHALL validate that amount is a positive number
7. WHEN the parent payroll is finalized, THE Payroll_Module SHALL prevent adding, modifying, or deleting payroll items

### Gereksinim 15: Bordro ve Finans - Avanslar

**Kullanıcı Hikayesi:** Bir personel olarak, avans talebinde bulunmak ve avansımın durumunu takip etmek istiyorum, böylece acil nakit ihtiyaçlarımı karşılayabilirim.

#### Kabul Kriterleri

1. THE Advance_Module SHALL store advance records with id, employee_id, request_date, amount, status, payment_date, and deduction_period fields
2. THE Advance_Module SHALL enforce valid status values: Pending, Approved, Rejected, Paid, Deducted
3. WHEN an advance is approved, THE Advance_Module SHALL require deduction_period in YYYY-MM format
4. WHEN an advance is paid, THE Advance_Module SHALL set payment_date to the actual payment date
5. THE Advance_Module SHALL validate that amount does not exceed a configurable percentage of employee's monthly salary
6. WHEN the deduction_period payroll is generated, THE Advance_Module SHALL automatically create a deduction item and update status to Deducted
7. THE Advance_Module SHALL prevent multiple pending advances for the same employee

### Gereksinim 16: Performans Değerlendirme

**Kullanıcı Hikayesi:** Bir yönetici olarak, ekip üyelerimin performansını değerlendirmek ve geri bildirim vermek istiyorum, böylece çalışan gelişimini destekleyebilirim.

#### Kabul Kriterleri

1. THE Performance_Module SHALL store review records with id, employee_id, reviewer_id, review_period, score, feedback, and status fields
2. THE Performance_Module SHALL enforce valid status values: Draft, Submitted, Acknowledged
3. THE Performance_Module SHALL validate that score is between 0 and 100
4. THE Performance_Module SHALL validate that reviewer_id is different from employee_id
5. WHEN status changes to Submitted, THE Performance_Module SHALL prevent further modifications except status change to Acknowledged
6. THE Performance_Module SHALL enforce valid review_period format (e.g., "2024 Q1", "2024 Yıl Sonu")
7. THE Performance_Module SHALL allow multiple reviews per employee for different review periods

### Gereksinim 17: Eğitim Yönetimi

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, eğitim programlarını ve personel eğitim kayıtlarını yönetmek istiyorum, böylece çalışan gelişimini takip edebilirim.

#### Kabul Kriterleri

1. THE Training_Module SHALL store training catalog records with id, title, provider, duration_hours, and category fields
2. THE Training_Module SHALL store employee training records with id, employee_id, training_id, completion_date, status, and certificate_url fields
3. THE Training_Module SHALL enforce valid status values for employee trainings: Planned, Completed, Failed
4. WHEN status is Completed, THE Training_Module SHALL require completion_date to be set
5. THE Training_Module SHALL allow nullable certificate_url for trainings without certificates
6. THE Training_Module SHALL validate that duration_hours is a positive integer
7. THE Training_Module SHALL allow multiple employees to be assigned to the same training

### Gereksinim 18: Disiplin Kayıtları

**Kullanıcı Hikayesi:** Bir İK yöneticisi olarak, disiplin olaylarını ve alınan aksiyonları kaydetmek istiyorum, böylece yasal gereklilikleri karşılayabilir ve tutarlı disiplin politikası uygulayabilirim.

#### Kabul Kriterleri

1. THE Disciplinary_Module SHALL store disciplinary records with id, employee_id, incident_date, violation_type, action_taken, defense, and document_path fields
2. THE Disciplinary_Module SHALL enforce valid violation_type values: İşe Geç Kalma, İş Güvenliği İhlali, Devamsızlık, Görev İhmali, Diğer
3. THE Disciplinary_Module SHALL enforce valid action_taken values: Sözlü Uyarı, Yazılı Uyarı, Tutanak, Maaş Kesintisi, İşten Çıkarma
4. THE Disciplinary_Module SHALL allow nullable defense for cases where employee did not provide a defense
5. THE Disciplinary_Module SHALL allow nullable document_path for verbal warnings without documentation
6. WHEN action_taken is Maaş Kesintisi, THE Disciplinary_Module SHALL create a corresponding deduction record in the next payroll

### Gereksinim 19: İşten Ayrılma Süreci

**Kullanıcı Hikayesi:** Bir İK uzmanı olarak, işten ayrılma sürecini yönetmek ve çıkış mülakatlarını kaydetmek istiyorum, böylece ayrılma sürecini düzgün tamamlayabilir ve geri bildirim toplayabilirim.

#### Kabul Kriterleri

1. THE Offboarding_Module SHALL store resignation records with id, employee_id, request_date, reason_category, reason_detail, last_working_day, and status fields
2. THE Offboarding_Module SHALL enforce valid reason_category values: İstifa, Emeklilik, Çıkarılma, Sözleşme Bitimi
3. THE Offboarding_Module SHALL enforce valid status values: Pending, Approved, Completed
4. WHEN a resignation is approved, THE Offboarding_Module SHALL update the employee's status to Terminated on last_working_day
5. THE Offboarding_Module SHALL store exit interview records with id, resignation_id, comments, and would_rehire fields
6. THE Offboarding_Module SHALL enforce one-to-one relationship between resignation and exit_interview
7. WHEN resignation is completed, THE Offboarding_Module SHALL calculate and record any remaining leave balance for payout

### Gereksinim 20: Sistem Ayarları

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, uygulama ayarlarını merkezi olarak yönetmek istiyorum, böylece sistem davranışını yapılandırabilir ve güncelleyebilirim.

#### Kabul Kriterleri

1. THE Settings_Module SHALL store app settings with key, value, and group fields
2. THE Settings_Module SHALL enforce unique key constraint
3. THE Settings_Module SHALL support grouping settings by category (e.g., company, payroll, leave)
4. THE Settings_Module SHALL provide default settings for: company_name, logo_path, minimum_wage, annual_leave_base_days, max_leave_transfer_days
5. WHEN a setting is updated, THE Settings_Module SHALL log the change in audit_log with old and new values
6. THE Settings_Module SHALL validate setting values based on their expected data types
