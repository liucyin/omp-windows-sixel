# omp Windows Terminal Sixel

Windows Terminal + Git Bash 中 oh-my-pi 发送前附件缩略图的本地补丁。已验证 omp **18.4.10**、Windows Terminal **1.24.11911.0**。不修改模型视觉能力声明。

原组件仅支持 Kitty Unicode-placeholder，Sixel 附件显示图标。本补丁先预留四行，再通过保存/恢复光标输出 Sixel，支持横向相邻附件；编码按图片与终端单元格尺寸缓存。

## 前提

- Windows Terminal 支持 Sixel；Git for Windows 和 Bun 已安装。
- omp 通过 `bun install -g @oh-my-pi/pi-coding-agent` 安装在默认 `~/.bun/install/global`。
- 在 **Git Bash** 使用；PowerShell 直接启动原 omp.exe 不使用本补丁。

## 安装

```bash
git clone https://github.com/liucyin/omp-windows-sixel.git
cd omp-windows-sixel
bun manage.mjs apply
```

在 `~/.bashrc` 添加：

```bash
if [[ -n ${WT_SESSION-} ]]; then
  export PI_FORCE_IMAGE_PROTOCOL=sixel
fi
export PATH="$HOME/.local/bin:$PATH"
```

在 `~/.bash_profile` **最后**添加（防止 Bun 初始化抢占入口）：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

新开 Windows Terminal Git Bash 标签：

```bash
type -a omp  # 首项应为 ~/.local/bin/omp
omp
```

## 更新

先退出 omp。在仓库目录执行：

```bash
git pull --ff-only
omp-update
```

或 `bun manage.mjs update`。更新前查询 npm 最新版本，**没有该版本的已验证补丁就拒绝升级**，保留当前安装。存在补丁才安装对应版本、校验源码、应用补丁并检查 CLI 启动。脚本不自动 git pull，避免意外执行远程变化。

不再使用裸 `omp update`：它可能覆盖补丁。若已经裸更新，运行 `bun manage.mjs apply`；不支持的新版本需要适配，不能拿旧文件覆盖。

```bash
bun manage.mjs status
bun test
```

`status` 报告是否为精确上游或精确补丁文件。源文件有其他改动则拒绝覆盖；重复 apply 幂等。

## 验证记录

实际 Windows Terminal 会话中粘贴截图与 RGB 色带图片，相邻框出现真实像素；清除草稿后无可见残影。编码 smoke 验证六行结构、末行 placement、重复渲染稳定。仓库测试覆盖幂等、源修改保护和错误补丁校验，不代替终端视觉验证。

## 备份及回滚

脚本首次应用保存原组件到 `~/.local/state/omp-windows-sixel/<VERSION>/attachment-chips.original.ts`。恢复它到 `~/.bun/install/global/node_modules/@oh-my-pi/pi-tui/src/prompt/attachment-chips.ts`，删除 `~/.local/bin/omp` 和 `omp-update`，移除 Shell 中的 Sixel 强制设置。不要覆盖整个新版组件；跨版本回滚应重新安装所需版本。

当前已补丁安装再次 apply 时不会生成伪造的原文件备份；本机原组件已另行备份，升级重新安装后会保存真实上游文件。

## 范围

这是版本化本机补丁仓库，不是 omp 全量 fork。未知版本不会猜测兼容；新增版本需要核对组件、渲染管线并重新验证。仓库不包含个人配置、凭据、历史或截图。
