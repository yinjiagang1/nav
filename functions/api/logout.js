export async function onRequestPost() {
    // 清除 HttpOnly Cookie 即可退出登录
    return new Response(JSON.stringify({ success: true, message: 'Logout successful' }), {
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `admin_token=deleted; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`
        }
    });
}
