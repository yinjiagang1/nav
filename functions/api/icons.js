// /api/icons 接口用于上传和获取 KV 中的 base64 图标

// 获取图标 (GET /api/icons?key=xxx) - 这是公开的
export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (!key) return new Response('Missing key', { status: 400 });

        const iconData = await env.ICONS.get(key);
        if (!iconData) return new Response('Not found', { status: 404 });

        // 解析 base64 (类似 data:image/png;base64,.....)
        const match = iconData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (!match) {
            return new Response('Invalid format in KV', { status: 500 });
        }

        const mimeType = match[1];
        const base64Str = match[2];
        const binaryString = atob(base64Str);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Response(bytes, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (e) {
        return new Response('Error', { status: 500 });
    }
}

// 上传图标 (POST /api/icons) - 这在 _middleware 里被拦截，必须登录
export async function onRequestPost({ request, env }) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !file.name || !file.type.startsWith('image/')) {
            return new Response(JSON.stringify({ error: 'Invalid or missing image file' }), { status: 400 });
        }

        // 大小限制 1MB
        if (file.size > 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'File too large (Max 1MB)' }), { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        const dataUrl = `data:${file.type};base64,${base64Data}`;

        const key = `icon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        await env.ICONS.put(key, dataUrl);

        return new Response(JSON.stringify({
            success: true,
            key: key,
            url: `/api/icons?key=${key}`
        }), { headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
