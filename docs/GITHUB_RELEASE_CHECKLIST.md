# Mineradio2 GitHub 发布清单

## 已在本地完成

- [x] 非官方二创版说明、GPL-3.0 和第三方服务声明
- [x] 桌面小组件、迷你模式、独立歌词页说明
- [x] `Mineradio2` 独立版本号、App ID、可执行文件和快捷方式名称
- [x] 小组件 IPC 来源校验和退出清理
- [x] 小组件回归测试
- [x] 发布前敏感文件检查

## 需要发布者确认后完成

1. 在 `adriannacrai413-png` 账号下 Fork `XxHuberrr/Mineradio-paused`。
2. 使用 Fork 的 `adriannacrai413-png/Mineradio-paused` 仓库，并从独立分支发布。
3. 确认 README 中的原项目链接、作者署名和第三方声明符合你的发布意图。
4. 提交源码，不要提交 `node_modules/`、`dist/`、日志、Cookie、Token、用户数据或桌面快捷方式。
5. 创建标签 `v2.3.0`，上传 `Mineradio2-2.3.0-Setup.exe`，并在 Release 中说明这是非官方二创版。

## 本地验收

```powershell
npm install
npm test
npm run build:win
```

GUI 验收时重点检查：调整完整模式尺寸、缩小到高度约 `180px` 以下自动进入迷你模式、迷你模式仅横向调整、切换歌词页/返回、重启后两种模式位置和尺寸恢复，以及快捷方式不弹出终端。
