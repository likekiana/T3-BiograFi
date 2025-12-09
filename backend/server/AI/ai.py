# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import io
import os
import requests
import json
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
CORS(app) 

# 导入配置
try:
    from config import (DEEPSEEK_API_KEY, DEEPSEEK_API_URL, DEEPSEEK_MODEL, 
                        MODELSCOPE_API_KEY, MODELSCOPE_API_URL, XUNZI_MODEL,
                        XUNZI_CLOUD_API_URL, XUNZI_CLOUD_MODEL,
                        TEMPERATURE, MAX_TOKENS, TOP_P, TIMEOUT)
except ImportError:
    # 如果没有 config.py，尝试从环境变量读取
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
    DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
    DEEPSEEK_MODEL = 'deepseek-chat'
    MODELSCOPE_API_KEY = os.environ.get('MODELSCOPE_API_KEY', '')
    MODELSCOPE_API_URL = 'https://api-inference.modelscope.cn/v1/chat/completions'
    XUNZI_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
    XUNZI_CLOUD_API_URL = 'https://ms-ens-685b28f8-bf6f.modelscope.cn/v1/chat/completions'
    XUNZI_CLOUD_MODEL = 'Xunzillm4cc/Xunzi-Qwen2-1.5B'
    TEMPERATURE = 0.75
    MAX_TOKENS = 2000
    TOP_P = 0.9
    TIMEOUT = 60
else:
    # 若存在配置文件，允许环境变量覆盖其中的 API Key
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', DEEPSEEK_API_KEY)
    MODELSCOPE_API_KEY = os.environ.get('MODELSCOPE_API_KEY', MODELSCOPE_API_KEY)

def generate_response(prompt, model=None):
    """
    调用 AI API 生成响应，支持 DeepSeek 和 荀子古汉语模型
    """
    model = model or 'xunzi-qwen2'
    
    # 根据模型选择对应的 API
    if model == 'xunzi-qwen2':
        api_url = MODELSCOPE_API_URL
        api_key = MODELSCOPE_API_KEY
        actual_model = XUNZI_MODEL
        api_name = '魔搭/荀子'
    elif model == 'xunzi-cloud':
        api_url = XUNZI_CLOUD_API_URL
        api_key = MODELSCOPE_API_KEY
        actual_model = XUNZI_CLOUD_MODEL
        api_name = '荀子云端'
    else:
        api_url = DEEPSEEK_API_URL
        api_key = DEEPSEEK_API_KEY
        actual_model = model
        api_name = 'DeepSeek'
    
    if not api_key:
        raise ValueError('未设置 {} API Key。请设置后重启服务。'.format(api_name))
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {}'.format(api_key)
    }
    
    # 构建消息列表
    messages = []
    
    # 古汉语专家系统提示
    if model == 'xunzi-qwen2':
        messages.append({
            'role': 'system',
            'content': '''你是一位精通古汉语的资深学者，专门研究先秦两汉至明清的古典文献。你具备以下专业能力：
1. 深厚的古汉语功底，熟悉文言文语法、词汇演变和修辞手法
2. 广博的古典文献知识，包括经史子集各类典籍
3. 对古代历史、文化、思想有深入理解
4. 能够准确解读古文含义，分析其思想内涵和历史背景
5. 你是基于qwen开发的荀子古汉语专用大模型

请用专业、严谨的态度回答问题，引用原文时注明出处，解释时兼顾字面意思和深层含义。'''
        })
    
    messages.append({
        'role': 'user',
        'content': prompt
    })
    
    # 构建请求体
    payload = {
        'model': actual_model,
        'messages': messages
    }
    
    # 魔搭平台的荀子模型可能不支持某些参数，使用更保守的配置
    if model == 'xunzi-qwen2':
        # 荀子模型使用简化参数
        payload['max_tokens'] = min(MAX_TOKENS, 1024)
    else:
        # DeepSeek 使用完整参数
        payload['temperature'] = TEMPERATURE
        payload['max_tokens'] = MAX_TOKENS
        payload['top_p'] = TOP_P
    
    try:
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            timeout=TIMEOUT
        )
        
        if not response.ok:
            error_info = response.text
            raise Exception('调用 {} API 失败: HTTP {} - {}'.format(api_name, response.status_code, error_info))
        
        result = response.json()
        if 'choices' in result and len(result['choices']) > 0:
            return result['choices'][0]['message']['content'].strip()
        else:
            raise ValueError('API 返回格式异常: {}'.format(json.dumps(result)))
            
    except requests.exceptions.RequestException as e:
        raise Exception('调用 {} API 失败: {}'.format(api_name, str(e)))

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': '请提供要分析的文本'}), 400
    
    input_text = data['text']
    model = data.get('model', 'xunzi-qwen2')  # 支持前端指定模型
    
    prompt = f"""
请将以下古文翻译成现代汉语：
"{input_text}"

要求：
1. 准确传达原文的意思，保持语义完整性
2. 翻译流畅自然，符合现代汉语表达习惯
3. 保持原文的风格和意境
4. 直接输出翻译结果，不要添加任何解释或说明
"""
    
    try:
        response = generate_response(prompt, model)
        return jsonify({'result': response})
    except Exception as e:
        return jsonify({'error': f'生成回复时出错: {str(e)}'}), 500

@app.route('/api/qa', methods=['POST'])
def qa_text():
    data = request.json
    if not data or 'text' not in data or 'question' not in data:
        return jsonify({'error': '请提供原文和问题'}), 400
    
    input_text = data['text']
    question = data['question']
    model = data.get('model', 'xunzi-qwen2')  # 支持前端指定模型
    
    prompt = f"""
原文："{input_text}"

问题：{question}

请针对上面的古文原文，回答用户的问题。请直接给出答案，不要输出思考过程。
"""
    
    try:
        response = generate_response(prompt, model)
        return jsonify({'result': response})
    except Exception as e:
        return jsonify({'error': f'生成回复时出错: {str(e)}'}), 500

@app.route('/api/auto-annotate', methods=['POST'])
def auto_annotate():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': '请提供要标注的文本'}), 400
    
    input_text = data['text']
    
    prompt = f"""
请对以下文本进行实体标注，标出所有的人物、地名、时间、器物、概念。

文本："{input_text}"

要求：
1. 请标注出文中所有的人物（包括人名、称谓）
2. 请标注出文中所有的地名（包括国名、地方名）
3. 请标注出文中所有的时间（包括年代、季节、时辰等）
4. 请标注出文中所有的器物（包括工具、物品、建筑等）
5. 请标注出文中所有的概念（包括抽象概念、思想、制度等）

请直接返回JSON格式的标注结果，格式如下：
[
  {{"text": "实体文本", "label": "人物"}},
  {{"text": "实体文本", "label": "地名"}}
]

注意：
- label 必须是以下之一：人物、地名、时间、器物、概念
- text 是实体在原文中的确切文本
- 只返回JSON数组，不要有其他文字说明
"""
    
    try:
        response = generate_response(prompt, 'xunzi-qwen2')
        # 尝试解析返回的JSON
        # 清理可能的markdown代码块标记
        cleaned = response.strip()
        if cleaned.startswith('```'):
            # 移除markdown代码块
            cleaned = re.sub(r'^```(?:json)?\s*\n', '', cleaned)
            cleaned = re.sub(r'\n```\s*$', '', cleaned)
        
        # 进一步清理可能的干扰字符
        # 移除首尾的非JSON字符
        cleaned = re.sub(r'^[^\[\{]+', '', cleaned)
        cleaned = re.sub(r'[^\]\}]+$', '', cleaned)
        
        # 尝试解析JSON
        try:
            annotations = json.loads(cleaned)
        except json.JSONDecodeError as e:
            # 如果解析失败，尝试修复常见问题
            # 1. 修复未闭合的字符串（简单处理：移除最后一个未闭合的引号）
            temp_cleaned = re.sub(r'"[^"]*$', '', cleaned)
            try:
                annotations = json.loads(temp_cleaned)
            except json.JSONDecodeError as e2:
                # 2. 尝试更宽松的解析：只提取数组部分
                array_match = re.search(r'\[[\s\S]*?\]', cleaned)
                if array_match:
                    array_str = array_match.group(0)
                    try:
                        annotations = json.loads(array_str)
                    except json.JSONDecodeError as e3:
                        return jsonify({'error': f'AI返回的格式无法解析: {str(e)}, 尝试修复后仍失败: {str(e3)}', 'raw_response': response, 'cleaned': cleaned}), 500
                else:
                    return jsonify({'error': f'AI返回的格式无法解析: {str(e)}, 未找到有效数组', 'raw_response': response, 'cleaned': cleaned}), 500
        
        # 验证并清理数据
        valid_labels = ['人物', '地名', '时间', '器物', '概念']
        validated_annotations = []
        
        for ann in annotations:
            if isinstance(ann, dict) and 'text' in ann and 'label' in ann:
                # 确保label是有效的
                if ann['label'] in valid_labels:
                    entity_text = ann['text']
                    # 在原文中查找实体的所有出现位置
                    start = 0
                    while True:
                        pos = input_text.find(entity_text, start)
                        if pos == -1:
                            break
                        # 找到一个匹配，添加到结果中
                        validated_annotations.append({
                            'start': pos,
                            'end': pos + len(entity_text),
                            'label': ann['label']
                        })
                        start = pos + 1
        
        # 去重：如果有完全相同的标注（start, end, label都相同），只保留一个
        unique_annotations = []
        seen = set()
        for ann in validated_annotations:
            key = (ann['start'], ann['end'], ann['label'])
            if key not in seen:
                seen.add(key)
                unique_annotations.append(ann)
        
        # 按start位置排序
        unique_annotations.sort(key=lambda x: x['start'])
        
        return jsonify({'annotations': unique_annotations})
    except Exception as e:
        return jsonify({'error': f'自动标注时出错: {str(e)}', 'raw_response': response if 'response' in locals() else '无响应'}), 500

if __name__ == '__main__':
    print('=' * 60)
    print('古文解析服务启动中...')
    print('使用荀子古汉语大模型')
    if MODELSCOPE_API_KEY:
        print(f'API Key: {MODELSCOPE_API_KEY[:8]}...{MODELSCOPE_API_KEY[-4:]}')
    else:
        print('警告: 未设置 MODELSCOPE_API_KEY 环境变量!')
        print('请设置环境变量后重启服务:')
        print('  export MODELSCOPE_API_KEY=your_api_key_here')
    print('服务地址: http://0.0.0.0:5004')
    print('=' * 60)
    app.run(host='0.0.0.0', port=5004, debug=False)
