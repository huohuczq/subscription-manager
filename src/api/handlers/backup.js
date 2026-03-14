import { getConfig, setConfig } from '../../data/config.js';
import { getAllSubscriptions } from '../../data/subscriptions.js';

async function handleBackupRequest(request, env) {
  if (request.method === 'GET') {
    try {
      const config = await getConfig(env);
      const subscriptions = await getAllSubscriptions(env);

      // 脱敏处理，导出时不携带管理员账密和 JWT，防止文件外泄导致安全风险
      const exportConfig = { ...config };
      delete exportConfig.ADMIN_USERNAME;
      delete exportConfig.ADMIN_PASSWORD;
      delete exportConfig.JWT_SECRET;

      const exportData = {
        version: '2.0.0',
        exportTime: new Date().toISOString(),
        config: exportConfig,
        subscriptions: subscriptions
      };

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="substracker_backup_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: '导出失败: ' + error.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (!body.config && !body.subscriptions) {
        return new Response(JSON.stringify({ success: false, message: '无效的备份文件格式' }), { status: 400, headers: {'Content-Type': 'application/json'} });
      }

      // 恢复配置（强制保留当前系统的鉴权秘钥，防止导入后直接被踢出登录）
      if (body.config) {
        const currentConfig = await getConfig(env);
        const importedConfig = { ...body.config };
        importedConfig.JWT_SECRET = currentConfig.JWT_SECRET;
        importedConfig.ADMIN_USERNAME = currentConfig.ADMIN_USERNAME;
        importedConfig.ADMIN_PASSWORD = currentConfig.ADMIN_PASSWORD;
        await setConfig(env, importedConfig);
      }

      // 恢复订阅列表数据
      if (body.subscriptions && Array.isArray(body.subscriptions)) {
        await env.SUBSCRIPTIONS_KV.put('subscriptions', JSON.stringify(body.subscriptions));
      }

      return new Response(JSON.stringify({ success: true, message: '恢复成功' }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: '恢复失败: ' + error.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

export { handleBackupRequest };