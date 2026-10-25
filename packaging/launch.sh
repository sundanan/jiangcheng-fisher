#!/bin/bash
# 江城钓客启动器：复用或启动本地服务器，打开浏览器
PORT=8137
DIR=/opt/jiangcheng-fisher

if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
  cd "$DIR" || exit 1
  nohup python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
  for i in $(seq 1 20); do
    curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
    sleep 0.3
  done
fi

URL="http://127.0.0.1:$PORT/"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
else
  for b in browser firefox chromium chromium-browser deepin-browser org.deepin.browser; do
    if command -v "$b" >/dev/null 2>&1; then "$b" "$URL" & exit 0; fi
  done
  echo "请用浏览器打开 $URL"
fi
