import dotenv from 'dotenv'
import { bot } from '../index.js'
import { getServe } from './serve.js'
import { getActiveRecords, removeRecord, saveRecords } from './records.js'
import schedule from 'node-schedule'
import { getOutfitReply } from './sendMessage.js'
import { prompts } from '../prompts/index.js'
import { getChineseDateInfo } from '../utils/dateUtils.js'

// 加载环境变量
dotenv.config()
const env = dotenv.config().parsed // 环境参数

/**
 * 设置每日天气提醒
 */
export function scheduleWeatherReminder(ServiceType = 'GPT') {
  // 每天早上 8:45 发送天气信息
  schedule.scheduleJob('45 8 * * *', async () => {
    try {
      const response = await getOutfitReply(ServiceType)
      const roomName = '三林羽毛球🏸'
      const room = await bot.Room.find({ topic: roomName })
      if (room) {
        await room.say(response)
      } else {
        console.log('未找到指定群聊')
      }
    } catch (error) {
      console.error('❌ 发送每日天气提醒失败:', error)
    }
  })

  console.log('⏰ 每日天气提醒任务已设置 (每天 8:45)')
}

export async function sendScheduledMessage(ServiceType = 'GPT') {
  scheduleWeatherReminder(ServiceType)
  schedule.scheduleJob('58 23 * * *', async () => {
    try {
      await dailyWork('三林羽毛球🏸')
    } catch (error) {
      console.error('每日提醒抢场地报错: ', error)
    }
  })
}

async function dailyWork(roomName) {
  const message = `@all 抢场地啦～～`
  const miniappLink = `#小程序://趣运动/DP42lh93kpErt4n`

  const clearResult = await cleanExpiredRecords(roomName, env.SERVICE_TYPE)
  const room = await bot.Room.find({ topic: roomName })
  if (room) {
    const roomName = (await room?.topic()) || null // 群名称
    console.log('获取到群聊' + roomName)

    if (clearResult.success && clearResult.clearCount > 0) {
      await room.say(clearResult.message)
    } else {
      console.log(clearResult.message)
    }

    await room.say(message)
    await room.say(miniappLink)
  } else {
    console.log('未找到指定群聊')
  }
}

export async function cleanExpiredRecords(roomName, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  // 读取所有有效记录
  const activeRecords = getActiveRecords(roomName)
  // 如果没有有效记录，直接返回
  if (!activeRecords || activeRecords.length === 0) {
    return {
      success: true,
      clearCount: 0,
      message: '当前没有需要清理的记录',
    }
  }

  const dateInfo = getChineseDateInfo()
  // 构建 AI 提示
  const prompt = prompts.CLEAR_DATA(dateInfo, activeRecords)

  try {
    let message = '活动自动过期结果汇报\n(如果有误删帮忙用/r 命令恢复一下 谢谢🙏):\n'
    let clearCount = 0
    // 调用 AI 接口获取过期活动ID
    console.log(ServiceType + prompt)
    const aiResponse = await getReply(prompt)
    console.log('ai返回结果' + aiResponse)
    const expiredResult = JSON.parse(aiResponse)

    // 删除过期记录
    for (const result of expiredResult) {
      if (result.result) {
        removeRecord(result.id, roomName)
        clearCount++
        console.log(JSON.stringify(result.reason))
        message = message + JSON.stringify(result.reason) + '\n -------------- \n'
      }
    }
    // 保存记录
    await saveRecords()

    return {
      success: true,
      clearCount: clearCount,
      message: `${message}`,
    }
  } catch (error) {
    return {
      success: false,
      clearCount: clearCount,
      message: `清理过期记录失败: ${error.message}`,
    }
  }
}
