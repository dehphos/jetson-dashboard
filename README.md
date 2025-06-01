# Abyss Dashboard

Abyss Dashboard, yerel ağ taraması ve sistem bilgileri sunmak üzere tasarlanmış bir Electron.js uygulamasıdır. Proje Electron, Node.js ve çeşitli ağ kütüphaneleriyle geliştirilmiştir.

## 🚀 Özellikler

- Yerel ağ IP taraması (evilscan ile)
- Varsayılan ağ geçidi tespiti (default-gateway ile)
- Veri sıkıştırma (pako ile)
- API talepleri (node-fetch ile)
- Taşınabilir Windows sürümü
- macOS için DMG & ZIP çıktısı

## 📦 Genel Gereksinimler

- Node.js >= 16.x
- Git (klonlama ve paket kurulumu için)
- macOS >= 11.6.0 veya Windows işletim sistemi (hedef platforma göre)

##  macOS özel gereksinimler:

- Xcode
- Python >= 3.7

> **Not:**  
> macOS uygulamaları sadece **macOS üzerinde**,  
> Windows `.exe` dosyaları ise sadece **Windows üzerinde** üretilebilir.

## 🔧 Kurulum

Projeyi klonlayın ve bağımlılıkları yükleyin:

```bash
git clone https://github.com/dehphos/jetson-dashboard.git
cd jetson-dashboard
npm install
```

## ▶️ Geliştirme Modunda Çalıştırma

Uygulamayı geliştirme modunda başlatmak için:

```bash
npm start
```

## 🛠 Derleme

Uygulamanın dağıtılabilir sürümünü oluşturmak için `electron-builder` kullanılır. Aşağıdaki komutları işletim sisteminize göre çalıştırabilirsiniz:

### Windows için

```bash
npx electron-builder --win
```

Bu işlem sonunda `dist/` klasöründe `.exe` uzantılı taşınabilir bir uygulama dosyası oluşur.

### macOS için

```bash
npx electron-builder --mac
```

Bu işlem sonunda `dist/` klasöründe `.dmg` ve `.zip` uzantılı dosyalar oluşur.

> Not: macOS kurulumu sırasında hata yaşanırsa [Bu tutorial](https://www.electronjs.org/docs/latest/development/build-instructions-macos) önerilir.

## 📁 Dosya Yapısı

```
/
│   .gitignore
│   chart.min.js
│   index.html
│   jetson_ipsi_bulma.js
│   main.js
│   package-lock.json
│   package.json
│   preload.js
│   README.md
│   renderer.js
│   style.css
│
├── build/
│   ├── icon.icns
│   └── icon.ico
│
├── jetsonDashboardv1/
│   ├── index.html
│   ├── jetson_ipsi_bulma.js
│   ├── main.js
│   ├── package-lock.json
│   ├── package.json
│   ├── preload.js
│   ├── renderer.js
│   └── style.css
│
└── jetsonDashboardv2/
    ├── index.html
    ├── jetson_ipsi_bulma.js
    ├── main.js
    ├── package-lock.json
    ├── package.json
    ├── preload.js
    ├── renderer.js
    └── style.css
```

## 👨‍💻 Geliştirici

**Efe Batman**  
[GitHub Profilim](https://github.com/dehphos)



