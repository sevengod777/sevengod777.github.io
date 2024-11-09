const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

const app = express();

// CORS配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API配置
const API_CONFIG = {
    apiKey: "1bd6aa413d90ee8d35832debdfe92554.uu8dPZKS8LX4baw0",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4"
};

// 生成JWT token
async function generateToken() {
    try {
        const [id, secret] = API_CONFIG.apiKey.split(".");
        
        const header = {
            alg: "HS256",
            sign_type: "SIGN"
        };
        
        const payload = {
            api_key: id,
            exp: Date.now() + 3600 * 1000, // 1小时后过期
            timestamp: Date.now()
        };

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        const message = `${encodedHeader}.${encodedPayload}`;
        
        const signature = crypto.createHmac('sha256', secret)
            .update(message)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        return `${message}.${signature}`;
    } catch (error) {
        console.error('生成Token失败:', error);
        throw error;
    }
}

// 聊天API路由
app.post('/api/chat', async (req, res) => {
    try {
        const token = await generateToken();
        console.log('生成的token:', token);
        console.log('收到聊天请求:', req.body);
        
        const response = await axios({
            method: 'post',
            url: `${API_CONFIG.baseURL}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            data: {
                model: API_CONFIG.model,
                messages: [
                    { 
                        role: 'system', 
                        content: '你是智谱AI助手' 
                    },
                    ...req.body.messages
                ]
            },
            timeout: 30000 // 30秒超时
        });

        console.log('API响应:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('聊天API错误:', {
            message: error.message,
            response: error.response?.data,
            config: error.config
        });
        res.status(500).json({ 
            error: error.message,
            details: error.response?.data
        });
    }
});

// 测试路由
app.get('/test', async (req, res) => {
    try {
        const token = await generateToken();
        console.log('测试token:', token);
        
        const response = await axios({
            method: 'post',
            url: `${API_CONFIG.baseURL}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            data: {
                model: API_CONFIG.model,
                messages: [
                    { role: 'user', content: '你好' }
                ]
            }
        });
        
        res.json({ 
            status: 'ok',
            message: '代理服务器正在运行',
            response: response.data.choices[0]?.message?.content
        });
    } catch (error) {
        console.error('测试路由错误:', {
            message: error.message,
            response: error.response?.data,
            config: error.config
        });
        res.status(500).json({
            status: 'error',
            message: error.message,
            details: error.response?.data
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log(`🚀 代理服务器启动成功！`);
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log('\nAPI配置信息:');
    console.log('- API密钥:', API_CONFIG.apiKey);
    console.log('- 模型:', API_CONFIG.model);
    console.log('- API地址:', API_CONFIG.baseURL);
    console.log('=================================\n');

    // 测试token生成和API连接
    generateToken().then(async token => {
        console.log('Token测试成功:', token);
        try {
            const response = await axios({
                method: 'post',
                url: `${API_CONFIG.baseURL}/chat/completions`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                data: {
                    model: API_CONFIG.model,
                    messages: [
                        { role: 'user', content: '你好' }
                    ]
                }
            });
            console.log('API连接测试成功:', response.data.choices[0]?.message?.content);
        } catch (error) {
            console.error('API连接测试失败:', error.response?.data || error.message);
        }
    }).catch(error => {
        console.error('Token生成失败:', error);
    });
});