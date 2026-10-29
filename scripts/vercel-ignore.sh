#!/usr/bin/env bash
# "Ignored Build Step" của Vercel: quyết định có build dự án hay không.
#   exit 0 → BỎ QUA build      exit 1 → BUILD
#
# Cách dùng (trong vercel.json của từng ứng dụng):
#   "ignoreCommand": "bash ../../scripts/vercel-ignore.sh apps/api"
#
# Chỉ build khi có thay đổi trong thư mục của ứng dụng, trong packages/, hoặc trong file cấu hình
# chung ở thư mục gốc. Không chắc chắn thì luôn build (an toàn hơn bỏ sót).

set -u
APP_DIR="${1:?Thiếu đường dẫn ứng dụng, ví dụ apps/api}"

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo ../..)" || exit 1

# Commit do GitHub Actions tự tạo (chỉ cập nhật file khóa / migration) trên nhánh pull request:
# commit trước đó của nhánh đã được build, nên bỏ qua để tiết kiệm lượt build.
if [[ "${VERCEL_GIT_COMMIT_REF:-}" != "main" && "${VERCEL_GIT_COMMIT_MESSAGE:-}" == "Cập nhật file sinh tự động từ CI"* ]]; then
  echo "Bỏ qua: commit sinh tự động từ CI."
  exit 0
fi

PREVIOUS="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [[ -z "$PREVIOUS" ]]; then
  echo "Build: chưa có bản build trước để so sánh."
  exit 1
fi

# Vercel tải repo dạng nông; lấy thêm commit trước nếu thiếu.
if ! git cat-file -e "$PREVIOUS^{commit}" 2>/dev/null; then
  git fetch --quiet --depth=50 origin "$PREVIOUS" 2>/dev/null || true
fi
if ! git cat-file -e "$PREVIOUS^{commit}" 2>/dev/null; then
  echo "Build: không tìm thấy commit $PREVIOUS để so sánh."
  exit 1
fi

PATHS=(
  "$APP_DIR"
  packages
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  scripts/vercel-ignore.sh
)

if git diff --quiet "$PREVIOUS" HEAD -- "${PATHS[@]}"; then
  echo "Bỏ qua: không có thay đổi liên quan tới $APP_DIR kể từ $PREVIOUS."
  exit 0
fi

echo "Build: có thay đổi liên quan tới $APP_DIR."
exit 1
