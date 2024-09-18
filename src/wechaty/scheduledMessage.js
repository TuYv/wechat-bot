import { FileBox } from 'file-box'

export async function sendScheduledMessage(room) {
  const message = `抢场地啦～～`
  const miniappLink = `#小程序://趣运动/DP42lh93kpErt4n`

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
    await room.say(message)
    await room.say(miniappLink)
    // 每隔 24 小时发送一次
    setInterval(
      async () => {
        await room.say(message)
        await room.say(miniappLink)
      },
      24 * 60 * 60 * 1000,
    ) // 24小时
  }, delay)
}
