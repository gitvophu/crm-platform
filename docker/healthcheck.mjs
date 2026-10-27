// Healthcheck của compose: thoát 0 khi URL trả 2xx. Image slim không có curl nên dùng fetch của Node.
// Dùng: node docker/healthcheck.mjs http://localhost:3000/health
const url = process.argv[2];

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
