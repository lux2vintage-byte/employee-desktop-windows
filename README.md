# Personel Yönetimi Uygulaması

ElectronJS, Vue3 ve SQLite teknolojilerini kullanarak geliştirilmiş masaüstü personel yönetimi uygulaması.

## Teknoloji Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Desktop Framework**: ElectronJS
- **Database**: SQLite3 (gömülü)
- **Build Tool**: Vite + Electron Builder
- **Test Framework**: Jest + Vitest
- **State Management**: Pinia

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
cd src/renderer && npm install
```

2. Geliştirme modunda çalıştırın:
```bash
npm run dev
```

## Geliştirme Komutları

- `npm run dev` - Geliştirme modunda uygulamayı başlat
- `npm run build` - Uygulamayı derle
- `npm run build:app` - Dağıtım için paketlenmiş uygulama oluştur
- `npm test` - Testleri çalıştır
- `npm run test:watch` - Testleri izleme modunda çalıştır

## Proje Yapısı

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
│   │   │   └── types/       # TypeScript tipleri
│   │   └── vite.config.ts
│   └── preload/             # Preload scripts
├── tests/                   # Test dosyaları
├── dist/                    # Build çıktıları
└── package.json
```

## Lisans

MIT