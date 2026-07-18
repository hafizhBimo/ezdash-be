# EZDASH - Backend API

REST API Server untuk aplikasi **EZDASH** (Stock & Consignment Monitoring Dashboard). Dibangun menggunakan **Node.js + Express.js** dan **Sequelize ORM** dengan database **PostgreSQL**.

---

## 🚀 Fitur Utama

- **JWT Authentication** dengan role-based access control (Admin & Management).
- **Import/Upload File Excel** harian (`.xlsx`) dengan validasi data dan log status otomatis.
- **Pembersihan Otomatis** pada folder temporary `uploads/` setelah proses import selesai.
- **Statistik Dashboard**: Penyediaan data agregasi (SOH, COH, Total SKU, Inventory Value, Coverage Days).
- **Grafik Interaktif**: Data agregasi untuk Apache ECharts (stok per gudang, top vendor, klasifikasi ABC, dsb).
- **Monitoring Table API**: Query pencarian, filter (gudang, vendor, tipe stok, status), pengurutan, dan paginasi server-side.

---

## 🛠️ Prasyarat

Sebelum memulai, pastikan perangkat Anda telah terinstall:
- **Node.js** (v18.x atau v20.x LTS)
- **npm** atau **yarn**
- **PostgreSQL** (v15 atau lebih baru)

---

## ⚙️ Cara Instalasi & Setup

### 1. Clone & Install Dependencies
Masuk ke dalam directory `backend` dan jalankan install:
```bash
cd backend
npm install
```

### 2. Konfigurasi Environment Variables (`.env`)
Buat file bernama `.env` di root directory `backend/` dan sesuaikan konfigurasinya:
```env
PORT=5001
NODE_ENV=development

# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ezdash
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Authentication JWT
JWT_SECRET=generate_random_secret_key_yang_panjang_dan_aman_123!
JWT_EXPIRES_IN=8h
```

### 3. Migrasi Database & Seeding
Jalankan migrasi tabel database dan masukkan data seeder default (untuk admin & management users):
```bash
# Menjalankan migrasi database
npm run db:migrate

# Menjalankan seeders data default
npm run db:seed
```

*(Untuk membatalkan migrasi terakhir, gunakan perintah `npm run db:undo`)*

---

## 🖥️ Menjalankan Aplikasi

### Mode Development (dengan Nodemon auto-reload)
```bash
npm run dev
# Server akan berjalan di http://localhost:5001
```

### Mode Production
```bash
npm start
```

---

## 📁 Struktur Folder Backend

```
backend/
├── config/             # Konfigurasi database untuk Sequelize CLI
├── migrations/         # File skema database (5 tabel utama)
├── seeders/            # Data inisial user untuk setup awal
├── uploads/            # Folder penyimpanan sementara file excel (auto-clean)
└── src/
    ├── app.js          # Entry point utama aplikasi Express
    ├── config/         # Konfigurasi sequelize instance (db.js)
    ├── controllers/    # Handler request HTTP (Auth, Dashboard, Upload, dll)
    ├── middleware/     # Auth guard, Logger, Centralized Error Handler
    ├── models/         # Definis Model DB (User, MasterItem, Snapshot, dll)
    ├── repositories/   # Lapisan database query (Repository Pattern)
    ├── routes/         # Routing API
    ├── services/       # Business logic layer
    └── utils/          # customError handler dan schema validator
```

---

## 🔌 API Endpoints

Semua endpoint diawali dengan prefix `/api`.

| HTTP Method | Endpoint | Keterangan | Autentikasi | Role |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Login user untuk mendapatkan JWT Token | Public | - |
| **POST** | `/api/upload` | Upload & import file Excel data harian | Required | `ADMIN` |
| **GET** | `/api/upload/history` | Mengambil riwayat pengunggahan file | Required | `ADMIN`, `MANAGEMENT` |
| **GET** | `/api/dashboard/summary` | Mengambil data KPI Cards summary | Required | `ADMIN`, `MANAGEMENT` |
| **GET** | `/api/dashboard/charts` | Mengambil dataset untuk grafik ECharts | Required | `ADMIN`, `MANAGEMENT` |
| **GET** | `/api/monitoring` | Mendapatkan data tabel stock monitoring | Required | `ADMIN`, `MANAGEMENT` |
| **GET** | `/api/usages` | Mendapatkan log history usage stok | Required | `ADMIN`, `MANAGEMENT` |
| **GET** | `/api/settings` | Mendapatkan konfigurasi sistem global | Required | `ADMIN`, `MANAGEMENT` |

---

## 🔑 Kredensial Pengguna Default

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `Admin123` |
| **Management** | `management` | `Mgt123` |

> ⚠️ **PENTING**: Segera ubah kata sandi default setelah Anda berhasil melakukan deployment di lingkungan production demi keamanan data Anda.
