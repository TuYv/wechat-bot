import dotenv from 'dotenv'
import { handleSolitaire, handleCommand, getActiveRecords } from './records.js'
import { getWeather } from '../api/weatherApi.js'

// 加载环境变量
dotenv.config()
const env = dotenv.config().parsed // 环境参数

// 从环境变量中导入机器人的名称
const botName = env.BOT_NAME

// 从环境变量中导入需要自动回复的消息前缀,默认配空串或不配置则等于无前缀
const autoReplyPrefix = env.AUTO_REPLY_PREFIX ? env.AUTO_REPLY_PREFIX : ''

// 从环境变量中导入联系人白名单
const aliasWhiteList = env.ALIAS_WHITELIST ? env.ALIAS_WHITELIST.split(',') : []

// 从环境变量中导入群聊白名单
const roomWhiteList = env.ROOM_WHITELIST ? env.ROOM_WHITELIST.split(',') : []
// 新增群聊白名单
const specialRoomWhiteList = env.SPECIAL_ROOM_WHITELIST ? env.SPECIAL_ROOM_WHITELIST.split(',') : []

import { getServe } from './serve.js'
/**
 * 处理特殊群聊消息
 * @param msg
 * @param bot
 * @param ServiceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export async function defaultMessage(msg, bot, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const contact = await msg.talker() // 发消息人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const isSpecialRoom = specialRoomWhiteList.includes(roomName) // 是否在群聊白名单内并且艾特了机器人
  const isMentionBot = content.startsWith(`${botName}`)
  const isSolitaire = isSpecialRoom && (content.startsWith(`#接龙`) || content.startsWith(`#Group Note`))
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
  const question = (await msg.mentionText()) || content.replace(`${botName}`, '').trim()
  const commandList = ['/add', '/a', '/delete', '/d', '/query', '/q', '/join', '/j', '/recover', '/r']
  const [command, ...args] = question.split(' ')

  if (isBotSelf || !isText) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理
  console.log(name + ': ' + msg.text())
  if (isSolitaire) {
    //接龙操作
    handleSolitaire(content, roomName)
    return
  }
  //如果是specialRoomWihiteList中的群,进入下面逻辑
  //如果消息内容有且仅有命令,进入命令逻辑
  //如果消息内容的开头是${botName} 进入群管理助手逻辑
  //否则进入AI操作逻辑
  if (isSpecialRoom) {
    if (command && commandList.includes(command.toLowerCase())) {
      // 命令操作
      const commandResponse = await handleCommand(command, args, alias, roomName)
      await room.say(commandResponse)
      return
    }
    if (isMentionBot) {
      const response = await checkQuestion(question, roomName, ServiceType)
      await room.say('@' + alias + ' ' + response)
      return
    }
  }
  //AI操作
  await aiMessage(msg, bot, ServiceType)
}

async function checkQuestion(question, roomName, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const today = new Date().toLocaleDateString() + new Date().toLocaleTimeString()
  console.log(today)
  let message = `
    -------------------------    以下是我的问题
    ${question}
    ------------------------- 以下为回复模板
   如果你觉得这是在问今天的天气回答base,如果是在问未来的天气回答all,否则回答no。除此之外回复不需要任何内容

  `
  console.log(message)
  let response = await getReply(message)
  console.log(response)
  if (response != 'no') {
    const context = await getWeather(response)
    console.log(context)
    const jsonContext = JSON.stringify(context)
    message = `
    你是一个专业的私人助理, 天气助手, 熟悉天气, 请根据当前的天气状况,提供多方面建议.  
    推荐合适的衣物选择,例如轻薄或保暖的服装,防晒或防雨措施。  
    考虑天气条件,提出室内或室外的活动建议,如晴天推荐户外运动,雨天则建议室内活动。    这些建议将帮助用户更好地准备当天的行程,确保舒适和安全。    现在的时间是: ${today}  
    -------------------------    以下是今天或者未来几天的天气情况 
    ${jsonContext}    
    -------------------------    以下为天气情况的字段释义, 仅作为 context 释义参考  
{
    "status(返回状态	值为0或1 1:成功;0:失败)": "1",
    "count(返回结果总数目)": "1",
    "info(返回的状态信息)": "OK",
    "infocode(返回状态说明,10000代表正确)": "10000",
    "lives(实况天气数据信息)": [
        {
            "province(省份名)": "上海",
            "city(城市名)": "浦东新区",
            "adcode(区域编码)": "310115",
            "weather(天气现象 汉字描述)": "阴",
            "temperature(实时气温，单位：摄氏度)": "20",
            "winddirection(风向描述)": "东",
            "windpower(风力级别)": "≤3",
            "humidity(空气湿度)": "71",
            "reporttime(数据发布的时间)": "2024-10-30 16:01:11",
            "temperature_float(实时气温浮点数据，单位：摄氏度)": "20.0",
            "humidity_float(空气湿度浮点数据)": "71.0"
        }
    ],"forecasts(预报天气信息数据)": [
              {
                  "city(城市名称)": "浦东新区",
                  "adcode(城市编码)": "310115",
                  "province(省份名称0": "上海",
                  "reporttime(预报发布时间)": "2024-10-30 16:33:16",
                  "casts(预报数据 list结构,元素cast,按顺序为当天、第二天、第三天的预报数据": [
                      {
                          "date(日期)": "2024-10-30",
                          "week(星期几)": "3",
                          "dayweather(白天天气现象)": "小雨",
                          "nightweather(晚上天气现象)": "阴",
                          "daytemp(白天温度)": "23",
                          "nighttemp(晚上温度)": "17",
                          "daywind(白天风向)": "北",
                          "nightwind(晚上风向)": "北",
                          "daypower(白天风力)": "1-3",
                          "nightpower(晚上风力)": "1-3",
                          "daytemp_float(白天温度浮点数据)": "23.0",
                          "nighttemp_float(晚上温度浮点数据)": "17.0"
                      }
                      ...更多数据
                  ]
              }
          ]
}
    -------------------------    以下是我的问题
  ${question}
  
以下为回复模板[温度需要转换成摄氏度显示],根据lives中的实时天气或者forecasts对应date中的数据回答 ()以及[]中内容无需在回复中带上,仅作最终结果展示,无需解释单位换算等内容:  
⏰(判断问题中的时间，如果近可用今天，明天，后天，否则用星期几)的时间是: [格式为 年-月-日]  
🌡️(问题中的日期)的温度是: [温度]℃ (根据上下文返回问题中的日子温度,如果有的话)  
🤒体感是: [体感温度]℃,感觉[舒适/凉爽/寒冷/炎热等] (根据上下文返回体感温度及天气对个人的感觉)  
🌬️风速和风向: [当前风速和风向,如“东北风 5级”]  
🌧️降水概率和类型: [降水概率和类型,如“60% 概率小雨”]  
❄️降雪概率: [降雪概率,如“20% 概率轻雪”]  
🌅日出和日落时间: [当天的日出和日落时间,如“日出 6:10, 日落 18:30”]🧣适宜的穿搭是: [根据体感温度和天气状况,提供简洁的穿搭建议,例如“轻薄长袖和牛仔裤”或“保暖外套和羊毛围巾”等]  
⚽️适宜的活动是: [根据当前天气状况,建议适宜的活动,如“户外散步”、“室内阅读”、“参加热瑜伽课程”等]  
🚗出行建议: [根据天气情况,提供出行建议,如“记得携带雨伞”或“适合骑行”等]  
🎉祝福: [提供一条积极、鼓励或应景的祝福]  
(如果你觉得上面的模版不适合本次的问题,可以自己定义返回结果)
  `
  } else {
    const activeRecords = getActiveRecords(roomName)
    const recordList = JSON.stringify(activeRecords)
    message = `你是一个羽毛球群的群管理助手,你只会回答与羽毛球相关的信息,回复时请使用纯文本格式。不要使用任何Markdown语法,包括但不限于#、*、>等符号。聊天界面不支持这些格式。这些是当前群里面的活动:\n${recordList}\n今天是 ${today},现在请尽量简短的回答:${question}`
  }
  console.log(message)
  response = await getReply(message)
  console.log(response)
  return response
}

/**
 * 默认消息发送
 * @param msg
 * @param bot
 * @param ServiceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export async function aiMessage(msg, bot, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const contact = msg.talker() // 发消息人
  const receiver = msg.to() // 消息接收人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  try {
    // 区分群聊和私聊
    // 群聊消息去掉艾特主体后,匹配自动回复前缀
    if (isRoom && room && content.replace(`${botName}`, '').trimStart().startsWith(`${autoReplyPrefix}`)) {
      const question = (await msg.mentionText()) || content.replace(`${botName}`, '').replace(`${autoReplyPrefix}`, '') // 去掉艾特的消息主体
      console.log('🌸🌸🌸 / question: ', question)
      const response = await getReply(question)
      await room.say(response)
    }
    // 私人聊天,白名单内的直接发送
    // 私人聊天直接匹配自动回复前缀
    if (isAlias && !room && content.trimStart().startsWith(`${autoReplyPrefix}`)) {
      const question = content.replace(`${autoReplyPrefix}`, '')
      console.log('🌸🌸🌸 / content: ', question)
      const response = await getReply(question)
      await contact.say(response)
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * 分片消息发送
 * @param message
 * @param bot
 * @returns {Promise<void>}
 */
export async function shardingMessage(message, bot) {
  const talker = message.talker()
  const isText = message.type() === bot.Message.Type.Text // 消息类型是否为文本
  if (talker.self() || message.type() > 10 || (talker.name() === '微信团队' && isText)) {
    return
  }
  const text = message.text()
  const room = message.room()
  if (!room) {
    console.log(`Chat GPT Enabled User: ${talker.name()}`)
    const response = await getChatGPTReply(text)
    await trySay(talker, response)
    return
  }
  let realText = splitMessage(text)
  // 如果是群聊但不是指定艾特人那么就不进行发送消息
  if (text.indexOf(`${botName}`) === -1) {
    return
  }
  realText = text.replace(`${botName}`, '')
  const topic = await room.topic()
  const response = await getChatGPTReply(realText)
  const result = `${realText}\n ---------------- \n ${response}`
  await trySay(room, result)
}

// 分片长度
const SINGLE_MESSAGE_MAX_SIZE = 500

/**
 * 发送
 * @param talker 发送哪个  room为群聊类 text为单人
 * @param msg
 * @returns {Promise<void>}
 */
async function trySay(talker, msg) {
  const messages = []
  let message = msg
  while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
    messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE))
    message = message.slice(SINGLE_MESSAGE_MAX_SIZE)
  }
  messages.push(message)
  for (const msg of messages) {
    await talker.say(msg)
  }
}

/**
 * 分组消息
 * @param text
 * @returns {Promise<*>}
 */
async function splitMessage(text) {
  let realText = text
  const item = text.split('- - - - - - - - - - - - - - -')
  if (item.length > 1) {
    realText = item[item.length - 1]
  }
  return realText
}
