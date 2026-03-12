import { handleApiRequest } from './api/router.js';
import { handleAdminRequest, handleLoginPage } from './api/admin.js';
import { handleDebug } from './api/debug.js';
import { getCurrentTimeInTimezone } from './core/time.js';
import { checkExpiringSubscriptions } from './services/scheduler.js';
import { getUserFromRequest } from './api/handlers/auth.js';
import { getConfig } from './data/config.js'; // 修正：指向 data 文件夹下的 config.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/debug') {
      // 调试页必须登录后才能访问，避免泄露系统信息
      const { user } = await getUserFromRequest(request, env);
      if (!user) {
        return new Response('未授权访问', {
          status: 401,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      return handleDebug(request, env);
    } else if (url.pathname.startsWith('/api')) {
      return handleApiRequest(request, env);
    } else if (url.pathname.startsWith('/admin')) {
      return handleAdminRequest(request, env, ctx);
    } else {
      return handleLoginPage();
    }
  },

  async scheduled(event, env, ctx) {
    // 动态获取用户配置的时区
    const config = await getConfig(env);
    const userTimezone = config.TIMEZONE || 'UTC';
    const currentTime = getCurrentTimeInTimezone(userTimezone);
    
    // 日志也一并修正，打印出当前真实的业务时区
    console.log('[Workers] 定时任务触发', 'cron:', event?.cron || '(unknown)', '时区:', userTimezone, '执行时间:', currentTime.toISOString());
    
    // 执行真正的到期检查与推送逻辑
    await checkExpiringSubscriptions(env);
  }
};