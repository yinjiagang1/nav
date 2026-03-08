// /api/sites 接口用于站点卡片 CRUD 操作

export async function onRequestGet({ env }) {
    const result = await env.DB.prepare('SELECT * FROM sites ORDER BY sort_order ASC').all();
    return new Response(JSON.stringify(result.results), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
    try {
        const data = await request.json();
        const id = data.id || `site_${Date.now()}`;
        const category_id = data.category_id;
        const name = data.name;
        const url = data.url;
        const icon = data.icon || '';
        const bg_color = data.bg_color || '#ffffff';
        const card_size = data.card_size || '1x1';
        const card_opacity = parseFloat(data.card_opacity) ?? 1.0;
        const sort_order = parseInt(data.sort_order) || 0;

        if (!category_id || !name || !url) return new Response(JSON.stringify({ error: 'Name, URl and category_id required' }), { status: 400 });

        const stmt = env.DB.prepare(
            'INSERT INTO sites (id, category_id, name, url, icon, bg_color, card_size, card_opacity, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, category_id, name, url, icon, bg_color, card_size, card_opacity, sort_order);

        await stmt.run();
        return new Response(JSON.stringify({ success: true, id }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const data = await request.json();
        const { id, category_id, name, url, icon, bg_color, card_size, card_opacity, sort_order } = data;

        if (!id || !name || !url || !category_id) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });

        const stmt = env.DB.prepare(
            'UPDATE sites SET category_id = ?, name = ?, url = ?, icon = ?, bg_color = ?, card_size = ?, card_opacity = ?, sort_order = ? WHERE id = ?'
        ).bind(category_id, name, url, icon || '', bg_color || '#ffffff', card_size || '1x1', parseFloat(card_opacity) ?? 1.0, parseInt(sort_order) || 0, id);

        await stmt.run();
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const requestUrl = new URL(request.url);
        const id = requestUrl.searchParams.get('id');

        if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

        await env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
