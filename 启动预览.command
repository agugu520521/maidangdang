#!/bin/zsh
cd "${0:A:h}" || exit 1
PREVIEW_NODE="$(command -v node)"
if [[ -z "$PREVIEW_NODE" ]]; then
  PREVIEW_NODE="/Users/leyang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$PREVIEW_NODE" ]]; then
  echo "请先安装 Node.js 20 或更新版本，再双击启动预览。"
  echo "安装地址：https://nodejs.org/"
  read -k 1 "?按任意键关闭"
  exit 1
fi
echo "Burgundy Cosmos 本地工坊启动中，请保留此终端窗口。"
"$PREVIEW_NODE" scripts/dev.mjs --open
