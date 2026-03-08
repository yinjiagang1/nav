// /api/settings 接口用于全局设置和密码修改

export async function onRequestGet({ env }) {
    const result = await env.DB.prepare('SELECT key, value FROM settings').all();
    const settings = result.results.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
    return new Response(JSON.stringify(settings), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPut({ request, env }) {
    try {
        const data = await request.json();

        // 如果包含 password，则单独处理密码修改
        if (data.admin_password_hash) {
            if (data.admin_password_hash.length < 6) {
                return new Response(JSON.stringify({ error: 'Password too short' }), { status: 400 });
            }
            // 这里简写为明文存储，如果是生产环境请使用类似 bcrypt 的哈希
            await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
                .bind('admin_password_hash', data.admin_password_hash).run();

            // 更新完密码不影响其他设置
            delete data.admin_password_hash;
        }

        const stmts = [];
        for (const [key, value] of Object.entries(data)) {
            // 只允许更新白名单内的设置
            if (['bg_type', 'bg_image_url', 'bg_api_url', 'bg_refresh_strategy', 'default_card_size', 'default_card_opacity'].includes(key)) {
                stmts.push(
                    env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
                        .bind(key, String(value))
                );
            }
        }

        if (stmts.length > 0) {
            await env.DB.batch(stmts);
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
