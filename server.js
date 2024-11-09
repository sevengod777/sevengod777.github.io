const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/chat', async (req, res) => {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: req.body.model || 'gpt-4-turbo-preview',
            messages: req.body.messages,
            temperature: req.body.temperature || 0.7,
            max_tokens: req.body.max_tokens || 2000,
            top_p: req.body.top_p || 1,
            frequency_penalty: req.body.frequency_penalty || 0,
            presence_penalty: req.body.presence_penalty || 0
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('OpenAI API错误:', error.response?.data || error.message);
        res.status(500).json({
            error: error.response?.data?.error || '服务器错误'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 