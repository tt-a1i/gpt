<script setup lang='ts'>
/**
 * 导入`Ref`类型定义
 *
 * 从`vue`库中导入了`Ref`类型，用于在Vue的Composition API中表示一个响应式引用。
 * 这个类型声明允许我们定义一个`Ref`，它封装了一个值，并且这个值可以是任何类型。
 */
import type { Ref } from 'vue'
/**
 * 引入Vue的响应式和生命周期钩子函数
 *
 * @import { computed } 用于创建响应式计算属性
 * @import { onMounted } 钩子函数，组件挂载完成后执行
 * @import { onUnmounted } 钩子函数，组件卸载前执行
 * @import { ref } 用于创建响应式引用
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
/**
 * 导入 vue-router 的 useRoute 函数
 *
 * 该函数用于在Vue组件中获取当前的路由信息。
 * 它是vue-router提供的一个用于在组合式API中使用的函数。
 *
 * @returns {Object} 返回一个包含当前路由信息的对象。
 */
import { useRoute } from 'vue-router'
/**
 * 导入 `storeToRefs` 函数 from 'pinia' 库。
 *
 * `storeToRefs` 是一个用于将 Pinia store 中的状态转换为可读写属性的函数。
 * 它允许我们将 store 中的状态方便地绑定到 Vue 组件的属性上，且这些属性会随着 store 状态的改变而自动更新。
 *
 * @returns 无返回值，此行代码主要目的是引入外部库函数。
 */
import { storeToRefs } from 'pinia'
/**
 * 导入Naive UI组件库的组件和实用函数
 *
 * @import { NAutoComplete } 自动完成组件，用于在输入时提供匹配建议
 * @import { NButton } 按钮组件，提供各种样式的按钮
 * @import { NInput } 输入框组件，用于文本输入
 * @import { useDialog } 对话框钩子，用于控制对话框的显示和隐藏
 * @import { useMessage } 消息提示钩子，用于显示简单的消息提示
 *
 * @returns 无返回值
 */
import { NAutoComplete, NButton, NInput, useDialog, useMessage } from 'naive-ui'
/**
 * 导入html2canvas库
 * 该库用于将HTML DOM转换为Canvas图片
 *
 * 参数: 无
 * 返回值: 无
 */
import html2canvas from 'html2canvas'
/**
 * 导入Message组件
 * 本行代码的作用是将./components中的Message组件导入到当前文件中供使用。
 * Message组件可用于显示消息提示。
 */
import { Message } from './components'
/**
 * 导入自定义钩子，用于处理滚动事件。
 */
import { useScroll } from './hooks/useScroll'
/**
 * 导入自定义钩子，用于处理聊天功能。
 */
import { useChat } from './hooks/useChat'
/**
 * 导入自定义钩子，用于在特定条件下使用上下文。
 */
import { useUsingContext } from './hooks/useUsingContext'
/**
 * 导入头部组件。
 */
import HeaderComponent from './components/Header/index.vue'
/**
 * 导入常用组件，包括悬浮按钮和SVG图标。
 */
import { HoverButton, SvgIcon } from '@/components/common'
/**
 * 导入基础布局的自定义钩子。
 */
import { useBasicLayout } from '@/hooks/useBasicLayout'
/**
 * 导入聊天和提示信息的Vuex存储模块。
 */
import { useChatStore, usePromptStore } from '@/store'
/**
 * 导入与聊天API交互的处理函数。
 */
import { fetchChatAPIProcess } from '@/api'
/**
 * 导入本地化工具函数。
 */
import { t } from '@/locales'

// 创建一个AbortController实例来控制请求的取消
let controller = new AbortController()

// 判断是否开启长回复功能，依赖于环境变量VITE_GLOB_OPEN_LONG_REPLY的值
const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

// 获取当前路由信息、对话框控制、消息服务实例
const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

// 使用聊天存储模块，用于管理聊天数据
const chatStore = useChatStore()

// 基础布局的使用，包括是否为移动端的判断
const { isMobile } = useBasicLayout()
// 使用聊天相关功能，包括添加、更新聊天信息等
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
// 使用滚动控制功能，包括滚动到底部等
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
// 使用上下文控制功能，包括切换使用上下文状态
const { usingContext, toggleUsingContext } = useUsingContext()

// 从路由参数中解析出uuid
const { uuid } = route.params as { uuid: string }

// 计算出的聊天数据源，基于uuid获取聊天信息
const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
// 筛选出对话列表，排除非正常对话选项的数据
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

// 用户输入的提示信息、加载状态的控制
const prompt = ref<string>('')
const loading = ref<boolean>(false)
// 输入框的引用，用于控制焦点等
const inputRef = ref<Ref | null>(null)

// 添加PromptStore
const promptStore = usePromptStore()

// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(+uuid, index, { loading: false })
})

/**
 * 提交表单，触发会话流程。
 */
function handleSubmit() {
  onConversation()
}

/**
 * 开始一个新的会话。
 * 该函数首先检查当前是否有输入消息，然后创建一个新的会话记录，并将输入的消息添加到会话中。
 */
async function onConversation() {
  // 获取当前输入框的值
  let message = prompt.value

  // 如果正在加载中，则直接返回
  if (loading.value)
    return

  // 如果消息为空或者只包含空格，则不进行任何操作
  if (!message || message.trim() === '')
    return

  // 初始化中断控制器
  controller = new AbortController()

  // 添加聊天消息到会话中
  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  // 滚动到聊天窗口底部
  scrollToBottom()

  // 设置加载状态为true，表示正在处理中
  loading.value = true
  // 清空输入框的消息
  prompt.value = ''

  // 初始化会话请求选项
  let options: Chat.ConversationRequest = {}
  // 尝试获取上一个会话的上下文，如果存在且选择使用上下文，则将其应用到当前会话
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }
  // 注意：代码在此处中断，缺少后续操作的说明

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '思考中',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  // 调用聊天API以获取聊天信息。
  try {
    let lastText = ''
    /**
     * 异步函数，用于获取一次聊天API的数据。
     * 利用给定的消息和选项来发起API请求，并在接收到响应时更新聊天记录。
     */
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message, // 输入的消息
        options, // 聊天选项
        signal: controller.signal, // 用于取消请求的信号
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // 处理接收到的响应文本
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            // 尝试解析接收到的数据
            const data = JSON.parse(chunk)
            // 更新聊天记录
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(), // 时间戳
                text: lastText + (data.text ?? ''), // 消息内容
                inversion: false, // 是否 inversion
                error: false, // 是否有错误
                loading: true, // 加载状态
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id }, // 会话选项
                requestOptions: { prompt: message, options: { ...options } }, // 请求选项
              },
            )

            // 长回复处理逻辑
            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce() // 递归调用以获取更多长回复内容
            }

            // 如果当前位于聊天窗口底部，则自动滚动到最底部
            scrollToBottomIfAtBottom()
          }
          catch (error) {
            // 错误处理逻辑（空实现）
          }
        },
      })
      // 更新聊天记录的加载状态
      updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
    }

    // 执行一次聊天API的调用
    await fetchChatAPIOnce()
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottomIfAtBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChat(
    +uuid,
    index,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              index,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }
          }
          catch (error) {
            //
          }
        },
      })
      updateChatSome(+uuid, index, { loading: false })
    }
    await fetchChatAPIOnce()
  }
  catch (error: any) {
    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = error?.message ?? t('common.wrong')

    updateChat(
      +uuid,
      index,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          id="image-wrapper"
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <template v-if="!dataSources.length">
            <div class="flex items-center justify-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
              <span>Aha~</span>
            </div>
          </template>
          <template v-else>
            <div>
              <Message
                v-for="(item, index) of dataSources"
                :key="index"
                :date-time="item.dateTime"
                :text="item.text"
                :inversion="item.inversion"
                :error="item.error"
                :loading="item.loading"
                @regenerate="onRegenerate(index)"
                @delete="handleDelete(index)"
              />
              <div class="sticky bottom-0 left-0 flex justify-center">
                <NButton v-if="loading" type="warning" @click="handleStop">
                  <template #icon>
                    <SvgIcon icon="ri:stop-circle-line" />
                  </template>
                  {{ t('common.stopResponding') }}
                </NButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <HoverButton @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                ref="inputRef"
                v-model:value="prompt"
                type="textarea"
                :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                @input="handleInput"
                @focus="handleFocus"
                @blur="handleBlur"
                @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>
