#!/usr/bin/env bash
# Hook PostToolUse (Edit/Write) của Claude Code: định dạng và lint ngay file vừa sửa.
# - Prettier --write: tự sửa định dạng (tôn trọng .prettierignore).
# - ESLint (file .ts/.tsx/.js/.mjs/.cjs): còn lỗi thì thoát mã 2, lỗi được gửi lại cho Claude để sửa ngay.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$root" || exit 0

# Đường dẫn file lấy từ JSON hook nhận qua stdin (dùng node để không phụ thuộc jq).
file="$(node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try {
      const j = JSON.parse(s);
      process.stdout.write((j.tool_input && j.tool_input.file_path) || (j.tool_response && j.tool_response.filePath) || "");
    } catch {}
  });
')"

[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  "$root"/*) ;;
  *) exit 0 ;; # Ngoài repo: bỏ qua.
esac
case "$file" in
  */node_modules/* | */.next/* | */dist/*) exit 0 ;;
esac

node_modules/.bin/prettier --write --ignore-unknown --log-level warn "$file" >/dev/null 2>&1 || true

case "$file" in
  *.ts | *.tsx | *.js | *.mjs | *.cjs)
    if ! out="$(node_modules/.bin/eslint --max-warnings=0 --no-warn-ignored "$file" 2>&1)"; then
      {
        echo "ESLint báo lỗi trong ${file#"$root"/} (xem docs/huong-dan/quy-uoc-code.md). Sửa đúng nguyên nhân, không tắt luật:"
        echo "$out"
      } >&2
      exit 2
    fi
    ;;
esac
exit 0
