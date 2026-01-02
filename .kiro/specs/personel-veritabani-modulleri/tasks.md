# Uygulama Planı: Personel Veritabanı Modülleri

## Genel Bakış

Bu plan, Personel Yönetimi Sistemi veritabanı modüllerinin aşamalı implementasyonunu içerir. Prisma ORM, TypeScript ve SQLite kullanılarak geliştirilecektir. Görevler modüler yapıda organize edilmiş olup, her modül bağımsız olarak test edilebilir.

## Görevler

- [-] 1. Temel Altyapı ve Yardımcı Araçlar
  - [x] 1.1 Prisma schema dosyasını güncelleyerek tüm modelleri ekle
    - Tüm entity'leri schema.prisma'ya ekle
    - Soft delete için deletedAt alanlarını ekle
    - İlişkileri ve kısıtlamaları tanımla
    - `npx prisma db push` ile veritabanını güncelle
    - _Requirements: 1.1, 1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1, 15.1, 16.1, 17.1, 17.2, 18.1, 19.1, 19.5, 20.1_

  - [x] 1.2 EncryptionUtil sınıfını oluştur
    - AES-256-GCM şifreleme implementasyonu
    - encrypt() ve decrypt() metodları
    - Ortam değişkeninden anahtar yönetimi
    - _Requirements: 1.9_

  - [x] 1.3 EncryptionUtil için property test yaz
    - **Property 4: Sensitive Data Encryption Round-Trip**
    - **Validates: Requirements 1.9, 4.5, 5.3, 5.4**

  - [x] 1.4 AuditLogger service'ini oluştur
    - log() metodu ile audit_log tablosuna kayıt
    - Eski ve yeni değerlerin JSON olarak saklanması
    - _Requirements: 1.7_

  - [x] 1.5 AuditLogger için property test yaz
    - **Property 3: Audit Log Completeness**
    - **Validates: Requirements 1.7**

  - [x] 1.6 BaseRepository soyut sınıfını oluştur
    - Soft delete mantığı (deletedAt alanı)
    - findAll, findById, create, update, softDelete, restore metodları
    - includeDeleted parametresi desteği
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.7 Soft Delete için property test yaz
    - **Property 1: Soft Delete Round-Trip**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 1.8 Timestamp yönetimi için property test yaz
    - **Property 2: Audit Timestamp Consistency**
    - **Validates: Requirements 1.4, 1.5, 1.6**

- [x] 2. Checkpoint - Temel altyapı testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 3. Validasyon Yardımcıları
  - [x] 3.1 TC Kimlik No validasyon fonksiyonunu oluştur
    - 11 haneli kontrol
    - Checksum algoritması
    - _Requirements: 4.4_

  - [x] 3.2 TC Kimlik validasyonu için property test yaz
    - **Property 10: TC Identity Number Validation**
    - **Validates: Requirements 4.4**

  - [x] 3.3 IBAN validasyon fonksiyonunu oluştur
    - TR prefix kontrolü
    - 26 karakter uzunluk kontrolü
    - _Requirements: 5.9_

  - [x] 3.4 IBAN validasyonu için property test yaz
    - **Property 12: IBAN Format Validation**
    - **Validates: Requirements 5.9**

  - [x] 3.5 Enum validasyon yardımcılarını oluştur
    - Tüm enum tipleri için validatörler
    - _Requirements: 4.6, 4.7, 5.5, 5.6, 5.7, 5.8, 6.2, 7.3, 8.2, 10.2, 15.2, 16.2, 17.3, 18.2, 18.3, 19.2, 19.3_

  - [x] 3.6 Enum validasyonları için property test yaz
    - **Property 11: Enum Value Enforcement**
    - **Validates: Requirements 4.6, 4.7, 5.5-5.8, 6.2, 7.3, 8.2, 10.2, 15.2, 16.2, 17.3, 18.2, 18.3, 19.2, 19.3**

- [x] 4. Organizasyonel Yapı Modülleri
  - [x] 4.1 DepartmentRepository'yi oluştur
    - BaseRepository'den türet
    - Hiyerarşi sorguları için özel metodlar
    - _Requirements: 2.1, 2.3, 2.6_

  - [x] 4.2 DepartmentService'i oluştur
    - CRUD operasyonları
    - İsim benzersizliği kontrolü
    - Alt departman kontrolü (silme engeli)
    - Hiyerarşi ağacı oluşturma
    - _Requirements: 2.2, 2.4, 2.5, 2.7_

  - [x] 4.3 Department modülü için property testler yaz
    - **Property 6: Department Hierarchy Integrity**
    - **Property 7: Department Name Uniqueness Within Parent**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.6**

  - [x] 4.4 PositionRepository'yi oluştur
    - BaseRepository'den türet
    - Departman bazlı sorgular
    - _Requirements: 3.1_

  - [x] 4.5 PositionService'i oluştur
    - CRUD operasyonları
    - Unvan benzersizliği kontrolü
    - Maaş skalası validasyonu
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.6 Position modülü için property test yaz
    - **Property 8: Position Salary Range Validity**
    - **Validates: Requirements 3.3**

  - [x] 4.7 Department ve Position IPC handler'larını oluştur
    - Electron IPC kanalları
    - Request/Response yapıları
    - _Requirements: 2.1-2.7, 3.1-3.6_

- [x] 5. Checkpoint - Organizasyonel yapı testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 6. Personel Yönetimi Modülleri
  - [x] 6.1 EmployeeRepository'yi oluştur
    - BaseRepository'den türet
    - Sicil no üretimi
    - İlişkili veri sorguları
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 EmployeeService'i oluştur
    - CRUD operasyonları
    - Sicil no benzersizliği kontrolü
    - TC Kimlik şifreleme
    - Durum ve sözleşme tipi validasyonu
    - Yönetici referans kontrolü
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.9, 4.10_

  - [x] 6.3 HistoryTracker service'ini oluştur
    - Departman değişikliği tarihçesi
    - Pozisyon değişikliği tarihçesi
    - _Requirements: 4.8_

  - [x] 6.4 Employee modülü için property testler yaz
    - **Property 9: Employee Code Uniqueness**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 6.5 EmployeeDetailsRepository'yi oluştur
    - One-to-one ilişki yönetimi
    - _Requirements: 5.1, 5.2_

  - [x] 6.6 EmployeeDetailsService'i oluştur
    - CRUD operasyonları
    - IBAN ve SGK no şifreleme
    - Enum validasyonları
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 6.7 EmployeeDetails için property test yaz
    - **Property 13: One-to-One Relationship Enforcement**
    - **Validates: Requirements 5.2**

  - [x] 6.8 EmployeeDocumentsRepository'yi oluştur
    - Çoklu belge desteği
    - _Requirements: 6.1, 6.5_

  - [x] 6.9 EmployeeDocumentsService'i oluştur
    - Belge yükleme ve silme
    - Dosya yolu validasyonu
    - Otomatik tarih ataması
    - _Requirements: 6.2, 6.3, 6.4, 6.6_

  - [x] 6.10 Employee modülleri için IPC handler'larını oluştur
    - Employee, EmployeeDetails, EmployeeDocuments kanalları
    - _Requirements: 4.1-4.10, 5.1-5.9, 6.1-6.6_

- [x] 7. Checkpoint - Personel yönetimi testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 8. Zaman Yönetimi Modülleri
  - [x] 8.1 AttendanceRepository'yi oluştur
    - Tarih bazlı sorgular
    - Toplu kayıt desteği
    - _Requirements: 7.1, 7.2, 7.7_

  - [x] 8.2 AttendanceService'i oluştur
    - Check-in/check-out işlemleri
    - Zaman sıralaması validasyonu
    - Çalışma saati hesaplama
    - Aylık rapor oluşturma
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [x] 8.3 Attendance modülü için property testler yaz
    - **Property 14: Attendance Time Ordering**
    - **Property 15: Attendance Uniqueness Per Day**
    - **Property 16: Working Hours Calculation**
    - **Validates: Requirements 7.2, 7.4, 7.6**

  - [x] 8.4 OvertimeRepository'yi oluştur
    - Onay durumu sorguları
    - _Requirements: 8.1_

  - [x] 8.5 OvertimeService'i oluştur
    - Mesai kaydı oluşturma
    - Onay/red işlemleri
    - Mesai ücreti hesaplama
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 8.6 Overtime modülü için property testler yaz
    - **Property 17: Overtime Multiplier Range**
    - **Property 18: Overtime Hours Range**
    - **Property 19: Overtime Pay Calculation**
    - **Validates: Requirements 8.3, 8.5, 8.6**

  - [x] 8.7 Attendance ve Overtime IPC handler'larını oluştur
    - _Requirements: 7.1-7.7, 8.1-8.6_

- [x] 9. Checkpoint - Zaman yönetimi testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 10. İzin Yönetimi Modülleri
  - [x] 10.1 LeaveTypeRepository'yi oluştur
    - Varsayılan izin türleri seed
    - _Requirements: 9.1, 9.6_

  - [x] 10.2 LeaveTypeService'i oluştur
    - CRUD operasyonları
    - İsim benzersizliği kontrolü
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [x] 10.3 LeaveRequestRepository'yi oluştur
    - Tarih aralığı sorguları
    - Çakışma kontrolü sorguları
    - _Requirements: 10.1_

  - [x] 10.4 LeaveRequestService'i oluştur
    - Talep oluşturma ve gün hesaplama
    - Yarım gün desteği
    - Onay/red işlemleri
    - Çakışma kontrolü
    - Dönüş tarihi hesaplama
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [x] 10.5 LeaveRequest için property testler yaz
    - **Property 20: Leave Day Count Calculation**
    - **Property 21: Leave Date Ordering**
    - **Property 22: Leave Overlap Prevention**
    - **Validates: Requirements 10.3, 10.4, 10.8, 10.9**

  - [x] 10.6 LeaveBalanceRepository'yi oluştur
    - Yıl bazlı sorgular
    - _Requirements: 11.1, 11.2_

  - [x] 10.7 LeaveBalanceService'i oluştur
    - Bakiye oluşturma ve güncelleme
    - Kalan gün hesaplama
    - Kıdeme göre hak hesaplama
    - Yıl sonu devir işlemi
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 10.8 LeaveBalance için property testler yaz
    - **Property 23: Leave Balance Calculation**
    - **Property 24: Leave Balance Deduction on Approval**
    - **Validates: Requirements 11.4, 10.6, 11.7**

  - [x] 10.9 Leave modülleri için IPC handler'larını oluştur
    - LeaveType, LeaveRequest, LeaveBalance kanalları
    - _Requirements: 9.1-9.6, 10.1-10.9, 11.1-11.7_

- [x] 11. Checkpoint - İzin yönetimi testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 12. Bordro ve Finans Modülleri
  - [x] 12.1 SalaryHistoryRepository'yi oluştur
    - Aktif maaş sorgusu
    - Tarihçe sorguları
    - _Requirements: 12.1_

  - [x] 12.2 SalaryService'i oluştur
    - Maaş kaydı oluşturma
    - Önceki kaydı kapatma (end_date set)
    - Güncel maaş sorgulama
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 12.3 Salary modülü için property testler yaz
    - **Property 5: Salary History Preservation**
    - **Property 25: Current Salary Identification**
    - **Property 26: Positive Amount Validation** (salary kısmı)
    - **Validates: Requirements 1.8, 12.4, 12.5, 12.6, 12.7, 12.8**

  - [x] 12.4 PayrollRepository'yi oluştur
    - Dönem bazlı sorgular
    - _Requirements: 13.1, 13.2_

  - [x] 12.5 PayrollItemRepository'yi oluştur
    - Bordro bazlı sorgular
    - _Requirements: 14.1_

  - [x] 12.6 PayrollService'i oluştur
    - Bordro oluşturma
    - Net maaş hesaplama
    - Kalem ekleme/silme
    - Toplam güncelleme
    - Kesinleştirme ve immutability
    - Mesai ve avans otomatik dahil etme
    - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 12.7 Payroll modülü için property testler yaz
    - **Property 27: Net Salary Calculation**
    - **Property 28: Finalized Payroll Immutability**
    - **Property 29: Payroll Period Uniqueness**
    - **Property 30: Payroll Totals Auto-Update**
    - **Validates: Requirements 13.2, 13.3, 13.4, 14.5, 14.7**

  - [x] 12.8 AdvanceRepository'yi oluştur
    - Bekleyen avans sorguları
    - Kesinti dönemi sorguları
    - _Requirements: 15.1_

  - [x] 12.9 AdvanceService'i oluştur
    - Avans talebi oluşturma
    - Onay/red işlemleri
    - Ödeme ve kesinti durumu güncelleme
    - Tutar limiti kontrolü
    - Bekleyen avans kontrolü
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 12.10 Advance modülü için property test yaz
    - **Property 31: Pending Advance Limit**
    - **Validates: Requirements 15.7**

  - [x] 12.11 Bordro modülleri için IPC handler'larını oluştur
    - Salary, Payroll, PayrollItem, Advance kanalları
    - _Requirements: 12.1-12.8, 13.1-13.8, 14.1-14.7, 15.1-15.7_

- [x] 13. Checkpoint - Bordro testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 14. Performans, Eğitim ve Disiplin Modülleri
  - [x] 14.1 PerformanceRepository'yi oluştur
    - Dönem ve personel bazlı sorgular
    - _Requirements: 16.1_

  - [x] 14.2 PerformanceService'i oluştur
    - Değerlendirme oluşturma ve güncelleme
    - Puan aralığı validasyonu
    - Kendi kendini değerlendirme engeli
    - Gönderim sonrası immutability
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [x] 14.3 Performance modülü için property testler yaz
    - **Property 32: Performance Score Range**
    - **Property 33: Self-Review Prevention**
    - **Property 34: Submitted Review Immutability**
    - **Validates: Requirements 16.3, 16.4, 16.5**

  - [x] 14.4 TrainingRepository'yi oluştur
    - Eğitim kataloğu sorguları
    - _Requirements: 17.1_

  - [x] 14.5 EmployeeTrainingRepository'yi oluştur
    - Personel eğitim kayıtları sorguları
    - _Requirements: 17.2_

  - [x] 14.6 TrainingService'i oluştur
    - Eğitim CRUD operasyonları
    - Personel atama
    - Tamamlama/başarısızlık işlemleri
    - _Requirements: 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 14.7 Training modülü için property testler yaz
    - **Property 35: Training Duration Positivity**
    - **Property 36: Completed Training Date Requirement**
    - **Validates: Requirements 17.4, 17.6**

  - [x] 14.8 DisciplinaryRepository'yi oluştur
    - İhlal tipi bazlı sorgular
    - _Requirements: 18.1_

  - [x] 14.9 DisciplinaryService'i oluştur
    - Disiplin kaydı oluşturma
    - Maaş kesintisi durumunda bordro entegrasyonu
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 14.10 Performans, Eğitim ve Disiplin IPC handler'larını oluştur
    - Performance, Training, EmployeeTraining, Disciplinary kanalları
    - _Requirements: 16.1-16.7, 17.1-17.7, 18.1-18.6_

- [ ] 15. Checkpoint - Performans/Eğitim/Disiplin testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 16. İşten Ayrılma Modülleri
  - [x] 16.1 ResignationRepository'yi oluştur
    - Bekleyen ayrılma sorguları
    - _Requirements: 19.1_

  - [x] 16.2 ExitInterviewRepository'yi oluştur
    - One-to-one ilişki yönetimi
    - _Requirements: 19.5, 19.6_

  - [x] 16.3 OffboardingService'i oluştur
    - Ayrılma talebi oluşturma
    - Onay ve tamamlama işlemleri
    - Personel durumu güncelleme
    - Çıkış mülakatı oluşturma
    - Kalan izin hesaplama
    - _Requirements: 19.2, 19.3, 19.4, 19.7_

  - [x] 16.4 Offboarding modülü için property testler yaz
    - **Property 37: Resignation Status Transition**
    - **Property 38: Exit Interview One-to-One**
    - **Validates: Requirements 19.4, 19.6**

  - [x] 16.5 Offboarding IPC handler'larını oluştur
    - Resignation, ExitInterview kanalları
    - _Requirements: 19.1-19.7_

- [ ] 17. Checkpoint - İşten ayrılma testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 18. Sistem Ayarları Modülü
  - [x] 18.1 AppSettingRepository'yi oluştur
    - Key ve grup bazlı sorgular
    - _Requirements: 20.1_

  - [x] 18.2 SettingsService'i oluştur
    - Ayar okuma ve yazma
    - Varsayılan ayarlar seed
    - Değişiklik audit log'u
    - _Requirements: 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 18.3 Settings modülü için property testler yaz
    - **Property 39: Settings Key Uniqueness**
    - **Property 40: Settings Change Audit**
    - **Validates: Requirements 20.2, 20.5**

  - [x] 18.4 Settings IPC handler'larını oluştur
    - AppSettings kanalları
    - _Requirements: 20.1-20.6_

- [ ] 19. Checkpoint - Sistem ayarları testlerinin geçtiğinden emin ol
  - Tüm testleri çalıştır, kullanıcıya sor

- [x] 20. Entegrasyon ve Son Kontroller
  - [x] 20.1 Tüm modüller arası entegrasyonu test et
    - Bordro oluşturma akışı (mesai, avans dahil)
    - İzin onay akışı (bakiye güncelleme)
    - İşten ayrılma akışı (durum güncelleme, izin hesaplama)
    - _Requirements: 10.6, 11.7, 13.7, 13.8, 15.6, 18.6, 19.4, 19.7_

  - [x] 20.2 Veritabanı seed script'ini güncelle
    - Varsayılan izin türleri
    - Varsayılan ayarlar
    - Test verileri (opsiyonel)
    - _Requirements: 9.6, 20.4_

  - [x] 20.3 Preload script'ini güncelle
    - Tüm yeni IPC kanallarını expose et
    - TypeScript tip tanımlarını güncelle

  - [x] 20.4 Renderer tarafı tip tanımlarını güncelle
    - electron.d.ts dosyasını güncelle
    - Tüm yeni API'leri tanımla

- [x] 21. Final Checkpoint - Tüm testlerin geçtiğinden emin ol
  - Tüm testleri çalıştır
  - Kod kalitesi kontrolü
  - Kullanıcıya final onayı sor

## Notlar

- Tüm görevler zorunludur ve kapsamlı implementasyon için gereklidir
- Her görev belirli gereksinimlere referans verir
- Checkpoint'ler artımlı doğrulama sağlar
- Property testler evrensel doğruluk özelliklerini doğrular
- Birim testler belirli örnekleri ve edge case'leri doğrular
