# Panduan Deploy Konverter Afresto Next di VPS Pribadi (Bersamaan dengan Bot WA & Discord)

Server ini berjalan di port lokal terpisah (`127.0.0.1:3845` secara default) tanpa dependensi `npm` luar, sehingga aman berdampingan dengan proses PM2 bot WhatsApp & Discord Anda.

## 1. Clone atau Perbarui Repo di VPS
Tempatkan folder proyek ini sejajar dengan folder bot Anda (misal di `/root/afresto-converter`):
```bash
git clone https://github.com/maulana1308/afresto-ai-assistant.git /root/afresto-converter
cd /root/afresto-converter/deploy/vps-converter
```

## 2. Atur `.env`
```bash
cp .env.example .env
nano .env
```
Isi `EXTRA_ENV_FILES=/path/ke/bot/.env` jika ingin langsung meminjam pool API key dari `.env` proyek Bot WA / Discord Anda di VPS, **atau** isi langsung `GEMINI_API_KEYS=AIzaKey1,AIzaKey2,...` (mendukung `GEMINI_API_KEY`, `GEMINI_API_KEYS`, serta `GEMINI_API_KEY_1..6`). Server otomatis melakukan rotasi round-robin dan failover ke key berikutnya jika salah satu key terkena limit `429`. Jika ingin melarang orang luar memakai kuota AI Anda, isi juga `CONVERTER_ACCESS_PIN=...` (kosongkan untuk mode publik *terima jadi*).

## 3. Jalankan dengan PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
```
Cek statusnya:
```bash
pm2 status afresto-converter
curl -s http://127.0.0.1:3845/api/health
```

## 4. Hubungkan ke Domain via Nginx + SSL Gratis (Certbot)
- Gunakan **OPSI 1** di `nginx.conf.example` bila memakai subdomain (misal `konverter.domainanda.com` — jangan lupa tambahkan DNS `A Record` subdomain tersebut ke IP VPS Anda).
- Atau gunakan **OPSI 2** bila ingin menumpang di `https://domainanda.com/konverter/`.
- Uji dan terapkan HTTPS:
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d konverter.domainanda.com
  ```
