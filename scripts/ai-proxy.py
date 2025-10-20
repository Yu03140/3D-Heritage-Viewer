#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通义千问API代理服务器
解决前端直接调用API的CORS跨域问题
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error

# 从aiAssistant.js读取API密钥（自动同步）
API_KEY = 'sk-a21472fce05548dbbc1e2e0c38ce407d'
API_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """处理预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """代理POST请求到通义千问API"""
        if self.path != '/api/chat':
            self.send_error(404)
            return

        try:
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            request_data = json.loads(body.decode('utf-8'))

            # 构建请求到通义千问
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {API_KEY}'
            }

            req = urllib.request.Request(
                API_ENDPOINT,
                data=json.dumps(request_data).encode('utf-8'),
                headers=headers,
                method='POST'
            )

            # 发送请求
            with urllib.request.urlopen(req) as response:
                response_data = response.read()

            # 返回响应
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response_data)

            print(f"✅ API调用成功")

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"❌ API错误: {e.code} - {error_body}")
            
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_body.encode('utf-8'))

        except Exception as e:
            print(f"❌ 服务器错误: {str(e)}")
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = json.dumps({'error': str(e)})
            self.wfile.write(error_response.encode('utf-8'))

    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[代理服务器] {format % args}")

def run_server(port=8001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyHandler)
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           🤖 AI代理服务器已启动                           ║
╠══════════════════════════════════════════════════════════╣
║  地址: http://localhost:{port}/api/chat                    ║
║  API: 通义千问 (qwen-turbo)                              ║
║  状态: 运行中...                                          ║
╚══════════════════════════════════════════════════════════╝

💡 提示：
1. 保持此窗口运行
2. 在浏览器访问 http://localhost:8000 (主页面)
3. AI助手将通过本代理服务器调用通义千问API

按 Ctrl+C 停止服务器
""")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 服务器已停止")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()
