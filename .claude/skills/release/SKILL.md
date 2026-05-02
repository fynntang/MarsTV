---
name: release
description: Version release for MarsTV monorepo — bumps all package versions to {YYMMDD[a-z]} format, commits, tags, and pushes. Use when the user asks to "release", "publish a version", "cut a release", "bump version", or "打版本/发布版本".
---

# Release

MarsTV monorepo 版本发布流程。统一更新所有 workspace 包的版本号，自动递增后缀，commit + tag + push。

## Workspace 包列表

版本发布涉及以下全部 `package.json`，缺一不可：

```
package.json                     # root
apps/desktop/package.json        # @marstv/desktop
apps/mobile/package.json         # @marstv/mobile
apps/web/package.json            # @marstv/web
packages/config/package.json     # @marstv/config
packages/core/package.json       # @marstv/core
packages/ui-native/package.json  # @marstv/ui-native
packages/ui-shared/package.json  # @marstv/ui-shared
packages/ui-web/package.json     # @marstv/ui-web
```

## 前置条件

### 0. 检查是否为 fork 仓库

**Release 只允许在主仓库执行，不允许在 fork 仓库执行。** 检测方法：

```bash
git remote -v
```

如果存在 `upstream` 远程（即 `origin` 是 fork），立即停止，告诉用户："当前仓库是 fork（origin=fork, upstream=主仓库）。Release 必须在主仓库执行，请在主仓库目录下操作。"

如果只有 `origin`（没有 `upstream`），则认为是主仓库，继续。

### 1. 检查分支

**Release 只允许在 `main` 分支执行。**

```bash
git branch --show-current
```

- 如果当前分支**不是** `main`，立即停止，告诉用户："必须先合并到 `main` 分支才能 release。当前分支：`xxx`。"
- 如果当前分支是 `main`，继续。

### 2. 同步 main

确保 `main` 是最新的：

```bash
git fetch origin && git pull origin main
```

如果有未拉取的更新，先拉取。如果有冲突，停止并让用户处理。

## 流程

### 3. 确定版本号

- 取今天日期，格式 `YYMMDD`（如 2026/05/02 → `260502`）
- 查看现有 git tag 中是否有以 `v{YYMMDD}` 开头的
- 取下一个可用后缀字母：`a` → `b` → `c` ... → `z`
- 如果当天还没有任何 release tag，后缀从 `a` 开始
- 组装为 `{YYMMDD}{suffix}`（如 `260502a`）

```bash
git tag | grep "^v$(date +%y%m%d)"
```

**后缀递增规则**：
- 无匹配 → `a`
- 已有 `v260502a` → `b`
- 已有 `v260502a`, `v260502b` → `c`

### 4. 更新版本号

对每个 workspace 包的 `package.json`，将 `"version"` 字段替换为新版本号。

**必须全部 9 个包都更新，不允许遗漏。**

### 5. 提交

```bash
git add package.json apps/*/package.json packages/*/package.json
git commit -m "chore: release v<version>"
```

### 6. 打 tag

```bash
git tag -a v<version> -m "v<version>"
```

使用 annotated tag，格式：`v{version}`（如 `v260502a`）。

### 7. 推送

推送前确认用户同意。先推送到 `origin`，再同步到 `upstream`（如果存在）。

```bash
git push origin HEAD
git push origin v<version>
```

如果配置了 `upstream` 远程，同步推送 tag：

```bash
git push upstream HEAD
git push upstream v<version>
```

> `upstream` 推送使用 `--force-with-lease` 以外的正常推送。如果 upstream 已存在该 tag（同版本号），跳过即可。

### 8. 报告

推送完成后，报告：
- 新版本号
- commit hash
- tag name
- 受影响包数量
