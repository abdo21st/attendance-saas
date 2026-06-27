import { prisma } from "./prisma"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs/promises"

const execAsync = promisify(exec)
const BACKUPS_DIR = path.join(process.cwd(), "backups")

export async function createBackup(): Promise<string> {
  await fs.mkdir(BACKUPS_DIR, { recursive: true })

  const dbUrl = new URL(process.env.DATABASE_URL || "postgresql://postgres:123@localhost:5432/payroll_system")
  const filename = `backup_${Date.now()}.sql`
  const filepath = path.join(BACKUPS_DIR, filename)

  const { stdout, stderr } = await execAsync(
    `pg_dump --dbname="${process.env.DATABASE_URL}" --file="${filepath}" --format=p --no-owner --no-acl`
  )

  const stat = await fs.stat(filepath)

  await prisma.backup.create({
    data: {
      filename,
      fileSize: stat.size,
      backupType: "manual",
      status: "completed",
    },
  })

  return filename
}

export async function restoreBackup(filename: string): Promise<void> {
  const filepath = path.join(BACKUPS_DIR, filename)

  await fs.access(filepath)

  await execAsync(`psql "${process.env.DATABASE_URL}" < "${filepath}"`)
}

export async function listBackups() {
  return prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  })
}
