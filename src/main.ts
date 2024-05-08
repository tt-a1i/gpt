import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales'
import { setupAssets, setupScrollbarStyle } from './plugins'
import { setupStore } from './store'
import { setupRouter } from './router'

/**
 * 启动应用程序的主函数。
 * 该函数创建应用程序实例，配置全局资产、滚动条样式、状态存储、国际化，
 * 然后设置路由并挂载应用程序。
 * 无参数。
 * 无显式返回值，但隐含地返回Promise<void>。
 */
async function bootstrap() {
  // 创建应用程序实例
  const app = createApp(App)

  // 配置静态资源
  setupAssets()

  // 设置滚动条样式
  setupScrollbarStyle()

  // 设置状态存储
  setupStore(app)

  // 设置多语言支持i18n
  setupI18n(app)

  // 等待路由设置完成
  await setupRouter(app)

  // 等待路由设置完成后，将app挂载到页面中id为app的元素上。
  app.mount('#app')
}

bootstrap()
