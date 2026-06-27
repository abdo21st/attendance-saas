<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment

## Coolify (baitak.mtapp.ly)

### Docker Compose (recommended)
1. Push the `payroll-system/` folder to a Git repository
2. In Coolify: New Resource → Docker Compose
3. Point to the repo, set the file path to `docker-compose.yml`
4. Set environment variables in Coolify UI:
   - `DATABASE_URL=postgresql://postgres:123@postgres:5432/payroll_system`
   - `AUTH_SECRET=<generate a random secret>`
   - `NEXTAUTH_URL=https://baitak.mtapp.ly`
   - `POSTGRES_PASSWORD=123`
5. Deploy

### Dockerfile only (if using external PostgreSQL)
1. Push code to Git repo
2. In Coolify: New Resource → Docker
3. Point to repo
4. Set environment variables (excluding POSTGRES_*)
5. Add `NEXTAUTH_URL` so NextAuth works behind the reverse proxy
