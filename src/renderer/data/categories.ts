// 支出分类数据：一级大类 → 二级小类
// 预设分类带 emoji 图标

import { getUserCategories } from '../database'

// --- 预设分类数据 ---

export interface PresetCategory {
  emoji: string
  children: string[]
}

const presetCategories: Record<string, PresetCategory> = {
  '餐饮饮食': { emoji: '🍽️', children: ['早餐', '午餐', '晚餐', '零食饮料', '外卖配送', '聚餐请客', '食材生鲜'] },
  '交通出行': { emoji: '🚗', children: ['公交地铁', '出租车/网约车', '加油充电', '停车费', '车辆保养', '火车/高铁', '飞机票'] },
  '购物消费': { emoji: '🛒', children: ['服饰鞋包', '数码电子', '家居日用品', '美妆护肤', '烟酒茶叶', '宠物用品'] },
  '住房物业': { emoji: '🏠', children: ['房租', '房贷', '物业费', '水费', '电费', '燃气费', '网费/话费', '维修装修'] },
  '医疗健康': { emoji: '🏥', children: ['门诊挂号', '药品费', '住院医疗', '体检保健', '健身运动', '牙科眼科'] },
  '教育学习': { emoji: '📚', children: ['书籍资料', '培训课程', '考试报名', '文具用品', '电子设备(学习)'] },
  '休闲娱乐': { emoji: '🎮', children: ['电影演出', '旅游度假', '游戏充值', '音乐视频会员', '运动器材', 'KTV/酒吧'] },
  '人情来往': { emoji: '🎁', children: ['礼物红包', '婚礼随礼', '孝敬父母', '请客吃饭', '捐款公益'] },
  '金融保险': { emoji: '💰', children: ['社保公积金', '商业保险', '银行手续费', '投资理财', '贷款利息'] },
  '其他支出': { emoji: '📦', children: ['快递运费', '证件办理', '罚款缴费', '其他杂项'] },
}

// --- Emoji 选择器数据 ---

export interface EmojiGroup {
  label: string
  emojis: string[]
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  { label: '食物饮品', emojis: ['🍽️','🍔','🍕','🍜','🍰','☕','🍺','🍚','🥤','🍞','🥗','🍱'] },
  { label: '交通出行', emojis: ['🚗','🚌','🚇','✈️','🚲','🚄','🚕','⛽','🚢','🏍️','🛴','🚗'] },
  { label: '购物消费', emojis: ['🛒','👗','👟','💄','⌚','📱','💻','🎧','👜','👓','🧴','💐'] },
  { label: '居家住房', emojis: ['🏠','🏡','🛏️','🚿','💡','🔑','🪴','🛋️','🏢','🔧','🧹','🏘️'] },
  { label: '健康医疗', emojis: ['🏥','💊','💉','🩺','🏃','🧘','😷','🦷','👀','🧠','🤒','🩹'] },
  { label: '学习教育', emojis: ['📚','📝','✏️','🎓','💻','📖','🖊️','📐','🎒','📓','🏫','🔬'] },
  { label: '休闲娱乐', emojis: ['🎮','🎬','🎵','🎸','🎤','🎯','🏀','⚽','🎰','🎳','🏖️','🎡'] },
  { label: '人情社交', emojis: ['🎁','💝','👨‍👩‍👧','🤝','💒','👶','💐','🥂','🎉','🙏','❤️','👥'] },
  { label: '金融理财', emojis: ['💰','💳','🏦','📊','💵','📈','💎','🏧','💸','🪙','🧧','📋'] },
  { label: '其他', emojis: ['📦','📌','🔖','⭐','✅','🔄','📎','📋','🗂️','💼','🛠️','🔍'] },
]

/** 平铺后的所有 emoji（去重） */
export const ALL_EMOJIS: string[] = [...new Set(EMOJI_GROUPS.flatMap(g => g.emojis))]

// --- 基础查询（仅预设） ---

/** 获取预设一级分类名称列表 */
export function getCategoryL1List(): string[] {
  return Object.keys(presetCategories)
}

/** 根据一级分类获取预设二级分类列表 */
export function getCategoryL2List(categoryL1: string): string[] {
  return presetCategories[categoryL1]?.children || []
}

/** 获取预设分类的 emoji，不存在则返回默认 📌 */
export function getPresetEmoji(l1Name: string): string {
  return presetCategories[l1Name]?.emoji || '📌'
}

// --- 分类树节点 ---

export interface CategoryTreeNode {
  name: string
  emoji: string
  isPreset: boolean
  userCategoryId?: number
  children: CategoryTreeNode[]
}

/** 获取某个一级分类名的 emoji（预设 > 用户自定义 > 默认） */
export async function getCategoryEmoji(l1Name: string): Promise<string> {
  const preset = presetCategories[l1Name]
  if (preset) return preset.emoji
  const userCats = await getUserCategories()
  const userL1 = userCats.find(c => c.parent_l1 === null && c.name === l1Name)
  return userL1?.emoji || '📌'
}

// --- 合并查询（预设 + 用户自定义） ---

/** 获取所有一级分类名称（预设 + 用户自定义，去重） */
export async function getAllCategoryL1List(): Promise<string[]> {
  const userCats = await getUserCategories()
  const userL1s = userCats.filter(c => c.parent_l1 === null).map(c => c.name)
  return [...new Set([...Object.keys(presetCategories), ...userL1s])]
}

/** 获取某个一级分类下的所有二级分类（预设 + 用户自定义，去重） */
export async function getAllCategoryL2List(l1: string): Promise<string[]> {
  const userCats = await getUserCategories()
  const userL2s = userCats.filter(c => c.parent_l1 === l1).map(c => c.name)
  return [...new Set([...(presetCategories[l1]?.children || []), ...userL2s])]
}

/** 获取完整分类树（带预设/自定义标记和 emoji） */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const userCats = await getUserCategories()
  const userL1s = userCats.filter(c => c.parent_l1 === null)
  const presetL1s = Object.keys(presetCategories)
  const allL1s = [...new Set([...presetL1s, ...userL1s.map(c => c.name)])]

  return allL1s.map(l1 => {
    const isPreset = presetL1s.includes(l1)
    const userL1 = userL1s.find(c => c.name === l1)
    const emoji = isPreset ? presetCategories[l1].emoji : (userL1?.emoji || '📌')

    const presetL2s = presetCategories[l1]?.children || []
    const userL2s = userCats.filter(c => c.parent_l1 === l1)
    const allL2s = [...new Set([...presetL2s, ...userL2s.map(c => c.name)])]

    return {
      name: l1,
      emoji,
      isPreset,
      userCategoryId: userL1?.id,
      children: allL2s.map(l2 => {
        const isPresetL2 = presetL2s.includes(l2)
        const userL2 = userL2s.find(c => c.name === l2)
        return {
          name: l2,
          emoji: '',
          isPreset: isPresetL2,
          userCategoryId: userL2?.id,
          children: [],
        }
      }),
    }
  })
}

export default presetCategories
