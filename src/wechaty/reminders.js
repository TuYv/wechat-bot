import fs from 'fs/promises'
import path from 'path'

const REMINDER_FILE = path.join(process.cwd(), 'reminders.json')
let reminders = []

// 加载提醒记录
export async function loadReminders() {
  try {
    const data = await fs.readFile(REMINDER_FILE, 'utf8')
    reminders = JSON.parse(data) || []
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('读取提醒文件时出错:', error)
    }
    reminders = []
  }
}

// 保存提醒记录
export async function saveReminders() {
  try {
    await fs.writeFile(REMINDER_FILE, JSON.stringify(reminders, null, 2), 'utf8')
  } catch (error) {
    console.error('保存提醒文件时出错:', error)
  }
}

// 添加提醒
export function addReminder(alias) {
  if (!reminders.includes(alias)) {
    reminders.push(alias)
  }
}
// 删除提醒
export function removeReminder(alias) {
  reminders = reminders.filter((reminder) => reminder !== alias)
}
