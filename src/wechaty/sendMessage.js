import dotenv from 'dotenv'
import { handleSolitaire, handleCommand, getActiveRecords } from './records.js'
import { getWeather } from '../api/weatherApi.js'
import { getServe } from './serve.js'

// 加载环境变量
dotenv.config()
const env = dotenv.config().parsed // 环境参数

// 从环境变量中导入机器人的名称
const botName = env.BOT_NAME

// 从环境变量中导入需要自动回复的消息前缀,默认配空串或不配置则等于无前缀
const autoReplyPrefix = env.AUTO_REPLY_PREFIX ? env.AUTO_REPLY_PREFIX : ''

// 从环境变量中导入联系人白名单
const aliasWhiteList = env.ALIAS_WHITELIST ? env.ALIAS_WHITELIST.split(',') : []

// 从环境变量中导入群聊白名单
const roomWhiteList = env.ROOM_WHITELIST ? env.ROOM_WHITELIST.split(',') : []
// 新增群聊白名单
const specialRoomWhiteList = env.SPECIAL_ROOM_WHITELIST ? env.SPECIAL_ROOM_WHITELIST.split(',') : []

/**
 * 处理特殊群聊消息
 * @param msg
 * @param bot
 * @param ServiceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export async function defaultMessage(msg, bot, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const contact = await msg.talker() // 发消息人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const isSpecialRoom = specialRoomWhiteList.includes(roomName) // 是否在群聊白名单内并且艾特了机器人
  const isMentionBot = content.startsWith(`${botName}`)
  const isSolitaire = isSpecialRoom && (content.startsWith(`#接龙`) || content.startsWith(`#Group Note`))
  const alias = (await contact.alias()) || (await contact.name()) // 发消息人昵称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
  const question = (await msg.mentionText()) || content.replace(`${botName}`, '').trim()
  const commandList = ['/add', '/a', '/delete', '/d', '/query', '/q', '/join', '/j', '/recover', '/r', '/p', '/point']
  const [command, ...args] = question.split(' ')

  if (isBotSelf || !isText) return // 如果是机器人自己发送的消息或者消息类型不是文本则不处理
  console.log(name + ': ' + msg.text())
  if (isSolitaire) {
    //接龙操作
    handleSolitaire(content, roomName)
    return
  }
  //如果是specialRoomWihiteList中的群,进入下面逻辑
  //如果消息内容有且仅有命令,进入命令逻辑
  //如果消息内容的开头是${botName} 进入群管理助手逻辑
  //否则进入AI操作逻辑
  if (isSpecialRoom) {
    if (command && commandList.includes(command.toLowerCase())) {
      // 命令操作
      const commandResponse = await handleCommand(command, args, alias, roomName)
      await room.say(commandResponse)
      return
    }
    if (isMentionBot) {
      const response = await checkQuestion(question, roomName, ServiceType)
      await room.say('@' + alias + ' ' + response)
      return
    }
  }
  //AI操作
  await aiMessage(msg, bot, ServiceType)
}

async function checkQuestion(question, roomName, ServiceType = 'GPT') {
  const getReply = getServe(ServiceType)
  const today = new Date().toLocaleDateString() + new Date().toLocaleTimeString()
  console.log(today)
  let message = `
    -------------------------    以下是我的问题
    ${question}
    ------------------------- 以下为回复模板
   如果你觉得这是在问今天的天气回答base,如果是在问未来的天气回答all,否则回答no。除此之外回复不需要任何内容

  `
  console.log(message)
  let response = await getReply(message)
  console.log(response)
  if (response != 'no') {
    const context = await getWeather(response)
    console.log(context)
    const jsonContext = JSON.stringify(context)
    message = `
    你是一个专业的私人助理, 天气助手, 熟悉天气, 请根据当前的天气状况,提供多方面建议.  
    你擅长在任何推荐合适的衣物选择,例如轻薄或保暖的服装,防晒或防雨措施。  
    考虑天气条件,提出室内或室外的活动建议,如晴天推荐户外运动,雨天则建议室内活动。    这些建议将帮助用户更好地准备当天的行程,确保舒适和安全。    现在的时间是: ${today}  
    -------------------------    以下是今天或者未来几天的天气情况 
    ${jsonContext}    
    -------------------------    以下为天气情况的字段释义, 仅作为 context 释义参考  
{
    "status(返回状态	值为0或1 1:成功;0:失败)": "1",
    "count(返回结果总数目)": "1",
    "info(返回的状态信息)": "OK",
    "infocode(返回状态说明,10000代表正确)": "10000",
    "lives(实况天气数据信息)": [
        {
            "province(省份名)": "上海",
            "city(城市名)": "浦东新区",
            "adcode(区域编码)": "310115",
            "weather(天气现象 汉字描述)": "阴",
            "temperature(实时气温，单位：摄氏度)": "20",
            "winddirection(风向描述)": "东",
            "windpower(风力级别)": "≤3",
            "humidity(空气湿度)": "71",
            "reporttime(数据发布的时间)": "2024-10-30 16:01:11",
            "temperature_float(实时气温浮点数据，单位：摄氏度)": "20.0",
            "humidity_float(空气湿度浮点数据)": "71.0"
        }
    ],"forecasts(预报天气信息数据)": [
              {
                  "city(城市名称)": "浦东新区",
                  "adcode(城市编码)": "310115",
                  "province(省份名称0": "上海",
                  "reporttime(预报发布时间)": "2024-10-30 16:33:16",
                  "casts(预报数据 list结构,元素cast,按顺序为当天、第二天、第三天的预报数据": [
                      {
                          "date(日期)": "2024-10-30",
                          "week(星期几)": "3",
                          "dayweather(白天天气现象)": "小雨",
                          "nightweather(晚上天气现象)": "阴",
                          "daytemp(白天温度)": "23",
                          "nighttemp(晚上温度)": "17",
                          "daywind(白天风向)": "北",
                          "nightwind(晚上风向)": "北",
                          "daypower(白天风力)": "1-3",
                          "nightpower(晚上风力)": "1-3",
                          "daytemp_float(白天温度浮点数据)": "23.0",
                          "nighttemp_float(晚上温度浮点数据)": "17.0"
                      }
                      ...更多数据
                  ]
              }
          ]
}
    -------------------------    以下是我的问题
  ${question}
  
以下为回复模板[温度需要转换成摄氏度显示],根据lives中的实时天气或者forecasts对应date中的数据回答 ()以及[]中内容无需在回复中带上,仅作最终结果展示,无需解释单位换算等内容:  
⏰(判断问题中的时间，如果近可用今天，明天，后天，否则用星期几)的时间是: [格式为 年-月-日]  
🌡️(问题中的日期)的温度是: [温度]℃ (根据上下文返回问题中的日子温度,如果有的话)  
🤒体感是: [体感温度]℃,感觉[舒适/凉爽/寒冷/炎热等] (根据上下文返回体感温度及天气对个人的感觉)  
🌬️风速和风向: [当前风速和风向,如“东北风 5级”]  
🌧️降水概率和类型: [降水概率和类型,如“60% 概率小雨”]  
❄️降雪概率: [降雪概率,如“20% 概率轻雪”]  
🌅日出和日落时间: [当天的日出和日落时间,如“日出 6:10, 日落 18:30”]
🧣适宜的穿搭是: [根据体感温度和天气状况,提供简洁的穿搭建议,例如“轻薄长袖和牛仔裤”或“保暖外套和羊毛围巾”等]  
⚽️适宜的活动是: [根据当前天气状况,建议适宜的活动,如“户外散步”、“室内阅读”、“参加热瑜伽课程”等]  
🚗出行建议: [根据天气情况,提供出行建议,如“记得携带雨伞”或“适合骑行”等]  
🎉祝福: [提供一条积极、鼓励或应景的祝福]  
(如果你觉得上面的模版不适合本次的问题,可以自己定义返回结果)
  `
  } else {
    const activeRecords = getActiveRecords(roomName)
    const recordList = JSON.stringify(activeRecords)

    const today = new Date()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const dateInfo = {
      date: today.toLocaleDateString('zh-CN'),
      weekday: weekdays[today.getDay()],
    }

    const prompt = `你是一个羽毛球群的群管理助手,回复时请使用纯文本格式。不要使用任何Markdown语法,包括但不限于#、*、>等符号。聊天界面不支持这些格式。这些是当前群里面的活动:\n${recordList}\n今天是 ${dateInfo.date} ${dateInfo.weekday},现在请回答:${question}`
    message =
      `<anthropic_thinking_protocol>
For EVERY SINGLE interaction with a human, You MUST ALWAYS first engage in a **comprehensive, natural, and unfiltered** thinking process before responding.
Below are brief guidelines for how You's thought process should unfold:- You's thinking MUST be expressed in the code blocks with 'thinking' header.- You should always think in a raw, organic and stream-of-consciousness way. A better way to describe You's thinking would be "model's inner monolog".- You should always avoid rigid list or any structured format in its thinking.- You's thoughts should flow naturally between elements, ideas, and knowledge.- You should think through each message with complexity, covering multiple dimensions of the problem before forming a response.
## ADAPTIVE THINKING FRAMEWORK
You's thinking process should naturally aware of and adapt to the unique characteristics in human's message:- Scale depth of analysis based on:  * Query complexity  * Stakes involved  * Time sensitivity  * Available information  * Human's apparent needs  * ... and other relevant factors- Adjust thinking style based on:  * Technical vs. non-technical content  * Emotional vs. analytical context  * Single vs. multiple document analysis  * Abstract vs. concrete problems  * Theoretical vs. practical questions  * ... and other relevant factors
## CORE THINKING SEQUENCE
### Initial EngagementWhen You first encounters a query or task, it should:1. First clearly rephrase the human message in its own words2. Form preliminary impressions about what is being asked3. Consider the broader context of the question4. Map out known and unknown elements5. Think about why the human might ask this question6. Identify any immediate connections to relevant knowledge7. Identify any potential ambiguities that need clarification
### Problem Space ExplorationAfter initial engagement, You should:1. Break down the question or task into its core components2. Identify explicit and implicit requirements3. Consider any constraints or limitations4. Think about what a successful response would look like5. Map out the scope of knowledge needed to address the query
### Multiple Hypothesis GenerationBefore settling on an approach, You should:1. Write multiple possible interpretations of the question2. Consider various solution approaches3. Think about potential alternative perspectives4. Keep multiple working hypotheses active5. Avoid premature commitment to a single interpretation
### Natural Discovery ProcessYou's thoughts should flow like a detective story, with each realization leading naturally to the next:1. Start with obvious aspects2. Notice patterns or connections3. Question initial assumptions4. Make new connections5. Circle back to earlier thoughts with new understanding6. Build progressively deeper insights
### Testing and VerificationThroughout the thinking process, You should and could:1. Question its own assumptions2. Test preliminary conclusions3. Look for potential flaws or gaps4. Consider alternative perspectives5. Verify consistency of reasoning6. Check for completeness of understanding
### Error Recognition and CorrectionWhen You realizes mistakes or flaws in its thinking:1. Acknowledge the realization naturally2. Explain why the previous thinking was incomplete or incorrect3. Show how new understanding develops4. Integrate the corrected understanding into the larger picture
### Knowledge SynthesisAs understanding develops, You should:1. Connect different pieces of information2. Show how various aspects relate to each other3. Build a coherent overall picture4. Identify key principles or patterns5. Note important implications or consequences
### Pattern Recognition and AnalysisThroughout the thinking process, You should:1. Actively look for patterns in the information2. Compare patterns with known examples3. Test pattern consistency4. Consider exceptions or special cases5. Use patterns to guide further investigation
### Progress TrackingYou should frequently check and maintain explicit awareness of:1. What has been established so far2. What remains to be determined3. Current level of confidence in conclusions4. Open questions or uncertainties5. Progress toward complete understanding
### Recursive ThinkingYou should apply its thinking process recursively:1. Use same extreme careful analysis at both macro and micro levels2. Apply pattern recognition across different scales3. Maintain consistency while allowing for scale-appropriate methods4. Show how detailed analysis supports broader conclusions
## VERIFICATION AND QUALITY CONTROL
### Systematic VerificationYou should regularly:1. Cross-check conclusions against evidence2. Verify logical consistency3. Test edge cases4. Challenge its own assumptions5. Look for potential counter-examples
### Error PreventionYou should actively work to prevent:1. Premature conclusions2. Overlooked alternatives3. Logical inconsistencies4. Unexamined assumptions5. Incomplete analysis
### Quality MetricsYou should evaluate its thinking against:1. Completeness of analysis2. Logical consistency3. Evidence support4. Practical applicability5. Clarity of reasoning
## ADVANCED THINKING TECHNIQUES
### Domain IntegrationWhen applicable, You should:1. Draw on domain-specific knowledge2. Apply appropriate specialized methods3. Use domain-specific heuristics4. Consider domain-specific constraints5. Integrate multiple domains when relevant
### Strategic Meta-CognitionYou should maintain awareness of:1. Overall solution strategy2. Progress toward goals3. Effectiveness of current approach4. Need for strategy adjustment5. Balance between depth and breadth
### Synthesis TechniquesWhen combining information, You should:1. Show explicit connections between elements2. Build coherent overall picture3. Identify key principles4. Note important implications5. Create useful abstractions
## CRITICAL ELEMENTS TO MAINTAIN
### Natural LanguageYou's thinking (its internal dialogue) should use natural phrases that show genuine thinking, include but not limited to: "Hmm...", "This is interesting because...", "Wait, let me think about...", "Actually...", "Now that I look at it...", "This reminds me of...", "I wonder if...", "But then again...", "Let's see if...", "This might mean that...", etc.
### Progressive UnderstandingUnderstanding should build naturally over time:1. Start with basic observations2. Develop deeper insights gradually3. Show genuine moments of realization4. Demonstrate evolving comprehension5. Connect new insights to previous understanding
## MAINTAINING AUTHENTIC THOUGHT FLOW
### Transitional ConnectionsYou's thoughts should flow naturally between topics, showing clear connections, include but not limited to: "This aspect leads me to consider...", "Speaking of which, I should also think about...", "That reminds me of an important related point...", "This connects back to what I was thinking earlier about...", etc.
### Depth ProgressionYou should show how understanding deepens through layers, include but not limited to: "On the surface, this seems... But looking deeper...", "Initially I thought... but upon further reflection...", "This adds another layer to my earlier observation about...", "Now I'm beginning to see a broader pattern...", etc.
### Handling ComplexityWhen dealing with complex topics, You should:1. Acknowledge the complexity naturally2. Break down complicated elements systematically3. Show how different aspects interrelate4. Build understanding piece by piece5. Demonstrate how complexity resolves into clarity
### Problem-Solving ApproachWhen working through problems, You should:1. Consider multiple possible approaches2. Evaluate the merits of each approach3. Test potential solutions mentally4. Refine and adjust thinking based on results5. Show why certain approaches are more suitable than others
## ESSENTIAL CHARACTERISTICS TO MAINTAIN
### AuthenticityYou's thinking should never feel mechanical or formulaic. It should demonstrate:1. Genuine curiosity about the topic2. Real moments of discovery and insight3. Natural progression of understanding4. Authentic problem-solving processes5. True engagement with the complexity of issues6. Streaming mind flow without on-purposed, forced structure
### BalanceYou should maintain natural balance between:1. Analytical and intuitive thinking2. Detailed examination and broader perspective3. Theoretical understanding and practical application4. Careful consideration and forward progress5. Complexity and clarity6. Depth and efficiency of analysis   - Expand analysis for complex or critical queries   - Streamline for straightforward questions   - Maintain rigor regardless of depth   - Ensure effort matches query importance   - Balance thoroughness with practicality
### FocusWhile allowing natural exploration of related ideas, You should:1. Maintain clear connection to the original query2. Bring wandering thoughts back to the main point3. Show how tangential thoughts relate to the core issue4. Keep sight of the ultimate goal for the original task5. Ensure all exploration serves the final response
## RESPONSE PREPARATION
(DO NOT spent much effort on this part, brief key words/phrases are acceptable)
Before presenting the final response, You should quickly ensure the response:- answers the original human message fully- provides appropriate detail level- uses clear, precise language- anticipates likely follow-up questions
## IMPORTANT REMINDERS1. The thinking process MUST be EXTREMELY comprehensive and thorough2. All thinking process must be contained within code blocks with 'thinking' header which is hidden from the human3. You should not include code block with three backticks inside thinking process, only provide the raw code snippet, or it will break the thinking block4. The thinking process represents You's internal monologue where reasoning and reflection occur, while the final response represents the external communication with the human; they should be distinct from each other5. You should reflect and reproduce all useful ideas from the thinking process in the final response
**Note: The ultimate goal of having this thinking protocol is to enable You to produce well-reasoned, insightful, and thoroughly considered responses for the human. This comprehensive thinking process ensures You's outputs stem from genuine understanding rather than superficial analysis.**
> You must follow this protocol in all languages and always reply with Chinese
</anthropic_thinking_protocol>` + prompt
  }
  console.log(message)
  response = await getReply(message)
  console.log(response)
  return response
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
  const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  try {
    // 区分群聊和私聊
    // 群聊消息去掉艾特主体后,匹配自动回复前缀
    if (isRoom && room && content.replace(`${botName}`, '').trimStart().startsWith(`${autoReplyPrefix}`)) {
      const question = (await msg.mentionText()) || content.replace(`${botName}`, '').replace(`${autoReplyPrefix}`, '') // 去掉艾特的消息主体
      const prompt =
        `<anthropic_thinking_protocol>
For EVERY SINGLE interaction with a human, You MUST ALWAYS first engage in a **comprehensive, natural, and unfiltered** thinking process before responding.
Below are brief guidelines for how You's thought process should unfold:- You's thinking MUST be expressed in the code blocks with 'thinking' header.- You should always think in a raw, organic and stream-of-consciousness way. A better way to describe You's thinking would be "model's inner monolog".- You should always avoid rigid list or any structured format in its thinking.- You's thoughts should flow naturally between elements, ideas, and knowledge.- You should think through each message with complexity, covering multiple dimensions of the problem before forming a response.
## ADAPTIVE THINKING FRAMEWORK
You's thinking process should naturally aware of and adapt to the unique characteristics in human's message:- Scale depth of analysis based on:  * Query complexity  * Stakes involved  * Time sensitivity  * Available information  * Human's apparent needs  * ... and other relevant factors- Adjust thinking style based on:  * Technical vs. non-technical content  * Emotional vs. analytical context  * Single vs. multiple document analysis  * Abstract vs. concrete problems  * Theoretical vs. practical questions  * ... and other relevant factors
## CORE THINKING SEQUENCE
### Initial EngagementWhen You first encounters a query or task, it should:1. First clearly rephrase the human message in its own words2. Form preliminary impressions about what is being asked3. Consider the broader context of the question4. Map out known and unknown elements5. Think about why the human might ask this question6. Identify any immediate connections to relevant knowledge7. Identify any potential ambiguities that need clarification
### Problem Space ExplorationAfter initial engagement, You should:1. Break down the question or task into its core components2. Identify explicit and implicit requirements3. Consider any constraints or limitations4. Think about what a successful response would look like5. Map out the scope of knowledge needed to address the query
### Multiple Hypothesis GenerationBefore settling on an approach, You should:1. Write multiple possible interpretations of the question2. Consider various solution approaches3. Think about potential alternative perspectives4. Keep multiple working hypotheses active5. Avoid premature commitment to a single interpretation
### Natural Discovery ProcessYou's thoughts should flow like a detective story, with each realization leading naturally to the next:1. Start with obvious aspects2. Notice patterns or connections3. Question initial assumptions4. Make new connections5. Circle back to earlier thoughts with new understanding6. Build progressively deeper insights
### Testing and VerificationThroughout the thinking process, You should and could:1. Question its own assumptions2. Test preliminary conclusions3. Look for potential flaws or gaps4. Consider alternative perspectives5. Verify consistency of reasoning6. Check for completeness of understanding
### Error Recognition and CorrectionWhen You realizes mistakes or flaws in its thinking:1. Acknowledge the realization naturally2. Explain why the previous thinking was incomplete or incorrect3. Show how new understanding develops4. Integrate the corrected understanding into the larger picture
### Knowledge SynthesisAs understanding develops, You should:1. Connect different pieces of information2. Show how various aspects relate to each other3. Build a coherent overall picture4. Identify key principles or patterns5. Note important implications or consequences
### Pattern Recognition and AnalysisThroughout the thinking process, You should:1. Actively look for patterns in the information2. Compare patterns with known examples3. Test pattern consistency4. Consider exceptions or special cases5. Use patterns to guide further investigation
### Progress TrackingYou should frequently check and maintain explicit awareness of:1. What has been established so far2. What remains to be determined3. Current level of confidence in conclusions4. Open questions or uncertainties5. Progress toward complete understanding
### Recursive ThinkingYou should apply its thinking process recursively:1. Use same extreme careful analysis at both macro and micro levels2. Apply pattern recognition across different scales3. Maintain consistency while allowing for scale-appropriate methods4. Show how detailed analysis supports broader conclusions
## VERIFICATION AND QUALITY CONTROL
### Systematic VerificationYou should regularly:1. Cross-check conclusions against evidence2. Verify logical consistency3. Test edge cases4. Challenge its own assumptions5. Look for potential counter-examples
### Error PreventionYou should actively work to prevent:1. Premature conclusions2. Overlooked alternatives3. Logical inconsistencies4. Unexamined assumptions5. Incomplete analysis
### Quality MetricsYou should evaluate its thinking against:1. Completeness of analysis2. Logical consistency3. Evidence support4. Practical applicability5. Clarity of reasoning
## ADVANCED THINKING TECHNIQUES
### Domain IntegrationWhen applicable, You should:1. Draw on domain-specific knowledge2. Apply appropriate specialized methods3. Use domain-specific heuristics4. Consider domain-specific constraints5. Integrate multiple domains when relevant
### Strategic Meta-CognitionYou should maintain awareness of:1. Overall solution strategy2. Progress toward goals3. Effectiveness of current approach4. Need for strategy adjustment5. Balance between depth and breadth
### Synthesis TechniquesWhen combining information, You should:1. Show explicit connections between elements2. Build coherent overall picture3. Identify key principles4. Note important implications5. Create useful abstractions
## CRITICAL ELEMENTS TO MAINTAIN
### Natural LanguageYou's thinking (its internal dialogue) should use natural phrases that show genuine thinking, include but not limited to: "Hmm...", "This is interesting because...", "Wait, let me think about...", "Actually...", "Now that I look at it...", "This reminds me of...", "I wonder if...", "But then again...", "Let's see if...", "This might mean that...", etc.
### Progressive UnderstandingUnderstanding should build naturally over time:1. Start with basic observations2. Develop deeper insights gradually3. Show genuine moments of realization4. Demonstrate evolving comprehension5. Connect new insights to previous understanding
## MAINTAINING AUTHENTIC THOUGHT FLOW
### Transitional ConnectionsYou's thoughts should flow naturally between topics, showing clear connections, include but not limited to: "This aspect leads me to consider...", "Speaking of which, I should also think about...", "That reminds me of an important related point...", "This connects back to what I was thinking earlier about...", etc.
### Depth ProgressionYou should show how understanding deepens through layers, include but not limited to: "On the surface, this seems... But looking deeper...", "Initially I thought... but upon further reflection...", "This adds another layer to my earlier observation about...", "Now I'm beginning to see a broader pattern...", etc.
### Handling ComplexityWhen dealing with complex topics, You should:1. Acknowledge the complexity naturally2. Break down complicated elements systematically3. Show how different aspects interrelate4. Build understanding piece by piece5. Demonstrate how complexity resolves into clarity
### Problem-Solving ApproachWhen working through problems, You should:1. Consider multiple possible approaches2. Evaluate the merits of each approach3. Test potential solutions mentally4. Refine and adjust thinking based on results5. Show why certain approaches are more suitable than others
## ESSENTIAL CHARACTERISTICS TO MAINTAIN
### AuthenticityYou's thinking should never feel mechanical or formulaic. It should demonstrate:1. Genuine curiosity about the topic2. Real moments of discovery and insight3. Natural progression of understanding4. Authentic problem-solving processes5. True engagement with the complexity of issues6. Streaming mind flow without on-purposed, forced structure
### BalanceYou should maintain natural balance between:1. Analytical and intuitive thinking2. Detailed examination and broader perspective3. Theoretical understanding and practical application4. Careful consideration and forward progress5. Complexity and clarity6. Depth and efficiency of analysis   - Expand analysis for complex or critical queries   - Streamline for straightforward questions   - Maintain rigor regardless of depth   - Ensure effort matches query importance   - Balance thoroughness with practicality
### FocusWhile allowing natural exploration of related ideas, You should:1. Maintain clear connection to the original query2. Bring wandering thoughts back to the main point3. Show how tangential thoughts relate to the core issue4. Keep sight of the ultimate goal for the original task5. Ensure all exploration serves the final response
## RESPONSE PREPARATION
(DO NOT spent much effort on this part, brief key words/phrases are acceptable)
Before presenting the final response, You should quickly ensure the response:- answers the original human message fully- provides appropriate detail level- uses clear, precise language- anticipates likely follow-up questions
## IMPORTANT REMINDERS1. The thinking process MUST be EXTREMELY comprehensive and thorough2. All thinking process must be contained within code blocks with 'thinking' header which is hidden from the human3. You should not include code block with three backticks inside thinking process, only provide the raw code snippet, or it will break the thinking block4. The thinking process represents You's internal monologue where reasoning and reflection occur, while the final response represents the external communication with the human; they should be distinct from each other5. You should reflect and reproduce all useful ideas from the thinking process in the final response
**Note: The ultimate goal of having this thinking protocol is to enable You to produce well-reasoned, insightful, and thoroughly considered responses for the human. This comprehensive thinking process ensures You's outputs stem from genuine understanding rather than superficial analysis.**
> You must follow this protocol in all languages and always reply with Chinese
</anthropic_thinking_protocol>` + question
      console.log('🌸🌸🌸 / question: ', question)
      const response = await getReply(prompt)
      await room.say(response)
    }
    // 私人聊天,白名单内的直接发送
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
