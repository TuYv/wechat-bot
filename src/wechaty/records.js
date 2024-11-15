import fs from 'fs/promises'
import path from 'path'

const RECORDS_FILE = path.join(process.cwd(), 'records.json')
let records = {}
let lastId = 0

// 在适当的位置加载记录
await loadRecords()

// 加载记录
export async function loadRecords() {
  try {
    const data = await fs.readFile(RECORDS_FILE, 'utf8')
    const parsed = JSON.parse(data)
    records = parsed.records || {}
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('读取记录文件时出错:', error)
    }
    records = {}
  }
}

// 保存记录
export async function saveRecords() {
  try {
    await fs.writeFile(RECORDS_FILE, JSON.stringify({ records }, null, 2), 'utf8')
  } catch (error) {
    console.error('保存记录文件时出错:', error)
  }
}

// 生成新的ID
export function generateNewId(roomName) {
  if (!records[roomName]) {
    records[roomName] = { lastId: 0, data: {} }
  }
  records[roomName].lastId++ // 更新 lastId
  return records[roomName].lastId // 返回新的 ID
}

// 添加记录
export function addRecord(name, content, participants, roomName) {
  const id = generateNewId(roomName)
  if (!records[roomName]) {
    records[roomName] = {}
  }
  records[roomName].data[id] = { name, content, participants, deleted: false } // 添加 deleted 属性
  return id
}

// 更新记录
export function updateRecord(id, participants, roomName) {
  if (records[roomName] && records[roomName].data[id]) {
    // 恢复记录
    records[roomName].data[id].deleted = false // 标记为未删除
    records[roomName].data[id].participants = Array.from(new Set([...participants])) // 去重
  }
}

// 查找记录
export function findRecord(name, content, roomName) {
  if (records[roomName]) {
    return Object.keys(records[roomName].data).find(
      (id) => records[roomName].data[id].name === name && records[roomName].data[id].content.trim() === content.trim(),
    )
  }
  return false
}

// 删除记录（标记为删除）
export function removeRecord(id, roomName) {
  if (records[roomName] && records[roomName].data[id]) {
    records[roomName].data[id].deleted = true // 标记为删除
  }
}

// 查询未删除的记录
export function getActiveRecords(roomName) {
  return Object.entries(records[roomName]?.data || {})
    .filter(([id, record]) => !record.deleted) // 过滤掉已删除的记录
    .map(([id, record]) => ({ id, ...record })) // 返回记录
}

// 处理接龙逻辑
export async function handleSolitaire(content, roomName) {
  // 检查消息内容是否包含引用消息的模式
  const ignorePattern = /- - - - - - - - - - - - - - -/ // 匹配包含多个 - 的行
  if (ignorePattern.test(content)) {
    return // 如果匹配，则不做处理
  }

  const cleanedContent = content
    .replace(/#接龙/g, '')
    .replace(/#Group Note/g, '')
    .trim()
  const lines = cleanedContent.split('\n')
  const participants = []
  let updatedContent = ''

  // 第一行作为内容
  updatedContent += lines[0].trim() + '\n'

  // 从第二行开始判断参与者
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^\d+\.\s?/.test(line)) {
      // 识别参与者行
      participants.push(line.split('. ')[1] || line.split('.')[1] || line.split(' ')[1])
    } else {
      // 如果不是参与者行，继续添加到内容中
      updatedContent += line.trim() + '\n'
    }
  }

  // 如果有参与者，去掉最后的换行符
  updatedContent = updatedContent.trim()
  const name = participants[0] // 参与人中的第一个

  // 检查是否需要更新记录
  const existingRecordId = findRecord(name, updatedContent, roomName)

  if (existingRecordId) {
    updateRecord(existingRecordId, participants, roomName)
  } else {
    // 生成新的ID并记录
    addRecord(name, updatedContent, participants, roomName)
  }
  // 保存记录
  await saveRecords()
}

// 处理命令逻辑
export async function handleCommand(command, args, alias, roomName) {
  switch (command.toLowerCase()) {
    case '/add':
    case '/a':
      if (args.length > 0) {
        const id = addRecord(alias, args.join(' '), [alias], roomName)
        await saveRecords()
        return `记录已添加，编号：${id}`
      } else {
        return '请提供要记录的内容'
      }
    case '/query':
    case '/q':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[roomName] && records[roomName].data[id] && !records[roomName].data[id].deleted) {
          const record = records[roomName].data[id]
          const participants = record.participants
            .map((participant, index) => `${index + 1}. ${participant}`) // 为参与者添加编号
            .join('\n') // 用换行符连接参与者
          return `#接龙\n${record.content}\n${participants}`
        } else {
          return `未找到编号为 ${args[0]} 的记录`
        }
      } else {
        const recordList = Object.entries(records[roomName]?.data || {})
          .filter(([id, record]) => !record.deleted) // 过滤掉已删除的记录
          .map(([id, record]) => `No:${id} ${record.content},\n已报名:${record.participants.length}人 发起人:${record.name}.`)
          .join('\n------------------------\n')
        return recordList || '暂无记录'
      }
    case '/delete':
    case '/d':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[roomName] && records[roomName].data[id] && !records[roomName].data[id].deleted) {
          removeRecord(id, roomName) // 标记为删除
          await saveRecords() // 保存记录
          return `编号 ${id} 的记录已删除`
        } else {
          return `未找到编号为 ${args[0]} 的记录`
        }
      } else {
        return '请提供要删除的记录编号'
      }
    case '/join':
    case '/j':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[roomName] && records[roomName].data[id] && !records[roomName].data[id].deleted) {
          if (!records[roomName].data[id].participants) {
            records[roomName].data[id].participants = [] // 初始化 participants
          }
          if (!records[roomName].data[id].participants.includes(alias)) {
            records[roomName].data[id].participants.push(alias)
            await saveRecords() // 保存记录
            return `${alias} 已加入编号 ${id} 的记录`
          } else {
            return `${alias} 已经在编号 ${id} 的记录中`
          }
        } else {
          return `未找到编号为 ${args[0]} 的记录`
        }
      } else {
        return '请提供要加入的记录编号'
      }
    case '/r':
    case '/recover':
      if (args.length > 0) {
        const id = parseInt(args[0], 10)
        if (records[roomName] && records[roomName].data[id]) {
          const record = records[roomName].data[id]
          if (record.deleted) {
            record.deleted = false // 恢复记录
            await saveRecords() // 保存记录
            return `记录编号 ${id} 已恢复。`
          } else {
            return `记录编号 ${id} 未被删除。`
          }
        } else {
          return `未找到编号为 ${args[0]} 的记录`
        }
      } else {
        return '请提供要恢复的记录编号。'
      }
    default:
      return '未知命令'
  }
}
