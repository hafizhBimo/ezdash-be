# Deployment Guide - Ubuntu + PM2 + Nginx (Backend & Frontend)

Panduan ini menjelaskan langkah-langkah untuk menyebarkan (deploy) aplikasi **EZDASH** ke server Ubuntu.

---

## 🌐 Konfigurasi DNS (Subdomain)

Sebelum memulai deployment di server, Anda harus mengarahkan subdomain Anda ke IP publik server:
1. Masuk ke DNS Manager tempat domain `johndoe.space` Anda dikelola (misalnya Cloudflare, Niagahoster, dll).
2. Tambahkan **A Record** baru:
   - **Tipe**: `A`
   - **Nama**: `ezdash` (akan membentuk subdomain `ezdash.johndoe.space`)
   - **IPv4 Address**: IP Publik server Ubuntu Anda (IP yang sama dengan domain portofolio utama Anda).
   - **TTL**: Auto / default.

---

## 🛠️ Prasyarat Server

Jalankan perintah berikut di server Ubuntu Anda untuk mengupdate sistem dan menginstal dependensi dasar:

```bash
# Update package list & upgrade packages
sudo apt update && sudo apt upgrade -y

# Install tools dasar
sudo apt install -y curl git gnupg ca-certificates

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 secara global
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL 17 (atau versi default sistem)
sudo apt install -y postgresql postgresql-contrib
```

---

## 1. Setup Database PostgreSQL

```bash
# Akses PostgreSQL shell sebagai user postgres
sudo -u postgres psql

# Buat database dan user baru
CREATE USER ezdash_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE ezdash OWNER ezdash_user;
GRANT ALL PRIVILEGES ON DATABASE ezdash TO ezdash_user;
\q
```

---

## 2. Struktur Folder & Deploy Backend

Karena kita men-deploy aplikasi ini di dalam home directory (`~/apps/ezdash`), kita tidak memerlukan hak akses `sudo` untuk mengelola folder atau dependencies aplikasi:

```bash
# Buat folder root aplikasi di home directory
mkdir -p ~/apps/ezdash
cd ~/apps/ezdash

# Clone repositori backend ke folder ezdash-be
git clone <backend_repo_url> ezdash-be
cd ezdash-be

# Install dependencies backend
npm install --omit=dev

# Buat file konfigurasi environment
nano .env
```

Isi file `.env` untuk backend:
```env
PORT=5001
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ezdash
DB_USER=ezdash_user
DB_PASSWORD=your_secure_password
JWT_SECRET=ganti_dengan_random_string_panjang_dan_aman_min_64_char
JWT_EXPIRES_IN=8h
```

Jalankan migrasi database dan seeders data default:
```bash
# Jalankan migrasi dan seeder default
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

---

## 3. Deploy & Build Frontend

```bash
cd ~/apps/ezdash

# Clone repositori frontend ke folder ezdash-fe
git clone <frontend_repo_url> ezdash-fe
cd ezdash-fe

# Install dependencies frontend
npm install

# Konfigurasi base API URL untuk production menggunakan subdomain Anda
# Buat file .env dan masukkan URL API subdomain Anda
echo "VITE_API_URL=https://ezdash.hafizhbimo.space/api" > .env

# Jalankan build produksi
npm run build
# Hasil build akan berada di folder ~/apps/ezdash/ezdash-fe/dist
```

---

## 4. PM2 Process Manager

Buat file konfigurasi PM2 di `~/apps/ezdash/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: 'ezdash-backend',
      script: './ezdash-be/src/app.js',
      cwd: '/home/your_username/apps/ezdash', // Ganti 'your_username' dengan username server Anda (bisa cek dengan perintah `whoami`)
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      env_file: './ezdash-be/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      max_memory_restart: '500M'
    }
  ]
};
```

Jalankan backend dengan PM2:
```bash
# Buat folder log
mkdir -p ~/apps/ezdash/logs

# Jalankan proses
cd ~/apps/ezdash
pm2 start ecosystem.config.cjs

# Konfigurasi PM2 agar otomatis berjalan saat server reboot
pm2 save
pm2 startup
# Eksekusi perintah output yang dihasilkan oleh 'pm2 startup' di terminal Anda
```

---

## 5. Nginx Server Block Configuration

Buat file konfig baru di `/etc/nginx/sites-available/ezdash`:

```nginx
server {
    listen 80;
    server_name ezdash.hafizhbimo.space;

    # Frontend static files
    root /home/your_username/apps/ezdash/ezdash-fe/dist; # Ganti 'your_username' dengan username server Anda
    index index.html;

    # Serve React SPA (forward all routes to index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Limit upload Excel berukuran besar (15MB)
        client_max_body_size 15M;
        proxy_read_timeout 120s;
    }
}
```

Aktifkan konfigurasi Nginx baru dan hapus konfigurasi *default* agar tidak terjadi konflik:

```bash
# Aktifkan site ezdash
sudo ln -s /etc/nginx/sites-available/ezdash /etc/nginx/sites-enabled/

# Nonaktifkan default site Nginx
sudo rm -f /etc/nginx/sites-enabled/default

# Test konfigurasi dan reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL / HTTPS dengan Certbot (Rekomendasi)

Untuk mengamankan koneksi menggunakan HTTPS secara gratis menggunakan Let's Encrypt:

```bash
# Install Certbot untuk Nginx
sudo apt install -y certbot python3-certbot-nginx

# Jalankan certbot untuk otomatis mengkonfigurasi SSL Nginx pada subdomain
sudo certbot --nginx -d ezdash.hafizhbimo.space
```

---

## 7. Pemantauan & Verifikasi

```bash
# Memeriksa status proses PM2
pm2 status

# Melihat log real-time backend
pm2 logs ezdash-backend --lines 50

# Memeriksa log error Nginx jika frontend tidak bisa diakses
sudo tail -n 50 -f /var/log/nginx/error.log
```
