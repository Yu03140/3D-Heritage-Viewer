#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# 通义千问API代理服务器
# 解决了前端直接调用API时遇到的CORS跨域和API密钥暴露问题。

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional

from rag import load_default_kb, RAGKnowledgeBase

# 警告：API密钥在此处硬编码。在生产环境中，应使用更安全的方法（如环境变量）来管理密钥。
API_KEY = 'sk-a21472fce05548dbbc1e2e0c38ce407d'
API_ENDPOINT = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'

SCRIPT_DIR = Path(__file__).resolve().parent
KB_PATH = SCRIPT_DIR.parent / 'data' / 'descriptions.json'

try:
    KNOWLEDGE_BASE: Optional[RAGKnowledgeBase] = load_default_kb(str(KB_PATH))
    kb_stats = KNOWLEDGE_BASE.stats()
    print(f"📚 知识库已加载: {kb_stats['chunks']} 个片段, 来源 {kb_stats['source']}")
except Exception as kb_error:
    KNOWLEDGE_BASE = None
    print(f"⚠️ 知识库未启用: {kb_error}")


def inject_context(request_payload: Dict[str, Any]) -> None:
    if KNOWLEDGE_BASE is None:
        return

    input_block = request_payload.get('input')
    if not isinstance(input_block, dict):
        return

    messages = input_block.get('messages')
    if not isinstance(messages, list):
        return

    last_user_message = None
    for message in reversed(messages):
        if isinstance(message, dict) and message.get('role') == 'user' and message.get('content'):
            last_user_message = message['content']
            break

    if not last_user_message:
        return

    try:
        results = KNOWLEDGE_BASE.retrieve(last_user_message, top_k=3)
    except Exception as retrieval_error:
        print(f"⚠️ 检索失败: {retrieval_error}")
        return

    if not results:
        return

    context_lines: List[str] = [
        '以下是从知识库检索到的相关资料：'
    ]

    for idx, item in enumerate(results, 1):
        metadata = item.get('metadata', {})
        title = metadata.get('title', '未知')
        dynasty = metadata.get('dynasty', '未知')
        category = metadata.get('category', '未知')
        year = metadata.get('year')
        header = f"[{idx}] 名称: {title} | 朝代: {dynasty} | 类别: {category}"
        if year and year != '未知':
            header += f" | 年代: {year}"
        context_lines.append(header)
        context_lines.append(f"来源: {metadata.get('source', 'data/descriptions.json')}")

        snippet = (item.get('text') or '').strip()
        if len(snippet) > 400:
            snippet = snippet[:400].rstrip() + '...'
        context_lines.append(f"内容: {snippet}")

    context_lines.append('如果资料不足，请说明。')

    context_message = {
        'role': 'system',
        'content': '\n'.join(context_lines)
    }

    augmented: List[Dict[str, Any]] = list(messages)
    insert_at = 0
    for idx, message in enumerate(augmented):
        if isinstance(message, dict) and message.get('role') == 'system':
            insert_at = idx + 1
            break

    augmented.insert(insert_at, context_message)
    input_block['messages'] = augmented
    print('📖 已注入知识库上下文')

class ProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """处理CORS预检请求"""
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

            # RAG上下文增强
            try:
                inject_context(request_data)
            except Exception as context_error:
                print(f"⚠️ 注入上下文时出错: {context_error}")

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
        """自定义日志输出格式"""
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
