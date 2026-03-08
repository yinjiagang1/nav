import { signJWT } from '../utils/jwt.js';

export async function onRequestPost({ request, env }) {
    try {
        const { password } = await request.json();

        // 获取管理员密码，环境变量 ADMIN_PASSWORD 优先，其次通过数据库获取（如果支持修改），默认 fall back 为 'admin123' 作为初始密码。
        // 在生产环境，强烈建议设置 ADMIN_PASSWORD 环境变量
        let expectedPassword = env.ADMIN_PASSWORD || 'admin123';

        // 检查数据库中是否已修改过密码
        try {
            const dbPasswordRaw = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_password_hash').first();
            if (dbPasswordRaw && dbPasswordRaw.value) {
                expectedPassword = dbPasswordRaw.value;
            }
        } catch (e) { /* ignore if settings table is not ready */ }

        // [注意] 生产环境密码应该加盐 Hash，这里为简化且由于运行在 Cloudflare Worker，直接对比明文或简单 Hash
        // 若前端传递了 hash 后的密码也可以在这里改写逻辑
        if (password !== expectedPassword) {
            return new Response(JSON.stringify({ error: 'Invalid password' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 登录成功，签发 JWT
        const secret = env.JWT_SECRET || 'itab-nav-secret-key-change-me';
        const payload = {
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days expiration
        };

        const token = await signJWT(payload, secret);

        // 返回包含 token 的 Cookie 和 JSON 响应
        // 考虑到跨域，如果前端和后端不在同一个域，SameSite 需根据实际调配，这里设置 Path=/ 保证全站有效
        return new Response(JSON.stringify({ success: true, message: 'Login successful' }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
