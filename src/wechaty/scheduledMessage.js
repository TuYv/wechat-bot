import dotenv from 'dotenv'
import { bot } from '../index.js'
import { getServe } from './serve.js'
import { getActiveRecords, removeRecord, saveRecords } from './records.js'
import schedule from 'node-schedule'
import { defaultMessage } from './sendMessage.js'

// 加载环境变量
dotenv.config()
const env = dotenv.config().parsed // 环境参数

// /**
//  * 设置每日天气提醒
//  * @param {*} bot wechaty实例
//  */
// export function scheduleWeatherReminder(bot) {
//   // 每天早上 8:45 发送天气信息
//   schedule.scheduleJob('45 8 * * *', async () => {
//       try {
//           // 创建一个模拟的消息对象
//           const mockMessage = {
//               text: () => `${process.env.BOT_NAME} 今天天气怎么样`,
//               room: () => null,
//               talker: () => ({
//                   name: () => process.env.BOT_NAME,
//                   alias: () => process.env.BOT_NAME
//               }),
//               type: () => bot.Message.Type.Text,
//               mentionText: () => '今天天气怎么样'
//           };

//           await defaultMessage(mockMessage, bot);
//           console.log('✅ 每日天气提醒已发送');
//       } catch (error) {
//           console.error('❌ 发送每日天气提醒失败:', error);
//       }
//   });

//   console.log('⏰ 每日天气提醒任务已设置 (每天 8:45)');
// }

export async function sendScheduledMessage() {
  const now = new Date()
  const firstSendTime = new Date()
  firstSendTime.setHours(23, 58, 0, 0) // 设置为 11:58

  // 如果当前时间已经超过 11:58，设置为第二天的 11:58
  if (now > firstSendTime) {
    firstSendTime.setDate(firstSendTime.getDate() + 1)
  }

  const delay = firstSendTime - now // 计算第一次发送的延迟时间

  // 首次发送
  setTimeout(async () => {
    await dailyWork('三林羽毛球🏸')
    // 每隔 24 小时发送一次
    setInterval(
      async () => {
        await dailyWork('三林羽毛球🏸')
      },
      24 * 60 * 60 * 1000,
    ) // 24小时
  }, delay)
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

  const today = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const dateInfo = {
    date: today.toLocaleDateString('zh-CN'),
    weekday: weekdays[today.getDay()],
  }
  // 构建 AI 提示
  const prompt = `
  今天是 ${dateInfo.date} ${dateInfo.weekday},请分析以下活动记录列表，判断哪些活动已经过期。
  规则：
  1. content字段中的今天 明天等相对时间不视为时间信息
  2. 如果记录中content字段包含具体日期（如：9月25日、9.25、09-25、1022等），将其与当前日期比较
  3. 如果记录中content字段包含星期几（如：周三、周四、星期三等），将其与当前星期比较,其中一周的开始是星期一
  4. 如果上面比较的结果大于或等于当前时间或星期则视为未过期
  5. 如果记录中content字段没有任何时间信息，也视为已过期
  6. 需要尽可能少的删除数据，除非明确符合某条删除规则
  7. 返回结果严格按照如下数据结构展示，括号内内容为字段释义，不需要返回，返回内容为纯文本不需要markdown转换：
  [{
    "id" : xxx(活动ID),
    "result" : xx(true为已过期，false为未过期),
    "reason" : xx(返回活动ID，活动内容和结果的判断逻辑需要给出判断过程和不符合哪条规则)
}]
  
  以下是需要检查的活动记录：
  ${JSON.stringify(activeRecords, null, 2)}
  `

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
