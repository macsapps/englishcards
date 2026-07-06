#!/bin/bash
# 静态网站本地服务器启动脚本
# macOS 双击即可运行,或在终端执行: bash start.command

# 切换到脚本所在目录(保证无论从哪里调用都能找到网站文件)
cd "$(dirname "$0")" || exit 1

PORT=8000

echo "============================================"
echo "  静态网站本地服务已启动"
echo "============================================"
echo ""
echo "本机访问:   http://localhost:$PORT"
echo ""
echo "局域网访问(同一 WiFi 下的其他设备):"
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk -v port="$PORT" '{print "  http://" $2 ":" port}'
echo ""
echo "提示: 优先选择 192.168.* 或 10.* 开头的 IP"
echo "按 Ctrl + C 停止服务"
echo "============================================"
echo ""

# 启动服务,绑定所有网卡(0.0.0.0)以允许 IP 访问
python3 -m http.server $PORT --bind 0.0.0.0
