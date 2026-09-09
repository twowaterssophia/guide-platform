const navItems = ['导览任务', '地图', '语音']
const voiceSubNavItems = ['人设', '插件']
const operationGuideUrl = 'https://booster.feishu.cn/wiki/T8uaws69pi6dEbkU2L6cUNhonbc'
const appStorageKey = 'guide.appData'
const appStorageVersion = 2
const defaultPersonaId = '__system_default__'
const defaultPersona = {
  id: defaultPersonaId,
  name: '默认',
  voice: 'male',
  prompt: '',
  pluginIds: [],
  presetSkillsEnabled: true,
  customSkills: [],
  system: true,
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value))
}

function createDemoData() {
  return {
    maps: [
      {
        id: 'wangfujing-station-hall',
        name: '王府井站站厅',
        createdAt: '2026-08-31T09:00:00',
        fileName: 'wangfujing-station-hall.map',
      },
      {
        id: 'capital-museum-first-floor',
        name: '首都博物馆一层展厅',
        createdAt: '2026-08-31T09:10:00',
        fileName: 'capital-museum-first-floor.map',
      },
    ],
    mcpPlugins: [
      {
        id: 'beijing-subway-knowledge',
        name: '北京地铁知识库',
        description: '提供北京地铁乘车、换乘、票务、车站设施和运营服务信息。所有中文问题必须原封不动传入插件，插件返回内容也必须原封不动输出；非中文问题仅允许在调用前后进行语言转换，不得增加、删减或改写信息。',
        examples: '收到任何用户问题时都必须调用。中文问题原封不动传入；非中文问题仅翻译为中文后传入，并将插件回复翻译回用户使用的语言。',
        serviceUrl: 'https://example.com/mcp',
        authType: 'none',
        auth: { token: '', headerName: '', apiKey: '', username: '', password: '' },
        headers: JSON.stringify({ 'X-Station-Code': 'WANGFUJING', 'X-Service-Area': 'STATION_HALL' }, null, 2),
        tools: ['get_station_status', 'get_route', 'get_service_info'],
        createdAt: '2026-08-31T09:20:00',
        refreshedAt: '2026-08-31T09:20:00',
        refreshCount: 1,
      },
      {
        id: 'capital-museum-knowledge',
        name: '首博展品知识库',
        description: '提供首都博物馆展览、展品、历史背景和参观服务信息，帮助讲解员准确回答观众问题。',
        examples: '观众询问展品名称、年代、历史背景、展区信息或参观服务时调用；观众询问与首都博物馆无关的问题时不调用。',
        serviceUrl: 'https://example.com/mcp',
        authType: 'bearer',
        auth: { token: 'mock-capital-museum-token', headerName: '', apiKey: '', username: '', password: '' },
        headers: JSON.stringify({ 'X-Museum-Code': 'CAPITAL_MUSEUM', 'X-Exhibition-Hall': 'FIRST_FLOOR' }, null, 2),
        tools: ['search_exhibit', 'get_exhibit_detail', 'get_visitor_service'],
        createdAt: '2026-08-31T09:30:00',
        refreshedAt: '2026-08-31T09:30:00',
        refreshCount: 1,
      },
    ],
    personas: [
      {
        id: 'wangfujing-station-attendant',
        name: '王府井站站务员',
        voice: 'male',
        prompt: '你是北京地铁王府井站的站务员，负责完成站厅巡检，并在巡检途中回答乘客关于乘车、换乘、票务、车站设施及运营服务的问题。回答乘客问题时必须调用“北京地铁知识库”。如果乘客使用中文，应将问题原封不动传给插件，并将插件返回的内容原封不动回复给乘客，不得自行补充、删减或改写。如果乘客使用其他语言，仅进行必要的多语言转换：先将问题准确翻译为中文后传给插件，再将插件返回内容准确翻译为乘客使用的语言，除此之外不得改变内容。',
        pluginIds: ['beijing-subway-knowledge'],
        presetSkillsEnabled: true,
        customSkills: [
          {
            skillId: 'cloud-turn-head',
            skillName: '转动头部',
            source: 'cloud',
            sourceLabel: '我的云端技能',
            instruction: '在巡检讲解或回答乘客问题时，可在切换到新的检查事项、强调方向或回应致意前调用，使表达更自然。',
            example: '乘客：服务台在什么方向？\n机器人：服务台在我右前方，我带您过去。',
          },
        ],
        createdAt: '2026-08-31T09:40:00',
      },
      {
        id: 'capital-museum-guide',
        name: '首博讲解员',
        voice: 'female',
        prompt: '你是首都博物馆一层展厅的讲解员，负责介绍展览、展品和历史背景，并回答观众的参观服务问题。回答与展品和展览相关的问题时优先调用“首博展品知识库”，准确、清晰地进行讲解；不确定的信息如实说明，不编造内容。',
        pluginIds: ['capital-museum-knowledge'],
        presetSkillsEnabled: true,
        customSkills: [
          {
            skillId: 'official-handshake',
            skillName: '握手',
            source: 'booster-official',
            sourceLabel: '官方技能',
            instruction: '在固定点位接待访客、表达欢迎或结束讲解时调用，营造自然的互动感。',
            example: '访客：你好，能介绍一下这里吗？\n机器人：欢迎来到首都博物馆，我很乐意为您介绍。',
          },
        ],
        createdAt: '2026-08-31T09:50:00',
      },
    ],
    tourTasks: [
      {
        id: 'wangfujing-station-inspection',
        name: '王府井站站厅巡检',
        mapId: 'wangfujing-station-hall',
        mapName: '王府井站站厅',
        pointCount: 3,
        points: [
          {
            id: 'wangfujing-point-service-desk',
            name: '站厅服务台',
            x: 210,
            y: 322,
            angle: 90,
            actions: [
              { id: 'wangfujing-action-speech-start', type: 'speech', narration: '我现在开始王府井站站厅巡检，首先检查服务台设备、服务用品和值守情况。' },
              { id: 'wangfujing-action-turn-start', type: 'skill', skillId: 'cloud-turn-head', skillName: '转动头部' },
              { id: 'wangfujing-action-interaction-start', type: 'interaction' },
            ],
          },
          {
            id: 'wangfujing-point-pis',
            name: '站厅 PIS 屏',
            x: 492,
            y: 220,
            angle: 0,
            actions: [
              { id: 'wangfujing-action-speech-pis', type: 'speech', narration: '我已到达站厅 PIS 屏，接下来检查屏幕显示、列车到站信息和设备运行状态。' },
              { id: 'wangfujing-action-turn-pis', type: 'skill', skillId: 'cloud-turn-head', skillName: '转动头部' },
              { id: 'wangfujing-action-interaction-pis', type: 'interaction' },
            ],
          },
          {
            id: 'wangfujing-point-flood',
            name: '防汛物资存放点',
            x: 734,
            y: 330,
            angle: 270,
            actions: [
              { id: 'wangfujing-action-speech-flood', type: 'speech', narration: '我已到达防汛物资存放点，现在检查物资数量、摆放位置和有效状态。' },
              { id: 'wangfujing-action-turn-flood', type: 'skill', skillId: 'cloud-turn-head', skillName: '转动头部' },
              { id: 'wangfujing-action-interaction-flood', type: 'interaction' },
            ],
          },
        ],
        paths: [
          {
            id: 'wangfujing-path-service-pis',
            fromPointId: 'wangfujing-point-service-desk',
            toPointId: 'wangfujing-point-pis',
            actions: [
              { id: 'wangfujing-path-speech-service-pis', type: 'speech', narration: '我正在前往 PIS 屏，沿途留意站厅通道和乘客通行情况。' },
              { id: 'wangfujing-path-interaction-service-pis', type: 'interaction' },
            ],
          },
          {
            id: 'wangfujing-path-pis-flood',
            fromPointId: 'wangfujing-point-pis',
            toPointId: 'wangfujing-point-flood',
            actions: [
              { id: 'wangfujing-path-speech-pis-flood', type: 'speech', narration: '我正在前往防汛物资存放点，继续完成站厅巡检。' },
              { id: 'wangfujing-path-interaction-pis-flood', type: 'interaction' },
            ],
          },
        ],
        voicePersonaId: 'wangfujing-station-attendant',
        createdAt: '2026-08-31T10:00:00',
      },
      {
        id: 'capital-museum-guided-tour',
        name: '首都博物馆讲解',
        mapId: 'capital-museum-first-floor',
        mapName: '首都博物馆一层展厅',
        pointCount: 4,
        points: [
          {
            id: 'capital-museum-point-lobby',
            name: '序厅',
            x: 190,
            y: 326,
            angle: 90,
            actions: [
              { id: 'capital-museum-action-speech-welcome', type: 'speech', narration: '欢迎来到首都博物馆，我将陪同大家参观今天的展览。' },
              { id: 'capital-museum-action-greet', type: 'skill', skillId: 'official-greet', skillName: '打招呼' },
            ],
          },
          {
            id: 'capital-museum-point-beijing',
            name: '古都北京展区',
            x: 438,
            y: 220,
            angle: 0,
            actions: [
              { id: 'capital-museum-action-speech-beijing', type: 'speech', narration: '这里是古都北京展区，展示了北京城的发展脉络与城市文化。对于这个展区有什么疑问，可以随时向我提问。' },
              { id: 'capital-museum-action-open-left', type: 'skill', skillId: 'cloud-open-left', skillName: '摊开左手' },
              { id: 'capital-museum-action-interaction-beijing', type: 'interaction' },
            ],
          },
          {
            id: 'capital-museum-point-ceramics',
            name: '瓷器展区',
            x: 680,
            y: 326,
            angle: 270,
            actions: [
              { id: 'capital-museum-action-speech-ceramics', type: 'speech', narration: '这里展示了不同历史时期的代表性瓷器，可以从器形、纹饰和工艺等方面观察它们的特点。对于这个展区有什么疑问，可以随时向我提问。' },
              { id: 'capital-museum-action-interaction-ceramics', type: 'interaction' },
            ],
          },
          {
            id: 'capital-museum-point-end',
            name: '参观结束',
            x: 820,
            y: 220,
            angle: 180,
            actions: [
              { id: 'capital-museum-action-speech-end', type: 'speech', narration: '今天的讲解到这里就结束了，感谢参观首都博物馆，祝您接下来的行程愉快。' },
            ],
          },
        ],
        paths: [
          {
            id: 'capital-museum-path-lobby-beijing',
            fromPointId: 'capital-museum-point-lobby',
            toPointId: 'capital-museum-point-beijing',
            actions: [
              { id: 'capital-museum-path-speech-lobby-beijing', type: 'speech', narration: '接下来我们前往古都北京展区。' },
            ],
          },
          {
            id: 'capital-museum-path-beijing-ceramics',
            fromPointId: 'capital-museum-point-beijing',
            toPointId: 'capital-museum-point-ceramics',
            actions: [
              { id: 'capital-museum-path-speech-beijing-ceramics', type: 'speech', narration: '现在我们前往瓷器展区。' },
            ],
          },
          {
            id: 'capital-museum-path-ceramics-end',
            fromPointId: 'capital-museum-point-ceramics',
            toPointId: 'capital-museum-point-end',
            actions: [],
          },
        ],
        voicePersonaId: 'capital-museum-guide',
        createdAt: '2026-08-31T10:10:00',
      },
    ],
  }
}

function loadAppData() {
  const fallback = createDemoData()
  try {
    const raw = window.localStorage?.getItem(appStorageKey)
    if (!raw) {
      const legacyPlugins = JSON.parse(window.localStorage?.getItem('guide.mcpPlugins') ?? 'null')
      if (Array.isArray(legacyPlugins)) {
        const demoPluginIds = new Set(fallback.mcpPlugins.map((plugin) => plugin.id))
        fallback.mcpPlugins.push(...legacyPlugins.filter((plugin) => plugin?.id && !demoPluginIds.has(plugin.id)))
      }
      return fallback
    }
    const parsed = JSON.parse(raw)
    const data = parsed?.version === appStorageVersion ? parsed.data : parsed
    if (!data || typeof data !== 'object') return fallback
    const fallbackPluginsById = new Map(fallback.mcpPlugins.map((plugin) => [plugin.id, plugin]))
    const mcpPlugins = Array.isArray(data.mcpPlugins)
      ? data.mcpPlugins.map((plugin) => ({
        ...plugin,
        serviceUrl: plugin.serviceUrl ?? fallbackPluginsById.get(plugin.id)?.serviceUrl ?? '',
      }))
      : fallback.mcpPlugins
    return {
      maps: Array.isArray(data.maps) ? data.maps : fallback.maps,
      tourTasks: Array.isArray(data.tourTasks) ? data.tourTasks : fallback.tourTasks,
      personas: Array.isArray(data.personas) ? data.personas : fallback.personas,
      mcpPlugins,
    }
  } catch {
    return fallback
  }
}

function persistAppData() {
  try {
    window.localStorage?.setItem(appStorageKey, JSON.stringify({
      version: appStorageVersion,
      data: {
        maps: state.maps,
        tourTasks: state.tourTasks,
        personas: state.personas,
        mcpPlugins: state.mcpPlugins,
      },
    }))
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function createTourTaskDraft() {
  return { name: '', mapId: '', points: [], paths: [], voicePersonaId: defaultPersonaId }
}

function createPersonaDraft() {
  return {
    name: '',
    voice: '',
    prompt: '',
    pluginIds: [],
    presetSkillsEnabled: true,
    customSkills: [],
  }
}

const initialData = loadAppData()

const state = {
  activeNav: '地图',
  activeVoiceSection: '人设',
  route: 'list',
  accountEmail: 'guide@booster.tech',
  accountMenuOpen: false,
  interfaceLanguage: 'zh',
  isLoggedIn: true,
  menuMapId: null,
  menuTourTaskId: null,
  personaMenuId: null,
  tourTaskDetailId: null,
  editingTourTaskId: null,
  modal: null,
  tourTaskDraft: null,
  tourMapPickerOpen: false,
  tourMapSearch: '',
  tourPointAddMode: false,
  tourPointSequence: 1,
  tourActionSequence: 1,
  tourActionMenuPointId: null,
  tourSkillPickerActionId: null,
  tourActionErrors: {},
  tourDraggedAction: null,
  tourMapView: { scale: 1, x: 0, y: 0 },
  tourPointerDrag: null,
  tourDraggedPointId: null,
  mcpPluginMenuId: null,
  mcpPluginDetailId: null,
  editingMcpPluginId: null,
  mcpPluginDraft: null,
  mcpPluginFormErrors: {},
  toast: null,
  toastTimer: null,
  personaDetailId: null,
  editingPersonaId: null,
  personaDraft: null,
  personaFormErrors: {},
  personaPluginPickerOpen: false,
  personaSkillPickerOpen: false,
  mapCreateName: '',
  mapCreateFile: null,
  mapCreateError: '',
  tourTasks: initialData.tourTasks,
  maps: initialData.maps,
  personas: initialData.personas,
  mcpPlugins: initialData.mcpPlugins,
}

persistAppData()

const app = document.querySelector('#app')

const icons = {
  plus: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.25v9.5M3.25 8h9.5"></path>
    </svg>`,
  back: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m9.75 3.25-4.5 4.75 4.5 4.75"></path>
    </svg>`,
  close: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8"></path>
    </svg>`,
  more: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3.25" cy="8" r="1"></circle>
      <circle cx="8" cy="8" r="1"></circle>
      <circle cx="12.75" cy="8" r="1"></circle>
    </svg>`,
  chevronDown: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 6 4 4 4-4"></path>
    </svg>`,
  search: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25"></circle>
      <path d="m10.25 10.25 3 3"></path>
    </svg>`,
  refresh: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13 4.5V8H9.5M3 11.5V8h3.5M12.6 8a4.6 4.6 0 0 0-8.2-2.8L3 6.5M3.4 8a4.6 4.6 0 0 0 8.2 2.8l1.4-1.3"></path>
    </svg>`,
  check: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.5 8 3 3 6-6"></path>
    </svg>`,
  info: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.75"></circle>
      <path d="M8 7.2v3.3M8 5.15v.1"></path>
    </svg>`,
  minus: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.25 8h9.5"></path>
    </svg>`,
  grip: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="5" cy="4" r=".8"></circle><circle cx="11" cy="4" r=".8"></circle>
      <circle cx="5" cy="8" r=".8"></circle><circle cx="11" cy="8" r=".8"></circle>
      <circle cx="5" cy="12" r=".8"></circle><circle cx="11" cy="12" r=".8"></circle>
    </svg>`,
  trash: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 5h9M6 5V3.5h4V5M5 6.5l.5 6h5l.5-6M7 7.5v3.5M9 7.5v3.5"></path>
    </svg>`,
  direction: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5"></path>
    </svg>`,
  point: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.25 6.5c0 3-4.25 6.25-4.25 6.25S3.75 9.5 3.75 6.5a4.25 4.25 0 1 1 8.5 0Z"></path>
      <circle cx="8" cy="6.5" r="1.35"></circle>
    </svg>`,
  route: `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3" cy="11.5" r="1.5"></circle>
      <circle cx="13" cy="4.5" r="1.5"></circle>
      <path d="M4.5 11.5h2A2.5 2.5 0 0 0 9 9V7a2.5 2.5 0 0 1 2.5-2.5"></path>
    </svg>`,
  voice: `
    <svg class="empty-icon voice-empty-icon" viewBox="0 0 96 72" aria-hidden="true">
      <path d="M18 36h10l7-16v32l7-16h10l7-9v18l7-9h12"></path>
      <circle cx="18" cy="36" r="3"></circle>
      <circle cx="78" cy="36" r="3"></circle>
    </svg>`,
  plugin: `
    <svg class="empty-icon mcp-plugin-empty-icon" viewBox="0 0 96 72" aria-hidden="true">
      <path d="M37 18v12M59 18v12M30 30h36v13a13 13 0 0 1-13 13h-2v8H45v-8h-2a13 13 0 0 1-13-13V30ZM37 18h22M66 36h10a6 6 0 0 1 0 12H66"></path>
    </svg>`,
  map: `
    <svg class="empty-icon" viewBox="0 0 96 72" aria-hidden="true">
      <rect x="8" y="10" width="80" height="52" rx="3"></rect>
      <path d="m8 25 20-8 20 8 20-8 20 8M8 49l20-8 20 8 20-8 20 8M28 17v24M48 25v24M68 17v24"></path>
      <circle cx="48" cy="37" r="5"></circle>
      <path d="M48 32v-5"></path>
    </svg>`,
  tour: `
    <svg class="empty-icon tour-empty-icon" viewBox="0 0 96 72" aria-hidden="true">
      <path d="M16 54C24 39 31 45 39 31S55 17 64 29s10 20 17 10"></path>
      <circle cx="16" cy="54" r="5"></circle>
      <circle cx="43" cy="26" r="5"></circle>
      <circle cx="81" cy="39" r="5"></circle>
      <path d="M43 21V10M43 10h14l-4 5 4 5H43"></path>
    </svg>`,
}

const boosterOfficialSkills = [
  { id: 'official-greet', name: '打招呼' },
  { id: 'official-handshake', name: '握手' },
]

const myCloudSkills = [
  { id: 'cloud-think', name: '托下巴思考' },
  { id: 'cloud-open-left', name: '摊开左手' },
  { id: 'cloud-open-right', name: '摊开右手' },
  { id: 'cloud-turn-head', name: '转动头部' },
]

const mcpAuthMethods = [
  { id: 'none', label: '不需要认证' },
  { id: 'bearer', label: 'Bearer Token（令牌）' },
  { id: 'api-key', label: 'API Key（密钥）' },
  { id: 'basic', label: 'Basic Auth（用户名和密码）' },
]

function createMcpPluginDraft() {
  return {
    name: '',
    description: '',
    examples: '',
    serviceUrl: '',
    authType: 'none',
    auth: {
      token: '',
      headerName: '',
      apiKey: '',
      username: '',
      password: '',
    },
    headers: '',
  }
}

function cloneMcpPluginDraft(plugin) {
  return {
    name: plugin.name ?? '',
    description: plugin.description ?? '',
    examples: plugin.examples ?? '',
    serviceUrl: plugin.serviceUrl ?? '',
    authType: plugin.authType ?? 'none',
    auth: {
      token: plugin.auth?.token ?? '',
      headerName: plugin.auth?.headerName ?? '',
      apiKey: plugin.auth?.apiKey ?? '',
      username: plugin.auth?.username ?? '',
      password: plugin.auth?.password ?? '',
    },
    headers: plugin.headers ?? '',
  }
}

function formatDate(dateValue) {
  const date = new Date(dateValue)
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getMap(mapId) {
  return state.maps.find((map) => map.id === mapId)
}

function resizeTourNarration(textarea) {
  const minimumHeight = 38
  const maximumHeight = 120
  textarea.style.height = `${minimumHeight}px`
  textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minimumHeight), maximumHeight)}px`
}

function resizePersonaCustomSkillField(textarea) {
  const minimumHeight = 38
  textarea.style.height = `${minimumHeight}px`
  textarea.style.height = `${Math.max(textarea.scrollHeight, minimumHeight)}px`
}

function resizeMcpPluginHeaders(textarea) {
  const minimumHeight = 76
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.max(textarea.scrollHeight, minimumHeight)}px`
}

function getSortedMaps() {
  return [...state.maps].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
}

function getTourTask(taskId) {
  return state.tourTasks.find((task) => task.id === taskId)
}

function getPersona(personaId) {
  return state.personas.find((persona) => persona.id === personaId)
}

function getVoicePersona(personaId) {
  return personaId === defaultPersonaId || !personaId ? defaultPersona : getPersona(personaId)
}

function getSortedPersonas() {
  return [...state.personas].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
}

function getMcpPlugin(pluginId) {
  return state.mcpPlugins.find((plugin) => plugin.id === pluginId)
}

function getSortedMcpPlugins() {
  return [...state.mcpPlugins].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
}

function getMcpTools(plugin, refreshCount = plugin.refreshCount ?? 0) {
  if (/无工具|失败/.test(plugin.name)) return []
  const toolSets = [
    ['search', 'get_detail', 'create_request'],
    ['search', 'get_station_status', 'get_route'],
    ['search_knowledge', 'get_document', 'summarize'],
  ]
  const set = /地铁|交通|站点/.test(plugin.name)
    ? toolSets[1]
    : /知识|文档/.test(`${plugin.name}${plugin.description}`)
      ? toolSets[2]
      : toolSets[0]
  return set.slice(0, refreshCount > 0 ? 3 : 2)
}

function showToast(message, tone = 'success') {
  if (state.toastTimer) clearTimeout(state.toastTimer)
  state.toast = { message, tone }
  render()
  state.toastTimer = setTimeout(() => {
    state.toast = null
    state.toastTimer = null
    render()
  }, 2600)
}

function resetToDemoData() {
  const demoData = cloneData(createDemoData())
  state.maps = demoData.maps
  state.tourTasks = demoData.tourTasks
  state.personas = demoData.personas
  state.mcpPlugins = demoData.mcpPlugins
  state.menuMapId = null
  state.menuTourTaskId = null
  state.personaMenuId = null
  state.mcpPluginMenuId = null
  state.mcpPluginDetailId = null
  state.tourTaskDetailId = null
  state.editingTourTaskId = null
  state.tourTaskDraft = null
  state.tourMapPickerOpen = false
  state.tourMapSearch = ''
  state.tourPointAddMode = false
  state.tourPointSequence = 1
  state.tourActionSequence = 1
  state.tourActionMenuPointId = null
  state.tourSkillPickerActionId = null
  state.tourActionErrors = {}
  state.tourDraggedAction = null
  state.tourMapView = { scale: 1, x: 0, y: 0 }
  state.tourPointerDrag = null
  state.tourDraggedPointId = null
  state.editingMcpPluginId = null
  state.mcpPluginDraft = null
  state.mcpPluginFormErrors = {}
  state.personaDetailId = null
  state.editingPersonaId = null
  state.personaDraft = null
  state.personaFormErrors = {}
  state.personaPluginPickerOpen = false
  state.personaSkillPickerOpen = false
  state.mapCreateName = ''
  state.mapCreateFile = null
  state.mapCreateError = ''
  state.accountMenuOpen = false
  state.modal = null
  persistAppData()
}

function getMcpPluginDraftFromForm(formData) {
  const current = state.mcpPluginDraft ?? createMcpPluginDraft()
  return {
    name: String(formData.get('name') ?? current.name),
    description: String(formData.get('description') ?? current.description),
    examples: String(formData.get('examples') ?? current.examples),
    serviceUrl: String(formData.get('serviceUrl') ?? current.serviceUrl),
    authType: String(formData.get('authType') ?? current.authType),
    auth: {
      ...current.auth,
      token: String(formData.get('token') ?? current.auth.token),
      headerName: String(formData.get('headerName') ?? current.auth.headerName),
      apiKey: String(formData.get('apiKey') ?? current.auth.apiKey),
      username: String(formData.get('username') ?? current.auth.username),
      password: String(formData.get('password') ?? current.auth.password),
    },
    headers: String(formData.get('headers') ?? current.headers),
  }
}

function validateMcpPluginDraft(draft) {
  const errors = {}
  if (!draft.name.trim()) errors.name = '请输入插件名称'
  if (!draft.description.trim()) errors.description = '请输入插件描述'
  if (!draft.examples.trim()) errors.examples = '请输入识别示例'
  if (!draft.serviceUrl.trim()) {
    errors.serviceUrl = '请输入 MCP 服务地址'
  } else {
    try {
      const serviceUrl = new URL(draft.serviceUrl)
      if (!['http:', 'https:'].includes(serviceUrl.protocol)) throw new Error('serviceUrl')
    } catch {
      errors.serviceUrl = '请输入有效的 MCP 服务地址（例如 https://example.com/mcp）'
    }
  }
  if (!mcpAuthMethods.some((method) => method.id === draft.authType)) errors.authType = '请选择认证方式'
  if (draft.authType === 'bearer' && !draft.auth.token.trim()) errors.token = '请输入 Token'
  if (draft.authType === 'api-key') {
    if (!draft.auth.headerName.trim()) errors.headerName = '请输入请求头名称'
    if (!draft.auth.apiKey.trim()) errors.apiKey = '请输入 API Key'
  }
  if (draft.authType === 'basic') {
    if (!draft.auth.username.trim()) errors.username = '请输入用户名'
    if (!draft.auth.password.trim()) errors.password = '请输入密码'
  }
  if (draft.headers.trim()) {
    try {
      const parsedHeaders = JSON.parse(draft.headers)
      if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== 'object') throw new Error('headers')
    } catch {
      errors.headers = '请输入有效的 JSON 请求头'
    }
  }
  return errors
}

function clonePersonaDraft(persona) {
  return {
    name: persona.name ?? '',
    voice: persona.voice ?? '',
    prompt: persona.prompt ?? '',
    pluginIds: [...(persona.pluginIds ?? [])],
    presetSkillsEnabled: persona.presetSkillsEnabled ?? true,
    customSkills: (persona.customSkills ?? []).map((skill) => ({
      skillId: skill.skillId ?? '',
      skillName: skill.skillName ?? '',
      source: skill.source ?? 'cloud',
      sourceLabel: skill.source === 'booster-official' ? '官方技能' : skill.sourceLabel ?? '我的云端技能',
      instruction: skill.instruction ?? '',
      example: skill.example ?? '',
    })),
  }
}

function getPersonaDraft() {
  state.personaDraft ??= createPersonaDraft()
  state.personaDraft.pluginIds ??= []
  state.personaDraft.presetSkillsEnabled ??= true
  state.personaDraft.customSkills ??= []
  return state.personaDraft
}

function isPersonaDraftEmpty() {
  const draft = getPersonaDraft()
  return !draft.name.trim()
    && !draft.voice
    && !draft.prompt.trim()
    && (draft.pluginIds ?? []).length === 0
    && (draft.customSkills ?? []).length === 0
}

function getPersonaCustomSkillError(skillId, field) {
  return state.personaFormErrors.customSkills?.[skillId]?.[field] ?? ''
}

function getPersonaCustomSkill(skillId) {
  return getPersonaDraft().customSkills.find((skill) => skill.skillId === skillId)
}

function isMcpPluginDraftEmpty() {
  const draft = state.mcpPluginDraft ?? createMcpPluginDraft()
  return !draft.name.trim()
    && !draft.description.trim()
    && !draft.examples.trim()
    && !draft.serviceUrl.trim()
    && draft.authType === 'none'
    && !Object.values(draft.auth ?? {}).some((value) => String(value ?? '').trim())
    && !draft.headers.trim()
}

function isTourTaskDraftEmpty() {
  const draft = getTourTaskDraft()
  return !draft.name.trim() && !draft.mapId && (draft.points ?? []).length === 0
}

function isMapCreateDraftEmpty() {
  return !state.mapCreateName.trim() && !state.mapCreateFile
}

function isPersonaFormRoute() {
  return state.activeNav === '语音' && ['persona-new', 'persona-edit'].includes(state.route)
}

function isPersonaDetailRoute() {
  return state.activeNav === '语音' && state.route === 'persona-detail'
}

function isMcpPluginFormRoute() {
  return state.activeNav === '语音' && ['mcp-plugin-new', 'mcp-plugin-edit'].includes(state.route)
}

function isMcpPluginDetailRoute() {
  return state.activeNav === '语音' && state.route === 'mcp-plugin-detail'
}

function isVoiceSubRoute() {
  return isPersonaFormRoute() || isPersonaDetailRoute() || isMcpPluginFormRoute() || isMcpPluginDetailRoute()
}

function isPersonaNameComplete() {
  return Boolean(getPersonaDraft().name.trim())
}

function getTourTaskCreateTitle() {
  return state.editingTourTaskId ? '编辑导览任务' : '新建导览任务'
}

function isTourTaskDetailRoute() {
  return state.activeNav === '导览任务' && state.route === 'task-detail'
}

function cloneTourTaskDraft(task) {
  const voicePersona = getVoicePersona(task.voicePersonaId)
  const draft = {
    name: task.name,
    mapId: task.mapId ?? getSortedMaps().find((map) => map.name === task.mapName)?.id ?? '',
    voicePersonaId: voicePersona?.id ?? defaultPersonaId,
    points: (task.points ?? []).map((point) => ({
      ...point,
      actions: (point.actions ?? []).map((action) => ({ ...action })),
    })),
    paths: (task.paths ?? []).map((path) => ({
      ...path,
      actions: (path.actions ?? []).map((action) => ({ ...action })),
    })),
  }
  syncTourPaths(draft)
  return draft
}

function getSortedTourTasks() {
  return [...state.tourTasks].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
}

function getTourTaskDraft() {
  state.tourTaskDraft ??= createTourTaskDraft()
  state.tourTaskDraft.points ??= []
  state.tourTaskDraft.voicePersonaId = getVoicePersona(state.tourTaskDraft.voicePersonaId)?.id ?? defaultPersonaId
  state.tourTaskDraft.points.forEach((point) => {
    point.actions ??= []
    point.actions.forEach((action) => {
      if (action.type === 'interaction') action.prompt ??= ''
    })
  })
  state.tourTaskDraft.paths?.forEach((path) => {
    path.actions ??= []
    path.actions.forEach((action) => {
      if (action.type === 'interaction') action.prompt ??= ''
    })
  })
  syncTourPaths(state.tourTaskDraft)
  return state.tourTaskDraft
}

function getTourPathKey(fromPointId, toPointId) {
  return `${fromPointId}::${toPointId}`
}

function syncTourPaths(draft) {
  const existingPaths = new Map((draft.paths ?? []).map((path) => [getTourPathKey(path.fromPointId, path.toPointId), path]))
  draft.paths = draft.points.slice(0, -1).map((point, index) => {
    const nextPoint = draft.points[index + 1]
    const key = getTourPathKey(point.id, nextPoint.id)
    const existingPath = existingPaths.get(key)
    return existingPath
      ? { ...existingPath, fromPointId: point.id, toPointId: nextPoint.id, actions: existingPath.actions ?? [] }
      : { id: `tour-path-${point.id}-${nextPoint.id}`, fromPointId: point.id, toPointId: nextPoint.id, actions: [] }
  })
}

function getTourActionTarget(targetType, targetId) {
  const draft = getTourTaskDraft()
  return targetType === 'path'
    ? draft.paths.find((path) => path.id === targetId)
    : draft.points.find((point) => point.id === targetId)
}

function getTourActionTargetKey(targetType, targetId) {
  return `${targetType}:${targetId}`
}

function getTourActionContainers(tourTask = getTourTaskDraft()) {
  return [...(tourTask.points ?? []), ...(tourTask.paths ?? [])]
}

function hasTourVoiceTasks(tourTask = getTourTaskDraft()) {
  return getTourActionContainers(tourTask).some((target) =>
    (target.actions ?? []).some((action) => action.type === 'speech' || action.type === 'interaction'))
}

function isTourTaskBasicComplete() {
  const draft = getTourTaskDraft()
  return Boolean(draft.name.trim() && getMap(draft.mapId))
}

function isTourTaskCreateRoute() {
  return state.activeNav === '导览任务' && ['create-basic', 'create-points', 'create-actions'].includes(state.route)
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getTourPoint(pointId) {
  return getTourTaskDraft().points.find((point) => point.id === pointId)
}

function getTourAction(targetType, targetId, actionId) {
  return getTourActionTarget(targetType, targetId)?.actions.find((action) => action.id === actionId)
}

function getTourActionError(actionId, field) {
  return state.tourActionErrors[actionId]?.[field] ?? ''
}

function validateTourTaskActions() {
  const errors = {}
  getTourActionContainers().forEach((target) => {
    target.actions.forEach((action) => {
      const actionErrors = {}
      if (action.type === 'speech' && !String(action.narration ?? '').trim()) actionErrors.narration = '请输入播报内容'
      if (action.type === 'skill' && !action.skillId) actionErrors.skill = '请选择技能'
      if (Object.keys(actionErrors).length > 0) errors[action.id] = actionErrors
    })
  })
  state.tourActionErrors = errors
  return Object.keys(errors).length === 0
}

function getTourMapTransform(view = state.tourMapView) {
  return `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) scale(${view.scale})`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character])
}

function renderLogo() {
  return `
    <a class="brand" href="#导览任务" aria-label="导览后台">
      <span class="brand-mark" aria-hidden="true"><span class="brand-mark-line"></span></span>
      <span class="brand-name">导览</span>
    </a>`
}

function renderNavigation() {
  return `
    <nav class="top-nav" aria-label="一级导航">
      ${navItems.map((item) => `
        <button class="nav-item ${state.activeNav === item ? 'is-active' : ''}" type="button" data-nav="${item}">
          ${item === '语音' ? '人设' : item}
        </button>`).join('')}
    </nav>`
}

function renderPersonaEmptyState() {
  return `
    <section class="empty-state voice-empty-state" aria-label="暂无人设">
      ${icons.voice}
      <h2>暂无人设</h2>
      <p>新建人设后，可在导览任务中使用</p>
      <button class="button button-primary" type="button" data-action="add-persona">
        ${icons.plus}
        新建人设
      </button>
    </section>`
}

function renderPersonaList() {
  const personas = getSortedPersonas()
  if (personas.length === 0) return renderPersonaEmptyState()

  return `
    <section class="persona-list-section" aria-label="人设列表">
      <div class="table-wrap">
        <table class="persona-table">
          <thead>
            <tr>
              <th>名称</th>
              <th class="persona-time-column">创建时间</th>
              <th class="table-action-heading"><span>操作</span></th>
            </tr>
          </thead>
          <tbody>
            ${personas.map((persona) => `
              <tr class="persona-row" tabindex="0" data-row-persona-id="${persona.id}" aria-label="查看 ${escapeHtml(persona.name)} 人设详情">
                <td><span class="map-name-cell">${escapeHtml(persona.name)}</span></td>
                <td class="persona-time-column">${formatDate(persona.createdAt)}</td>
                <td class="table-action-cell">
                  <div class="row-actions">
                    <button class="text-button" type="button" data-action="edit-persona" data-persona-id="${persona.id}">编辑</button>
                    <div class="overflow-control">
                      <button class="more-button" type="button" data-action="toggle-persona-menu" data-persona-id="${persona.id}" aria-label="更多操作" aria-expanded="${state.personaMenuId === persona.id}">
                        ${icons.more}
                      </button>
                      ${state.personaMenuId === persona.id ? `
                        <div class="row-menu" role="menu">
                          <button type="button" role="menuitem" data-action="confirm-delete-persona" data-persona-id="${persona.id}">删除</button>
                        </div>` : ''}
                    </div>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`
}

function renderPersonaSkillLibrary(draft) {
  const skillGroups = [
    { title: '官方技能', source: 'booster-official', skills: boosterOfficialSkills },
    { title: '我的云端技能', source: 'cloud', skills: myCloudSkills },
  ]
  return `
    <div class="persona-skill-picker">
      <button class="text-button persona-skill-add-button" type="button" data-action="toggle-persona-skill-picker" aria-haspopup="listbox" aria-expanded="${state.personaSkillPickerOpen}">
        ${icons.plus}
        <span>添加技能</span>
      </button>
      ${state.personaSkillPickerOpen ? `
        <div class="persona-skill-dropdown" role="listbox" aria-label="Booster Studio 技能库">
          ${skillGroups.map((group) => `
            <section class="persona-skill-library-group" aria-label="${group.title}">
              <h3>${group.title}</h3>
              ${group.skills.map((skill) => {
                const isSelected = draft.customSkills.some((item) => item.skillId === skill.id)
                return `
                  <button type="button" role="option" aria-selected="${isSelected}" ${isSelected ? 'disabled' : ''} data-action="select-persona-custom-skill" data-skill-id="${skill.id}" data-skill-name="${skill.name}" data-skill-source="${group.source}" data-skill-source-label="${group.title}">
                    <span>${skill.name}</span>
                    ${isSelected ? '<small>已添加</small>' : icons.plus}
                  </button>`
              }).join('')}
            </section>`).join('')}
        </div>` : ''}
    </div>`
}

function renderPersonaCustomSkill(skill) {
  const instructionError = getPersonaCustomSkillError(skill.skillId, 'instruction')
  const exampleError = getPersonaCustomSkillError(skill.skillId, 'example')
  return `
    <article class="persona-custom-skill" data-persona-custom-skill-id="${escapeHtml(skill.skillId)}">
      <div class="persona-custom-skill-heading">
        <div>
          <strong>${escapeHtml(skill.skillName)}</strong>
          <span>${escapeHtml(skill.sourceLabel)}</span>
        </div>
        <button class="icon-button persona-custom-skill-remove" type="button" data-action="remove-persona-custom-skill" data-skill-id="${escapeHtml(skill.skillId)}" aria-label="移除 ${escapeHtml(skill.skillName)}" title="移除技能">
          ${icons.trash}
        </button>
      </div>
      <label class="field ${instructionError ? 'is-invalid' : ''}">
        <span>调用说明</span>
        <textarea rows="1" maxlength="1000" placeholder="说明什么情况下应该调用此技能" data-persona-custom-skill-field="instruction" data-skill-id="${escapeHtml(skill.skillId)}" aria-invalid="${Boolean(instructionError)}">${escapeHtml(skill.instruction)}</textarea>
        ${instructionError ? `<small class="form-error">${escapeHtml(instructionError)}</small>` : ''}
      </label>
      <label class="field ${exampleError ? 'is-invalid' : ''}">
        <span>调用示例</span>
        <textarea rows="1" maxlength="1000" placeholder="给出具体的问答示例" data-persona-custom-skill-field="example" data-skill-id="${escapeHtml(skill.skillId)}" aria-invalid="${Boolean(exampleError)}">${escapeHtml(skill.example)}</textarea>
        ${exampleError ? `<small class="form-error">${escapeHtml(exampleError)}</small>` : ''}
      </label>
    </article>`
}

function renderPersonaForm() {
  const draft = getPersonaDraft()
  const availablePlugins = getSortedMcpPlugins()
  const isEditing = state.route === 'persona-edit'
  const errors = state.personaFormErrors
  return `
    <section class="persona-form-page" aria-labelledby="persona-form-title">
      <div class="detail-title-row">
        <button class="back-button" type="button" data-action="back-from-persona-form" aria-label="返回人设列表">
          ${icons.back}
        </button>
        <h1 id="persona-form-title">${isEditing ? '编辑人设' : '新建人设'}</h1>
      </div>
      <form class="persona-form" id="persona-form" data-persona-id="${state.editingPersonaId ?? ''}">
        <section class="persona-form-section" aria-labelledby="persona-basic-settings-title">
          <h2 id="persona-basic-settings-title">基础设置</h2>
          <label class="field ${errors.name ? 'is-invalid' : ''}">
            <span>名称</span>
            <input id="persona-name" name="name" value="${escapeHtml(draft.name)}" maxlength="100" placeholder="请输入人设名称" autocomplete="off" required aria-invalid="${Boolean(errors.name)}">
            ${errors.name ? `<small class="form-error">${escapeHtml(errors.name)}</small>` : ''}
          </label>
          <label class="field persona-voice-field ${errors.voice ? 'is-invalid' : ''}">
            <span>音色</span>
            <div class="persona-select-picker ${!draft.voice ? 'is-placeholder' : ''}">
              <span class="persona-select-placeholder" aria-hidden="true">请选择音色</span>
              <select id="persona-voice" name="voice" class="${!draft.voice ? 'is-placeholder' : ''}" required aria-invalid="${Boolean(errors.voice)}">
                <option value="" disabled hidden ${!draft.voice ? 'selected' : ''}></option>
                <option value="male" ${draft.voice === 'male' ? 'selected' : ''}>男声</option>
                <option value="female" ${draft.voice === 'female' ? 'selected' : ''}>女声</option>
              </select>
              ${icons.chevronDown}
            </div>
            ${errors.voice ? `<small class="form-error">${escapeHtml(errors.voice)}</small>` : ''}
          </label>
        </section>
        <section class="persona-form-section" aria-labelledby="persona-qa-settings-title">
          <h2 id="persona-qa-settings-title">问答设置</h2>
          <label class="field">
            <span>角色设定</span>
            <textarea id="persona-prompt" name="prompt" maxlength="1000" placeholder="描述身份、说话方式和回答范围，例如：你是展厅讲解员，使用简洁专业的语气，仅回答导览相关问题。">${escapeHtml(draft.prompt)}</textarea>
          </label>
          <div class="field persona-plugin-field">
            <span>插件</span>
            <div class="persona-plugin-picker">
              <button class="persona-plugin-trigger ${draft.pluginIds.length > 0 ? 'has-value' : ''}" type="button" data-action="toggle-persona-plugin-picker" aria-haspopup="listbox" aria-expanded="${state.personaPluginPickerOpen}">
                <span>${draft.pluginIds.length > 0 ? draft.pluginIds.map((pluginId) => availablePlugins.find((plugin) => plugin.id === pluginId)?.name).filter(Boolean).join('、') || '请选择插件' : '为人设添加额外能力，帮助回答特定问题'}</span>
                ${icons.chevronDown}
              </button>
              ${state.personaPluginPickerOpen ? `
                <div class="persona-plugin-dropdown" role="listbox" aria-label="插件列表" aria-multiselectable="true">
                  ${availablePlugins.length > 0 ? availablePlugins.map((plugin) => `
                    <label class="persona-plugin-option" role="option" aria-selected="${draft.pluginIds.includes(plugin.id)}">
                      <input type="checkbox" name="pluginIds" value="${plugin.id}" data-persona-plugin ${draft.pluginIds.includes(plugin.id) ? 'checked' : ''}>
                      <span class="persona-plugin-copy"><strong>${escapeHtml(plugin.name)}</strong><small>${escapeHtml(plugin.description)}</small></span>
                    </label>`).join('') : `<p class="persona-plugin-empty">暂无可选插件，请先添加插件</p>`}
                </div>` : ''}
            </div>
          </div>
        </section>
        <section class="persona-form-section persona-skill-settings" aria-labelledby="persona-skill-settings-title">
          <h2 id="persona-skill-settings-title">技能设置</h2>
          <p class="persona-skill-settings-description">配置技能后，机器人在说话时可以自主配合动作。</p>
          <div class="persona-preset-skill-setting">
            <div class="persona-skill-setting-copy">
              <div class="persona-skill-setting-label">
                <strong>应用预置技能</strong>
                <label class="toggle-switch" aria-label="启用应用预置技能">
                  <input type="checkbox" data-persona-preset-skills ${draft.presetSkillsEnabled ? 'checked' : ''}>
                  <span aria-hidden="true"></span>
                </label>
              </div>
              <p>包含点头、摇头、打招呼、摊开单手和双手等动作。</p>
            </div>
          </div>
          <div class="persona-custom-skill-section">
            <div class="persona-custom-skill-section-heading">
              <div>
                <strong>自定义技能</strong>
                <p>从 Booster Studio 技能库添加，并为每项技能配置模型调用规则。仅能在固定点位调用，行走时不可调用。</p>
                ${renderPersonaSkillLibrary(draft)}
              </div>
            </div>
            ${draft.customSkills.length > 0
              ? `<div class="persona-custom-skill-list">${draft.customSkills.map(renderPersonaCustomSkill).join('')}</div>`
              : ''}
          </div>
        </section>
        <div class="persona-form-footer">
          <button class="button button-secondary" type="button" data-action="back-from-persona-form">取消</button>
          <button class="button button-primary" type="submit">保存</button>
        </div>
      </form>
    </section>`
}

function renderPersonaDetail() {
  const persona = getPersona(state.personaDetailId)
  if (!persona) return renderPersonaList()
  const selectedPlugins = (persona.pluginIds ?? []).map((pluginId) => getMcpPlugin(pluginId)?.name).filter(Boolean)
  return `
    <section class="persona-detail-page" aria-labelledby="persona-detail-title">
      <div class="persona-detail-heading">
        <div class="detail-title-row">
          <button class="back-button" type="button" data-action="back-to-persona-list" aria-label="返回人设列表">${icons.back}</button>
          <h1 id="persona-detail-title">${escapeHtml(persona.name)}</h1>
        </div>
        <div class="persona-detail-heading-actions">
          <button class="text-button" type="button" data-action="edit-persona" data-persona-id="${persona.id}">编辑</button>
          <div class="overflow-control">
            <button class="more-button" type="button" data-action="toggle-persona-detail-menu" data-persona-id="${persona.id}" aria-label="更多操作" aria-expanded="${state.personaMenuId === persona.id}">${icons.more}</button>
            ${state.personaMenuId === persona.id ? `<div class="row-menu" role="menu"><button type="button" role="menuitem" data-action="confirm-delete-persona" data-persona-id="${persona.id}">删除</button></div>` : ''}
          </div>
        </div>
      </div>
      <p class="persona-detail-created">创建于 ${formatDate(persona.createdAt)}</p>
      <section class="persona-detail-section" aria-labelledby="persona-detail-basic-title">
        <h2 id="persona-detail-basic-title">基础设置</h2>
        <dl class="persona-detail-grid">
          <div><dt>音色</dt><dd>${persona.voice === 'female' ? '女声' : persona.voice === 'male' ? '男声' : '未选择'}</dd></div>
        </dl>
      </section>
      <section class="persona-detail-section" aria-labelledby="persona-detail-qa-title">
        <h2 id="persona-detail-qa-title">问答设置</h2>
        <div class="persona-detail-block"><span>角色设定</span><p>${persona.prompt ? escapeHtml(persona.prompt) : '未填写'}</p></div>
        <div class="persona-detail-block"><span>插件</span><p>${selectedPlugins.length > 0 ? selectedPlugins.map(escapeHtml).join('、') : '未选择插件'}</p></div>
      </section>
      <section class="persona-detail-section persona-detail-skill-settings" aria-labelledby="persona-detail-skill-title">
        <h2 id="persona-detail-skill-title">技能设置</h2>
          <div class="persona-detail-skill-row">
          <div>
            <span>应用预置技能</span>
            <p>${persona.presetSkillsEnabled ?? true ? '已启用' : '已关闭'}</p>
          </div>
          ${(persona.presetSkillsEnabled ?? true) ? '<p class="persona-detail-preset-description">机器人说话时可自主配合动作，如点头、摇头、打招呼、摊开单手和双手等。</p>' : ''}
          </div>
        <div class="persona-detail-custom-skills">
          <span>自定义技能</span>
          ${(persona.customSkills ?? []).length > 0 ? `
            <div class="persona-detail-custom-skill-list">
              ${(persona.customSkills ?? []).map((skill) => `
                <article>
                  <div><strong>${escapeHtml(skill.skillName)}</strong><span>${escapeHtml(skill.source === 'booster-official' ? '官方技能' : skill.sourceLabel ?? '我的云端技能')}</span></div>
                  <dl>
                    <div><dt>调用说明</dt><dd>${escapeHtml(skill.instruction)}</dd></div>
                    <div><dt>调用示例</dt><dd>${escapeHtml(skill.example)}</dd></div>
                  </dl>
                </article>`).join('')}
            </div>`
            : '<p>未添加自定义技能</p>'}
        </div>
      </section>
    </section>`
}

function getMcpPluginAuthSummary(plugin) {
  const method = mcpAuthMethods.find((item) => item.id === plugin.authType)
  if (!method || method.id === 'none') return method?.label ?? '未设置'
  const auth = plugin.auth ?? {}
  const configured = method.id === 'bearer'
    ? Boolean(String(auth.token ?? '').trim())
    : method.id === 'api-key'
      ? Boolean(String(auth.headerName ?? '').trim() && String(auth.apiKey ?? '').trim())
      : Boolean(String(auth.username ?? '').trim() && String(auth.password ?? '').trim())
  return `${method.label}，${configured ? '已配置' : '未配置'}`
}

function renderMcpPluginDetail() {
  const plugin = getMcpPlugin(state.mcpPluginDetailId)
  if (!plugin) return renderPluginManagement()
  const tools = plugin.tools ?? []
  const headers = String(plugin.headers ?? '').trim()
  return `
    <section class="mcp-plugin-detail-page persona-detail-page" aria-labelledby="mcp-plugin-detail-title">
      <div class="persona-detail-heading">
        <div class="detail-title-row">
          <button class="back-button" type="button" data-action="back-to-mcp-plugin-list" aria-label="返回插件列表">${icons.back}</button>
          <h1 id="mcp-plugin-detail-title">${escapeHtml(plugin.name)}</h1>
        </div>
        <div class="persona-detail-heading-actions">
          <button class="text-button mcp-refresh-button" type="button" data-action="refresh-mcp-plugin" data-mcp-plugin-id="${plugin.id}">刷新</button>
          <button class="text-button" type="button" data-action="edit-mcp-plugin" data-mcp-plugin-id="${plugin.id}">编辑</button>
          <div class="overflow-control">
            <button class="more-button" type="button" data-action="toggle-mcp-plugin-menu" data-mcp-plugin-id="${plugin.id}" aria-label="更多操作" aria-expanded="${state.mcpPluginMenuId === plugin.id}">${icons.more}</button>
            ${state.mcpPluginMenuId === plugin.id ? `<div class="row-menu" role="menu"><button type="button" role="menuitem" data-action="confirm-delete-mcp-plugin" data-mcp-plugin-id="${plugin.id}">删除</button></div>` : ''}
          </div>
        </div>
      </div>
      <p class="persona-detail-created">创建于 ${formatDate(plugin.createdAt)}，最后刷新于 ${formatDate(plugin.refreshedAt)}</p>
      <div class="mcp-plugin-detail-fields">
        <div class="persona-detail-block"><span>描述</span><p>${plugin.description ? escapeHtml(plugin.description) : '未填写'}</p></div>
        <div class="persona-detail-block"><span>识别示例</span><p>${plugin.examples ? escapeHtml(plugin.examples) : '未填写'}</p></div>
        <div class="persona-detail-block"><span>MCP 服务地址</span><p>${plugin.serviceUrl ? escapeHtml(plugin.serviceUrl) : '未配置'}</p></div>
        <div class="persona-detail-block"><span>认证方式</span><p>${escapeHtml(getMcpPluginAuthSummary(plugin))}</p></div>
        <div class="persona-detail-block mcp-plugin-detail-headers"><span>自定义请求头</span><pre>${headers ? escapeHtml(headers) : '未配置'}</pre></div>
        <div class="persona-detail-block"><span>工具名称</span><div class="mcp-tool-tags mcp-plugin-detail-tools">${tools.length > 0 ? tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join('') : '<p>未发现工具</p>'}</div></div>
      </div>
    </section>`
}

function renderPluginManagement() {
  const plugins = getSortedMcpPlugins()
  return `
    <div class="page-heading page-heading-with-action">
      <div>
        <h1 id="voice-content-title">插件</h1>
        <p>管理人设可使用的插件</p>
      </div>
      ${plugins.length > 0 ? `<button class="button button-primary" type="button" data-action="add-mcp-plugin">${icons.plus}<span>添加插件</span></button>` : ''}
    </div>
    ${plugins.length === 0 ? `
      <section class="empty-state mcp-plugin-empty-state" aria-label="暂无插件">
        ${icons.plugin}
        <h2>暂无插件</h2>
        <p>插件可以为人设补充知识和能力，添加后即可使用。</p>
        <button class="button button-primary" type="button" data-action="add-mcp-plugin">${icons.plus}<span>添加插件</span></button>
      </section>` : `
      <section class="mcp-plugin-list-section" aria-label="插件列表">
        <div class="table-wrap mcp-plugin-table-wrap">
          <table class="mcp-plugin-table">
            <thead>
              <tr>
                <th>插件名称</th>
                <th class="mcp-plugin-tools-column">工具名称</th>
                <th class="mcp-plugin-time-column">创建时间</th>
                <th class="mcp-plugin-time-column">最后刷新时间</th>
                <th class="mcp-plugin-action-heading"><span>操作</span></th>
              </tr>
            </thead>
            <tbody>
              ${plugins.map((plugin) => {
                const tools = plugin.tools ?? []
                return `
                <tr class="mcp-plugin-row" tabindex="0" data-row-mcp-plugin-id="${plugin.id}" aria-label="查看 ${escapeHtml(plugin.name)} 插件详情">
                  <td><span class="map-name-cell">${escapeHtml(plugin.name)}</span></td>
                  <td class="mcp-plugin-tools-column">
                    <div class="mcp-tool-tags" title="${escapeHtml(tools.join('、'))}">
                      ${tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join('')}
                    </div>
                  </td>
                  <td class="mcp-plugin-time-column">${formatDate(plugin.createdAt)}</td>
                  <td class="mcp-plugin-time-column">${formatDate(plugin.refreshedAt)}</td>
                  <td class="mcp-plugin-action-cell">
                    <div class="mcp-plugin-row-actions">
                      <button class="text-button mcp-refresh-button" type="button" data-action="refresh-mcp-plugin" data-mcp-plugin-id="${plugin.id}">刷新</button>
                      <button class="text-button" type="button" data-action="edit-mcp-plugin" data-mcp-plugin-id="${plugin.id}">编辑</button>
                      <div class="overflow-control">
                        <button class="more-button" type="button" data-action="toggle-mcp-plugin-menu" data-mcp-plugin-id="${plugin.id}" aria-label="更多操作" aria-expanded="${state.mcpPluginMenuId === plugin.id}">${icons.more}</button>
                        ${state.mcpPluginMenuId === plugin.id ? `<div class="row-menu" role="menu"><button type="button" role="menuitem" data-action="confirm-delete-mcp-plugin" data-mcp-plugin-id="${plugin.id}">删除</button></div>` : ''}
                      </div>
                    </div>
                  </td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>`}`
}

function renderVoicePage() {
  const isPersonaSection = state.activeVoiceSection === '人设'
  const hideSubnav = isPersonaFormRoute() || isPersonaDetailRoute() || isMcpPluginFormRoute() || isMcpPluginDetailRoute()
  const content = !isPersonaSection
    ? isMcpPluginFormRoute()
      ? renderMcpPluginFormPage()
      : isMcpPluginDetailRoute()
        ? renderMcpPluginDetail()
      : renderPluginManagement()
    : isPersonaFormRoute()
      ? renderPersonaForm()
      : isPersonaDetailRoute()
        ? renderPersonaDetail()
        : `
          <div class="page-heading page-heading-with-action">
            <div>
                <h1 id="voice-content-title">人设</h1>
              <p>设置导览时机器人的说话方式</p>
            </div>
            ${state.personas.length > 0 ? `<button class="button button-primary" type="button" data-action="add-persona">${icons.plus}<span>新建人设</span></button>` : ''}
          </div>
          ${renderPersonaList()}`

  return `
    <section class="voice-page${hideSubnav ? ' voice-page-form' : ''}" aria-label="语音设置">
      ${hideSubnav ? '' : `<aside class="voice-subnav" aria-label="语音二级导航">
        <nav>
          ${voiceSubNavItems.map((item) => `
            <button class="voice-subnav-item ${state.activeVoiceSection === item ? 'is-active' : ''}" type="button" data-voice-section="${item}" aria-current="${state.activeVoiceSection === item ? 'page' : 'false'}">
              ${item}
            </button>`).join('')}
        </nav>
      </aside>`}
      <div class="voice-page-content">${content}</div>
    </section>`
}

function renderAccountMenu() {
  const languageLabel = state.interfaceLanguage === 'zh' ? 'English' : '中文'
  const initial = state.accountEmail.slice(0, 1).toUpperCase()

  return `
    <div class="account-control">
      <button class="account-avatar" type="button" data-action="toggle-account-menu" aria-label="账户菜单" aria-haspopup="menu" aria-expanded="${state.accountMenuOpen}">
        ${initial}
      </button>
      ${state.accountMenuOpen ? `
        <div class="account-menu" role="menu" aria-label="账户菜单">
          <p class="account-email">${escapeHtml(state.accountEmail)}</p>
          <div class="account-menu-divider"></div>
          <a class="account-menu-link" href="${operationGuideUrl}" target="_blank" rel="noreferrer" role="menuitem">使用手册</a>
          <button type="button" role="menuitem" data-action="toggle-account-language">${languageLabel}</button>
          <button class="account-menu-danger" type="button" role="menuitem" data-action="confirm-reset-demo">重置演示数据</button>
          <div class="account-menu-divider"></div>
          <button type="button" role="menuitem" data-action="confirm-logout">退出登录</button>
        </div>` : ''}
    </div>`
}

function renderMapEmptyState() {
  return `
    <section class="empty-state" aria-label="暂无地图">
      ${icons.map}
      <h2>暂无地图</h2>
      <p>上传地图后，即可创建导览任务</p>
      <a class="guide-link" href="${operationGuideUrl}" target="_blank" rel="noreferrer">查看操作说明</a>
    </section>`
}

function renderMapList() {
  const maps = getSortedMaps()
  if (maps.length === 0) return renderMapEmptyState()

  return `
    <section class="map-list-section" aria-label="地图列表">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>地图名称</th>
              <th>创建时间</th>
              <th class="table-action-heading"><span>操作</span></th>
            </tr>
          </thead>
          <tbody>
            ${maps.map((map) => `
              <tr class="map-row" tabindex="0" data-row-map-id="${map.id}" aria-label="查看 ${escapeHtml(map.name)} 地图详情">
                <td><span class="map-name-cell">${escapeHtml(map.name)}</span></td>
                <td>${formatDate(map.createdAt)}</td>
                <td class="table-action-cell">
                  <div class="row-actions">
                    <button class="text-button" type="button" data-action="edit-map" data-map-id="${map.id}">编辑</button>
                    <div class="overflow-control">
                      <button class="more-button" type="button" data-action="toggle-menu" data-map-id="${map.id}" aria-label="更多操作" aria-expanded="${state.menuMapId === map.id}">
                        ${icons.more}
                      </button>
                      ${state.menuMapId === map.id ? `
                        <div class="row-menu" role="menu">
                          <button type="button" role="menuitem" data-action="confirm-delete" data-map-id="${map.id}">删除</button>
                        </div>` : ''}
                    </div>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`
}

function renderScanNoise() {
  let seed = 20260820
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const clusters = [
    { x: 638, y: 264, rx: 112, ry: 102, count: 440 },
    { x: 561, y: 356, rx: 92, ry: 62, count: 260 },
    { x: 302, y: 245, rx: 55, ry: 72, count: 150 },
    { x: 759, y: 171, rx: 54, ry: 42, count: 92 },
    { x: 474, y: 148, rx: 38, ry: 31, count: 58 },
  ]

  const dots = clusters.flatMap((cluster) => Array.from({ length: cluster.count }, () => {
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random())
    const x = cluster.x + Math.cos(angle) * cluster.rx * distance
    const y = cluster.y + Math.sin(angle) * cluster.ry * distance
    const radius = .65 + random() * 1.7
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}"></circle>`
  }))

  const fragments = Array.from({ length: 120 }, () => {
    const x = 155 + random() * 650
    const y = 108 + random() * 292
    const length = 2 + random() * 10
    const angle = random() * Math.PI
    const dx = Math.cos(angle) * length
    const dy = Math.sin(angle) * length
    return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${dx.toFixed(1)} ${dy.toFixed(1)}"></path>`
  })

  return `${dots.join('')}<g fill="none" stroke="#000000" stroke-linecap="round" stroke-width="1.6">${fragments.join('')}</g>`
}

function renderFloorPlan(mapName, options = {}) {
  const safeMapName = escapeHtml(mapName)
  const bare = options.bare === true
  return `
    <svg class="floor-plan${bare ? ' floor-plan-bare' : ''}" viewBox="0 0 960 500" role="img" aria-label="${safeMapName}二维地图预览">
      <rect width="960" height="500" fill="${bare ? 'none' : '#ffffff'}"></rect>
      <g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round">
        <path d="M145 96L274 91L401 94" stroke-width="4"></path>
        <path d="M418 94L576 88L704 93L824 98" stroke-width="3.7"></path>
        <path d="M824 98L832 194L829 264" stroke-width="4.1"></path>
        <path d="M830 281L835 354L827 417" stroke-width="3.8"></path>
        <path d="M827 417L690 423L571 419" stroke-width="4.2"></path>
        <path d="M553 420L408 426L275 421L143 416" stroke-width="3.9"></path>
        <path d="M143 416L136 326L140 238" stroke-width="4.3"></path>
        <path d="M140 220L135 155L145 96" stroke-width="3.8"></path>
        <path d="M205 144L230 180L225 238L260 266L326 271" stroke-width="3.2"></path>
        <path d="M336 159L347 206L329 249" stroke-width="3.8"></path>
        <path d="M386 111L382 182L424 198L462 180" stroke-width="3.2"></path>
        <path d="M455 183L494 203L489 250L520 271" stroke-width="3.6"></path>
        <path d="M170 326L221 307L258 323L265 374" stroke-width="3.6"></path>
        <path d="M368 309L414 294L457 316L449 371" stroke-width="3.2"></path>
        <path d="M706 207L747 222L777 205L810 238" stroke-width="3.9"></path>
        <path d="M700 344L747 331L786 346L818 325" stroke-width="3.5"></path>
      </g>
      <g fill="#000000">
        ${renderScanNoise()}
      </g>
    </svg>`
}

function renderMapDetail() {
  const map = getMap(state.detailMapId)
  if (!map) return renderMapList()

  return `
    <section class="map-detail" aria-label="查看地图详情">
      <div class="detail-heading">
        <div class="detail-title-row">
          <button class="back-button" type="button" data-action="back-to-list" aria-label="返回地图列表">
            ${icons.back}
          </button>
          <h1>查看地图详情</h1>
        </div>
        <div class="detail-meta">
          <span>名称</span>
          <strong>${escapeHtml(map.name)}</strong>
        </div>
      </div>
      <section class="preview-section" aria-labelledby="preview-title">
        <div class="preview-header"><span id="preview-title">预览</span></div>
        <div class="map-preview">${renderFloorPlan(map.name)}</div>
      </section>
    </section>`
}

function renderMapPage() {
  if (state.route === 'detail') return renderMapDetail()
  return `
    <div class="page-heading page-heading-with-action">
      <div>
        <h1>地图</h1>
        <p>管理导览使用的地图</p>
      </div>
      <button class="button button-primary" type="button" data-action="add-map">${icons.plus}<span>添加地图</span></button>
    </div>
    ${renderMapList()}`
}

function renderTourTaskDetailMarker(point, index) {
  return `
    <span class="tour-task-detail-marker" style="left: ${(point.x / 9.6).toFixed(3)}%; top: ${(point.y / 5).toFixed(3)}%; --point-angle: ${point.angle}deg;" aria-label="点位 ${index + 1}：${escapeHtml(point.name)}，朝向 ${Math.round(point.angle)} 度">
      <span class="tour-task-detail-marker-number">${index + 1}</span>
      <span class="tour-task-detail-direction" aria-hidden="true">${icons.direction}</span>
    </span>`
}

function renderTourTaskDetailAction(action, index, targetType) {
  const interactionPrompt = String(action.prompt ?? '').trim()
  const content = action.type === 'speech'
    ? escapeHtml(action.narration || '未填写讲解词')
    : action.type === 'interaction'
      ? escapeHtml(interactionPrompt || getTourInteractionDefaultDescription(targetType))
      : escapeHtml(action.skillName || '未选择技能')

  return `
    <li class="tour-task-detail-action">
      <span class="tour-task-detail-action-order">${index + 1}</span>
      <span class="tour-task-detail-action-type">${action.type === 'speech' ? '语音播报' : action.type === 'interaction' ? '语音问答' : '执行技能'}</span>
      <p>${content}</p>
    </li>`
}

function getTourInteractionDefaultDescription(targetType) {
  return targetType === 'path'
    ? '未填写任务信息时，机器人不会主动说话，只回答用户提问；未填写结束条件时，抵达下个点位或点击“下个环节”后结束。'
    : '未填写任务信息时，机器人不会主动说话，只回答用户提问；未填写结束条件时，在 App 上手动结束。'
}

function renderTourTaskDetailTarget(target, index, targetType, label) {
  const actions = target.actions ?? []
  return `
    <article class="tour-task-detail-point ${targetType === 'path' ? 'tour-task-detail-path' : ''}">
      <div class="tour-task-detail-point-heading">
        <span class="tour-task-detail-point-icon" aria-hidden="true">${targetType === 'path' ? icons.route : icons.point}</span>
        <span class="tour-task-detail-point-order">${index + 1}</span>
        <h3>${escapeHtml(label)}</h3>
      </div>
      ${targetType === 'point' ? `
        <dl class="tour-task-detail-coordinates">
          <div><dt>X 坐标</dt><dd>${Math.round(target.x)}</dd></div>
          <div><dt>Y 坐标</dt><dd>${Math.round(target.y)}</dd></div>
          <div><dt>角度</dt><dd>${Math.round(target.angle)}°</dd></div>
        </dl>` : ''}
      <div class="tour-task-detail-actions-list">
        ${actions.length > 0 ? `<ol>${actions.map((action, actionIndex) => renderTourTaskDetailAction(action, actionIndex, targetType)).join('')}</ol>` : '<p>暂无任务</p>'}
      </div>
    </article>`
}

function renderTourTaskDetail() {
  const task = getTourTask(state.tourTaskDetailId)
  if (!task) return renderTourTaskList()
  const map = getMap(task.mapId) ?? { name: task.mapName }
  const points = task.points ?? []
  const detailDraft = { points, paths: (task.paths ?? []).map((path) => ({ ...path, actions: [...(path.actions ?? [])] })) }
  syncTourPaths(detailDraft)
  const paths = detailDraft.paths
  const persona = getVoicePersona(task.voicePersonaId)
  const targetSections = points.flatMap((point, index) => {
    const sections = [{ target: point, targetType: 'point', label: `抵达「${point.name}」后`, index }]
    const path = paths[index]
    const nextPoint = points[index + 1]
    if (path && nextPoint) sections.push({ target: path, targetType: 'path', label: `从「${point.name}」到「${nextPoint.name}」途中`, index })
    return sections
  })

  return `
    <section class="tour-task-detail" aria-labelledby="tour-task-detail-title">
      <div class="tour-task-detail-heading">
        <div class="detail-title-row">
          <button class="back-button" type="button" data-action="back-to-tour-task-list" aria-label="返回导览任务列表">
            ${icons.back}
          </button>
          <h1 id="tour-task-detail-title">${escapeHtml(task.name)}</h1>
        </div>
        <div class="tour-task-detail-heading-actions">
          <button class="text-button" type="button" data-action="edit-tour-task" data-task-id="${task.id}">编辑</button>
          <div class="overflow-control">
            <button class="more-button" type="button" data-action="toggle-tour-menu" data-task-id="${task.id}" aria-label="更多操作" aria-expanded="${state.menuTourTaskId === task.id}">
              ${icons.more}
            </button>
            ${state.menuTourTaskId === task.id ? `
              <div class="row-menu" role="menu">
                <button type="button" role="menuitem" data-action="confirm-delete-tour-task" data-task-id="${task.id}">删除</button>
              </div>` : ''}
          </div>
        </div>
      </div>
      <div class="tour-task-detail-meta">
        <div><span>地图</span><strong>${escapeHtml(map.name)}</strong></div>
        ${hasTourVoiceTasks(task) ? `<div><span>语音人设</span><strong>${escapeHtml(persona?.name ?? '默认')}</strong></div>` : ''}
      </div>
      <section class="tour-task-detail-section" aria-labelledby="tour-task-map-title">
        <h2 id="tour-task-map-title">地图及点位</h2>
        <div class="tour-task-detail-map">
          <div class="tour-task-detail-map-stage">
            ${renderFloorPlan(map.name, { bare: true })}
            ${points.map(renderTourTaskDetailMarker).join('')}
          </div>
        </div>
      </section>
      <section class="tour-task-detail-section" aria-labelledby="tour-task-points-title">
        <h2 id="tour-task-points-title">任务编排</h2>
        <div class="tour-task-detail-points">
          ${targetSections.length > 0 ? targetSections.map((section) => renderTourTaskDetailTarget(section.target, section.index, section.targetType, section.label)).join('') : '<p class="tour-task-detail-empty">暂无点位</p>'}
        </div>
      </section>
    </section>`
}

function renderTourTaskPage() {
  if (state.route === 'create-basic') return renderTourTaskCreateBasic()
  if (state.route === 'create-points') return renderTourTaskCreatePoints()
  if (state.route === 'create-actions') return renderTourTaskCreateActions()
  if (state.route === 'task-detail') return renderTourTaskDetail()

  return `
    <div class="page-heading page-heading-with-action">
      <div>
        <h1>导览任务</h1>
        <p>设置机器人要执行的导览内容</p>
      </div>
      ${state.tourTasks.length > 0 ? `
        <button class="button button-primary" type="button" data-action="add-tour-task">
          ${icons.plus}
          新建导览任务
        </button>` : ''}
    </div>
    ${state.tourTasks.length === 0 ? renderTourTaskEmptyState() : renderTourTaskList()}`
}

function renderTourTaskCreateBasic() {
  const draft = getTourTaskDraft()
  const maps = getSortedMaps()
  const selectedMap = getMap(draft.mapId)
  const isEditing = Boolean(state.editingTourTaskId)
  const search = state.tourMapSearch.trim().toLowerCase()
  const filteredMaps = search
    ? maps.filter((map) => map.name.toLowerCase().includes(search))
    : maps

  return `
    <section class="tour-task-create tour-task-step" aria-labelledby="create-tour-task-title">
      <div class="detail-title-row">
        <button class="back-button" type="button" data-action="back-from-tour-task-create" aria-label="返回导览任务列表">
          ${icons.back}
        </button>
        <h1 id="create-tour-task-title">${getTourTaskCreateTitle()}</h1>
      </div>
      <form class="tour-task-create-form" id="tour-task-basic-form">
        <label class="field tour-task-name-field">
          <span>名称</span>
          <input id="tour-task-name" name="name" value="${escapeHtml(draft.name)}" placeholder="请输入导览任务名称" maxlength="40" autocomplete="off" required>
        </label>
        <div class="field tour-map-field">
          <span id="tour-map-label">${isEditing ? '地图' : '选择地图'}</span>
          <div class="tour-map-picker">
            <button class="tour-map-trigger ${selectedMap ? 'has-value' : ''}" type="button" data-action="toggle-tour-map-picker" role="combobox" aria-labelledby="tour-map-label" aria-controls="tour-map-listbox" aria-haspopup="listbox" aria-expanded="${!isEditing && state.tourMapPickerOpen}" ${isEditing || maps.length === 0 ? 'disabled' : ''}>
              <span>${selectedMap ? escapeHtml(selectedMap.name) : maps.length === 0 ? '暂无地图' : '请选择地图'}</span>
              ${icons.chevronDown}
            </button>
            <input type="hidden" name="mapId" value="${selectedMap?.id ?? ''}">
            ${!isEditing && state.tourMapPickerOpen ? `
              <div class="tour-map-dropdown">
                <label class="tour-map-search">
                  ${icons.search}
                  <span class="sr-only">搜索地图</span>
                  <input id="tour-map-search" type="search" value="${escapeHtml(state.tourMapSearch)}" placeholder="搜索地图" autocomplete="off">
                </label>
                <div class="tour-map-listbox" id="tour-map-listbox" role="listbox" aria-label="地图列表">
                  ${filteredMaps.length > 0 ? filteredMaps.map((map) => `
                    <button type="button" role="option" aria-selected="${draft.mapId === map.id}" data-action="select-tour-map" data-map-id="${map.id}">
                      <span>${escapeHtml(map.name)}</span>
                      ${draft.mapId === map.id ? icons.check : ''}
                    </button>`).join('') : '<p>无匹配地图</p>'}
                </div>
              </div>` : ''}
          </div>
        </div>
        <div class="tour-task-step-footer">
          <div class="tour-task-step-footer-inner">
            ${isEditing ? '<button class="button button-secondary" type="button" data-action="cancel-tour-task-edit">取消</button>' : ''}
            <div class="tour-task-step-footer-actions">
              <button class="button button-primary" type="button" data-action="next-tour-task-basic" ${isTourTaskBasicComplete() ? '' : 'disabled'}>下一步</button>
            </div>
          </div>
        </div>
      </form>
    </section>`
}

function renderTourPointMarker(point, index) {
  return `
    <div class="tour-point-marker" data-point-marker-id="${point.id}" style="left: ${(point.x / 9.6).toFixed(3)}%; top: ${(point.y / 5).toFixed(3)}%;" role="button" tabindex="0" aria-label="${escapeHtml(point.name)}">
      <span>${index + 1}</span>
      <button class="tour-point-direction-handle" type="button" data-direction-point-id="${point.id}" style="--point-angle: ${point.angle}deg" title="调整朝向" aria-label="调整 ${escapeHtml(point.name)} 朝向">
        ${icons.direction}
      </button>
    </div>`
}

function renderTourPointList(points) {
  if (points.length === 0) return '<div class="tour-point-list-empty">暂无点位</div>'

  return `
    <div class="tour-point-list-wrap">
      <div class="tour-point-list" role="table" aria-label="点位列表">
        <div class="tour-point-list-header" role="row">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span role="columnheader">名称</span>
          <span role="columnheader">X 坐标</span>
          <span role="columnheader">Y 坐标</span>
          <span role="columnheader">角度</span>
          <span role="columnheader">操作</span>
        </div>
        ${points.map((point, index) => `
          <div class="tour-point-row" role="row" data-point-row-id="${point.id}">
            <span class="tour-point-drag-handle" draggable="true" data-point-drag-handle-id="${point.id}" title="拖拽调整顺序" aria-label="拖拽调整 ${escapeHtml(point.name)} 顺序">${icons.grip}</span>
            <span class="tour-point-order" aria-label="点位 ${index + 1}">${index + 1}</span>
            <label><span class="sr-only">名称</span><input value="${escapeHtml(point.name)}" maxlength="24" data-point-field="name" data-point-id="${point.id}"></label>
            <label><span class="sr-only">X 坐标</span><input type="number" min="0" max="960" step="1" value="${Math.round(point.x)}" data-point-field="x" data-point-id="${point.id}"></label>
            <label><span class="sr-only">Y 坐标</span><input type="number" min="0" max="500" step="1" value="${Math.round(point.y)}" data-point-field="y" data-point-id="${point.id}"></label>
            <label><span class="sr-only">角度</span><input type="number" min="0" max="359" step="1" value="${Math.round(point.angle)}" data-point-field="angle" data-point-id="${point.id}"></label>
            <button class="tour-point-delete" type="button" data-action="delete-tour-point" data-point-id="${point.id}" aria-label="删除 ${escapeHtml(point.name)}">删除</button>
          </div>`).join('')}
      </div>
    </div>`
}

function renderTourTaskCreatePoints() {
  const draft = getTourTaskDraft()
  const map = getMap(draft.mapId)
  if (!map) return renderTourTaskCreateBasic()

  return `
    <section class="tour-task-create tour-task-step tour-point-step" aria-labelledby="create-tour-task-title">
      <div class="detail-title-row">
        <button class="back-button" type="button" data-action="back-from-tour-task-create" aria-label="返回导览任务列表">
          ${icons.back}
        </button>
        <h1 id="create-tour-task-title">${getTourTaskCreateTitle()}</h1>
      </div>
      <section class="tour-point-editor" aria-labelledby="tour-point-editor-title">
        <div class="tour-point-editor-toolbar">
          <h2 id="tour-point-editor-title">配置点位</h2>
          <button class="button button-primary" type="button" data-action="toggle-add-tour-point">
            ${icons.plus}
            ${state.tourPointAddMode ? '取消添加' : '添加点位'}
          </button>
        </div>
        <div class="tour-point-map-viewport ${state.tourPointAddMode ? 'is-adding' : ''}" data-map-viewport>
          <div class="tour-map-zoom-controls" data-map-control>
            <button type="button" data-action="zoom-out-tour-map" aria-label="缩小地图" title="缩小">${icons.minus}</button>
            <button type="button" data-action="zoom-in-tour-map" aria-label="放大地图" title="放大">${icons.plus}</button>
          </div>
          <div class="tour-point-map-stage" data-map-stage style="transform: ${getTourMapTransform()};">
            ${renderFloorPlan(map.name, { bare: true })}
            ${draft.points.map(renderTourPointMarker).join('')}
          </div>
        </div>
        <section class="tour-point-list-section" aria-labelledby="tour-point-list-title">
          <h2 id="tour-point-list-title">点位列表</h2>
          ${renderTourPointList(draft.points)}
        </section>
      </section>
        <div class="tour-task-step-footer">
          <div class="tour-task-step-footer-inner">
            ${state.editingTourTaskId ? '<button class="button button-secondary" type="button" data-action="cancel-tour-task-edit">取消</button>' : ''}
            <div class="tour-task-step-footer-actions">
              <button class="button button-secondary" type="button" data-action="previous-tour-task-basic">上一步</button>
              <button class="button button-primary" type="button" data-action="next-tour-task-points" ${draft.points.length > 0 ? '' : 'disabled'}>下一步</button>
            </div>
          </div>
        </div>
      </section>`
}

function renderActionTypeMenu(targetType, targetId) {
  if (state.tourActionMenuPointId !== getTourActionTargetKey(targetType, targetId)) return ''
  const actionItems = targetType === 'path'
    ? [['speech', '语音播报'], ['interaction', '语音问答']]
    : [['speech', '语音播报'], ['interaction', '语音问答'], ['skill', '执行技能']]
  return `
    <div class="tour-action-type-menu" role="menu" aria-label="选择任务类型">
      ${actionItems.map(([type, label]) => `<button type="button" role="menuitem" data-action="add-tour-action" data-target-type="${targetType}" data-target-id="${targetId}" data-action-type="${type}">${label}</button>`).join('')}
    </div>`
}

function renderSkillGroup(title, skills, targetType, targetId, action) {
  return `
    <section class="tour-skill-group" aria-label="${title}">
      <h4>${title}</h4>
      ${skills.map((skill) => `
        <button type="button" role="option" aria-selected="${action.skillId === skill.id}" data-action="select-tour-skill" data-target-type="${targetType}" data-target-id="${targetId}" data-action-id="${action.id}" data-skill-id="${skill.id}" data-skill-name="${skill.name}">
          <span>${skill.name}</span>
          ${action.skillId === skill.id ? icons.check : ''}
        </button>`).join('')}
    </section>`
}

function renderTourAction(targetType, targetId, action, index) {
  const isSpeech = action.type === 'speech'
  const isInteraction = action.type === 'interaction'
  const isSkillPickerOpen = state.tourSkillPickerActionId === action.id
  const narrationError = getTourActionError(action.id, 'narration')
  const skillError = getTourActionError(action.id, 'skill')
  return `
    <div class="tour-action-row" data-tour-action-id="${action.id}" data-tour-action-target-id="${targetId}" data-tour-action-target-type="${targetType}">
      <span class="tour-action-drag-handle" draggable="true" data-action-drag-handle-id="${action.id}" data-target-id="${targetId}" data-target-type="${targetType}" title="拖拽调整任务顺序" aria-label="拖拽调整任务顺序">${icons.grip}</span>
      <span class="tour-action-order" aria-label="任务 ${index + 1}">${index + 1}</span>
      <span class="tour-action-type">${isSpeech ? '语音播报' : isInteraction ? '语音问答' : '执行技能'}</span>
      <div class="tour-action-content">
        ${isSpeech ? `
          <label class="tour-action-field">
            <textarea class="${narrationError ? 'is-invalid' : ''}" rows="1" maxlength="500" placeholder="请输入播报内容" data-tour-action-field="narration" data-target-type="${targetType}" data-target-id="${targetId}" data-action-id="${action.id}" aria-invalid="${Boolean(narrationError)}">${escapeHtml(action.narration ?? '')}</textarea>
            ${narrationError ? `<p class="tour-action-error" role="alert">${narrationError}</p>` : ''}
          </label>` : isInteraction ? `
          <p class="tour-action-inline-description">用户可在此环节与机器人进行语音问答${targetType === 'path' ? '，抵达下一个点位后自动结束' : '，在 App 上手动结束'}</p>` : `
          <div class="tour-action-field">
            <div class="tour-action-skill-picker">
              <button class="tour-action-skill-trigger ${action.skillId ? 'has-value' : ''} ${skillError ? 'is-invalid' : ''}" type="button" data-action="toggle-tour-skill-picker" data-target-type="${targetType}" data-target-id="${targetId}" data-action-id="${action.id}" aria-haspopup="listbox" aria-expanded="${isSkillPickerOpen}" aria-invalid="${Boolean(skillError)}">
                <span>${action.skillName ? escapeHtml(action.skillName) : '请选择技能'}</span>
                ${icons.chevronDown}
              </button>
              ${isSkillPickerOpen ? `
                <div class="tour-skill-dropdown" role="listbox" aria-label="技能列表">
                  ${renderSkillGroup('Booster 官方技能', boosterOfficialSkills, targetType, targetId, action)}
                  ${renderSkillGroup('我的云端技能', myCloudSkills, targetType, targetId, action)}
                </div>` : ''}
            </div>
            ${skillError ? `<p class="tour-action-error" role="alert">${skillError}</p>` : ''}
          </div>`}
      </div>
      <button class="tour-action-delete text-button" type="button" data-action="delete-tour-action" data-target-type="${targetType}" data-target-id="${targetId}" data-action-id="${action.id}">删除</button>
    </div>`
}

function renderTourActionAddControl(targetType, targetId) {
  return `
    <div class="tour-action-add-control">
      <button class="tour-action-add-text" type="button" data-action="toggle-tour-action-menu" data-target-type="${targetType}" data-target-id="${targetId}" aria-haspopup="menu" aria-expanded="${state.tourActionMenuPointId === getTourActionTargetKey(targetType, targetId)}">
        ${icons.plus}
        <span>添加任务</span>
      </button>
      ${renderActionTypeMenu(targetType, targetId)}
    </div>`
}

function renderTourTaskCreateActions() {
  const draft = getTourTaskDraft()
  const map = getMap(draft.mapId)
  if (!map) return renderTourTaskCreateBasic()

  return `
    <section class="tour-task-create tour-task-step tour-action-step" aria-labelledby="create-tour-task-title">
      <div class="detail-title-row">
        <button class="back-button" type="button" data-action="back-from-tour-task-create" aria-label="返回导览任务列表">
          ${icons.back}
        </button>
        <h1 id="create-tour-task-title">${getTourTaskCreateTitle()}</h1>
      </div>
      <section class="tour-action-editor" aria-labelledby="tour-action-editor-title">
        <h2 id="tour-action-editor-title">设置任务</h2>
        ${draft.points.length > 0 ? `
          <div class="tour-action-list">
            ${draft.points.map((point, index) => `
              <article class="tour-action-point" data-tour-action-point-id="${point.id}">
                <div class="tour-action-point-header">
                  <div class="tour-action-point-label">
                    <span class="tour-action-point-icon" aria-hidden="true">${icons.point}</span>
                    <strong>抵达「${escapeHtml(point.name)}」后</strong>
                  </div>
                </div>
                <div class="tour-point-actions">
                  ${point.actions.length > 0 ? `${point.actions.map((action, actionIndex) => renderTourAction('point', point.id, action, actionIndex)).join('')}${renderTourActionAddControl('point', point.id)}` : renderTourActionAddControl('point', point.id)}
                </div>
              </article>
              ${index < draft.points.length - 1 ? (() => {
                const nextPoint = draft.points[index + 1]
                const path = draft.paths.find((item) => item.fromPointId === point.id && item.toPointId === nextPoint.id)
                if (!path) return ''
                return `
                  <article class="tour-action-point tour-action-path" data-tour-action-point-id="${path.id}">
                    <div class="tour-action-point-header">
                      <div class="tour-action-point-label">
                        <span class="tour-action-point-icon" aria-hidden="true">${icons.route}</span>
                        <strong>从「${escapeHtml(point.name)}」到「${escapeHtml(nextPoint.name)}」途中</strong>
                      </div>
                    </div>
                    <div class="tour-point-actions">
                      ${path.actions.length > 0 ? `${path.actions.map((action, actionIndex) => renderTourAction('path', path.id, action, actionIndex)).join('')}${renderTourActionAddControl('path', path.id)}` : renderTourActionAddControl('path', path.id)}
                    </div>
                  </article>`
              })() : ''}`).join('')}
          </div>` : '<div class="tour-action-empty">暂无点位，请返回上一步添加点位。</div>'}
        ${hasTourVoiceTasks(draft) ? `
          <div class="tour-voice-persona-picker">
            <label class="field" for="tour-voice-persona">
                <span>选择语音人设</span>
                <p class="tour-voice-persona-description">所有语音播报和语音问答任务将使用此人设。</p>
                <div class="tour-voice-persona-select">
                  <select id="tour-voice-persona" data-tour-task-field="voicePersona">
                  ${getSortedPersonas().map((persona) => `<option value="${persona.id}" ${draft.voicePersonaId === persona.id ? 'selected' : ''}>${escapeHtml(persona.name)}</option>`).join('')}
                  <option value="${defaultPersonaId}" ${draft.voicePersonaId === defaultPersonaId ? 'selected' : ''}>默认</option>
                  </select>
                ${icons.chevronDown}
              </div>
            </label>
          </div>` : ''}
      </section>
      <div class="tour-task-step-footer">
        <div class="tour-task-step-footer-inner">
          ${state.editingTourTaskId ? '<button class="button button-secondary" type="button" data-action="cancel-tour-task-edit">取消</button>' : ''}
          <div class="tour-task-step-footer-actions">
            <button class="button button-secondary" type="button" data-action="previous-tour-task-points">上一步</button>
            <button class="button button-primary" type="button" data-action="save-tour-task">保存</button>
          </div>
        </div>
      </div>
    </section>`
}

function renderTourTaskEmptyState() {
  return `
    <section class="empty-state" aria-label="暂无导览任务">
      ${icons.tour}
      <h2>暂无导览任务</h2>
      <p>新建导览任务后，可在这里查看和管理</p>
      <button class="button button-primary" type="button" data-action="add-tour-task">
        ${icons.plus}
        新建导览任务
      </button>
    </section>`
}

function renderTourTaskList() {
  return `
    <section class="tour-task-list-section" aria-label="导览任务列表">
      <div class="table-wrap">
        <table class="tour-task-table">
          <thead>
            <tr>
              <th>任务名称</th>
              <th class="tour-map-column">地图名称</th>
              <th class="tour-count-column">点位数量</th>
              <th class="tour-time-column">创建时间</th>
              <th class="table-action-heading"><span>操作</span></th>
            </tr>
          </thead>
          <tbody>
            ${getSortedTourTasks().map((task) => `
              <tr class="tour-task-row" tabindex="0" data-row-task-id="${task.id}" aria-label="查看 ${escapeHtml(task.name)} 导览任务详情">
                <td><span class="map-name-cell">${escapeHtml(task.name)}</span></td>
                <td class="tour-map-column">${escapeHtml(task.mapName)}</td>
                <td class="tour-count-column">${task.pointCount}</td>
                <td class="tour-time-column">${formatDate(task.createdAt)}</td>
                <td class="table-action-cell">
                  <div class="row-actions">
                    <button class="text-button" type="button" data-action="edit-tour-task" data-task-id="${task.id}">编辑</button>
                    <div class="overflow-control">
                      <button class="more-button" type="button" data-action="toggle-tour-menu" data-task-id="${task.id}" aria-label="更多操作" aria-expanded="${state.menuTourTaskId === task.id}">
                        ${icons.more}
                      </button>
                      ${state.menuTourTaskId === task.id ? `
                        <div class="row-menu" role="menu">
                          <button type="button" role="menuitem" data-action="confirm-delete-tour-task" data-task-id="${task.id}">删除</button>
                        </div>` : ''}
                    </div>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`
}

function renderEditModal(map) {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-map-title">
        <div class="modal-header">
          <h2 id="edit-map-title">编辑地图</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <form class="map-form" id="edit-map-form" data-map-id="${map.id}">
          <label class="field">
            <span>地图名称</span>
            <input id="map-name" name="name" value="${escapeHtml(map.name)}" maxlength="40" required>
          </label>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
            <button class="button button-primary" type="submit">保存</button>
          </div>
        </form>
      </section>
    </div>`
}

function renderAddMapModal() {
  const name = state.mapCreateName
  const fileName = state.mapCreateFile?.name ?? ''
  const error = state.mapCreateError
  return `
    <div class="modal-backdrop" data-action="back-from-map-create">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="add-map-title">
        <div class="modal-header">
          <h2 id="add-map-title">添加地图</h2>
          <button class="icon-button" type="button" data-action="back-from-map-create" aria-label="关闭">${icons.close}</button>
        </div>
        <form class="map-form" id="add-map-form">
          <label class="field ${error === '请输入地图名称' ? 'is-invalid' : ''}">
            <span>地图名称</span>
            <input id="new-map-name" name="name" value="${escapeHtml(name)}" maxlength="40" required autocomplete="off" aria-invalid="${error === '请输入地图名称'}">
          </label>
          <div class="field map-file-field ${error === '请选择地图文件' ? 'is-invalid' : ''}">
            <span>地图文件</span>
            <div class="file-picker">
              <input id="new-map-file" class="file-picker-input" name="file" type="file" aria-invalid="${error === '请选择地图文件'}">
              <label class="file-picker-control" for="new-map-file">
                <span class="file-picker-action">选择文件</span>
                <span class="file-picker-name ${fileName ? 'has-file' : ''}">${fileName ? escapeHtml(fileName) : '未选择文件'}</span>
              </label>
            </div>
          </div>
          ${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ''}
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="back-from-map-create">取消</button>
            <button class="button button-primary" type="submit">保存</button>
          </div>
        </form>
      </section>
    </div>`
}

function renderDeleteModal(map) {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-map-title" aria-describedby="delete-map-description">
        <div class="modal-header">
          <h2 id="delete-map-title">删除地图</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="delete-map-description">确定删除“${escapeHtml(map.name)}”吗？删除后不可恢复。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
            <button class="button button-danger" type="button" data-action="delete-map" data-map-id="${map.id}">删除</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderDeleteTourTaskModal(task) {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-tour-task-title" aria-describedby="delete-tour-task-description">
        <div class="modal-header">
          <h2 id="delete-tour-task-title">删除导览任务</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="delete-tour-task-description">确定删除“${escapeHtml(task.name)}”吗？删除后不可恢复。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
            <button class="button button-danger" type="button" data-action="delete-tour-task" data-task-id="${task.id}">删除</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderDeletePersonaModal(persona) {
  const affectedTasks = state.tourTasks.filter((task) => task.voicePersonaId === persona.id)
  const affectedTaskMessage = affectedTasks.length > 0
    ? `使用该人设的 ${affectedTasks.length} 个导览任务${affectedTasks.map((task) => `“${escapeHtml(task.name)}”`).join('、')}将自动切换为默认人设。`
    : ''
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-persona-title" aria-describedby="delete-persona-description">
        <div class="modal-header">
          <h2 id="delete-persona-title">删除人设</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="delete-persona-description">确定删除“${escapeHtml(persona.name)}”吗？删除后不可恢复。${affectedTaskMessage}</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
            <button class="button button-danger" type="button" data-action="delete-persona" data-persona-id="${persona.id}">删除</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderDiscardPersonaModal() {
  const isEditing = state.route === 'persona-edit'
  const actionLabel = isEditing ? '编辑' : '新建'
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="discard-persona-title" aria-describedby="discard-persona-description">
        <div class="modal-header">
          <h2 id="discard-persona-title">放弃${actionLabel}人设</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="discard-persona-description">确定离开吗？已填写的内容将不会保留。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">继续编辑</button>
            <button class="button button-primary" type="button" data-action="discard-persona">放弃并返回</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderDiscardTourTaskModal() {
  const isEditing = Boolean(state.editingTourTaskId)
  const actionLabel = isEditing ? '编辑' : '添加'
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="discard-tour-task-title" aria-describedby="discard-tour-task-description">
        <div class="modal-header">
          <h2 id="discard-tour-task-title">放弃${actionLabel}导览任务</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="discard-tour-task-description">确定放弃本次${actionLabel}吗？已填写的内容将不会保留。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">继续编辑</button>
            <button class="button button-primary" type="button" data-action="discard-tour-task">放弃并返回</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderDiscardMapModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="discard-map-title" aria-describedby="discard-map-description">
        <div class="modal-header">
          <h2 id="discard-map-title">放弃添加地图</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="discard-map-description">确定离开吗？已填写的内容将不会保留。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">继续编辑</button>
            <button class="button button-primary" type="button" data-action="discard-map-create">放弃并返回</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderMcpPluginAuthFields(draft, errors) {
  if (draft.authType === 'bearer') {
    return `<label class="field mcp-auth-inline-field ${errors.token ? 'is-invalid' : ''}"><span>Token</span><input name="token" type="password" value="${escapeHtml(draft.auth.token)}" placeholder="请输入 Token" autocomplete="new-password" aria-invalid="${Boolean(errors.token)}">${errors.token ? `<small class="form-error">${escapeHtml(errors.token)}</small>` : ''}</label>`
  }
  if (draft.authType === 'api-key') {
    return `
      <label class="field mcp-auth-inline-field ${errors.headerName ? 'is-invalid' : ''}"><span>请求头名称</span><input name="headerName" value="${escapeHtml(draft.auth.headerName)}" placeholder="例如：X-API-Key" aria-invalid="${Boolean(errors.headerName)}">${errors.headerName ? `<small class="form-error">${escapeHtml(errors.headerName)}</small>` : ''}</label>
      <label class="field mcp-auth-inline-field ${errors.apiKey ? 'is-invalid' : ''}"><span>API Key</span><input name="apiKey" type="password" value="${escapeHtml(draft.auth.apiKey)}" placeholder="请输入 API Key" autocomplete="new-password" aria-invalid="${Boolean(errors.apiKey)}">${errors.apiKey ? `<small class="form-error">${escapeHtml(errors.apiKey)}</small>` : ''}</label>`
  }
  if (draft.authType === 'basic') {
    return `
      <label class="field mcp-auth-inline-field ${errors.username ? 'is-invalid' : ''}"><span>用户名</span><input name="username" value="${escapeHtml(draft.auth.username)}" placeholder="请输入用户名" autocomplete="username" aria-invalid="${Boolean(errors.username)}">${errors.username ? `<small class="form-error">${escapeHtml(errors.username)}</small>` : ''}</label>
      <label class="field mcp-auth-inline-field ${errors.password ? 'is-invalid' : ''}"><span>密码</span><input name="password" type="password" value="${escapeHtml(draft.auth.password)}" placeholder="请输入密码" autocomplete="new-password" aria-invalid="${Boolean(errors.password)}">${errors.password ? `<small class="form-error">${escapeHtml(errors.password)}</small>` : ''}</label>`
  }
  return ''
}

function renderMcpPluginFormPage() {
  const draft = state.mcpPluginDraft ?? createMcpPluginDraft()
  const errors = state.mcpPluginFormErrors
  const isEditing = Boolean(state.editingMcpPluginId)
  return `
    <section class="mcp-plugin-form-page" aria-labelledby="mcp-plugin-form-title">
      <div class="detail-title-row">
        <button class="back-button" type="button" data-action="back-from-mcp-plugin-form" aria-label="返回插件列表">
          ${icons.back}
        </button>
        <h1 id="mcp-plugin-form-title">${isEditing ? '编辑插件' : '添加插件'}</h1>
      </div>
      <form class="mcp-plugin-form" id="mcp-plugin-form" data-mcp-plugin-id="${state.editingMcpPluginId ?? ''}">
          <label class="field ${errors.name ? 'is-invalid' : ''}">
            <span>名称</span>
            <input name="name" value="${escapeHtml(draft.name)}" maxlength="100" placeholder="请输入插件名称" autocomplete="off" aria-invalid="${Boolean(errors.name)}">
            ${errors.name ? `<small class="form-error">${escapeHtml(errors.name)}</small>` : ''}
          </label>
          <label class="field ${errors.description ? 'is-invalid' : ''}">
            <span>描述</span>
            <textarea name="description" maxlength="1000" placeholder="说明插件能提供什么能力，以及适合处理哪些问题。例如：提供展厅信息，回答参观服务问题。" aria-invalid="${Boolean(errors.description)}">${escapeHtml(draft.description)}</textarea>
            ${errors.description ? `<small class="form-error">${escapeHtml(errors.description)}</small>` : ''}
          </label>
          <label class="field ${errors.examples ? 'is-invalid' : ''}">
            <span>识别示例</span>
            <textarea name="examples" maxlength="1000" placeholder="举例说明哪些问题需要使用插件，哪些问题不需要。例如：询问展厅信息时调用，闲聊时不调用。" aria-invalid="${Boolean(errors.examples)}">${escapeHtml(draft.examples)}</textarea>
            ${errors.examples ? `<small class="form-error">${escapeHtml(errors.examples)}</small>` : ''}
          </label>
          <label class="field ${errors.serviceUrl ? 'is-invalid' : ''}">
            <span>MCP 服务地址</span>
            <input name="serviceUrl" type="text" value="${escapeHtml(draft.serviceUrl)}" maxlength="500" placeholder="https://example.com/mcp" inputmode="url" autocomplete="url" aria-invalid="${Boolean(errors.serviceUrl)}">
            ${errors.serviceUrl ? `<small class="form-error">${escapeHtml(errors.serviceUrl)}</small>` : ''}
          </label>
          <fieldset class="field mcp-auth-fieldset">
            <legend>认证方式</legend>
            <div class="mcp-auth-options">
              ${mcpAuthMethods.map((method) => `
                <div class="mcp-auth-option-item ${draft.authType === method.id ? 'is-selected' : ''}">
                  <label class="mcp-auth-option"><input type="radio" name="authType" value="${method.id}" ${draft.authType === method.id ? 'checked' : ''}> <span>${method.label}</span></label>
                  ${draft.authType === method.id && method.id !== 'none' ? `<div class="mcp-auth-option-fields">${renderMcpPluginAuthFields(draft, errors)}</div>` : ''}
                </div>`).join('')}
            </div>
          </fieldset>
          <label class="field ${errors.headers ? 'is-invalid' : ''}">
            <span>自定义请求头</span>
            <textarea name="headers" maxlength="2000" placeholder="请输入 JSON 格式的请求头，如：{&quot;X-Custom-Header&quot;:&quot;value&quot;,&quot;X-Another-Header&quot;:&quot;value&quot;}">${escapeHtml(draft.headers)}</textarea>
            ${errors.headers ? `<small class="form-error">${escapeHtml(errors.headers)}</small>` : ''}
          </label>
          <div class="mcp-plugin-form-footer">
            <button class="button button-secondary" type="button" data-action="back-from-mcp-plugin-form">取消</button>
            <button class="button button-primary" type="submit">保存</button>
          </div>
      </form>
    </section>`
}

function renderDiscardMcpPluginModal() {
  const actionLabel = state.route === 'mcp-plugin-edit' ? '编辑' : '添加'
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="discard-mcp-plugin-title" aria-describedby="discard-mcp-plugin-description">
        <div class="modal-header">
          <h2 id="discard-mcp-plugin-title">放弃${actionLabel}插件</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="discard-mcp-plugin-description">确定离开吗？已填写的内容将不会保留。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">继续编辑</button>
            <button class="button button-primary" type="button" data-action="discard-mcp-plugin">放弃并返回</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderToast() {
  if (!state.toast) return ''
  return `<div class="toast toast-${state.toast.tone}" role="status">${state.toast.message}</div>`
}

function renderLogoutModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
        <div class="modal-header">
          <h2 id="logout-title">退出登录</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="logout-description">确定退出当前账号吗？</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
            <button class="button button-primary" type="button" data-action="logout">退出登录</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderResetDemoModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-demo-title" aria-describedby="reset-demo-description">
        <div class="modal-header">
          <h2 id="reset-demo-title">重置演示数据</h2>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
        </div>
        <div class="confirm-content">
          <p id="reset-demo-description">重置后，当前保存的地图、导览任务、人设和插件将被覆盖，并恢复为王府井站巡检与首都博物馆讲解的演示数据。</p>
          <div class="modal-footer">
            <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
            <button class="button button-danger" type="button" data-action="reset-demo-data">确认重置</button>
          </div>
        </div>
      </section>
    </div>`
}

function renderModal() {
  if (!state.modal) return ''
  if (state.modal.type === 'discard-tour-task') return renderDiscardTourTaskModal()
  if (state.modal.type === 'discard-persona') return renderDiscardPersonaModal()
  if (state.modal.type === 'discard-mcp-plugin') return renderDiscardMcpPluginModal()
  if (state.modal.type === 'discard-map') return renderDiscardMapModal()
  if (state.modal.type === 'logout') return renderLogoutModal()
  if (state.modal.type === 'reset-demo') return renderResetDemoModal()
  if (state.modal.type === 'delete-tour-task') {
    const task = getTourTask(state.modal.taskId)
    return task ? renderDeleteTourTaskModal(task) : ''
  }
  if (state.modal.type === 'delete-persona') {
    const persona = getPersona(state.modal.personaId)
    return persona ? renderDeletePersonaModal(persona) : ''
  }
  if (state.modal.type === 'delete-mcp-plugin') {
    const plugin = getMcpPlugin(state.modal.mcpPluginId)
    const affectedPersonas = state.personas.filter((persona) => (persona.pluginIds ?? []).includes(state.modal.mcpPluginId))
    const affectedPersonaMessage = affectedPersonas.length > 0
      ? `当前有 ${affectedPersonas.length} 个人设正在使用此插件：${affectedPersonas.map((persona) => `“${escapeHtml(persona.name)}”`).join('、')}。删除后，这些人设将不再关联该插件。`
      : ''
    return plugin ? `
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-mcp-plugin-title" aria-describedby="delete-mcp-plugin-description">
          <div class="modal-header">
            <h2 id="delete-mcp-plugin-title">删除插件</h2>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icons.close}</button>
          </div>
          <div class="confirm-content">
            <p id="delete-mcp-plugin-description">确定删除“${escapeHtml(plugin.name)}”吗？删除后不可恢复。${affectedPersonaMessage}</p>
            <div class="modal-footer">
              <button class="button button-secondary" type="button" data-action="close-modal">取消</button>
              <button class="button button-danger" type="button" data-action="delete-mcp-plugin" data-mcp-plugin-id="${plugin.id}">删除</button>
            </div>
          </div>
        </section>
      </div>` : ''
  }
  if (state.modal.type === 'add-map') return renderAddMapModal()
  const map = getMap(state.modal.mapId)
  if (!map) return ''
  return state.modal.type === 'edit' ? renderEditModal(map) : renderDeleteModal(map)
}

function render() {
  if (!state.isLoggedIn) {
    document.title = '已退出登录 | 导览后台'
    app.innerHTML = `
      <div class="app-shell signed-out-shell">
        <main class="signed-out-state">
          <h1>已退出登录</h1>
          <p>当前账号已退出。</p>
        </main>
      </div>`
    return
  }

  const detailTask = isTourTaskDetailRoute() ? getTourTask(state.tourTaskDetailId) : null
  const voicePageTitle = isMcpPluginFormRoute()
    ? (state.route === 'mcp-plugin-edit' ? '编辑插件' : '添加插件')
    : isMcpPluginDetailRoute()
      ? '插件详情'
      : isPersonaFormRoute()
        ? (state.route === 'persona-edit' ? '编辑人设' : '新建人设')
        : isPersonaDetailRoute()
          ? '人设详情'
          : state.activeVoiceSection
  persistAppData()
  document.title = state.activeNav === '地图'
    ? `${state.route === 'detail' ? '查看地图详情' : '地图'} | 导览后台`
    : state.activeNav === '语音'
      ? `${voicePageTitle}${voicePageTitle === '人设' ? '' : ' | 人设'} | 导览后台`
      : `${isTourTaskCreateRoute() ? getTourTaskCreateTitle() : detailTask?.name ?? '导览任务'} | 导览后台`

  app.innerHTML = `
    <div class="app-shell">
      ${(state.activeNav === '地图' && state.route === 'detail') || isTourTaskCreateRoute() || isTourTaskDetailRoute() || isVoiceSubRoute() ? '' : `
        <header class="topbar">
          ${renderLogo()}
          ${renderNavigation()}
          ${renderAccountMenu()}
        </header>`}
      <main class="page-content">
        ${state.activeNav === '地图' ? renderMapPage() : state.activeNav === '语音' ? renderVoicePage() : renderTourTaskPage()}
      </main>
      ${renderModal()}
      ${renderToast()}
    </div>`

  if (state.modal?.type === 'edit') {
    requestAnimationFrame(() => {
      const input = document.querySelector('#map-name')
      input?.focus()
      input?.select()
    })
  }

  if (state.modal?.type === 'add-map') {
    requestAnimationFrame(() => document.querySelector('#new-map-name')?.focus())
  }

  if (state.tourMapPickerOpen) {
    requestAnimationFrame(() => {
      const input = document.querySelector('#tour-map-search')
      input?.focus()
      input?.setSelectionRange(input.value.length, input.value.length)
    })
  }

  requestAnimationFrame(() => {
    document.querySelectorAll('[data-tour-action-field="narration"], [data-tour-action-field="interactionPrompt"]').forEach(resizeTourNarration)
    document.querySelectorAll('[data-persona-custom-skill-field]').forEach(resizePersonaCustomSkillField)
    document.querySelectorAll('#mcp-plugin-form textarea[name="headers"]').forEach(resizeMcpPluginHeaders)
  })
}

function setRoute(route, mapId) {
  state.route = route
  state.detailMapId = mapId ?? null
  state.menuMapId = null
  state.menuTourTaskId = null
  state.mcpPluginMenuId = null
  state.personaMenuId = null
  state.accountMenuOpen = false
  state.tourMapPickerOpen = false
  state.tourMapSearch = ''
  state.modal = null
  const hash = route === 'detail' ? `#map/${mapId}` : '#地图'
  if (window.location.hash !== hash) window.location.hash = hash
  else render()
}

function setVoiceRoute(section = '人设') {
  state.activeNav = '语音'
  const normalizedSection = section === '人设管理' ? '人设' : section === '插件管理' ? '插件' : section
  state.activeVoiceSection = voiceSubNavItems.includes(normalizedSection) ? normalizedSection : '人设'
  state.route = 'voice'
  state.detailMapId = null
  state.tourTaskDetailId = null
  state.personaDetailId = null
  state.mcpPluginDetailId = null
  state.editingPersonaId = null
  state.personaDraft = null
  state.personaFormErrors = {}
  state.personaPluginPickerOpen = false
  state.personaSkillPickerOpen = false
  state.mcpPluginDraft = null
  state.mcpPluginFormErrors = {}
  state.editingMcpPluginId = null
  state.editingTourTaskId = null
  state.menuMapId = null
  state.menuTourTaskId = null
  state.mcpPluginMenuId = null
  state.personaMenuId = null
  state.accountMenuOpen = false
  state.tourMapPickerOpen = false
  state.tourMapSearch = ''
  state.tourPointAddMode = false
  state.tourPointerDrag = null
  state.tourActionMenuPointId = null
  state.tourSkillPickerActionId = null
  state.tourDraggedAction = null
  state.modal = null
  const hash = state.activeVoiceSection === '插件' ? '#语音/插件管理' : '#语音/人设管理'
  if (decodeURIComponent(window.location.hash) !== hash) window.location.hash = hash
  else render()
}

function setMcpPluginRoute(route = 'list', pluginId) {
  const plugin = ['detail', 'edit'].includes(route) ? getMcpPlugin(pluginId) : null
  if (['detail', 'edit'].includes(route) && !plugin) {
    setVoiceRoute('插件')
    return
  }

  state.activeNav = '语音'
  state.activeVoiceSection = '插件'
  state.route = route === 'new' ? 'mcp-plugin-new' : route === 'edit' ? 'mcp-plugin-edit' : route === 'detail' ? 'mcp-plugin-detail' : 'voice'
  state.mcpPluginDetailId = route === 'detail' ? plugin.id : null
  state.editingMcpPluginId = route === 'edit' ? plugin.id : null
  state.mcpPluginDraft = route === 'edit'
    ? { ...cloneMcpPluginDraft(plugin), __sourceId: plugin.id }
    : route === 'new'
      ? createMcpPluginDraft()
      : null
  state.mcpPluginFormErrors = {}
  state.detailMapId = null
  state.tourTaskDetailId = null
  state.personaDetailId = null
  state.editingPersonaId = null
  state.personaDraft = null
  state.personaFormErrors = {}
  state.personaPluginPickerOpen = false
  state.personaSkillPickerOpen = false
  state.editingTourTaskId = null
  state.menuMapId = null
  state.menuTourTaskId = null
  state.mcpPluginMenuId = null
  state.personaMenuId = null
  state.accountMenuOpen = false
  state.tourMapPickerOpen = false
  state.tourMapSearch = ''
  state.modal = null

  const hash = route === 'new'
    ? '#语音/插件管理/new'
    : route === 'edit'
      ? `#语音/插件管理/${plugin.id}/edit`
      : route === 'detail'
        ? `#语音/插件管理/${plugin.id}`
      : '#语音/插件管理'
  if (decodeURIComponent(window.location.hash) !== hash) window.location.hash = hash
  else render()
}

function setPersonaRoute(route = 'list', personaId) {
  state.activeNav = '语音'
  state.activeVoiceSection = '人设'
  state.route = route === 'new' ? 'persona-new' : route === 'edit' ? 'persona-edit' : route === 'detail' ? 'persona-detail' : 'voice'
  state.personaDetailId = route === 'detail' ? personaId ?? null : null
  state.mcpPluginDetailId = null
  state.editingPersonaId = route === 'edit' ? personaId ?? null : null
  state.detailMapId = null
  state.tourTaskDetailId = null
  state.editingTourTaskId = null
  state.menuMapId = null
  state.menuTourTaskId = null
  state.mcpPluginMenuId = null
  state.personaMenuId = null
  state.personaPluginPickerOpen = false
  state.personaSkillPickerOpen = false
  state.mcpPluginDraft = null
  state.mcpPluginFormErrors = {}
  state.editingMcpPluginId = null
  state.accountMenuOpen = false
  state.modal = null
  if (route === 'new') {
    state.personaDraft = createPersonaDraft()
    state.personaFormErrors = {}
    state.personaPluginPickerOpen = false
    state.personaSkillPickerOpen = false
  }
  const hash = route === 'new'
    ? '#语音/人设管理/new'
    : route === 'edit'
      ? `#语音/人设管理/${personaId}/edit`
      : route === 'detail'
        ? `#语音/人设管理/${personaId}`
        : '#语音/人设管理'
  if (decodeURIComponent(window.location.hash) !== hash) window.location.hash = hash
  else render()
}

function setTourTaskRoute(route = 'list', taskId) {
  state.activeNav = '导览任务'
  state.route = route
  state.detailMapId = null
  state.tourTaskDetailId = route === 'task-detail' ? taskId ?? null : null
  state.mcpPluginDetailId = null
  if (route === 'list') state.editingTourTaskId = null
  state.menuMapId = null
  state.menuTourTaskId = null
  state.mcpPluginMenuId = null
  state.mcpPluginDraft = null
  state.mcpPluginFormErrors = {}
  state.editingMcpPluginId = null
  state.personaMenuId = null
  state.accountMenuOpen = false
  state.tourMapPickerOpen = false
  state.tourMapSearch = ''
  state.tourPointAddMode = false
  state.tourPointerDrag = null
  state.tourActionMenuPointId = null
  state.tourSkillPickerActionId = null
  state.tourDraggedAction = null
  state.modal = null
  const hash = route === 'create-basic'
    ? '#tour-task/new'
    : route === 'create-points' ? '#tour-task/new/points'
      : route === 'create-actions' ? '#tour-task/new/actions'
        : route === 'task-detail' ? `#tour-task/${taskId}` : '#导览任务'
  if (decodeURIComponent(window.location.hash) !== hash) window.location.hash = hash
  else render()
}

function syncRouteFromHash() {
  const hash = decodeURIComponent(window.location.hash)
  const mapDetailMatch = hash.match(/^#map\/(.+)$/)
  const tourTaskDetailMatch = hash.match(/^#tour-task\/([^/]+)$/)
  const personaEditMatch = hash.match(/^#语音\/人设管理\/([^/]+)\/edit$/)
  const personaDetailMatch = hash.match(/^#语音\/人设管理\/([^/]+)$/)
  const voicePersonaNew = hash === '#语音/人设管理/new'
  const mcpPluginEditMatch = hash.match(/^#语音\/插件管理\/([^/]+)\/edit$/)
  const mcpPluginDetailMatch = hash.match(/^#语音\/插件管理\/([^/]+)$/)
  const voiceMcpPluginNew = hash === '#语音/插件管理/new'
  const voiceSectionMatch = hash.match(/^#语音(?:\/(人设管理|插件管理|人设|插件))?$/)
  if (voiceMcpPluginNew) {
    state.activeNav = '语音'
    state.activeVoiceSection = '插件'
    state.route = 'mcp-plugin-new'
    state.editingMcpPluginId = null
    state.mcpPluginDraft ??= createMcpPluginDraft()
    state.mcpPluginFormErrors = {}
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.personaDetailId = null
    state.mcpPluginDetailId = null
    state.editingPersonaId = null
  } else if (mcpPluginEditMatch && getMcpPlugin(mcpPluginEditMatch[1])) {
    state.activeNav = '语音'
    state.activeVoiceSection = '插件'
    state.route = 'mcp-plugin-edit'
    state.editingMcpPluginId = mcpPluginEditMatch[1]
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.personaDetailId = null
    state.mcpPluginDetailId = null
    state.editingPersonaId = null
    if (!state.mcpPluginDraft || state.mcpPluginDraft.__sourceId !== mcpPluginEditMatch[1]) {
      state.mcpPluginDraft = { ...cloneMcpPluginDraft(getMcpPlugin(mcpPluginEditMatch[1])), __sourceId: mcpPluginEditMatch[1] }
    }
    state.mcpPluginFormErrors = {}
  } else if (mcpPluginDetailMatch && getMcpPlugin(mcpPluginDetailMatch[1])) {
    state.activeNav = '语音'
    state.activeVoiceSection = '插件'
    state.route = 'mcp-plugin-detail'
    state.mcpPluginDetailId = mcpPluginDetailMatch[1]
    state.editingMcpPluginId = null
    state.mcpPluginDraft = null
    state.mcpPluginFormErrors = {}
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.personaDetailId = null
    state.editingPersonaId = null
  } else if (voicePersonaNew) {
    state.activeNav = '语音'
    state.activeVoiceSection = '人设'
    state.route = 'persona-new'
    state.personaDetailId = null
    state.editingPersonaId = null
    state.personaDraft ??= createPersonaDraft()
    state.personaFormErrors = {}
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.mcpPluginDetailId = null
  } else if (personaEditMatch && getPersona(personaEditMatch[1])) {
    state.activeNav = '语音'
    state.activeVoiceSection = '人设'
    state.route = 'persona-edit'
    state.personaDetailId = null
    state.editingPersonaId = personaEditMatch[1]
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.mcpPluginDetailId = null
    if (!state.personaDraft || state.personaDraft.__sourceId !== personaEditMatch[1]) {
      state.personaDraft = { ...clonePersonaDraft(getPersona(personaEditMatch[1])), __sourceId: personaEditMatch[1] }
    }
  } else if (personaDetailMatch && getPersona(personaDetailMatch[1])) {
    state.activeNav = '语音'
    state.activeVoiceSection = '人设'
    state.route = 'persona-detail'
    state.personaDetailId = personaDetailMatch[1]
    state.editingPersonaId = null
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.mcpPluginDetailId = null
  } else if (voiceSectionMatch) {
    state.activeNav = '语音'
    state.route = 'voice'
    const section = voiceSectionMatch[1] === '人设管理' ? '人设' : voiceSectionMatch[1] === '插件管理' ? '插件' : voiceSectionMatch[1]
    state.activeVoiceSection = section ?? '人设'
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.personaDetailId = null
    state.mcpPluginDetailId = null
    state.editingPersonaId = null
  } else if (mapDetailMatch && getMap(mapDetailMatch[1])) {
    state.activeNav = '地图'
    state.route = 'detail'
    state.detailMapId = mapDetailMatch[1]
    state.tourTaskDetailId = null
  } else if (hash === '#地图') {
    state.activeNav = '地图'
    state.route = 'list'
    state.detailMapId = null
    state.tourTaskDetailId = null
  } else if (tourTaskDetailMatch && getTourTask(tourTaskDetailMatch[1])) {
    state.activeNav = '导览任务'
    state.route = 'task-detail'
    state.detailMapId = null
    state.tourTaskDetailId = tourTaskDetailMatch[1]
  } else if (hash === '#tour-task/new/points' && state.tourTaskDraft && isTourTaskBasicComplete()) {
    state.activeNav = '导览任务'
    state.route = 'create-points'
    state.detailMapId = null
    state.tourTaskDetailId = null
  } else if (hash === '#tour-task/new/actions' && state.tourTaskDraft && isTourTaskBasicComplete()) {
    state.activeNav = '导览任务'
    state.route = 'create-actions'
    state.detailMapId = null
    state.tourTaskDetailId = null
  } else if (hash === '#tour-task/new' || hash === '#tour-task/new/points' || hash === '#tour-task/new/actions') {
    state.activeNav = '导览任务'
    state.route = 'create-basic'
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.tourTaskDraft ??= createTourTaskDraft()
  } else {
    state.activeNav = '导览任务'
    state.route = 'list'
    state.detailMapId = null
    state.tourTaskDetailId = null
    state.editingTourTaskId = null
  }
  state.menuMapId = null
  state.menuTourTaskId = null
  state.mcpPluginMenuId = null
  state.personaMenuId = null
  state.personaPluginPickerOpen = false
  state.personaSkillPickerOpen = false
  state.accountMenuOpen = false
  state.tourMapPickerOpen = false
  state.tourMapSearch = ''
  state.tourPointAddMode = false
  state.tourPointerDrag = null
  state.tourActionMenuPointId = null
  state.tourSkillPickerActionId = null
  state.tourDraggedAction = null
  state.modal = null
  render()
}

function closeModal() {
  state.modal = null
  render()
}

function leavePersonaForm() {
  state.personaDraft = null
  state.editingPersonaId = null
  state.personaFormErrors = {}
  state.modal = null
  setPersonaRoute('list')
}

function leaveMcpPluginForm() {
  state.mcpPluginDraft = null
  state.editingMcpPluginId = null
  state.mcpPluginFormErrors = {}
  state.modal = null
  setVoiceRoute('插件')
}

function leaveTourTaskForm() {
  state.tourTaskDraft = null
  state.editingTourTaskId = null
  state.tourPointAddMode = false
  state.tourPointSequence = 1
  state.tourActionSequence = 1
  state.tourActionErrors = {}
  state.tourDraggedAction = null
  state.tourActionMenuPointId = null
  state.tourSkillPickerActionId = null
  state.tourMapView = { scale: 1, x: 0, y: 0 }
  state.modal = null
  setTourTaskRoute('list')
}

function leaveMapCreateForm() {
  state.mapCreateName = ''
  state.mapCreateFile = null
  state.mapCreateError = ''
  state.modal = null
  render()
}

function editTourTask(taskId) {
  const task = getTourTask(taskId)
  if (!task) return
  const draft = cloneTourTaskDraft(task)
  state.tourTaskDraft = draft
  state.editingTourTaskId = task.id
  state.tourPointSequence = draft.points.length + 1
  state.tourActionSequence = getTourActionContainers(draft).reduce((total, target) => total + target.actions.length, 0) + 1
  state.tourActionErrors = {}
  state.tourMapView = { scale: 1, x: 0, y: 0 }
  setTourTaskRoute('create-basic')
}

app.addEventListener('click', (event) => {
  const navButton = event.target.closest('[data-nav]')
  if (navButton) {
    state.activeNav = navButton.dataset.nav
    if (state.activeNav === '语音') setVoiceRoute()
    else if (state.activeNav === '地图') setRoute('list')
    else setTourTaskRoute()
    return
  }

  const voiceSectionButton = event.target.closest('[data-voice-section]')
  if (voiceSectionButton) {
    setVoiceRoute(voiceSectionButton.dataset.voiceSection)
    return
  }

  const closestActionElement = event.target.closest('[data-action]')
  const actionElement = closestActionElement?.classList.contains('modal-backdrop') && event.target !== closestActionElement
    ? null
    : closestActionElement
  const action = actionElement?.dataset.action
  const mapId = actionElement?.dataset.mapId
  const taskId = actionElement?.dataset.taskId
  const pointId = actionElement?.dataset.pointId
  const targetType = actionElement?.dataset.targetType ?? 'point'
  const targetId = actionElement?.dataset.targetId ?? pointId
  const personaId = actionElement?.dataset.personaId
  const mcpPluginId = actionElement?.dataset.mcpPluginId
  const skillId = actionElement?.dataset.skillId

  if (state.accountMenuOpen && action && !['toggle-account-menu', 'toggle-account-language', 'confirm-logout', 'logout'].includes(action)) {
    state.accountMenuOpen = false
  }

  if (action === 'back-to-list') {
    setRoute('list')
    return
  }
  if (action === 'back-to-tour-task-list') {
    setTourTaskRoute('list')
    return
  }
  if (action === 'back-to-persona-list') {
    setPersonaRoute('list')
    return
  }
  if (action === 'back-to-mcp-plugin-list') {
    setMcpPluginRoute('list')
    return
  }
  if (action === 'toggle-account-menu') {
    state.accountMenuOpen = !state.accountMenuOpen
    state.menuMapId = null
    state.menuTourTaskId = null
    render()
    return
  }
  if (action === 'toggle-account-language') {
    state.interfaceLanguage = state.interfaceLanguage === 'zh' ? 'en' : 'zh'
    render()
    return
  }
  if (action === 'confirm-reset-demo') {
    state.accountMenuOpen = false
    state.modal = { type: 'reset-demo' }
    render()
    return
  }
  if (action === 'reset-demo-data') {
    resetToDemoData()
    showToast('已恢复演示数据')
    return
  }
  if (action === 'confirm-logout') {
    state.accountMenuOpen = false
    state.modal = { type: 'logout' }
    render()
    return
  }
  if (action === 'logout') {
    state.accountMenuOpen = false
    state.modal = null
    state.isLoggedIn = false
    render()
    return
  }
  if (action === 'edit-map') {
    state.menuMapId = null
    state.modal = { type: 'edit', mapId }
    render()
    return
  }
  if (action === 'add-map') {
    state.mapCreateName = ''
    state.mapCreateFile = null
    state.mapCreateError = ''
    state.modal = { type: 'add-map' }
    render()
    return
  }
  if (action === 'back-from-map-create') {
    if (isMapCreateDraftEmpty()) {
      leaveMapCreateForm()
    } else {
      state.modal = { type: 'discard-map' }
      render()
    }
    return
  }
  if (action === 'toggle-menu') {
    state.menuMapId = state.menuMapId === mapId ? null : mapId
    render()
    return
  }
  if (action === 'confirm-delete') {
    state.menuMapId = null
    state.modal = { type: 'delete', mapId }
    render()
    return
  }
  if (action === 'delete-map') {
    state.maps = state.maps.filter((map) => map.id !== mapId)
    persistAppData()
    state.modal = null
    setRoute('list')
    return
  }
  if (action === 'toggle-tour-menu') {
    state.menuTourTaskId = state.menuTourTaskId === taskId ? null : taskId
    render()
    return
  }
  if (action === 'confirm-delete-tour-task') {
    state.menuTourTaskId = null
    state.modal = { type: 'delete-tour-task', taskId }
    render()
    return
  }
  if (action === 'delete-tour-task') {
    state.tourTasks = state.tourTasks.filter((task) => task.id !== taskId)
    persistAppData()
    state.menuTourTaskId = null
    state.modal = null
    if (state.route === 'task-detail') setTourTaskRoute('list')
    else render()
    return
  }
  if (action === 'add-persona') {
    state.personaDraft = createPersonaDraft()
    state.editingPersonaId = null
    state.personaDetailId = null
    state.personaFormErrors = {}
    setPersonaRoute('new')
    return
  }
  if (action === 'edit-persona') {
    const persona = getPersona(personaId)
    if (!persona) return
    state.personaDraft = { ...clonePersonaDraft(persona), __sourceId: persona.id }
    state.editingPersonaId = persona.id
    state.personaFormErrors = {}
    setPersonaRoute('edit', persona.id)
    return
  }
  if (action === 'toggle-persona-menu' || action === 'toggle-persona-detail-menu') {
    state.personaMenuId = state.personaMenuId === personaId ? null : personaId
    render()
    return
  }
  if (action === 'toggle-persona-plugin-picker') {
    state.personaPluginPickerOpen = !state.personaPluginPickerOpen
    state.personaSkillPickerOpen = false
    render()
    return
  }
  if (action === 'toggle-persona-skill-picker') {
    state.personaSkillPickerOpen = !state.personaSkillPickerOpen
    state.personaPluginPickerOpen = false
    render()
    return
  }
  if (action === 'select-persona-custom-skill') {
    const draft = getPersonaDraft()
    if (!skillId || draft.customSkills.some((skill) => skill.skillId === skillId)) return
    draft.customSkills.push({
      skillId,
      skillName: actionElement.dataset.skillName ?? '',
      source: actionElement.dataset.skillSource ?? 'cloud',
      sourceLabel: actionElement.dataset.skillSourceLabel ?? '我的云端技能',
      instruction: '',
      example: '',
    })
    state.personaSkillPickerOpen = false
    render()
    return
  }
  if (action === 'remove-persona-custom-skill') {
    const draft = getPersonaDraft()
    draft.customSkills = draft.customSkills.filter((skill) => skill.skillId !== skillId)
    if (state.personaFormErrors.customSkills) delete state.personaFormErrors.customSkills[skillId]
    render()
    return
  }
  if (action === 'add-mcp-plugin') {
    setMcpPluginRoute('new')
    return
  }
  if (action === 'edit-mcp-plugin') {
    const plugin = getMcpPlugin(mcpPluginId)
    if (!plugin) return
    setMcpPluginRoute('edit', plugin.id)
    return
  }
  if (action === 'toggle-mcp-plugin-menu') {
    state.mcpPluginMenuId = state.mcpPluginMenuId === mcpPluginId ? null : mcpPluginId
    state.personaMenuId = null
    render()
    return
  }
  if (action === 'confirm-delete-mcp-plugin') {
    state.mcpPluginMenuId = null
    state.modal = { type: 'delete-mcp-plugin', mcpPluginId }
    render()
    return
  }
  if (action === 'delete-mcp-plugin') {
    state.mcpPlugins = state.mcpPlugins.filter((plugin) => plugin.id !== mcpPluginId)
    state.personas = state.personas.map((persona) => ({
      ...persona,
      pluginIds: (persona.pluginIds ?? []).filter((pluginId) => pluginId !== mcpPluginId),
    }))
    if (state.personaDraft) state.personaDraft.pluginIds = (state.personaDraft.pluginIds ?? []).filter((pluginId) => pluginId !== mcpPluginId)
    persistAppData()
    state.mcpPluginMenuId = null
    state.modal = null
    if (state.route === 'mcp-plugin-detail') {
      setMcpPluginRoute('list')
      showToast('删除成功')
      return
    }
    showToast('删除成功')
    return
  }
  if (action === 'refresh-mcp-plugin') {
    const plugin = getMcpPlugin(mcpPluginId)
    if (!plugin) return
    const tools = getMcpTools(plugin, (plugin.refreshCount ?? 0) + 1)
    if (tools.length === 0) {
      showToast('未获取到工具列表', 'error')
      return
    }
    plugin.tools = tools
    plugin.refreshCount = (plugin.refreshCount ?? 0) + 1
    plugin.refreshedAt = new Date().toISOString()
    persistAppData()
    state.mcpPluginMenuId = null
    showToast('刷新成功')
    return
  }
  if (action === 'confirm-delete-persona') {
    state.personaMenuId = null
    state.modal = { type: 'delete-persona', personaId }
    render()
    return
  }
  if (action === 'delete-persona') {
    const affectedTasks = state.tourTasks.filter((task) => task.voicePersonaId === personaId)
    state.personas = state.personas.filter((persona) => persona.id !== personaId)
    state.tourTasks = state.tourTasks.map((task) => task.voicePersonaId === personaId ? { ...task, voicePersonaId: defaultPersonaId } : task)
    if (state.tourTaskDraft?.voicePersonaId === personaId) state.tourTaskDraft.voicePersonaId = defaultPersonaId
    persistAppData()
    state.personaMenuId = null
    state.modal = null
    if (state.personaDetailId === personaId) setPersonaRoute('list')
    if (affectedTasks.length > 0) {
      const taskNames = affectedTasks.map((task) => `“${task.name}”`).join('、')
      showToast(`已删除人设，${taskNames}已切换为默认人设`)
    } else {
      showToast('删除成功')
    }
    return
  }
  if (action === 'back-from-persona-form') {
    if (state.editingPersonaId || !isPersonaDraftEmpty()) {
      state.modal = { type: 'discard-persona' }
      render()
    } else {
      leavePersonaForm()
    }
    return
  }
  if (action === 'discard-persona') {
    leavePersonaForm()
    return
  }
  if (action === 'back-from-mcp-plugin-form') {
    if (state.editingMcpPluginId || !isMcpPluginDraftEmpty()) {
      state.modal = { type: 'discard-mcp-plugin' }
      render()
    } else {
      leaveMcpPluginForm()
    }
    return
  }
  if (action === 'discard-mcp-plugin') {
    leaveMcpPluginForm()
    return
  }
  if (action === 'discard-map-create') {
    leaveMapCreateForm()
    return
  }
  if (action === 'edit-tour-task') {
    editTourTask(taskId)
    return
  }
  if (action === 'add-tour-task') {
    state.tourTaskDraft = createTourTaskDraft()
    state.editingTourTaskId = null
    state.tourPointSequence = 1
    state.tourActionSequence = 1
    state.tourActionErrors = {}
    state.tourDraggedAction = null
    state.tourMapView = { scale: 1, x: 0, y: 0 }
    setTourTaskRoute('create-basic')
    return
  }
  if (action === 'back-from-tour-task-create' || action === 'cancel-tour-task-edit') {
    state.tourMapPickerOpen = false
    state.tourMapSearch = ''
    if (state.editingTourTaskId || !isTourTaskDraftEmpty()) {
      state.modal = { type: 'discard-tour-task' }
      render()
    } else {
      leaveTourTaskForm()
    }
    return
  }
  if (action === 'toggle-tour-map-picker') {
    if (state.editingTourTaskId) return
    state.tourMapPickerOpen = !state.tourMapPickerOpen
    state.tourMapSearch = ''
    render()
    return
  }
  if (action === 'select-tour-map') {
    if (state.editingTourTaskId) return
    getTourTaskDraft().mapId = mapId
    state.tourMapPickerOpen = false
    state.tourMapSearch = ''
    render()
    return
  }
  if (action === 'next-tour-task-basic') {
    if (isTourTaskBasicComplete()) setTourTaskRoute('create-points')
    return
  }
  if (action === 'previous-tour-task-basic') {
    setTourTaskRoute('create-basic')
    return
  }
  if (action === 'next-tour-task-points') {
    if (getTourTaskDraft().points.length > 0) setTourTaskRoute('create-actions')
    return
  }
  if (action === 'previous-tour-task-points') {
    setTourTaskRoute('create-points')
    return
  }
  if (action === 'toggle-add-tour-point') {
    state.tourPointAddMode = !state.tourPointAddMode
    render()
    return
  }
  if (action === 'zoom-in-tour-map' || action === 'zoom-out-tour-map') {
    const direction = action === 'zoom-in-tour-map' ? 1 : -1
    state.tourMapView.scale = clamp(Number((state.tourMapView.scale + direction * .15).toFixed(2)), .7, 2.5)
    render()
    return
  }
  if (action === 'delete-tour-point') {
    const draft = getTourTaskDraft()
    draft.points = draft.points.filter((point) => point.id !== pointId)
    render()
    return
  }
  if (action === 'toggle-tour-action-menu') {
    const targetKey = getTourActionTargetKey(targetType, targetId)
    state.tourActionMenuPointId = state.tourActionMenuPointId === targetKey ? null : targetKey
    state.tourSkillPickerActionId = null
    render()
    return
  }
  if (action === 'add-tour-action') {
    const actionTarget = getTourActionTarget(targetType, targetId)
    if (!actionTarget) return
    const actionType = actionElement.dataset.actionType
    if (targetType === 'path' && actionType === 'skill') return
    const actionId = `tour-action-${state.tourActionSequence++}`
    actionTarget.actions.push(actionType === 'speech'
      ? { id: actionId, type: 'speech', narration: '' }
      : actionType === 'interaction'
        ? { id: actionId, type: 'interaction', prompt: '' }
        : { id: actionId, type: 'skill', skillId: '', skillName: '' })
    delete state.tourActionErrors[actionId]
    state.tourActionMenuPointId = null
    state.tourSkillPickerActionId = actionType === 'skill' ? actionId : null
    render()
    return
  }
  if (action === 'toggle-tour-skill-picker') {
    const actionId = actionElement.dataset.actionId
    state.tourSkillPickerActionId = state.tourSkillPickerActionId === actionId ? null : actionId
    state.tourActionMenuPointId = null
    render()
    return
  }
  if (action === 'select-tour-skill') {
    const tourAction = getTourAction(targetType, targetId, actionElement.dataset.actionId)
    if (!tourAction) return
    tourAction.skillId = actionElement.dataset.skillId
    tourAction.skillName = actionElement.dataset.skillName
    if (state.tourActionErrors[tourAction.id]?.skill) delete state.tourActionErrors[tourAction.id].skill
    state.tourSkillPickerActionId = null
    render()
    return
  }
  if (action === 'delete-tour-action') {
    const actionTarget = getTourActionTarget(targetType, targetId)
    if (!actionTarget) return
    actionTarget.actions = actionTarget.actions.filter((tourAction) => tourAction.id !== actionElement.dataset.actionId)
    delete state.tourActionErrors[actionElement.dataset.actionId]
    if (state.tourSkillPickerActionId === actionElement.dataset.actionId) state.tourSkillPickerActionId = null
    render()
    return
  }
  if (action === 'save-tour-task') {
    if (!validateTourTaskActions()) {
      render()
      return
    }
    const draft = getTourTaskDraft()
    const map = getMap(draft.mapId)
    if (!map) return
    const existingTask = state.editingTourTaskId ? getTourTask(state.editingTourTaskId) : null
    const savedTask = {
      id: existingTask?.id ?? `tour-task-${Date.now()}`,
      name: draft.name.trim(),
      mapId: map.id,
      mapName: map.name,
      pointCount: draft.points.length,
      points: draft.points.map((point) => ({
        ...point,
        actions: point.actions.map((tourAction) => ({ ...tourAction })),
      })),
      paths: draft.paths.map((path) => ({
        ...path,
        actions: path.actions.map((tourAction) => ({ ...tourAction })),
      })),
      voicePersonaId: hasTourVoiceTasks(draft) ? (getVoicePersona(draft.voicePersonaId)?.id ?? defaultPersonaId) : defaultPersonaId,
      createdAt: existingTask?.createdAt ?? new Date().toISOString(),
    }
    if (existingTask) {
      state.tourTasks = state.tourTasks.map((task) => task.id === existingTask.id ? savedTask : task)
    } else {
      state.tourTasks.push(savedTask)
    }
    persistAppData()
    state.tourTaskDraft = null
    state.editingTourTaskId = null
    state.tourActionErrors = {}
    state.tourDraggedAction = null
    state.tourPointSequence = 1
    state.tourActionSequence = 1
    setTourTaskRoute('list')
    return
  }
  if (action === 'discard-tour-task') {
    leaveTourTaskForm()
    return
  }
  if (action === 'close-modal') {
    if (state.modal?.type === 'discard-map') {
      state.modal = { type: 'add-map' }
      render()
    } else if (event.target.classList.contains('modal-backdrop') || event.target.closest('button')) {
      closeModal()
    }
    return
  }

  if (state.accountMenuOpen && !event.target.closest('.account-control')) {
    state.accountMenuOpen = false
    render()
    return
  }

  const row = event.target.closest('[data-row-map-id]')
  const personaRow = event.target.closest('[data-row-persona-id]')
  const tourTaskRow = event.target.closest('[data-row-task-id]')
  const mcpPluginRow = event.target.closest('[data-row-mcp-plugin-id]')
  const mapStage = event.target.closest('[data-map-stage]')
  if (mapStage && state.route === 'create-points' && state.tourPointAddMode && !event.target.closest('[data-point-marker-id], [data-direction-point-id]')) {
    const bounds = mapStage.getBoundingClientRect()
    const x = clamp((event.clientX - bounds.left) / bounds.width * 960, 0, 960)
    const y = clamp((event.clientY - bounds.top) / bounds.height * 500, 0, 500)
    const pointNumber = state.tourPointSequence++
    getTourTaskDraft().points.push({
      id: `tour-point-${pointNumber}`,
      name: `点位 ${pointNumber}`,
      x: Math.round(x),
      y: Math.round(y),
      angle: 0,
      actions: [],
    })
    state.tourPointAddMode = false
    render()
  }
  else if (row) setRoute('detail', row.dataset.rowMapId)
  else if (personaRow) setPersonaRoute('detail', personaRow.dataset.rowPersonaId)
  else if (tourTaskRow) setTourTaskRoute('task-detail', tourTaskRow.dataset.rowTaskId)
  else if (mcpPluginRow) setMcpPluginRoute('detail', mcpPluginRow.dataset.rowMcpPluginId)
  else if (state.tourMapPickerOpen && !event.target.closest('.tour-map-picker')) {
    state.tourMapPickerOpen = false
    state.tourMapSearch = ''
    render()
  }
  else if ((state.tourActionMenuPointId || state.tourSkillPickerActionId) && !event.target.closest('.tour-action-add-control, .tour-action-skill-picker')) {
    state.tourActionMenuPointId = null
    state.tourSkillPickerActionId = null
    render()
  }
  else if ((state.personaPluginPickerOpen || state.personaSkillPickerOpen) && !event.target.closest('.persona-plugin-picker, .persona-skill-picker, .persona-custom-skill, .persona-form-footer')) {
    state.personaPluginPickerOpen = false
    state.personaSkillPickerOpen = false
    render()
  }
  else if (state.menuMapId || state.menuTourTaskId || state.personaMenuId || state.mcpPluginMenuId) {
    state.menuMapId = null
    state.menuTourTaskId = null
    state.personaMenuId = null
    state.mcpPluginMenuId = null
    render()
  }
})

app.addEventListener('input', (event) => {
  if (event.target.matches('#mcp-plugin-form input, #mcp-plugin-form textarea')) {
    const draft = state.mcpPluginDraft ?? createMcpPluginDraft()
    const fieldName = event.target.name
    if (fieldName === 'name' || fieldName === 'description' || fieldName === 'examples' || fieldName === 'serviceUrl' || fieldName === 'headers') draft[fieldName] = event.target.value
    else if (Object.prototype.hasOwnProperty.call(draft.auth, fieldName)) draft.auth[fieldName] = event.target.value
    state.mcpPluginDraft = draft
    if (fieldName === 'headers') resizeMcpPluginHeaders(event.target)
    if (state.mcpPluginFormErrors[fieldName] && event.target.value.trim()) {
      delete state.mcpPluginFormErrors[fieldName]
      event.target.closest('.field')?.classList.remove('is-invalid')
      event.target.setAttribute('aria-invalid', 'false')
      event.target.closest('.field')?.querySelector('.form-error')?.remove()
    }
    return
  }

  if (event.target.matches('#new-map-name')) {
    state.mapCreateName = event.target.value
    if (state.mapCreateError === '请输入地图名称' && event.target.value.trim()) state.mapCreateError = ''
    return
  }

  if (event.target.matches('#persona-name')) {
    getPersonaDraft().name = event.target.value
    if (state.personaFormErrors.name && event.target.value.trim()) {
      delete state.personaFormErrors.name
      event.target.closest('.field')?.classList.remove('is-invalid')
      event.target.setAttribute('aria-invalid', 'false')
      event.target.closest('.field')?.querySelector('.form-error')?.remove()
    }
    return
  }

  if (event.target.matches('#persona-prompt')) {
    getPersonaDraft().prompt = event.target.value
    return
  }

  if (event.target.matches('[data-persona-custom-skill-field]')) {
    const skill = getPersonaCustomSkill(event.target.dataset.skillId)
    const field = event.target.dataset.personaCustomSkillField
    if (!skill || !['instruction', 'example'].includes(field)) return
    skill[field] = event.target.value
    resizePersonaCustomSkillField(event.target)
    const errors = state.personaFormErrors.customSkills?.[skill.skillId]
    if (event.target.value.trim() && errors?.[field]) {
      delete errors[field]
      if (Object.keys(errors).length === 0) delete state.personaFormErrors.customSkills[skill.skillId]
      if (Object.keys(state.personaFormErrors.customSkills ?? {}).length === 0) delete state.personaFormErrors.customSkills
      event.target.closest('.field')?.classList.remove('is-invalid')
      event.target.setAttribute('aria-invalid', 'false')
      event.target.closest('.field')?.querySelector('.form-error')?.remove()
    }
    return
  }

  if (event.target.matches('#tour-task-name')) {
    getTourTaskDraft().name = event.target.value
    const nextButton = document.querySelector('[data-action="next-tour-task-basic"]')
    if (nextButton) nextButton.disabled = !isTourTaskBasicComplete()
  }
  if (event.target.matches('#tour-map-search')) {
    state.tourMapSearch = event.target.value
    render()
  }
  if (event.target.matches('[data-point-field="name"]')) {
    const point = getTourPoint(event.target.dataset.pointId)
    if (point) point.name = event.target.value
  }
  if (event.target.matches('[data-tour-action-field="narration"]')) {
    const tourAction = getTourAction(event.target.dataset.targetType ?? 'point', event.target.dataset.targetId, event.target.dataset.actionId)
    if (tourAction) {
      tourAction.narration = event.target.value
      if (tourAction.narration.trim() && state.tourActionErrors[tourAction.id]?.narration) {
        delete state.tourActionErrors[tourAction.id].narration
        event.target.classList.remove('is-invalid')
        event.target.setAttribute('aria-invalid', 'false')
        event.target.closest('.tour-action-field')?.querySelector('.tour-action-error')?.remove()
      }
    }
    resizeTourNarration(event.target)
  }
  if (event.target.matches('[data-tour-action-field="interactionPrompt"]')) {
    const tourAction = getTourAction(event.target.dataset.targetType ?? 'point', event.target.dataset.targetId, event.target.dataset.actionId)
    if (tourAction) tourAction.prompt = event.target.value
    resizeTourNarration(event.target)
  }
  if (event.target.matches('[data-tour-task-field="voicePersona"]')) {
    getTourTaskDraft().voicePersonaId = event.target.value
  }
})

app.addEventListener('change', (event) => {
  if (event.target.matches('#mcp-plugin-form input[name="authType"]')) {
    state.mcpPluginDraft = getMcpPluginDraftFromForm(new FormData(event.target.closest('form')))
    state.mcpPluginDraft.authType = event.target.value
    state.mcpPluginFormErrors = {}
    render()
    return
  }

  if (event.target.matches('#new-map-file')) {
    state.mapCreateFile = event.target.files?.[0] ?? null
    state.mapCreateError = ''
    render()
    return
  }

  if (event.target.matches('[data-tour-task-field="voicePersona"]')) {
    getTourTaskDraft().voicePersonaId = event.target.value
    return
  }

  if (event.target.matches('#persona-voice')) {
    const voice = ['male', 'female'].includes(event.target.value) ? event.target.value : ''
    getPersonaDraft().voice = voice
    event.target.classList.toggle('is-placeholder', !voice)
    event.target.closest('.persona-select-picker')?.classList.toggle('is-placeholder', !voice)
    if (voice && state.personaFormErrors.voice) {
      delete state.personaFormErrors.voice
      event.target.closest('.field')?.classList.remove('is-invalid')
      event.target.setAttribute('aria-invalid', 'false')
      event.target.closest('.field')?.querySelector('.form-error')?.remove()
    }
    return
  }

  if (event.target.matches('[data-persona-preset-skills]')) {
    getPersonaDraft().presetSkillsEnabled = event.target.checked
    render()
    return
  }

  if (event.target.matches('[data-persona-plugin]')) {
    const draft = getPersonaDraft()
    const pluginId = event.target.value
    draft.pluginIds = event.target.checked
      ? [...new Set([...draft.pluginIds, pluginId])]
      : draft.pluginIds.filter((id) => id !== pluginId)
    state.personaPluginPickerOpen = true
    render()
    return
  }

  const field = event.target.dataset.pointField
  if (!['x', 'y', 'angle'].includes(field)) return
  const point = getTourPoint(event.target.dataset.pointId)
  if (!point) return
  const maximum = field === 'x' ? 960 : field === 'y' ? 500 : 359
  point[field] = clamp(Number(event.target.value) || 0, 0, maximum)
  render()
})

app.addEventListener('pointerdown', (event) => {
  if (state.route !== 'create-points' || event.button !== 0) return
  const viewport = event.target.closest('[data-map-viewport]')
  if (!viewport || event.target.closest('[data-map-control]')) return

  const directionHandle = event.target.closest('[data-direction-point-id]')
  const pointMarker = event.target.closest('[data-point-marker-id]')
  const mode = directionHandle ? 'direction' : pointMarker ? 'point' : 'pan'
  if (mode === 'pan' && state.tourPointAddMode) return

  const pointId = directionHandle?.dataset.directionPointId ?? pointMarker?.dataset.pointMarkerId ?? null
  const point = pointId ? getTourPoint(pointId) : null
  state.tourPointerDrag = {
    mode,
    pointerId: event.pointerId,
    viewport,
    pointId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: point?.x ?? state.tourMapView.x,
    startY: point?.y ?? state.tourMapView.y,
    moved: false,
  }
  viewport.setPointerCapture?.(event.pointerId)
  event.preventDefault()
})

app.addEventListener('pointermove', (event) => {
  const drag = state.tourPointerDrag
  if (!drag || drag.pointerId !== event.pointerId) return
  const deltaX = event.clientX - drag.startClientX
  const deltaY = event.clientY - drag.startClientY
  drag.moved ||= Math.hypot(deltaX, deltaY) > 3

  if (drag.mode === 'pan') {
    state.tourMapView.x = drag.startX + deltaX
    state.tourMapView.y = drag.startY + deltaY
    const stage = drag.viewport.querySelector('[data-map-stage]')
    if (stage) stage.style.transform = getTourMapTransform()
  }

  if (drag.mode === 'point') {
    const point = getTourPoint(drag.pointId)
    const stage = drag.viewport.querySelector('[data-map-stage]')
    const marker = drag.viewport.querySelector(`[data-point-marker-id="${drag.pointId}"]`)
    if (!point || !stage || !marker) return
    const bounds = stage.getBoundingClientRect()
    point.x = clamp((event.clientX - bounds.left) / bounds.width * 960, 0, 960)
    point.y = clamp((event.clientY - bounds.top) / bounds.height * 500, 0, 500)
    marker.style.left = `${(point.x / 9.6).toFixed(3)}%`
    marker.style.top = `${(point.y / 5).toFixed(3)}%`
  }

  if (drag.mode === 'direction') {
    const point = getTourPoint(drag.pointId)
    const marker = drag.viewport.querySelector(`[data-point-marker-id="${drag.pointId}"]`)
    const handle = drag.viewport.querySelector(`[data-direction-point-id="${drag.pointId}"]`)
    if (!point || !marker || !handle) return
    const markerBounds = marker.getBoundingClientRect()
    const angle = Math.atan2(event.clientY - (markerBounds.top + markerBounds.height / 2), event.clientX - (markerBounds.left + markerBounds.width / 2)) * 180 / Math.PI + 90
    point.angle = Math.round((angle + 360) % 360)
    handle.style.setProperty('--point-angle', `${point.angle}deg`)
  }
})

app.addEventListener('pointerup', (event) => {
  const drag = state.tourPointerDrag
  if (!drag || drag.pointerId !== event.pointerId) return
  drag.viewport.releasePointerCapture?.(event.pointerId)
  state.tourPointerDrag = null
  if (drag.moved) render()
})

app.addEventListener('pointercancel', () => {
  state.tourPointerDrag = null
})

app.addEventListener('wheel', (event) => {
  const viewport = event.target.closest('[data-map-viewport]')
  if (!viewport || state.route !== 'create-points') return
  event.preventDefault()
  const direction = event.deltaY < 0 ? 1 : -1
  state.tourMapView.scale = clamp(Number((state.tourMapView.scale + direction * .1).toFixed(2)), .7, 2.5)
  const stage = viewport.querySelector('[data-map-stage]')
  if (stage) stage.style.transform = getTourMapTransform()
}, { passive: false })

app.addEventListener('dragstart', (event) => {
  const actionHandle = event.target.closest('[data-action-drag-handle-id]')
  if (actionHandle) {
    state.tourDraggedAction = {
      actionId: actionHandle.dataset.actionDragHandleId,
      targetType: actionHandle.dataset.targetType,
      targetId: actionHandle.dataset.targetId,
    }
    event.dataTransfer?.setData('text/plain', actionHandle.dataset.actionDragHandleId)
    event.dataTransfer?.setDragImage(actionHandle, 8, 8)
    actionHandle.closest('[data-tour-action-id]')?.classList.add('is-dragging')
    return
  }
  const handle = event.target.closest('[data-point-drag-handle-id]')
  if (!handle) return
  state.tourDraggedPointId = handle.dataset.pointDragHandleId
  event.dataTransfer?.setData('text/plain', state.tourDraggedPointId)
  event.dataTransfer?.setDragImage(handle, 8, 8)
  event.target.closest('[data-point-row-id]')?.classList.add('is-dragging')
})

app.addEventListener('dragover', (event) => {
  if (state.tourDraggedAction) {
    const targetRow = event.target.closest('[data-tour-action-id]')
    if (targetRow && targetRow.dataset.tourActionTargetId === state.tourDraggedAction.targetId && targetRow.dataset.tourActionTargetType === state.tourDraggedAction.targetType) event.preventDefault()
    return
  }
  if (!state.tourDraggedPointId || !event.target.closest('[data-point-row-id]')) return
  event.preventDefault()
})

app.addEventListener('drop', (event) => {
  if (state.tourDraggedAction) {
    const targetRow = event.target.closest('[data-tour-action-id]')
    const source = state.tourDraggedAction
    if (!targetRow || targetRow.dataset.tourActionTargetId !== source.targetId || targetRow.dataset.tourActionTargetType !== source.targetType) return
    event.preventDefault()
    const actions = getTourActionTarget(source.targetType, source.targetId)?.actions
    const sourceIndex = actions?.findIndex((action) => action.id === source.actionId) ?? -1
    const targetIndex = actions?.findIndex((action) => action.id === targetRow.dataset.tourActionId) ?? -1
    if (actions && sourceIndex >= 0 && targetIndex >= 0 && sourceIndex !== targetIndex) {
      const [action] = actions.splice(sourceIndex, 1)
      actions.splice(targetIndex, 0, action)
    }
    state.tourDraggedAction = null
    render()
    return
  }
  const targetRow = event.target.closest('[data-point-row-id]')
  const sourceId = state.tourDraggedPointId
  if (!targetRow || !sourceId) return
  event.preventDefault()
  const targetId = targetRow.dataset.pointRowId
  if (sourceId !== targetId) {
    const points = getTourTaskDraft().points
    const sourceIndex = points.findIndex((point) => point.id === sourceId)
    const targetIndex = points.findIndex((point) => point.id === targetId)
    if (sourceIndex >= 0 && targetIndex >= 0) {
      const [point] = points.splice(sourceIndex, 1)
      points.splice(targetIndex, 0, point)
    }
  }
  state.tourDraggedPointId = null
  render()
})

app.addEventListener('dragend', () => {
  state.tourDraggedAction = null
  state.tourDraggedPointId = null
  render()
})

app.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (state.modal || state.menuMapId || state.menuTourTaskId || state.personaMenuId || state.mcpPluginMenuId || state.personaPluginPickerOpen || state.personaSkillPickerOpen || state.tourMapPickerOpen || state.accountMenuOpen)) {
    state.modal = null
    state.menuMapId = null
    state.menuTourTaskId = null
    state.personaMenuId = null
    state.mcpPluginMenuId = null
    state.personaPluginPickerOpen = false
    state.personaSkillPickerOpen = false
    state.tourMapPickerOpen = false
    state.tourMapSearch = ''
    state.accountMenuOpen = false
    render()
    return
  }

  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-row-map-id]')) {
    event.preventDefault()
    setRoute('detail', event.target.dataset.rowMapId)
  }

  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-row-task-id]')) {
    event.preventDefault()
    setTourTaskRoute('task-detail', event.target.dataset.rowTaskId)
  }

  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-row-persona-id]')) {
    event.preventDefault()
    setPersonaRoute('detail', event.target.dataset.rowPersonaId)
  }

  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-row-mcp-plugin-id]')) {
    event.preventDefault()
    setMcpPluginRoute('detail', event.target.dataset.rowMcpPluginId)
  }
})

app.addEventListener('submit', (event) => {
  if (event.target.matches('#mcp-plugin-form')) {
    event.preventDefault()
    const draft = getMcpPluginDraftFromForm(new FormData(event.target))
    draft.name = draft.name.trim()
    draft.description = draft.description.trim()
    draft.examples = draft.examples.trim()
    draft.serviceUrl = draft.serviceUrl.trim()
    draft.headers = draft.headers.trim()
    const errors = validateMcpPluginDraft(draft)
    state.mcpPluginDraft = draft
    if (Object.keys(errors).length > 0) {
      state.mcpPluginFormErrors = errors
      render()
      requestAnimationFrame(() => document.querySelector('#mcp-plugin-form [aria-invalid="true"]')?.focus())
      return
    }
    const existingPlugin = state.editingMcpPluginId ? getMcpPlugin(state.editingMcpPluginId) : null
    const savedAt = new Date().toISOString()
    const pluginCandidate = {
      ...existingPlugin,
      id: existingPlugin?.id ?? `mcp-plugin-${Date.now()}`,
      ...draft,
      createdAt: existingPlugin?.createdAt ?? savedAt,
      refreshedAt: existingPlugin?.refreshedAt ?? savedAt,
      refreshCount: existingPlugin?.refreshCount ?? 0,
    }
    const tools = getMcpTools(pluginCandidate, pluginCandidate.refreshCount)
    if (tools.length === 0) {
      state.mcpPluginFormErrors = {}
      showToast('未获取到工具列表', 'error')
      return
    }
    pluginCandidate.tools = tools
    if (existingPlugin) {
      state.mcpPlugins = state.mcpPlugins.map((plugin) => plugin.id === existingPlugin.id ? pluginCandidate : plugin)
    } else {
      state.mcpPlugins.push(pluginCandidate)
    }
    persistAppData()
    state.mcpPluginDraft = null
    state.mcpPluginFormErrors = {}
    state.editingMcpPluginId = null
    state.modal = null
    setVoiceRoute('插件')
    showToast(existingPlugin ? '保存成功' : '添加成功')
    return
  }

  if (event.target.matches('#persona-form')) {
    event.preventDefault()
    const formData = new FormData(event.target)
    const name = String(formData.get('name') ?? '').trim()
    const voice = String(formData.get('voice') ?? '')
    const errors = {}
    if (!name) errors.name = '请输入人设名称'
    if (!['male', 'female'].includes(voice)) errors.voice = '请选择音色'
    const customSkillErrors = {}
    getPersonaDraft().customSkills.forEach((skill) => {
      const skillErrors = {}
      if (!skill.instruction.trim()) skillErrors.instruction = '请输入调用说明'
      if (!skill.example.trim()) skillErrors.example = '请输入调用示例'
      if (Object.keys(skillErrors).length > 0) customSkillErrors[skill.skillId] = skillErrors
    })
    if (Object.keys(customSkillErrors).length > 0) errors.customSkills = customSkillErrors
    if (Object.keys(errors).length > 0) {
      state.personaFormErrors = errors
      render()
      requestAnimationFrame(() => document.querySelector(
        errors.name
          ? '#persona-name'
          : errors.voice
            ? '#persona-voice'
            : '[data-persona-custom-skill-field][aria-invalid="true"]',
      )?.focus())
      return
    }
    const existingPersona = state.editingPersonaId ? getPersona(state.editingPersonaId) : null
    const savedPersona = {
      id: existingPersona?.id ?? `persona-${Date.now()}`,
      name,
      voice,
      prompt: String(formData.get('prompt') ?? '').trim(),
      pluginIds: [...getPersonaDraft().pluginIds],
      presetSkillsEnabled: Boolean(getPersonaDraft().presetSkillsEnabled),
      customSkills: getPersonaDraft().customSkills.map((skill) => ({ ...skill })),
      createdAt: existingPersona?.createdAt ?? new Date().toISOString(),
    }
    if (existingPersona) {
      state.personas = state.personas.map((persona) => persona.id === existingPersona.id ? savedPersona : persona)
    } else {
      state.personas.push(savedPersona)
    }
    persistAppData()
    state.personaDraft = null
    state.editingPersonaId = null
    state.personaFormErrors = {}
    setPersonaRoute('list')
    return
  }

  if (event.target.matches('#add-map-form')) {
    event.preventDefault()
    const name = state.mapCreateName.trim()
    const file = state.mapCreateFile
    if (!name) {
      state.mapCreateError = '请输入地图名称'
      render()
      return
    }
    if (!file) {
      state.mapCreateError = '请选择地图文件'
      render()
      return
    }

    const id = `map-${Date.now()}`
    state.maps.push({ id, name, createdAt: new Date().toISOString(), fileName: file.name })
    persistAppData()
    state.mapCreateName = ''
    state.mapCreateFile = null
    state.mapCreateError = ''
    state.modal = null
    setRoute('list')
    return
  }

  if (!event.target.matches('#edit-map-form')) return
  event.preventDefault()
  const name = String(new FormData(event.target).get('name')).trim()
  const mapId = event.target.dataset.mapId
  const map = getMap(mapId)
  if (!map || !name) return
  state.maps = state.maps.map((item) => item.id === mapId ? { ...item, name } : item)
  state.tourTasks = state.tourTasks.map((task) => task.mapId === mapId ? { ...task, mapName: name } : task)
  persistAppData()
  closeModal()
})

window.addEventListener('hashchange', syncRouteFromHash)
syncRouteFromHash()
