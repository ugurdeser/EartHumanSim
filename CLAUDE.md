# Takılmaca

Tarayıcıda çalışan simülasyon (Vite + saf JS, canvas). Backend yok; `npm run build` → `dist/` statik dosyalar.

## Ev sunucusu (2026-10-30 itibarıyla)

- SSH: `ssh ugur@192.168.1.58` (anahtarla giriş; otomasyonda `-o BatchMode=yes`). Hostname `ugur-lenovo-laptop`, Tailscale IP `100.114.130.29`.
- Ubuntu 26.04.1 LTS, 8 çekirdek, ~5 GB RAM, 468 GB disk.
- `sudo` şifre istiyor → etkileşimsiz çalıştırılamaz (ufw durumu vb. bilinmiyor).
- 80/443 portlarını Docker'daki `panini-nginx` konteyneri tutuyor. Sistemdeki nginx kurulu ama kapalı — açılmamalı, port çakışır.
- Compose projesi: `~/myserver/docker-compose.yml` (db = MSSQL 127.0.0.1:1433, backend = panini-backend .NET, nginx). Düzenlemeden önce `.bak` yedeği alınıyor.
- nginx ayarı: `~/myserver/nginx/nginx.conf` (ro mount), sertifikalar `~/myserver/nginx/certs`, statik siteler `~/myserver/sites/<domain>` → `/var/www/<domain>`.
- Yayındaki siteler: api.pantakas.com (proxy → backend:8080), yigitharita.com, ugurkoc.tr, blog.ugurkoc.tr, studio.ugurkoc.tr.
- Yeni statik site eklemek: `sites/` altına klasör + compose'a volume satırı + `nginx.conf`'a server bloğu → `docker exec panini-nginx nginx -t` → `docker compose up -d nginx`.
- Ayrıca çalışanlar: ServerTakip agent (`~/ServerTakip`), fail2ban, tailscaled.
- Gizli bilgiler `.env` dosyalarında / compose ortam değişkenlerinde — okunmamalı.

## Deploy düzeni

Diğer siteler self-hosted GitHub Actions runner'larla deploy ediliyor (`~/actions-runner-*`, her repo için ayrı runner). Örnek: SpaceStyleBlog `.github/workflows/deploy.yml`:

- `main`'e push + `workflow_dispatch` ile tetiklenir, `concurrency: deploy` + `cancel-in-progress: true`
- `runs-on: self-hosted`
- checkout → `npm ci` → build → `rsync -a --delete <çıktı>/ /home/ugur/myserver/sites/<site>/` → özet adımı
- Adım adları ve yorumlar Türkçe. Klasör nginx'e mount'lu olduğu için yeniden başlatma gerekmiyor.

Takılmaca için plan: `~/myserver/sites/takilmaca` + yalnızca yerel ağ/Tailscale için 8090 portu (`http://192.168.1.58:8090`). Henüz uygulanmadı.
