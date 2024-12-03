/**
 * 获取格式化的中文日期信息
 * @returns {{date: string, weekday: string}} 包含日期和星期的对象
 */
export function getChineseDateInfo() {
    const today = new Date()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    
    return {
      date: today.toLocaleDateString('zh-CN'),
      weekday: weekdays[today.getDay()],
    }
  }