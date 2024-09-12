import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
// 加载环境变量
dotenv.config()
const env = dotenv.config().parsed // 环境参数

// 从环境变量中导入机器人的名称
const botName = env.BOT_NAME

// 从环境变量中导入需要自动回复的消息前缀，默认配空串或不配置则等于无前缀
const autoReplyPrefix = env.AUTO_REPLY_PREFIX ? env.AUTO_REPLY_PREFIX : ''

// 从环境变量中导入联系人白名单
const aliasWhiteList = env.ALIAS_WHITELIST ? env.ALIAS_WHITELIST.split(',') : []

// 从环境变量中导入群聊白名单
const roomWhiteList = env.ROOM_WHITELIST ? env.ROOM_WHITELIST.split(',') : []
// 新增群聊白名单
const specialRoomWhiteList = env.SPECIAL_ROOM_WHITELIST ? env.SPECIAL_ROOM_WHITELIST.split(',') : []

// 用于存储记录的对象
let records = {}
let lastId = 0 // 用于跟踪最后使用的ID
const RECORDS_FILE = path.join(process.cwd(), 'records.json')

// 在程序启动时加载记录和最后使用的ID
async function loadRecordsAndLastId() {
  try {
    const data = await fs.readFile(RECORDS_FILE, 'utf8')
    const parsed = JSON.parse(data)
    records = parsed.records || {}
    lastId = parsed.lastId || 0
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('读取记录文件时出错:', error)
    }
    records = {}
    lastId = 0
  }
}

// 生成新的ID
function generateNewId() {
  lastId++
  return lastId
}

// 保存记录和最后使用的ID
async function saveRecordsAndLastId() {
  try {
    const data = JSON.stringify({ records, lastId }, null, 2)
    await fs.writeFile(RECORDS_FILE, data, 'utf8')
  } catch (error) {
    console.error('保存记录文件时出错:', error)
  }
}

// 在程序启动时加载记录和最后使用的ID
loadRecordsAndLastId()

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
  const contact = msg.talker() // 发消息人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const isRoom = specialRoomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称

  const question = (await msg.mentionText()) || content.replace(`${botName}`, '').trim()
  const [command, ...args] = question.split(' ')

  switch (command.toLowerCase()) {
    case '/add':
    case '/a':
      if (args.length > 0) {
        const id = generateNewId()
        records[id] = {
          name: alias,
          content: args.join(' '),
          participants: [alias], // 自动将发起人加入参与者列表
        }
        await saveRecordsAndLastId() // 保存记录和最后使用的ID
        await room.say(`记录已添加，编号：${id}`)
      } else {
        await room.say('请提供要记录的内容')
      }
      break
    case '/query':
    case '/q':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[id]) {
          const record = records[id]
          const participants = record.participants.join(', ')
          await room.say(`编号:${id}, 内容:${record.content}, 参与者: ${participants}`)
        } else {
          await room.say(`未找到编号为 ${id} 的记录`)
        }
      } else {
        const recordList = Object.entries(records)
          .map(([id, record]) => `编号:${id},${record.content},发起人 ${record.name}.`)
          .join('\n')
        await room.say(recordList || '暂无记录')
      }
      break
    case '/delete':
    case '/d':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[id]) {
          delete records[id]
          await saveRecordsAndLastId() // 保存记录和最后使用的ID
          await room.say(`编号 ${id} 的记录已删除`)
        } else {
          await room.say(`未找到编号为 ${id} 的记录`)
        }
      } else {
        await room.say('请提供要删除的记录编号')
      }
      break
    case '/join':
    case '/j':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[id]) {
          if (!records[id].participants) {
            records[id].participants = [] // 初始化 participants
          }
          if (!records[id].participants.includes(alias)) {
            records[id].participants.push(alias)
            await saveRecordsAndLastId()
            await room.say(`${alias} 已加入编号 ${id} 的记录`)
          } else {
            await room.say(`${alias} 已经在编号 ${id} 的记录中`)
          }
        } else {
          await room.say(`未找到编号为 ${id} 的记录`)
        }
      } else {
        await room.say('请提供要加入的记录编号')
      }
      break
    default:
      // 调用原来的 defaultMessage 方法
      await aiMessage(msg, bot, ServiceType)
  }
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
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
  // TODO 你们可以根据自己的需求修改这里的逻辑
  if (isBotSelf || !isText) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理
  try {
    // 区分群聊和私聊
    // 群聊消息去掉艾特主体后，匹配自动回复前缀
    if (isRoom && room && content.replace(`${botName}`, '').trimStart().startsWith(`${autoReplyPrefix}`)) {
      const question = (await msg.mentionText()) || content.replace(`${botName}`, '').replace(`${autoReplyPrefix}`, '') // 去掉艾特的消息主体
      console.log('🌸🌸🌸 / question: ', question)
      const response = await getReply(question)
      await room.say(response)
    }
    // 私人聊天，白名单内的直接发送
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
// 读取记录
async function loadRecords() {
  try {
    const data = await fs.readFile(RECORDS_FILE, 'utf8')
    records = JSON.parse(data)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('读取记录文件时出错:', error)
    }
    // 如果文件不存在，我们就使用空对象
    records = {}
  }
}
// 保存记录
async function saveRecords() {
  try {
    await fs.writeFile(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8')
  } catch (error) {
    console.error('保存记录文件时出错:', error)
  }
}
