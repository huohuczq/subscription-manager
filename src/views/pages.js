import themeResourcesHtml from './theme-resources.html';
import navbarHtml from './components/navbar.html';
import toastHtml from './components/toast.html';
import lunarToolsHtml from './components/lunar-tools.html';

import loginPageHtml from './pages/loginPage.html';
import adminPageHtml from './pages/adminPage.html';
import configPageHtml from './pages/configPage.html';
import dashboardPageHtml from './pages/dashboardPage.html';

// 统一模板注入函数
function injectLayout(html) {
  return html
    .replace(/\$\{themeResources\}/g, themeResourcesHtml)
    .replace(/\$\{navbar\}/g, navbarHtml)
    .replace(/\$\{toast\}/g, toastHtml)
    .replace(/\$\{lunarTools\}/g, lunarToolsHtml); // 仅在需要的页面注入
}

const loginPage = injectLayout(loginPageHtml);
const adminPage = injectLayout(adminPageHtml);
const configPage = injectLayout(configPageHtml);

function dashboardPage() {
  return injectLayout(dashboardPageHtml);
}

export { loginPage, adminPage, configPage, dashboardPage };