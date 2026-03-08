// /api/categories 接口用于分类 CRUD 操作

export async function onRequestGet({ env }) {
    const result = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    return new Response(JSON.stringify(result.results), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
    try {
        const data = await request.json();
        const id = data.id || `cat_${Date.now()}`;
        const name = data.name;
        const icon = data.icon || '';
        const parent_id = data.parent_id || null;
        const sort_order = parseInt(data.sort_order) || 0;

        if (!name) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400 });

        const stmt = env.DB.prepare(
            'INSERT INTO categories (id, name, icon, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, name, icon, parent_id, sort_order);

        await stmt.run();
        return new Response(JSON.stringify({ success: true, id }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPut({ request, env }) {
    try {
        const data = await request.json();
        const { id, name, icon, parent_id, sort_order } = data;

        if (!id || !name) return new Response(JSON.stringify({ error: 'ID and Name required' }), { status: 400 });

        const stmt = env.DB.prepare(
            'UPDATE categories SET name = ?, icon = ?, parent_id = ?, sort_order = ? WHERE id = ?'
        ).bind(name, icon || '', parent_id || null, sort_order || 0, id);

        await stmt.run();
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete({ request, env }) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

        // 因为有了 ON DELETE CASCADE，如果外键配置正确，删除分类会自动删除下属站点。
        // 但是 D1 默认不支持外键的自动级联，必须确保存储引擎支持。为了安全，我们也可以手动删除：
        await env.DB.batch([
            env.DB.prepare('DELETE FROM sites WHERE category_id = ?').bind(id),
            env.DB.prepare('DELETE FROM categories WHERE parent_id = ?').bind(id), // 假设只有两级，简单清空子类
            env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id)
        ]);

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
