dev:
    cargo tauri dev

# 清理前端构建、tauri缓存、rust编译产物
clean:
    rm -rf dist .tauri
    cd src-tauri && cargo clean
    echo "✅ 轻度清理完成"

build:
    cargo tauri build
