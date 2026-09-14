export const demoKnowledgePlugin = {
  name: '北京地铁站知识库',
  description: '回答地铁乘客的问题，任何问题都要调用此插件。',
  examples: '任何问题都要调用此插件。',
  serviceUrl: 'https://everything.skybridge.tech',
  tools: [
    { name: 'show-everything', description: 'A simple greeting tool' },
    { name: 'flip-coin', description: 'Flips a coin and checks if the user\'s guess is correct' },
    { name: 'inspect-file', description: 'Read a file the user uploaded and echo it back as a downloadable reference.' },
  ],
} as const

export const demoPersona = {
  name: '王府井地铁站站务员',
  voice: 'female',
  prompt: '你是王府井地铁站的站务员。你需要用简洁、友好、专业的方式回答用户问题。\n\n任何问题，必须以用户提问原文查询地铁知识库，如果用户使用英文提问，则先翻译为中文查询，然后以地铁知识库的原文去回答用户，禁止做任何杜撰加工，如果用户使用英文提问，则最终需要以英文回答。',
  presetSkillsEnabled: true,
} as const

export const demoTour = {
  name: '王府井站站厅巡检',
  points: [
    {
      name: '站厅服务台', x: 210, y: 322, angle: 90,
      actions: [{ type: 'SKILL', skillId: 'cloud-turn-head', skillName: '转动头部' }],
    },
    {
      name: '站厅 PIS 屏', x: 492, y: 220, angle: 0,
      actions: [{ type: 'SKILL', skillId: 'cloud-turn-head', skillName: '转动头部' }],
    },
    {
      name: '防汛物资存放点', x: 734, y: 330, angle: 270,
      actions: [
        { type: 'SKILL', skillId: 'cloud-turn-head', skillName: '转动头部' },
        { type: 'SPEECH', narration: '巡检任务已完成。' },
      ],
    },
  ],
  paths: [
    { fromSequence: 1, toSequence: 2, actions: [{ type: 'SPEECH', narration: '正在前往站厅 PIS 屏。' }] },
    { fromSequence: 2, toSequence: 3, actions: [{ type: 'SPEECH', narration: '正在前往防汛物资存放点。' }] },
  ],
} as const
