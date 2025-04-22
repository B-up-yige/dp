/**
 * socketConfig.js
 * 处理Socket连接配置
 */

// API端点
const CONFIG_API_URL = '/api/config/socket';

/**
 * 检测当前应用是否运行在开发代理服务器下
 * @returns {boolean} 是否使用代理
 */
export const isRunningWithProxy = () => {
  // 在开发环境下，React应用通常通过代理服务器（如webpack-dev-server）连接到后端
  // 例如，前端运行在localhost:3000，而后端在localhost:5000
  const isDevEnv = process.env.NODE_ENV === 'development';
  const currentPort = window.location.port;
  
  // 如果当前不是在标准API服务器端口（如5000）上运行，且是开发环境，则很可能使用了代理
  const isProxyLikely = isDevEnv && currentPort && currentPort !== '5000';
  
  console.log('代理检测:', {
    环境: process.env.NODE_ENV,
    当前URL: window.location.href,
    端口: currentPort,
    可能使用代理: isProxyLikely
  });
  
  return isProxyLikely;
};

/**
 * 从服务器获取Socket连接地址
 * @returns {Promise<string>} Socket服务器地址
 */
export const getSocketUrl = async () => {
  try {
    console.log('开始获取Socket配置，请求地址:', CONFIG_API_URL);
    
    // 检测是否使用代理
    const usingProxy = isRunningWithProxy();
    
    // 从API获取配置
    const response = await fetch(CONFIG_API_URL);
    
    console.log('收到Socket配置响应:', {
      status: response.status,
      ok: response.ok,
      url: response.url
    });
    
    if (!response.ok) {
      throw new Error(`获取Socket配置失败: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Socket配置数据:', data);
    
    const { socketUrl } = data;
    
    if (!socketUrl) {
      throw new Error('无效的Socket配置');
    }
    
    // 如果使用代理且返回的是localhost，需要保持同源
    if (usingProxy && socketUrl.includes('localhost')) {
      const proxySocketUrl = window.location.origin;
      console.log('检测到代理环境，使用同源Socket地址:', proxySocketUrl);
      return proxySocketUrl;
    }
    
    console.log('获取到有效的Socket地址:', socketUrl);
    return socketUrl;
  } catch (error) {
    console.error('获取Socket配置出错:', error);
    // 失败时使用当前域名作为备选
    const fallbackUrl = window.location.origin;
    console.log('使用备选Socket地址:', fallbackUrl);
    return fallbackUrl;
  }
}; 