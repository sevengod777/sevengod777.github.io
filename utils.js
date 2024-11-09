// JWT token生成工具
async function generateToken(apiKey) {
    try {
        const [id, secret] = apiKey.split(".");
        
        const header = {
            alg: "HS256",
            sign_type: "SIGN"
        };
        
        const payload = {
            api_key: id,
            exp: Date.now() + 3600 * 1000, // 1小时后过期
            timestamp: Date.now()
        };

        const encodedHeader = btoa(JSON.stringify(header))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
            
        const encodedPayload = btoa(JSON.stringify(payload))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        const message = `${encodedHeader}.${encodedPayload}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(message)
        );
        
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        return `${message}.${encodedSignature}`;
    } catch (error) {
        console.error('生成Token失败:', error);
        throw error;
    }
}

export { generateToken }; 