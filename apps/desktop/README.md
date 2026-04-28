# Desktop App (Tauri 2)

Tauri 2 shell wrapping the Web app. 复用 `apps/web` 的构建产物。

## M4 脚手架待补

```bash
# 在 apps/desktop 下运行
pnpm dlx create-tauri-app@latest
```

配置要点(M4 实施时):
- `tauri.conf.json` 的 `build.frontendDist` 指向 `../web/out` 或开发时指向 `http://localhost:3000`
- 启用 updater plugin,signing key 从 GitHub Secrets 注入
