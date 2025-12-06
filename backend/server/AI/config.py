# -*- coding: utf-8 -*-
"""
百度千帆ERNIE X1 API 配置文件
请在下方填入你的 API Key 和 Model ID
"""

# 从“安全认证-API Key”页面获取的Key
# 获取地址: https://qianfan.baidubce.com/
API_KEY = "YOUR_API_KEY_HERE"

# 你在模型服务列表中看到的专属模型ID
MODEL_ID = "YOUR_MODEL_ID_HERE"

# API 配置
QIANFAN_API_URL = "https://qianfan.baidubce.com/v2/chat/completions"

# 生成参数配置
TEMPERATURE = 0.75
MAX_TOKENS = 2000
TOP_P = 0.9
TIMEOUT = 30  # 请求超时时间（秒）


