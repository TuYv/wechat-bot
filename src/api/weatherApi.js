import axios from 'axios'

// 封装获取天气信息的函数
export async function getOpenWeather(lat, lon) {
  const API_KEY = '1852d92bc34b88be3e21e5c425353a46'
  const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        lat,
        lon,
        appid: API_KEY,
        lang: 'zh_cn',
      },
    })
    return response.data // 返回天气信息
  } catch (error) {
    console.error('获取天气信息失败:', error)
    throw new Error('获取天气信息失败')
  }
}
// 封装获取天气信息的函数
export async function getXinWeather(lat, lon) {
  const API_KEY = 'SoCQoVzehv8rZKmZj'
  const BASE_URL = 'https://api.seniverse.com/v3/weather/now.json'

  try {
    const loc = lat + ':' + lon
    const response = await axios.get(BASE_URL, {
      params: {
        unit: 'c',
        language: 'zh-Hans',
        key: API_KEY,
        location: loc,
      },
    })
    return response.data // 返回天气信息
  } catch (error) {
    console.error('获取天气信息失败:', error)
    throw new Error('获取天气信息失败')
  }
}
// 封装获取天气信息的函数
export async function getWeather(extensions) {
  const API_KEY = 'd1b7a95805e5b8078566887b6437768f'
  const BASE_URL = 'https://restapi.amap.com/v3/weather/weatherInfo'

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        key: API_KEY,
        city: 310115,
        extensions,
      },
    })
    return response.data // 返回天气信息
  } catch (error) {
    console.error('获取天气信息失败:', error)
    throw new Error('获取天气信息失败')
  }
}
