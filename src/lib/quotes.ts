// ============================================================
// 首页随机文案
// 面向「企业实践日记」的使用者（质量管理相关专业 + 企业实习），
// 取三类：古典惜时劝学、质量管理格言、关于观察与记录的西文短句。
// 每条都带出处，不收录来源不明的说法。
// ============================================================

export interface Quote {
  text: string
  author: string
}

export const QUOTES: Quote[] = [
  // —— 古典：积累与躬行 ——
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子《劝学》' },
  { text: '千里之行，始于足下。', author: '《老子》' },
  { text: '合抱之木，生于毫末。', author: '《老子》' },
  { text: '锲而不舍，金石可镂。', author: '荀子《劝学》' },
  { text: '君子博学而日参省乎己，则知明而行无过矣。', author: '荀子《劝学》' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游' },
  { text: '博学之，审问之，慎思之，明辨之，笃行之。', author: '《礼记·中庸》' },
  { text: '知是行之始，行是知之成。', author: '王阳明《传习录》' },
  { text: '如切如磋，如琢如磨。', author: '《诗经·卫风》' },

  // —— 古典：学习与自省 ——
  { text: '学而不思则罔，思而不学则殆。', author: '《论语·为政》' },
  { text: '温故而知新，可以为师矣。', author: '《论语·为政》' },
  { text: '知之为知之，不知为不知，是知也。', author: '《论语·为政》' },
  { text: '三人行，必有我师焉。', author: '《论语·述而》' },
  { text: '工欲善其事，必先利其器。', author: '《论语·卫灵公》' },
  { text: '吾日三省吾身。', author: '《论语·学而》' },
  { text: '天行健，君子以自强不息。', author: '《周易》' },

  // —— 质量管理 ——
  { text: '我们相信上帝，其他人请拿数据来。', author: '戴明' },
  {
    text: '如果你无法把正在做的事描述成一个过程，那你就不知道自己在做什么。',
    author: '戴明',
  },
  { text: '质量是每个人的责任。', author: '戴明' },
  { text: '质量是免费的。', author: '菲利普·克劳斯比' },

  // —— 观察、记录与成长 ——
  { text: '未经审视的人生不值得过。', author: '苏格拉底' },
  { text: '我们看到的不是事物本身，而是我们自己。', author: '阿奈斯·宁' },
  { text: '生活不是我们活过的日子，而是我们记住的日子。', author: '加西亚·马尔克斯' },
  { text: '真正重要的东西，用眼睛是看不见的。', author: '圣埃克苏佩里《小王子》' },
]

/**
 * 随机取一条文案。
 * @param exclude 需要避开的上一条（避免「换一句」换出同一句）
 * @param rand 随机源，注入以便测试
 */
export function randomQuote(exclude?: string, rand: () => number = Math.random): Quote {
  const pool = exclude ? QUOTES.filter(q => q.text !== exclude) : QUOTES
  const list = pool.length ? pool : QUOTES
  const i = Math.min(list.length - 1, Math.floor(rand() * list.length))
  return list[i]
}
