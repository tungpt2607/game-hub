import { schema, type Database } from '@opes/db';

/** Ghi nhật ký thao tác quản trị. Không bao giờ ghi mật khẩu hay mã phiên vào `data`. */
export async function audit(
  db: Database,
  entry: {
    userId: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(schema.auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    data: entry.data ?? null,
  });
}
