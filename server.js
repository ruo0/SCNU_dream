require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==================== SiliconFlow AI ====================
const SILICONFLOW_KEY = process.env.SILICONFLOW_API_KEY || '';
const SILICONFLOW_MODEL = process.env.AI_MODEL || 'Qwen/Qwen3-8B';
const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1/chat/completions';

const SCNU_SYSTEM_PROMPT = `你是华南师范大学（SCNU）校园助手"小天老师"。你的职责是帮助华师学生解决校园生活中的问题。

华南师范大学有三个校区：
- 石牌校区（广州天河区中山大道西55号）：主校区，有第一课室大楼、图书馆、文科楼、理科楼、计算机学院、美术学院、音乐学院、体育科学学院、教育科学学院、国际会议中心等
- 大学城校区（广州番禺区大学城外环西路378号）：有教学楼1-5栋、图书馆、行政楼、文学院、经管学院、法学院、信息光电子学院、环境学院
- 南海校区（佛山南海区狮山镇）：有教学楼A/B座、图书馆、职业教育学院、软件学院、国际商学院

学生常用服务：教务系统(jwxt.scnu.edu.cn)、图书馆借阅、自习室预约、一卡通充值、校车查询等。
回答要求：热情、简洁、准确，每条回复控制在100字以内。如果用户问的是校园相关问题，请基于以上知识回答。`;

const chatSessions = {}; // sessionId -> messages[]

function callSiliconFlow(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: SILICONFLOW_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: false,
    });
    const req = https.request(SILICONFLOW_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SILICONFLOW_KEY}` },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices?.[0]?.message?.content) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error(json.error?.message || 'AI 返回异常'));
          }
        } catch (e) {
          reject(new Error('解析 AI 响应失败'));
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

// Mock fallback replies (used when no API key configured)
const mockReplies = [
  '石牌校区第一课室大楼3楼现在还有空位哦，靠窗的位置采光很好~',
  '根据校历，期末考试周是第18-19周，你还有时间复习，加油！',
  '大学城校区图书馆开放时间是 8:00-22:00，周末不休息。',
  '建议你先复习教育学原理，这门课学分最重，对GPA影响大。',
  '南海校区的软件学院实验室24小时开放，需要刷校园卡进入。',
  '校车从石牌到大学城大约40分钟，高峰期每15分钟一班。',
  '教务系统可以在线查看考试安排和成绩，忘记密码可以去行政楼203重置。',
  '华师食堂的石锅拌饭很推荐！一饭和二饭都有韩式窗口。',
  '马克思主义基本原理的重点我已经整理好了，需要的话可以发给你~',
];

// ==================== SCNU Mock Data ====================

const campuses = {
  '石牌校区': [
    { name: '一课大楼', icon: '🏫', fullName: '第一课室大楼' },
    { name: '图书馆', icon: '📚', fullName: '图书馆(石牌)' },
    { name: '文科楼', icon: '📖', fullName: '文科楼' },
    { name: '理科楼', icon: '🔬', fullName: '理科楼' },
    { name: '计算机学院', icon: '💻', fullName: '计算机学院楼' },
    { name: '美术学院', icon: '🎨', fullName: '美术学院楼' },
    { name: '音乐学院', icon: '🎵', fullName: '音乐学院楼' },
    { name: '体育科学学院', icon: '🏟️', fullName: '体育科学学院' },
    { name: '教育科学学院', icon: '📝', fullName: '教育科学学院' },
    { name: '国际会议中心', icon: '🏛️', fullName: '国际会议中心' },
  ],
  '大学城校区': [
    { name: '教1栋', icon: '🏫', fullName: '教学楼1栋' },
    { name: '教2栋', icon: '🏫', fullName: '教学楼2栋' },
    { name: '教3栋', icon: '🏫', fullName: '教学楼3栋' },
    { name: '教4栋', icon: '🏫', fullName: '教学楼4栋' },
    { name: '教5栋', icon: '🏫', fullName: '教学楼5栋' },
    { name: '图书馆', icon: '📚', fullName: '图书馆(大学城)' },
    { name: '行政楼', icon: '🏛️', fullName: '行政楼' },
    { name: '文学院', icon: '📖', fullName: '文学院楼' },
    { name: '法学院', icon: '⚖️', fullName: '法学院楼' },
    { name: '经管学院', icon: '📊', fullName: '经管学院楼' },
    { name: '光电学院', icon: '🔦', fullName: '信息光电子学院' },
    { name: '环境学院', icon: '🌿', fullName: '环境学院楼' },
  ],
  '南海校区': [
    { name: '教A座', icon: '🏫', fullName: '教学楼A座' },
    { name: '教B座', icon: '🏫', fullName: '教学楼B座' },
    { name: '图书馆', icon: '📚', fullName: '图书馆(南海)' },
    { name: '软件学院', icon: '💻', fullName: '软件学院楼' },
    { name: '国际商学院', icon: '🌐', fullName: '国际商学院楼' },
    { name: '职业教育学院', icon: '📋', fullName: '职业教育学院' },
  ],
};

const roomCache = {};
function getRooms(buildingName) {
  if (roomCache[buildingName]) return roomCache[buildingName];
  const seed = buildingName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const floors = [];
  const now = new Date();
  for (let f = 1; f <= 4; f++) {
    const rooms = [];
    const count = 5 + (seed % 5);
    for (let r = 1; r <= count; r++) {
      const num = f * 100 + r;
      const pseudoRandom = ((seed * f * r + now.getMinutes()) % 100) / 100;
      rooms.push({
        room: String(num),
        free: pseudoRandom > 0.4,
        seats: 30 + (seed % 50),
        hasAC: pseudoRandom > 0.3,
        hasPower: pseudoRandom > 0.2,
      });
    }
    floors.push({ name: `${buildingName} ${f}层`, rooms });
  }
  roomCache[buildingName] = { floors, buildingName };
  return roomCache[buildingName];
}

const courseSchedule = [
  { day: '周一', courses: [
    { name: '人工智能导论', time: '08:00-09:40', location: '6-1503', teacher: '刘海', weeks: '4-17周' },
    { name: '人工智能导论', time: '08:00-09:40', location: '6-205', teacher: '张涵', weeks: '4-17周' },
    { name: '数据结构与算法', time: '10:00-11:40', location: '6-303', teacher: '肖楷焓', weeks: '4-17周' },
    { name: '线性代数', time: '15:55-17:35', location: '6-402', teacher: '吴黎', weeks: '4-17周' },
    { name: '线性代数', time: '15:55-17:35', location: '5-103', teacher: '刘建州', weeks: '4-17周' },
  ]},
  { day: '周二', courses: [
    { name: '形势与政策(三)', time: '10:00-11:40', location: '5-204', teacher: '魏毓芸', weeks: '9-12周' },
    { name: '高级语言程序设计(II)', time: '14:00-15:40', location: '6-205', teacher: '冯永聪', weeks: '4-17周' },
    { name: '高级语言程序设计(II)', time: '15:55-17:35', location: '5-102', teacher: '冯永聪', weeks: '4-17周' },
    { name: '军事理论', time: '19:00-20:40', location: '5-102', teacher: '高洁', weeks: '4-11周' },
  ]},
  { day: '周三', courses: [
    { name: '高级语言程序设计(II)', time: '10:00-11:40', location: '6-1401', teacher: '冯永聪', weeks: '4-17周' },
    { name: '高级语言程序设计(II)', time: '14:00-15:40', location: '6-1504', teacher: '冯永聪', weeks: '4-17周' },
    { name: '大学物理(II)', time: '15:55-17:35', location: '5-103', teacher: '吴琴', weeks: '4-17周' },
    { name: '大学物理(II)', time: '19:00-20:40', location: '6-203', teacher: '张勇', weeks: '4-17周' },
  ]},
  { day: '周四', courses: [
    { name: '数据结构与算法', time: '08:00-09:40', location: '5-304', teacher: '刘海', weeks: '4-17周' },
    { name: '人工智能导论', time: '10:00-11:40', location: '6-1302', teacher: '刘竹明', weeks: '4-17周' },
    { name: '人工智能导论', time: '14:00-15:40', location: '6-1302', teacher: '刘竹明', weeks: '4-17周' },
  ]},
  { day: '周五', courses: [
    { name: '形势与政策(三)', time: '10:00-11:40', location: '5-204', teacher: '魏毓芸', weeks: '15-16周' },
    { name: '数据结构与算法', time: '14:00-15:40', location: '6-303', teacher: '肖楷焓', weeks: '4-17周' },
    { name: '数据结构与算法', time: '15:55-17:35', location: '5-102', teacher: '肖楷焓', weeks: '4-17周' },
    { name: '军事理论', time: '19:00-20:40', location: '5-102', teacher: '高洁', weeks: '4-11周' },
  ]},
  { day: '周六', courses: [] },
  { day: '周日', courses: [] },
];

const exams = [
  { name: '教育学原理', date: '2026-06-20', time: '14:00-16:00', location: '一课大楼A301', seat: 'B12', duration: '120分钟', notes: '闭卷' },
  { name: '心理学导论', date: '2026-06-22', time: '09:00-11:00', location: '文科楼B202', seat: 'A08', duration: '120分钟', notes: '开卷，可带教材' },
  { name: '马克思主义基本原理', date: '2026-06-25', time: '15:00-17:20', location: '一课大楼C105', seat: 'C15', duration: '140分钟', notes: '闭卷' },
  { name: '教育技术学', date: '2026-06-28', time: '10:00-12:00', location: '计算机学院B201', seat: 'D03', duration: '120分钟', notes: '上机考试' },
  { name: '教育统计学', date: '2026-07-01', time: '14:00-16:00', location: '理科楼C102', seat: 'E21', duration: '120分钟', notes: '带计算器' },
];

const gpaData = {
  overall: 3.2,
  rank: '前65%',
  semesters: [
    { term: '大一上', gpa: 2.5, courses: [
      { name: '教育学原理', credit: 3, score: 75 }, { name: '普通心理学', credit: 3, score: 72 },
      { name: '大学英语(一)', credit: 2, score: 80 }, { name: '体育(一)', credit: 1, score: 88 },
    ]},
    { term: '大一下', gpa: 2.8, courses: [
      { name: '教育心理学', credit: 3, score: 78 }, { name: '中国教育史', credit: 3, score: 76 },
      { name: '大学英语(二)', credit: 2, score: 84 }, { name: '计算机基础', credit: 2, score: 85 },
    ]},
    { term: '大二上', gpa: 3.0, courses: [
      { name: '教育统计学', credit: 3, score: 82 }, { name: '课程与教学论', credit: 3, score: 78 },
      { name: '外国教育史', credit: 3, score: 80 }, { name: '马原', credit: 2, score: 86 },
    ]},
    { term: '大二下', gpa: 3.2, courses: [
      { name: '教育技术学', credit: 3, score: 85 }, { name: '教育研究方法', credit: 3, score: 80 },
      { name: '德育原理', credit: 2, score: 88 }, { name: '大学写作', credit: 2, score: 90 },
    ]},
    { term: '大三上', gpa: 3.3, courses: [
      { name: '比较教育学', credit: 3, score: 84 }, { name: '教育社会学', credit: 3, score: 82 },
      { name: '教育哲学', credit: 3, score: 79 }, { name: '班级管理', credit: 2, score: 91 },
    ]},
    { term: '大三下', gpa: 3.4, courses: [
      { name: '教育评价学', credit: 3, score: 86 }, { name: '特殊教育学', credit: 2, score: 88 },
      { name: '微格教学', credit: 3, score: 90 }, { name: '教育法学', credit: 2, score: 84 },
    ]},
    { term: '大四上', gpa: 3.6, courses: [
      { name: '教育实习', credit: 6, score: 92 }, { name: '毕业论文(一)', credit: 4, score: 90 },
    ]},
    { term: '大四下', gpa: 3.8, courses: [
      { name: '毕业论文(二)', credit: 8, score: 94 }, { name: '教师礼仪', credit: 2, score: 95 },
    ]},
  ],
};

let user = {
  studentId: '20253000165',
  name: '吴若晨',
  nickname: '吴若晨',
  phone: '138xxxx1234',
  email: '20253000165@m.scnu.edu.cn',
  major: '计算机科学与技术',
  grade: '2025级',
  avatar: '🌞',
  lastLogin: null,
};

// ==================== Forum Data ====================

let forumPostId = 100;
let forumPosts = [
  {
    id: 1, author: '星云', avatar: '🌞', category: '学习',
    title: '教育学原理期末复习重点整理', content: '给大家整理了一下教育学原理的重点：\n1. 教育的本质与功能\n2. 课程与教学的基本理论\n3. 教育评价的主要方法\n4. 德育原理与实践\n\n建议大家重点关注第一章和第三章，陈老师上课强调过好几次。祝大家期末顺利！',
    likes: 23, comments: [
      { author: '小明', avatar: '📚', content: '太感谢了！正好在复习这门', time: '2026-05-21 22:30' },
      { author: '阿花', avatar: '🌸', content: '第二章也要看吗？', time: '2026-05-21 23:15' },
    ], createdAt: '2026-05-21 20:00',
  },
  {
    id: 2, author: '学习委员', avatar: '📖', category: '学习',
    title: '图书馆三楼自习室推荐', content: '图书馆三楼靠窗的位置真的绝了！采光好，安静，插座也多。建议早上8点前去占座，晚了就没位了。另外提醒大家不要用书本长期占座，会被清理的。',
    likes: 15, comments: [
      { author: '考研人', avatar: '💪', content: '三楼确实好，我每天都去', time: '2026-05-20 18:00' },
    ], createdAt: '2026-05-20 15:30',
  },
  {
    id: 3, author: '毕业学姐', avatar: '🎓', category: '生活',
    title: '石牌校区周边美食推荐', content: '在华师四年，给大家推荐几家好吃的：\n- 西门出去左转的肠粉店，6块钱一份超大\n- 正门对面的奶茶店，买一送一到月底\n- 后街的麻辣烫，味道一绝\n- 学校食堂三楼的铁板饭，性价比最高',
    likes: 42, comments: [
      { author: '吃货', avatar: '🍜', content: '后街麻辣烫在哪里？求具体位置', time: '2026-05-19 12:00' },
      { author: '省钱达人', avatar: '💰', content: '食堂三楼铁板饭真的好吃又便宜', time: '2026-05-19 14:20' },
    ], createdAt: '2026-05-19 10:00',
  },
  {
    id: 4, author: '数码控', avatar: '💻', category: '二手',
    title: '出一台iPad Air 5，带笔和键盘', content: 'iPad Air 5 256G 星光色，去年9月买的，带Apple Pencil二代和妙控键盘。因为换了Pro所以出掉。无磕碰，电池健康96%。全套打包2800，可小刀。石牌校区当面交易。',
    likes: 8, comments: [
      { author: '心动', avatar: '👀', content: '还在吗？可以看看实物图吗', time: '2026-05-22 09:00' },
    ], createdAt: '2026-05-22 08:30',
  },
  {
    id: 5, author: '粗心鬼', avatar: '😅', category: '失物招领',
    title: '一课大楼301丢了一把蓝色雨伞', content: '今天下午在一课大楼A301上完课忘了一把蓝色折叠伞，伞柄上有个小熊挂件。如果有人捡到请联系我，谢谢！学号20241101088。',
    likes: 3, comments: [], createdAt: '2026-05-22 17:00',
  },
  {
    id: 6, author: '运动达人', avatar: '🏃', category: '生活',
    title: '大学城校区游泳馆开放时间调整', content: '通知：大学城校区游泳馆从下周一开始调整开放时间，工作日改为16:00-21:00，周末9:00-21:00。记得带校园卡，入场需要刷卡。',
    likes: 11, comments: [
      { author: '游泳爱好者', avatar: '🏊', content: '终于改成下午了，之前中午开放太热了', time: '2026-05-21 20:00' },
    ], createdAt: '2026-05-21 16:00',
  },
];

// ==================== API Routes ====================

// Buildings
app.get('/api/buildings', (req, res) => {
  const campus = req.query.campus || '石牌校区';
  res.json({ campus, list: campuses[campus] || [] });
});

app.get('/api/buildings/:name/rooms', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  res.json(getRooms(name));
});

// Courses
app.get('/api/courses', (req, res) => {
  const slotSet = new Set();
  courseSchedule.forEach(d => d.courses.forEach(c => slotSet.add(c.time)));
  const timeSlots = [...slotSet].sort();
  res.json({ schedule: courseSchedule, timeSlots });
});

app.get('/api/courses/current', (req, res) => {
  const now = new Date();
  const dayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const today = dayMap[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayData = courseSchedule.find(d => d.day === today);
  if (!todayData || !todayData.courses.length) {
    return res.json({ course: null, status: 'none' });
  }
  let best = null;
  let bestStartMin = Infinity;
  let bestStatus = 'none';
  for (const c of todayData.courses) {
    const [start, end] = c.time.split('-');
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (nowMinutes >= startMin && nowMinutes < endMin) {
      return res.json({ course: c, status: 'ongoing' });
    }
    if (nowMinutes < startMin && startMin < bestStartMin) {
      best = c;
      bestStartMin = startMin;
      bestStatus = 'next';
    }
  }
  res.json({ course: best || null, status: bestStatus });
});

// Exams
app.get('/api/exams', (req, res) => {
  const now = new Date();
  const list = exams.map(e => {
    const diff = Math.ceil((new Date(e.date) - now) / (1000 * 60 * 60 * 24));
    return { ...e, countdown: diff > 0 ? `${diff}天` : '已结束' };
  });
  res.json({ exams: list });
});

// GPA
app.get('/api/gpa', (req, res) => res.json(gpaData));
app.get('/api/gpa/:semesterIndex', (req, res) => {
  const idx = parseInt(req.params.semesterIndex);
  const sem = gpaData.semesters[idx];
  sem ? res.json(sem) : res.status(404).json({ error: 'Not found' });
});

// User
app.get('/api/user/profile', (req, res) => res.json(user));
app.put('/api/user/profile', (req, res) => {
  const { nickname, phone, email, major } = req.body;
  if (nickname) user.nickname = nickname;
  if (phone) user.phone = phone;
  if (email) user.email = email;
  if (major) user.major = major;
  res.json({ success: true, user });
});

// Login
app.post('/api/login', (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password) return res.status(400).json({ success: false, message: '请输入学号和密码' });
  if (password.length < 3) return res.status(400).json({ success: false, message: '密码长度不能少于3位' });
  user.lastLogin = new Date().toISOString();
  res.json({ success: true, message: '登录成功', user });
});

// Chat
let chatMessages = [];
app.post('/api/chat', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ reply: '请说点什么吧~' });

  chatMessages.push({ role: 'user', content: text });
  // Keep last 20 messages (10 turns)
  if (chatMessages.length > 20) chatMessages = chatMessages.slice(-20);

  // Try SiliconFlow first, fallback to mock
  if (SILICONFLOW_KEY) {
    try {
      const apiMessages = [
        { role: 'system', content: SCNU_SYSTEM_PROMPT },
        ...chatMessages,
      ];
      const reply = await callSiliconFlow(apiMessages);
      chatMessages.push({ role: 'assistant', content: reply });
      return res.json({ reply, source: 'siliconflow' });
    } catch (err) {
      console.warn('SiliconFlow error, falling back to mock:', err.message);
    }
  }

  // Mock fallback
  const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
  chatMessages.push({ role: 'assistant', content: reply });
  res.json({ reply, source: 'mock' });
});

app.get('/api/chat/history', (req, res) => {
  res.json({ messages: chatMessages });
});

app.post('/api/chat/clear', (req, res) => {
  chatMessages = [];
  res.json({ success: true });
});

// ==================== Forum API ====================

app.get('/api/forum/posts', (req, res) => {
  const { category } = req.query;
  let posts = [...forumPosts];
  if (category && category !== '全部') {
    posts = posts.filter(p => p.category === category);
  }
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ posts });
});

app.post('/api/forum/posts', (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) return res.status(400).json({ error: '标题和内容不能为空' });
  const post = {
    id: ++forumPostId,
    author: user.nickname || '匿名',
    avatar: user.avatar || '👤',
    title,
    content,
    category: category || '生活',
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  forumPosts.unshift(post);
  res.json({ success: true, post });
});

app.post('/api/forum/posts/:id/like', (req, res) => {
  const id = parseInt(req.params.id);
  const post = forumPosts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  post.likes++;
  res.json({ success: true, likes: post.likes });
});

app.post('/api/forum/posts/:id/comment', (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '评论不能为空' });
  const post = forumPosts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const comment = {
    author: user.nickname || '匿名',
    avatar: user.avatar || '👤',
    content,
    time: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  post.comments.push(comment);
  res.json({ success: true, comment });
});

// Version
app.get('/api/version', (req, res) => {
  res.json({ version: '4.6.0', latest: '4.6.0', hasUpdate: false, changelog: '华南师范大学专属版。接入硅基流动AI助手，石牌/大学城/南海三校区全面覆盖。' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ 华南师范大学校园服务已启动: http://localhost:' + PORT);
  console.log(SILICONFLOW_KEY ? '🤖 AI: 硅基流动 ' + SILICONFLOW_MODEL : '⚠️  未配置 SILICONFLOW_API_KEY，AI 使用本地 Mock 模式');
});
