# Triển khai đầy đủ, tên miền và backup

## Chọn mô hình

| Mô hình                | Database         | Gợi ý sử dụng                                            |
| ---------------------- | ---------------- | -------------------------------------------------------- |
| Next.js + SQLite       | File trên volume | Một instance, cấu hình nhỏ                               |
| Next.js + PostgreSQL   | Database riêng   | Production có nhiều instance                             |
| iNET tĩnh + Node riêng | DB ở Node        | Giữ frontend trên OneSite, kết nối API công khai có CORS |

Không dùng Cloudflare Workers/Sites làm runtime trực tiếp của bản Node này: tính năng ping sử dụng TCP qua `node:net`. Bản tĩnh iNET không phụ thuộc runtime server.

## PostgreSQL mới

Bản mặc định dùng SQLite. `prisma/schema.postgres.prisma` và `prisma/migrations-postgres/` chứa schema và migration khởi tạo PostgreSQL tương ứng. Chọn provider trước khi generate client, migrate và build:

```dotenv
DB_PROVIDER="postgres"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
APP_URL="https://DOMAIN-THAT-CUA-BAN"
```

```bash
npm run db:use-postgres
npm run db:setup
npm run build
npm start
```

URL trên là mẫu. Dùng connection string thật của database bạn quản lý; không commit `.env`. Script chọn provider chỉ thay source schema/migration được dùng, không tự đọc/chuyển dữ liệu SQLite sang PostgreSQL. Dùng database PostgreSQL trống khi khởi tạo; dữ liệu cũ cần quy trình export/import riêng và backup trước.

Script lưu lại schema/migrations của provider hiện tại trước khi chuyển. Với các thay đổi schema sau này, dùng Prisma Migrate tương ứng môi trường; không áp dụng lịch sử SQLite vào PostgreSQL.

## Railway qua GitHub

1. Tạo repository thực, đẩy nhánh `main`, rồi tạo service từ repository đó trong Railway.
2. Railway đọc `railway.json` và `Dockerfile`. Không chọn nhánh `inet` cho backend.
3. Với PostgreSQL, thêm database service và dùng biến tham chiếu `DATABASE_URL` do Railway cung cấp. Đặt `DB_PROVIDER=postgres` từ trước build; Dockerfile có `ARG DB_PROVIDER` để chọn đúng schema.
4. Với SQLite, đặt `DB_PROVIDER=sqlite`, `DATABASE_URL=file:/data/network.db`, gắn volume tại `/data`, kiểm tra quyền ghi của user Node và giữ một replica.
5. Đặt `APP_URL` là URL HTTPS mà bạn thực sự dùng để mở backend. Các biến server/Discord/store có thể cấu hình bằng env hoặc admin. Trên production, cookie phiên có Secure nên cần HTTPS.
6. Lần đầu cần dữ liệu mẫu, đặt `SEED_DEMO_ON_BOOT=true`. Sau khi khởi tạo, đổi lại false để không tạo lại nội dung seed đã xóa. Migration vẫn chạy ở mỗi lần khởi động; không dùng `migrate dev` trong production.
7. Tạo admin qua terminal/SSH của service bằng `npm run admin:create` với `ADMIN_EMAIL`/`ADMIN_PASSWORD` được đặt tạm thời. Xóa password khỏi biến runtime sau khi tạo. Không có mật khẩu mặc định.
8. Đợi deployment đạt **SUCCESS** và `/api/health` trả HTTP 200 trước khi kết luận service chạy. Kiểm tra log có giới hạn, tránh ghi secret vào log.

Docker runtime chạy user `node`, phục vụ standalone output cùng `public/` và `_next/static/`. Chưa chạy Docker image hoặc triển khai tài khoản Railway trong lần bàn giao này; build Node, schema và integration tests là bằng chứng kiểm tra ở máy phát triển.

## Domain ryuuworl.id.vn và HTTPS

Chỉ thực hiện khi bạn muốn xuất bản:

1. Trong service Railway, tạo generated domain để kiểm tra trước; dùng đúng target port được service cung cấp.
2. Thêm custom domain `ryuuworl.id.vn` hoặc subdomain backend đã chọn.
3. Sao chép chính xác các bản ghi xác minh/CNAME/A/ALIAS mà Railway hiển thị sang trang DNS của iNET. Không dùng địa chỉ IP tự suy đoán. Apex có thể cần loại bản ghi khác CNAME tùy DNS provider; làm theo yêu cầu hiện tại của hai dịch vụ.
4. Chờ DNS và chứng chỉ HTTPS được xác minh. Sửa `APP_URL` thành domain cuối cùng và redeploy nếu env thay đổi.
5. Kiểm tra cookie/login, metadata, sitemap, ticket và server status trên domain cuối cùng.
6. Muốn `www`, thêm riêng domain đó và bản ghi tương ứng; thiết lập redirect canonical ở hosting khi cần.

Nếu apex đang phục vụ OneSite, giữ apex ở iNET và dùng subdomain riêng cho backend. `STATIC_SITE_ORIGIN=https://ryuuworl.id.vn` chỉ cần khi frontend tĩnh gọi API từ origin khác.

`SERVER_IP` là endpoint Minecraft Java, không phải URL website. Một domain website mới mua chưa tạo Minecraft game server.

## Biến môi trường

- `DATABASE_URL`, `DB_PROVIDER`, `APP_URL`: runtime/build/database.
- `SERVER_NAME`, `SERVER_IP`, `SERVER_PORT`, `SERVER_VERSION`: mặc định website/Minecraft.
- `DEMO_MODE=true`: giữ nhãn mẫu cho tới khi có host thật.
- `DISCORD_INVITE`, `DISCORD_GUILD_ID`: link mời và widget ID; Discord phải bật widget công khai.
- `STORE_URL`: `/store` hoặc URL HTTPS cửa hàng thật.
- `STATS_INGEST_TOKEN`: tối thiểu 32 ký tự, chỉ server/plugin giữ.
- `STATIC_SITE_ORIGIN`: một origin frontend tĩnh chính xác, không `/` cuối.
- `TRUST_PROXY=true`: chỉ bật khi reverse proxy ghi đè X-Forwarded-For đáng tin cậy. Mặc định rate limit theo một nhóm chung.
- `ALLOW_PRIVATE_MC_HOST=true`: chỉ khi cố ý ping host nội bộ đã cấu hình trong mạng tin cậy; mặc định chặn loopback, private và metadata.

`.env.example` liệt kê đầy đủ. Database configuration trong admin ghi đè các giá trị mặc định công khai, không chứa secret.

## Backup và khôi phục

SQLite dùng backup API để có snapshot nhất quán:

```bash
python3 scripts/backup-sqlite.py backups
```

Script đọc `DATABASE_URL` từ môi trường đang export; nếu không đặt, dùng `prisma/dev.db`. Nó không tự đọc `.env`. Với production, chạy ở môi trường đã có `DATABASE_URL`. Chuyển backup ra nơi lưu trữ riêng có kiểm soát truy cập, vì DB có email/ticket/session hash. Không commit backup vào Git.

Khôi phục SQLite: dừng app, sao lưu file đang dùng, chép backup đến đúng `DATABASE_URL`, kiểm tra quyền ghi, rồi khởi động và gọi `/api/health`. Không ghi đè file khi app đang hoạt động.

PostgreSQL có thể dùng backup được quản lý của nhà cung cấp hoặc công cụ PostgreSQL:

```bash
pg_dump --dbname="$DATABASE_URL" --format=custom --file=network-backup.dump
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner network-backup.dump
```

Chỉ khôi phục vào database đích đã chuẩn bị, sau khi kiểm tra backup và phạm vi dữ liệu; ví dụ không dùng tùy chọn xóa đối tượng tự động. Nên thử phục hồi vào staging trước. Giữ chính sách retention và sao lưu ngoài instance.

## CI và cập nhật

`.github/workflows/ci.yml` chạy database setup, typecheck, lint, unit/integration tests, build, Playwright và static export trên GitHub Actions. Workflow chỉ kiểm tra/đính kèm artifact, không tự deploy.

Trước khi cập nhật production: backup database, kiểm tra CI, áp dụng migration tương thích, xem log/health và giữ bản nguồn trước đó để rollback. Hạ phiên bản code không tự đảo ngược migration dữ liệu.

Nguồn hướng dẫn nền tảng: https://docs.railway.com/builds/railpack, https://docs.railway.com/cli/deploying, https://docs.railway.com/deployments/monorepo và https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production. Thao tác domain/DNS phải theo giá trị mà tài khoản của bạn hiển thị lúc cấu hình.
