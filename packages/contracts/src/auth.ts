import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email không hợp lệ.')
  .max(254, 'Email quá dài.');

const name = z
  .string()
  .trim()
  .min(1, 'Hãy nhập tên.')
  .max(100, 'Tên tối đa 100 ký tự.');

export const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu tối thiểu ${PASSWORD_MIN_LENGTH} ký tự.`)
  .max(PASSWORD_MAX_LENGTH, `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`);

export const UserRoleSchema = z.enum(['admin', 'operator', 'redeemer', 'viewer']);
export const UserStatusSchema = z.enum(['active', 'disabled']);

/** Thông tin tài khoản trả về cho CMS (không bao giờ có mật khẩu). */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  mustChangePassword: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// ---------- Thiết lập lần đầu ----------

export const SetupStatusSchema = z.object({ needsSetup: z.boolean() });
export type SetupStatus = z.infer<typeof SetupStatusSchema>;

export const SetupRequestSchema = z.object({ name, email, password: PasswordSchema });
export type SetupRequest = z.infer<typeof SetupRequestSchema>;

// ---------- Đăng nhập ----------

export const LoginRequestSchema = z.object({
  email,
  password: z.string().min(1, 'Hãy nhập mật khẩu.').max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const MeResponseSchema = z.object({ user: UserSchema });
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Hãy nhập mật khẩu hiện tại.').max(PASSWORD_MAX_LENGTH),
    newPassword: PasswordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    path: ['newPassword'],
  });
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// ---------- Quản lý tài khoản ----------

export const UserListResponseSchema = z.object({
  users: z.array(UserSchema),
  /** Số quản trị viên đang hoạt động; CMS nhắc nhở khi chỉ còn 1. */
  activeAdminCount: z.number().int(),
});
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

export const UserCreateRequestSchema = z.object({ name, email });
export type UserCreateRequest = z.infer<typeof UserCreateRequestSchema>;

export const UserUpdateRequestSchema = z
  .object({ name: name.optional(), status: UserStatusSchema.optional() })
  .refine((v) => v.name !== undefined || v.status !== undefined, {
    message: 'Không có thay đổi nào.',
  });
export type UserUpdateRequest = z.infer<typeof UserUpdateRequestSchema>;

/** Mật khẩu tạm chỉ trả về một lần, cho người vừa tạo hoặc đặt lại. */
export const TemporaryPasswordResponseSchema = z.object({
  user: UserSchema,
  temporaryPassword: z.string(),
});
export type TemporaryPasswordResponse = z.infer<typeof TemporaryPasswordResponseSchema>;
