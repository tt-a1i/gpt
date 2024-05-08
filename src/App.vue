<script setup lang="ts">
/**
 * 引入 Naive UI 的配置提供者组件和自定义组件以及主题和语言的自定义钩子。
 * 本段代码用于配置应用的主题、语言，并通过 Naive UI 的 NConfigProvider 组件提供给应用。
 */
import { NConfigProvider } from 'naive-ui'
import { NaiveProvider } from '@/components/common'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'

// 使用 useTheme 钩子获取当前应用的主题设置和主题覆盖配置
const { theme, themeOverrides } = useTheme()
// 使用 useLanguage 钩子获取当前应用的语言设置
const { language } = useLanguage()
</script>

<template>
  <!-- 使用 NConfigProvider 配置组件来应用主题、主题覆盖和语言设置 -->
  <NConfigProvider
    class="h-full"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="language"
  >
    <!-- 通过 NaiveProvider 组件为整个应用提供 Naive UI 配置 -->
    <NaiveProvider>
      <!-- 使用 RouterView 来渲染路由对应的组件 -->
      <RouterView />
    </NaiveProvider>
  </NConfigProvider>
</template>
