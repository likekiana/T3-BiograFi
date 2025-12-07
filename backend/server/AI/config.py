# -*- coding: utf-8 -*-
"""
AI API 配置文件
包含百度千帆ERNIE X1和DeepSeek模型的配置
"""

# ==================== 百度千帆ERNIE X1 配置 ====================
# 从“安全认证-API Key”页面获取的Key
# 获取地址: https://qianfan.baidubce.com/
API_KEY = "bce-v3/ALTAK-GlzTH3GEwkwIGzCsLtoeG/692dd1e4a3efc131b1b06ef241e668306e6782c9"

# 你在模型服务列表中看到的专属模型ID
MODEL_ID = "am-hrzab73jvugw"

# API 配置
QIANFAN_API_URL = "https://qianfan.baidubce.com/v2/chat/completions"

# ==================== DeepSeek 配置 ====================
# DeepSeek API Key
DEEPSEEK_API_KEY = "sk-e8ad98bc116c40b2aebdef00d10d8b54"

# DeepSeek 模型ID
DEEPSEEK_MODEL_ID = "deepseek-chat"

# DeepSeek API URL
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 默认使用的API类型
DEFAULT_API_TYPE = "deepseek"  # 'qianfan' 或 'deepseek'

# ==================== 通用生成参数配置 ====================
TEMPERATURE = 0.75
MAX_TOKENS = 2000
TOP_P = 0.9
TIMEOUT = 30  # 请求超时时间（秒）


