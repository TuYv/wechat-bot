import { FileBox } from 'file-box'
import { bot } from '../index.js'

export async function sendScheduledMessage() {
  const message = `抢场地啦～～`
  const miniappLink = `#小程序://趣运动/DP42lh93kpErt4n`

  // const roomList = await bot.Room.findAll()
  // console.log(roomList)

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
    const room = await bot.Room.find({ topic: '三林羽毛球🏸' })
    if (room) {
      const roomName = (await room?.topic()) || null // 群名称
      console.log('获取到群聊' + roomName)

      await room.say(message)
      await room.say(miniappLink)
    } else {
      console.log('未找到指定群聊')
    }
    // 每隔 24 小时发送一次
    setInterval(
      async () => {
        const room = await bot.Room.find({ topic: '三林羽毛球🏸' })
        if (room) {
          const roomName = (await room?.topic()) || null // 群名称
          console.log('获取到群聊' + roomName)
          await room.say(message)
          await room.say(miniappLink)
        } else {
          console.log('未找到指定群聊')
        }
      },
      24 * 60 * 60 * 1000,
    ) // 24小时
  }, delay)
}
