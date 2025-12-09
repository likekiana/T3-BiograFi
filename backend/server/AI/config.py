# -*- coding: utf-8 -*-
"""
AI API 配置文件
"""

# DeepSeek API 配置
# 获取地址: https://platform.deepseek.com/
DEEPSEEK_API_KEY = "sk-e8ad98bc116c40b2aebdef00d10d8b54"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

# 荀子古汉语大模型配置（推荐）
MODELSCOPE_API_KEY = "sk-eef7ffa4c2604e9299944ba10e0674be"
MODELSCOPE_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
XUNZI_MODEL = "qwen2.5-7b-instruct"  # 底层模型

# 荀子古汉语大模型（文本生成）
XUNZI_CLOUD_API_URL = "https://ms-ens-035a4e62-37b6.api-inference.modelscope.cn/v1/chat/completions"
XUNZI_CLOUD_MODEL = "Xunzillm4cc/Xunzi-Qwen2-1.5B"

# 生成参数配置
TEMPERATURE = 0.75
MAX_TOKENS = 2000
TOP_P = 0.9
TIMEOUT = 60  # 请求超时时间（秒）


