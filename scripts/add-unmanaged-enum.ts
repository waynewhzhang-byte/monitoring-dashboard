/**
 * 为 DeviceStatus 枚举添加 UNMANAGED 值
 * 用法: npm run add-unmanaged-enum 或 ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/add-unmanaged-enum.ts
 */
import { PrismaClient } from '@prisma/client';

const sql = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'DeviceStatus' AND e.enumlabel = 'UNMANAGED'
  ) THEN
    ALTER TYPE "DeviceStatus" ADD VALUE 'UNMANAGED';
  END IF;
END
$$;
`;

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✓ DeviceStatus 枚举已添加 UNMANAGED，或已存在');
  } catch (e) {
    console.error('执行失败:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
