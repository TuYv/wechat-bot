import dotenv from 'dotenv'
import { handleSolitaire, handleCommand, getActiveRecords } from './records.js'
import { getWeather } from '../api/weatherApi.js'
import { getServe } from './serve.js'
import { prompts } from '../prompts/index.js'
import { getChineseDateInfo } from '../utils/dateUtils.js'

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
  const isSolitaire = content.startsWith(`#接龙`) || content.startsWith(`#Group Note`)
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
  const question = (await msg.mentionText()) || content.replace(`${botName}`, '').trim()
  const commandList = ['/add', '/a', '/delete', '/d', '/query', '/q', '/join', '/j', '/recover', '/r', '/p', '/point']
  const [command, ...args] = question.split(' ')

  if (isBotSelf || !isText) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理

  if (isSpecialRoom) {
    //接龙操作
    if (isSolitaire) {
      await handleSolitaire(content, roomName)
      return
    }
    //命令操作
    if (command && commandList.includes(command.toLowerCase())) {
      const commandResponse = await handleCommand(command, args, alias, roomName)
      await room.say(commandResponse)
      return
    }
    //群管理助手操作
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
  //通过AI判断是什么类型的问题
  const dateInfo = getChineseDateInfo()
  let message = prompts.LOGICAL_JUDGMENT(question)
  let response = await getReply(message)
  if (response != 'no') {
    //如果是天气相关的问题
    return await getWeatherReply(dateInfo, question, ServiceType)
    // return await getOutfitReply(ServiceType)
  } else {
    //羽毛球管理相关的问题
    const activeRecords = getActiveRecords(roomName)
    const recordList = JSON.stringify(activeRecords)

    return await getBadmintonReply(dateInfo, recordList, question, ServiceType)
  }
}

//获取天气提示
export async function getWeatherReply(dateInfo, question, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const context = await getWeather()
  const jsonContext = JSON.stringify(context)
  const message = prompts.WEATHER_TEMPLATE(dateInfo, jsonContext, question)
  return await getReply(message)
}

export async function getOutfitReply(ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const context = await getWeather()
  const jsonContext = JSON.stringify(context)
  console.log(jsonContext)
  const message = prompts.OUTFIT(jsonContext)
  return await getReply(message)
}

//获取羽毛球管理响应
async function getBadmintonReply(dateInfo, recordList, question, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const message = prompts.GROUP_ASSISTANT(recordList, dateInfo, question)
  return await getReply(message)
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
