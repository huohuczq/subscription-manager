import { handleLogin, handleLogout, getUserFromRequest } from './handlers/auth.js';
import { handleGetConfig, handleUpdateConfig } from './handlers/config.js';
import { handleDashboardStats } from './handlers/dashboard.js';
import { handleThirdPartyNotify } from './handlers/notify.js';
import { handleSubscriptions } from './handlers/subscriptions.js';
import { getConfig } from '../data/config.js';
import { handleTestNotification } from './handlers/test-notification.js';
import { handleBackupRequest } from './handlers/backup.js';

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.slice(4);
  const method = request.method;

  const config = await getConfig(env);

  if (path === '/login' && method === 'POST') {
    return handleLogin(request, env);
  }

  if (path === '/logout' && (method === 'GET' || method === 'POST')) {
    return handleLogout();
  }

  // 对 /backup 接口验证专门的备份密钥
  let isBackupAuth = false;
  if (path === '/backup') {
    const tokenFromHeader = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const tokenFromQuery = url.searchParams.get('token') || '';
    const providedToken = tokenFromHeader || tokenFromQuery;
    if (config.BACKUP_SECRET_KEY && providedToken === config.BACKUP_SECRET_KEY) {
      isBackupAuth = true;
    }
  }

  const { user } = await getUserFromRequest(request, env);
  
  // 核心拦截：如果没有登录态，也没有合法的备份密钥，则拦截
  if (!user && path !== '/login' && !isBackupAuth) {
    return new Response(
      JSON.stringify({ success: false, message: '未授权访问' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (path === '/config') {
    if (method === 'GET') return handleGetConfig(env);
    if (method === 'POST') return handleUpdateConfig(request, env);
  }

  if (path === '/dashboard/stats' && method === 'GET') {
    return handleDashboardStats(env, config);
  }

  if (path === '/test-notification' && method === 'POST') {
    return handleTestNotification(request, env);
  }

  // 挂载备份请求路由
  if (path === '/backup') {
    return handleBackupRequest(request, env);
  }

  const subscriptionResponse = await handleSubscriptions(request, env, path);
  if (subscriptionResponse) return subscriptionResponse;

  const thirdPartyResponse = await handleThirdPartyNotify(request, env, config, url);
  if (thirdPartyResponse) return thirdPartyResponse;

  return new Response(
    JSON.stringify({ success: false, message: '未找到请求的资源' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

export { handleApiRequest };