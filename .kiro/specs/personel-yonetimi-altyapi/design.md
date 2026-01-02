# Tasarım Belgesi

## Genel Bakış

Personel Yönetimi uygulaması için ElectronJS, Vue3 ve SQLite teknolojilerini kullanarak modern, cross-platform masaüstü uygulama altyapısı tasarımı. Uygulama, güvenli ve performanslı yerel veri depolama ile reaktif kullanıcı arayüzü sunacaktır.

## Mimari

### Genel Mimari
```
┌─────────────────────────────────────────┐
│              Electron Main Process       │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │   SQLite DB     │ │   IPC Handlers  ││
│  │   Manager       │ │                 ││
│  └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
                    │
                    │ IPC Communication
                    │
┌─────────────────────────────────────────┐
│           Electron Renderer Process     │
│  ┌─────────────────────────────────────┐│
│  │            Vue 3 App                ││
│  │  ┌─────────────┐ ┌─────────────────┐││
│  │  │ Components  │ │  Composition    │││
│  │  │             │ │  API Store      │││
│  │  └─────────────┘ └─────────────────┘││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Teknoloji Stack
- **Frontend**: Vue 3 + TypeScript + Vite
- **Desktop Framework**: ElectronJS
- **Database**: SQLite3 (gömülü)
- **Build Tool**: Vite + Electron Builder
- **Development**: Hot Reload + DevTools

## Bileşenler ve Arayüzler

### 1. Electron Main Process Bileşenleri

#### Main Window Manager
```typescript
interface MainWindowManager {
  createWindow(): Promise<BrowserWindow>
  configureWindow(options: WindowOptions): void
  handleWindowEvents(): void
}
```

#### Database Manager
```typescript
interface DatabaseManager {
  initialize(): Promise<void>
  getConnection(): Database
  executeQuery(sql: string, params?: any[]): Promise<any>
  close(): Promise<void>
}
```

#### IPC Handler
```typescript
interface IPCHandler {
  registerHandlers(): void
  handleDatabaseOperations(event: IpcMainInvokeEvent, operation: DatabaseOperation): Promise<any>
  handleFileOperations(event: IpcMainInvokeEvent, operation: FileOperation): Promise<any>
}
```

### 2. Vue 3 Frontend Bileşenleri

#### App Store (Pinia)
```typescript
interface AppStore {
  // State
  isLoading: boolean
  currentUser: User | null
  
  // Actions
  initializeApp(): Promise<void>
  setLoading(loading: boolean): void
}
```

#### Database Service
```typescript
interface DatabaseService {
  query<T>(sql: string, params?: any[]): Promise<T[]>
  insert(table: string, data: Record<string, any>): Promise<number>
  update(table: string, data: Record<string, any>, where: string): Promise<boolean>
  delete(table: string, where: string): Promise<boolean>
}
```

### 3. Proje Yapısı
```
personel-yonetimi/
├── src/
│   ├── main/                 # Electron Main Process
│   │   ├── main.ts          # Ana Electron dosyası
│   │   ├── database/        # SQLite yönetimi
│   │   ├── ipc/             # IPC handlers
│   │   └── config/          # Yapılandırma
│   ├── renderer/            # Vue 3 Frontend
│   │   ├── src/
│   │   │   ├── components/  # Vue bileşenleri
│   │   │   ├── stores/      # Pinia stores
│   │   │   ├── services/    # API servisleri
│   │   │   ├── types/       # TypeScript tipleri
│   │   │   └── main.ts      # Vue app entry
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── preload/             # Preload scripts
│       └── preload.ts
├── dist/                    # Build çıktıları
├── package.json
├── tsconfig.json
└── electron-builder.json
```

### 4. Masaüstü UI Tasarım Bileşenleri

#### Responsive Layout Manager
```typescript
interface ResponsiveLayoutManager {
  calculateOptimalLayout(screenWidth: number, screenHeight: number): LayoutConfig
  adjustSidebarWidth(availableWidth: number): number
  determineGridColumns(containerWidth: number): number
}

interface LayoutConfig {
  sidebarWidth: number
  contentPadding: number
  gridColumns: number
  cardMinWidth: number
}
```

#### Keyboard Shortcut Handler
```typescript
interface KeyboardShortcutHandler {
  registerShortcuts(): void
  handleShortcut(key: string, modifiers: string[]): void
  getAvailableShortcuts(): ShortcutDefinition[]
}

interface ShortcutDefinition {
  key: string
  modifiers: string[]
  action: string
  description: string
}
```

#### Multi-Panel Display Manager
```typescript
interface MultiPanelDisplayManager {
  calculatePanelSizes(availableWidth: number): PanelSizes
  shouldShowPanel(panelType: PanelType, screenWidth: number): boolean
  optimizeContentDisplay(panels: Panel[]): DisplayOptimization
}

interface PanelSizes {
  sidebar: number
  main: number
  details?: number
}
```

## Veri Modelleri

### SQLite Veritabanı Şeması
```sql
-- Sistem tabloları
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit tablosu (tüm tablolar için ortak)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_values TEXT,      -- JSON format
    new_values TEXT,      -- JSON format
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript Veri Modelleri
```typescript
// Base model for all entities
interface BaseEntity {
  id?: number
  createdAt?: Date
  updatedAt?: Date
}

// Database configuration
interface DatabaseConfig {
  path: string
  options: {
    verbose?: boolean
    fileMustExist?: boolean
  }
}

// IPC Communication types
interface DatabaseOperation {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  data?: Record<string, any>
  where?: string
  params?: any[]
}
```

## Doğruluk Özellikleri

*Bir özellik, sistemin tüm geçerli yürütmelerinde doğru olması gereken bir karakteristik veya davranıştır - esasen, sistemin ne yapması gerektiği hakkında resmi bir ifadedir. Özellikler, insan tarafından okunabilir spesifikasyonlar ile makine tarafından doğrulanabilir doğruluk garantileri arasında köprü görevi görür.*

### Özellik 1: Vue Reaktivite Sistemi
*Herhangi bir* Vue bileşeninde veri değişikliği yapıldığında, UI otomatik olarak güncellenmelidir
**Doğrular: Gereksinim 2.2**

### Özellik 2: SQLite CRUD İşlemleri ve Kalıcılık
*Herhangi bir* geçerli veri için, veritabanına ekleme, güncelleme, silme ve sorgulama işlemleri başarılı olmalı ve veriler uygulama oturumları arasında korunmalıdır
**Doğrular: Gereksinim 3.3, 3.4**

### Özellik 3: Veritabanı Hata Yönetimi
*Herhangi bir* geçersiz veritabanı işlemi için, sistem uygun hata mesajları döndürmeli ve uygulama çökmemelidir
**Doğrular: Gereksinim 3.5**

### Özellik 4: Build Sistemi Bundle Optimizasyonu
*Herhangi bir* production build için, çıktı bundle boyutu development build'inden küçük olmalıdır
**Doğrular: Gereksinim 5.4**

### Özellik 5: Masaüstü Layout Adaptasyonu
*Herhangi bir* pencere boyutu değişikliğinde, UI layout'u yeni boyutlara uygun şekilde yeniden düzenlenmeli ve içerik okunabilir kalmalıdır
**Doğrular: Gereksinim 6.2**

### Özellik 6: Çoklu Panel Görüntüleme
*Herhangi bir* büyük ekran boyutunda (>1200px genişlik), sistem aynı anda birden fazla bilgi panelini görüntüleyebilmeli ve kaydırma gerektirmemelidir
**Doğrular: Gereksinim 6.4, 6.5**

### Özellik 7: Klavye Kısayolu Tutarlılığı
*Herhangi bir* kayıtlı klavye kısayolu için, sistem tutarlı şekilde ilgili eylemi gerçekleştirmeli ve çakışma olmamalıdır
**Doğrular: Gereksinim 6.3**

## Hata Yönetimi

### Electron Main Process Hata Yönetimi
- **Uncaught Exception Handling**: Yakalanmamış istisnalar için global handler
- **Database Connection Errors**: Veritabanı bağlantı hatalarında graceful fallback
- **IPC Communication Errors**: Renderer-Main process arası iletişim hatalarında retry mekanizması

### Vue Frontend Hata Yönetimi
- **Global Error Handler**: Vue uygulaması seviyesinde hata yakalama
- **API Error Handling**: Database service çağrılarında hata yönetimi
- **User Feedback**: Kullanıcıya anlamlı hata mesajları gösterme

### SQLite Hata Yönetimi
```typescript
interface DatabaseErrorHandler {
  handleConnectionError(error: Error): void
  handleQueryError(error: Error, query: string): void
  handleTransactionError(error: Error): void
}
```

## Test Stratejisi

### İkili Test Yaklaşımı
Bu projede hem unit testler hem de property-based testler kullanılacaktır:

- **Unit testler**: Belirli örnekleri, edge case'leri ve hata durumlarını doğrular
- **Property testler**: Tüm girdiler boyunca evrensel özellikleri doğrular
- Her ikisi de kapsamlı kapsama için gerekli ve tamamlayıcıdır

### Unit Test Stratejisi
- **Electron Main Process**: Window oluşturma, IPC handlers, database initialization
- **Vue Components**: Component rendering, user interactions, state management
- **Database Operations**: Specific CRUD operations, schema validation
- **Build System**: Successful compilation, bundle generation

### Property-Based Test Stratejisi
- **Test Framework**: Jest + fast-check (JavaScript/TypeScript için)
- **Minimum 100 iterasyon** her property test için
- **Test Etiketleme**: Her test şu format ile etiketlenecek:
  - **Feature: personel-yonetimi-altyapi, Property {number}: {property_text}**

### Test Konfigürasyonu
```typescript
// Property test örneği
describe('Feature: personel-yonetimi-altyapi, Property 2: SQLite CRUD İşlemleri ve Kalıcılık', () => {
  test('CRUD operations preserve data across sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer(),
          name: fc.string(),
          data: fc.anything()
        }),
        async (testData) => {
          // Test implementation
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Test Kapsamı
- **Electron Process Tests**: Main process initialization, window management
- **Vue Component Tests**: Reactivity, TypeScript integration, Electron API access
- **Database Tests**: CRUD operations, error handling, data persistence
- **Build System Tests**: TypeScript compilation, Vue bundling, executable generation
- **Integration Tests**: End-to-end application flow, IPC communication