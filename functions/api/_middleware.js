import { verifyJWT } from '../utils/jwt.js';

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // 2. Auth Middleware
    // 公开接口，不需要鉴权
    const publicPaths = [
        '/api/nav',
        '/api/login',
        '/api/icons' // icons 的 GET 请求单独在内部分析是否公开，这里先放行
    ];

    let isPublic = false;
    for (const p of publicPaths) {
        if (path === p || path.startsWith(p + '/')) {
            isPublic = true;
            break;
        }
    }

    // 针对 icons，GET 放行，POST（上传）需要鉴权
    if (path.startsWith('/api/icons') && request.method === 'POST') {
        isPublic = false;
    }

    if (!isPublic) {
        // 获取 Cookie
        const cookie = request.headers.get('Cookie') || '';
        const match = cookie.match(/admin_token=([^;]+)/);
        const token = match ? match[1] : null;

        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized', code: 401 }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // 默认的 Secret，部署时建议在环境变量配置 JWT_SECRET
        const secret = env.JWT_SECRET || 'itab-nav-secret-key-change-me';
        const payload = await verifyJWT(token, secret);

        if (!payload || payload.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden', code: 403 }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        // 将用户信息注入 request
        request.user = payload;
    }

    // 3. 继续执行后续接口逻辑
    const response = await next();

    // 添加 CORS 头
    const newResponse = new Response(response.body, response);
    for (const [key, value] of Object.entries(corsHeaders)) {
        newResponse.headers.set(key, value);
    }

    return newResponse;
}
