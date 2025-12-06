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
    from config import API_KEY, MODEL_ID, TEMPERATURE, MAX_TOKENS, TOP_P, TIMEOUT
except ImportError:
    # 如果没有 config.py，尝试从环境变量读取
    API_KEY = os.environ.get('API_KEY', 'bce-v3/ALTAK-GlzTH3GEwkwIGzCsLtoeG/692dd1e4a3efc131b1b06ef241e668306e6782c9')
    MODEL_ID = os.environ.get('MODEL_ID', 'am-hrzab73jvugw')
    QIANFAN_API_URL = 'https://qianfan.baidubce.com/v2/chat/completions'
    TEMPERATURE = 0.75
    MAX_TOKENS = 2000
    TOP_P = 0.9
    TIMEOUT = 30
else:
    # 若存在配置文件，允许环境变量覆盖其中的 API Key
    API_KEY = os.environ.get('API_KEY', API_KEY)
    MODEL_ID = os.environ.get('MODEL_ID', MODEL_ID)

def generate_response(prompt, model=None):
    """
    调用百度千帆ERNIE X1 API生成响应
    """
    if not API_KEY:
        raise ValueError('未设置 API_KEY 环境变量。请设置后重启服务。')
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'  # 使用Bearer Token鉴权
    }
    
    payload = {
        "model": model or MODEL_ID,  # 这里决定了调用哪个模型服务
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        'temperature': TEMPERATURE,
        'max_tokens': MAX_TOKENS,
        'top_p': TOP_P
    }
    
    try:
        response = requests.post(
            QIANFAN_API_URL,
            headers=headers,
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()  # 检查HTTP错误
        
        result = response.json()
        if 'result' in result:
            return result.get("result", "未收到有效回复。").strip()
        elif 'choices' in result and len(result['choices']) > 0:
            # 兼容OpenAI格式的返回
            return result['choices'][0]['message']['content'].strip()
        else:
            raise ValueError('API 返回格式异常')
            
    except requests.exceptions.Timeout:
        raise Exception('错误：请求超时，请检查网络。')
    except requests.exceptions.RequestException as e:
        raise Exception(f'网络请求错误: {str(e)}')
    except json.JSONDecodeError:
        raise Exception('错误：无法解析API返回的数据。')

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': '请提供要分析的文本'}), 400
    
    input_text = data['text']
    model = data.get('model', MODEL_ID)  # 支持前端指定模型
    
    prompt = f"""
请对"{input_text}"进行详细解释。你的解释应该尽可能全面,包含以下方面:
1. 对其字面意思的解读。
2. 阐述其核心哲学思想。
3. 结合现代学习或工作场景,谈谈它的现实意义。
请直接给出解释,不要输出任何思考过程，并且必须分成上面那三点进行回答。
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
    model = data.get('model', MODEL_ID)  # 支持前端指定模型
    
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
  {"text": "实体文本", "label": "人物"},
  {"text": "实体文本", "label": "地名"}
]

注意：
- label 必须是以下之一：人物、地名、时间、器物、概念
- text 是实体在原文中的确切文本
- 只返回JSON数组，不要有其他文字说明
"""
    
    try:
        response = generate_response(prompt, MODEL_ID)
        # 尝试解析返回的JSON
        # 清理可能的markdown代码块标记
        cleaned = response.strip()
        if cleaned.startswith('```'):
            # 移除markdown代码块
            cleaned = re.sub(r'^```(?:json)?\s*\n', '', cleaned)
            cleaned = re.sub(r'\n```\s*$', '', cleaned)
        
        # 解析JSON
        annotations = json.loads(cleaned)
        
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
    except json.JSONDecodeError as e:
        return jsonify({'error': f'AI返回的格式无法解析: {str(e)}', 'raw_response': response}), 500
    except Exception as e:
        return jsonify({'error': f'自动标注时出错: {str(e)}'}), 500

if __name__ == '__main__':
    print('=' * 60)
    print('古文解析服务启动中...')
    print('使用百度千帆ERNIE X1 API')
    if API_KEY:
        print(f'API Key: {API_KEY[:8]}...{API_KEY[-4:]}')
        print(f'Model ID: {MODEL_ID}')
    else:
        print('警告: 未设置 API_KEY 环境变量!')
        print('请设置环境变量后重启服务:')
        print('  export API_KEY=your_api_key_here')
        print('  export MODEL_ID=your_model_id_here')
    print('服务地址: http://0.0.0.0:5004')
    print('=' * 60)
    app.run(host='0.0.0.0', port=5004, debug=False)
