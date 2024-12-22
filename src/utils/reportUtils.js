// 添加羽毛球励志语录
const badmintonQuotes = [
  '坚持不懈，每一次挥拍都是进步 🏸',
  '技术源于练习，成功源于坚持 ✨',
  '今天的汗水，是明天的实力 💪',
  '羽毛球不只是运动，更是一种生活态度 🌟',
  '即使失误也不要气馁，重要的是继续前进 🎯',
  '球场如人生，起起落落都是成长 🌈',
  '享受比赛的过程，胜负只是结果 🎨',
  '团队合作，让双打更精彩 🤝',
  '每一次挑战，都是超越自我的机会 ⭐️',
  '保持热爱，永远年轻 💫',
]

// 获取随机励志语录
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * badmintonQuotes.length)
  return badmintonQuotes[randomIndex]
}

function generateAnnualReport(records) {
  // 为每个群聊创建独立的统计数据，使用群聊名称作为 key
  const groupStats = new Map()

  // 遍历所有记录
  Object.entries(records.records).forEach(([roomName, room]) => {
    // 为每个群聊初始化统计数据
    if (!groupStats.has(roomName)) {
      groupStats.set(roomName, {
        totalStats: {
          totalEvents: 0,
          totalParticipants: 0,
          mostActiveMonth: '',
          mostActiveVenue: '',
          mostActiveTimeSlot: '',
          mostPopularFormat: '',
        },
        personalStats: new Map(),
        monthlyEvents: new Map(),
        venues: new Map(),
        timeSlots: new Map(),
        formats: new Map(),
        partnerStats: new Map(),
      })
    }

    const currentGroupStats = groupStats.get(roomName)

    Object.values(room.data).forEach((event) => {
      // 总活动数
      currentGroupStats.totalStats.totalEvents++

      // 参与人数统计
      currentGroupStats.totalStats.totalParticipants += event.participants.length

      // 解析活动信息
      const eventInfo = parseEventContent(event.content)

      // 更新月份统计
      const month = eventInfo.month
      currentGroupStats.monthlyEvents.set(month, (currentGroupStats.monthlyEvents.get(month) || 0) + 1)

      // 更新场地统计
      if (eventInfo.venue) {
        currentGroupStats.venues.set(eventInfo.venue, (currentGroupStats.venues.get(eventInfo.venue) || 0) + 1)
      }

      // 更新时间段统计
      if (eventInfo.timeSlot) {
        currentGroupStats.timeSlots.set(eventInfo.timeSlot, (currentGroupStats.timeSlots.get(eventInfo.timeSlot) || 0) + 1)
      }

      // 更新比赛形式统计
      if (eventInfo.format) {
        currentGroupStats.formats.set(eventInfo.format, (currentGroupStats.formats.get(eventInfo.format) || 0) + 1)
      }

      // 更新个人统计
      event.participants.forEach((participant, index) => {
        if (!currentGroupStats.personalStats.has(participant)) {
          currentGroupStats.personalStats.set(participant, {
            totalParticipation: 0,
            initiatedEvents: 0,
            participatedEvents: 0,
          })
        }

        const stats = currentGroupStats.personalStats.get(participant)
        stats.totalParticipation++

        if (index === 0) {
          // 发起者
          stats.initiatedEvents++
        } else {
          // 参与者
          stats.participatedEvents++
        }
      })

      // 统计配对信息
      event.participants.forEach((player) => {
        if (!currentGroupStats.partnerStats.has(player)) {
          currentGroupStats.partnerStats.set(player, new Map())
        }

        // 统计每个人和其他人一起参加活动的次数
        event.participants.forEach((partner) => {
          if (player !== partner) {
            const playerPartners = currentGroupStats.partnerStats.get(player)
            playerPartners.set(partner, (playerPartners.get(partner) || 0) + 1)
          }
        })
      })
    })
  })

  // 生成总结报告
  return {
    generateOverallReport(roomName) {
      const groupStat = groupStats.get(roomName)
      if (!groupStat) return `未找到"${roomName}"群的活动记录 😅`

      // 添加数据检查
      const monthStr = getMaxKey(groupStat.monthlyEvents)
      const venueStr = getMaxKey(groupStat.venues)
      const timeSlotStr = getMaxKey(groupStat.timeSlots)
      const formatStr = getMaxKey(groupStat.formats)

      return `${roomName} 2024年羽毛球活动年度总结 🎉
        
总体数据：
- 全年共发起🏸 ${groupStat.totalStats.totalEvents} 场活动 
- 累计参与👥 ${groupStat.totalStats.totalParticipants} 人次 
- 最活跃月份📅：${monthStr === '暂无数据' ? monthStr : monthStr + '月'} 
- 最受欢迎场地🏢：${venueStr} 
- 最热门时段⏰：${timeSlotStr} 
- 最受欢迎形式🎯：${formatStr} 

${
  groupStat.personalStats.size > 0
    ? `🏆 活跃选手排行：
${generateTopPlayersList(groupStat.personalStats)}`
    : '暂无参与记录 😅'
}

${getRandomQuote()}`
    },

    generatePersonalReport(roomName, playerName) {
      const groupStat = groupStats.get(roomName)
      if (!groupStat) return `未找到"${roomName}"群的活动记录 😅`

      const stats = groupStat.personalStats.get(playerName)
      if (!stats) return `未找到 ${playerName} 在"${roomName}"群的参与记录 😅`

      // 获取最佳搭档信息
      const bestPartner = getBestPartner(playerName, groupStat.partnerStats)
      const bestPartnerStr = bestPartner ? `${bestPartner.name} (一起参加了 ${bestPartner.count} 次活动)` : '暂无数据'

      return `${playerName} 在"${roomName}"群的2024年羽毛球活动总结 ⭐️

参与数据：
- 总参与次数🎯：${stats.totalParticipation} 次 
- 发起活动🎨：${stats.initiatedEvents} 次 
- 参与活动🤝：${stats.participatedEvents} 次 

个人偏好：
- 最常参与月份📅：${getPlayerPreferredMonth(playerName, records, roomName)} 
- 最常参与时段⏰：${getPlayerPreferredTimeSlot(playerName, records, roomName)} 
- 最佳球搭子👥：${bestPartnerStr} 

${getRandomQuote()}`
    },
  }
}

// 辅助函数
function parseEventContent(content) {
  const info = {
    month: null,
    venue: null,
    timeSlot: null,
    format: null,
  }

  // 解析月份
  const monthMatch = content.match(/(\d{1,2})月|\d{1,2}\.\d{1,2}/)
  if (monthMatch) {
    info.month = parseInt(monthMatch[1])
  }

  // 解析场地
  if (content.includes('三林')) {
    info.venue = '三林体育中心'
  }

  // 解析时间段
  if (content.includes('晚') || content.match(/\d{1,2}[:：]\d{2}.*\d{1,2}[:：]\d{2}/)) {
    info.timeSlot = '晚上'
  } else if (content.includes('早') || content.includes('上午')) {
    info.timeSlot = '上午'
  } else if (content.includes('下午')) {
    info.timeSlot = '下午'
  }

  // 解析比赛形式
  if (content.includes('双打')) {
    info.format = '双打'
  } else if (content.includes('单打')) {
    info.format = '单打'
  }

  return info
}

function getMaxKey(map) {
  if (!map || map.size === 0) return '暂无数据'

  return Array.from(map.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
}

function generateTopPlayersList(personalStats) {
  if (!personalStats || personalStats.size === 0) return '暂无数据'

  return Array.from(personalStats.entries())
    .sort((a, b) => b[1].totalParticipation - a[1].totalParticipation)
    .slice(0, 10)
    .map((entry, index) => `${index + 1}. ${entry[0]}: ${entry[1].totalParticipation}次参与，${entry[1].initiatedEvents}次发起`)
    .join('\n')
}

// 获取玩家最常参与的月份
function getPlayerPreferredMonth(playerName, records, roomName) {
  const monthlyParticipation = new Map()

  const room = records.records[roomName]
  if (!room) return '暂无数据'

  Object.values(room.data).forEach((event) => {
    if (event.deleted) return // 跳过已删除的记录
    if (event.participants.includes(playerName)) {
      const eventInfo = parseEventContent(event.content)
      if (eventInfo.month) {
        monthlyParticipation.set(eventInfo.month, (monthlyParticipation.get(eventInfo.month) || 0) + 1)
      }
    }
  })

  if (monthlyParticipation.size === 0) {
    return '暂无数据'
  }

  const preferredMonth = getMaxKey(monthlyParticipation)
  return `${preferredMonth}月 (${monthlyParticipation.get(preferredMonth)}次)`
}

// 获取玩家最常参���的时间段
function getPlayerPreferredTimeSlot(playerName, records, roomName) {
  const timeSlotParticipation = new Map()

  const room = records.records[roomName]
  if (!room) return '暂无数据'

  Object.values(room.data).forEach((event) => {
    if (event.deleted) return // 跳过已删除的记录
    if (event.participants.includes(playerName)) {
      const eventInfo = parseEventContent(event.content)
      if (eventInfo.timeSlot) {
        timeSlotParticipation.set(eventInfo.timeSlot, (timeSlotParticipation.get(eventInfo.timeSlot) || 0) + 1)
      }
    }
  })

  if (timeSlotParticipation.size === 0) {
    return '暂无数据'
  }

  const preferredTimeSlot = getMaxKey(timeSlotParticipation)
  return `${preferredTimeSlot} (${timeSlotParticipation.get(preferredTimeSlot)}次)`
}

// 获取最佳搭档
function getBestPartner(playerName, partnerStats) {
  const playerPartners = partnerStats.get(playerName)
  if (!playerPartners || playerPartners.size === 0) return null

  const bestPartner = Array.from(playerPartners.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))

  return {
    name: bestPartner[0],
    count: bestPartner[1],
  }
}

// 确保导出这些函数
export { generateAnnualReport, getPlayerPreferredMonth, getPlayerPreferredTimeSlot }
