import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  message,
  Collapse,
  Tag,
  Modal,
  Input,
  Popconfirm,
  Empty,
  Typography,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  TagsOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { addUserCategory, updateUserCategory, deleteUserCategory } from '../database'
import { getCategoryTree, CategoryTreeNode, EMOJI_GROUPS, getPresetEmoji } from '../data/categories'

const { Text } = Typography

export default function CategoryManage() {
  // --- 分类树 ---
  const [tree, setTree] = useState<CategoryTreeNode[]>([])
  const [loading, setLoading] = useState(false)

  // --- 弹窗 ---
  const [modalOpen, setModalOpen] = useState(false)
  const [modalName, setModalName] = useState('')
  const [modalEmoji, setModalEmoji] = useState('📌')
  const [modalParentL1, setModalParentL1] = useState<string | null>(null) // null=新增一级
  const [editingId, setEditingId] = useState<number | null>(null) // 有 id=编辑模式
  const [modalLoading, setModalLoading] = useState(false)

  // --- emoji 搜索 ---
  const [emojiSearch, setEmojiSearch] = useState('')

  // 过滤后的 emoji 分组
  const filteredGroups = emojiSearch.trim()
    ? EMOJI_GROUPS.map(g => ({
        ...g,
        emojis: g.emojis.filter(e => e.includes(emojiSearch.trim())),
      })).filter(g => g.emojis.length > 0)
    : EMOJI_GROUPS

  // 加载分类树
  const loadTree = async () => {
    setLoading(true)
    try {
      setTree(await getCategoryTree())
    } catch (err) {
      message.error('加载分类失败：' + String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTree() }, [])

  // 打开新增弹窗
  const openAdd = (parentL1: string | null) => {
    setEditingId(null)
    setModalName('')
    setModalEmoji('📌')
    setEmojiSearch('')
    setModalParentL1(parentL1)
    setModalOpen(true)
  }

  // 打开编辑弹窗
  const openEdit = (item: CategoryTreeNode, parentL1: string | null) => {
    setEditingId(item.userCategoryId!)
    setModalName(item.name)
    setModalEmoji(item.emoji || getPresetEmoji(item.name))
    setEmojiSearch('')
    setModalParentL1(parentL1)
    setModalOpen(true)
  }

  // 确认新增/编辑
  const handleConfirm = async () => {
    const name = modalName.trim()
    if (!name) { message.warning('请输入分类名称'); return }
    setModalLoading(true)
    try {
      if (editingId !== null) {
        await updateUserCategory(editingId, name, modalEmoji)
        message.success('分类修改成功')
      } else {
        await addUserCategory(name, modalParentL1, modalEmoji)
        message.success('分类添加成功')
      }
      setModalOpen(false)
      await loadTree()
    } catch (err) {
      message.error((editingId !== null ? '修改' : '添加') + '失败：' + String(err))
    } finally {
      setModalLoading(false)
    }
  }

  // 删除分类
  const handleDelete = async (item: CategoryTreeNode) => {
    if (!item.userCategoryId) return
    try {
      await deleteUserCategory(item.userCategoryId)
      message.success('分类已删除（已有账单已归到「其他支出」）')
      await loadTree()
    } catch (err) {
      message.error('删除失败：' + String(err))
    }
  }

  // 分隔预设和自定义
  const presetL1s = tree.filter(n => n.isPreset)
  const customL1s = tree.filter(n => !n.isPreset)

  return (
    <div style={{ maxWidth: 720, margin: '24px auto' }}>
      {/* ===== 预设分类 ===== */}
      <Card
        title={
          <Space>
            <TagsOutlined />
            <span>预设分类</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          系统自带的分类，不可修改或删除
        </Text>
        {presetL1s.length === 0 ? (
          <Empty description="暂无预设分类" />
        ) : (
          <Collapse
            size="small"
            items={presetL1s.map(l1 => ({
              key: l1.name,
              label: (
                <Space>
                  <span style={{ fontSize: 16 }}>{l1.emoji}</span>
                  <span>{l1.name}</span>
                  <Tag color="blue" style={{ fontSize: 11 }}><LockOutlined /> 预设</Tag>
                </Space>
              ),
              children: (
                <div style={{ paddingLeft: 24 }}>
                  {l1.children.map(l2 => (
                    <div
                      key={l2.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: '1px dashed #f0f0f0',
                      }}
                    >
                      <Tag color="blue" style={{ fontSize: 11 }}><LockOutlined /></Tag>
                      <span style={{ fontSize: 14 }}>{l2.name}</span>
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      {/* ===== 自定义分类 ===== */}
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>我的分类</span>
          </Space>
        }
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openAdd(null)}>
            新增一级分类
          </Button>
        }
      >
        {customL1s.length === 0 ? (
          <Empty description="还没有自定义分类，点击上方按钮添加" />
        ) : (
          <Collapse
            size="small"
            items={customL1s.map(l1 => ({
              key: l1.name,
              label: (
                <Space>
                  <span style={{ fontSize: 16 }}>{l1.emoji}</span>
                  <span>{l1.name}</span>
                  <Space.Compact size="small">
                    <Tag color="green" style={{ fontSize: 11 }}>自定义</Tag>
                    <Button type="link" size="small" icon={<EditOutlined />}
                      onClick={e => { e.stopPropagation(); openEdit(l1, null) }} />
                    <Popconfirm
                      title="确定删除这个一级分类吗？"
                      description="已有的账单会自动归到「其他支出」"
                      onConfirm={e => { e?.stopPropagation(); handleDelete(l1) }}
                      onCancel={e => e?.stopPropagation()}
                      okText="确定删除" cancelText="取消"
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}
                        onClick={e => e.stopPropagation()} />
                    </Popconfirm>
                  </Space.Compact>
                </Space>
              ),
              extra: (
                <Button type="dashed" size="small" icon={<PlusOutlined />}
                  onClick={e => { e.stopPropagation(); openAdd(l1.name) }}>
                  新增二级
                </Button>
              ),
              children: (
                <div style={{ paddingLeft: 24 }}>
                  {l1.children.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>暂无二级分类</Text>
                  ) : (
                    l1.children.map(l2 => (
                      <div key={l2.name} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '4px 0', borderBottom: '1px dashed #f0f0f0',
                      }}>
                        <Space>
                          <span style={{ fontSize: 14 }}>{l2.name}</span>
                          {l2.isPreset ? (
                            <Tag color="blue" style={{ fontSize: 11 }}><LockOutlined /> 预设</Tag>
                          ) : (
                            <Space.Compact size="small">
                              <Tag color="green" style={{ fontSize: 11 }}>自定义</Tag>
                              <Button type="link" size="small" icon={<EditOutlined />}
                                onClick={() => openEdit(l2, l1.name)} />
                              <Popconfirm
                                title="确定删除这个二级分类吗？"
                                description="已有的账单会自动归到「其他支出」"
                                onConfirm={() => handleDelete(l2)}
                                okText="确定删除" cancelText="取消"
                              >
                                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space.Compact>
                          )}
                        </Space>
                      </div>
                    ))
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      {/* ===== 新增/编辑弹窗 ===== */}
      <Modal
        title={
          editingId !== null
            ? '修改分类'
            : modalParentL1 === null
              ? '新增一级分类'
              : `在「${modalParentL1}」下新增二级分类`
        }
        open={modalOpen}
        onOk={handleConfirm}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading}
        okText={editingId !== null ? '保存' : '添加'}
        cancelText="取消"
        destroyOnClose
        width={480}
      >
        <div style={{ marginTop: 16 }}>
          {/* 名称 */}
          <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
            {editingId !== null
              ? '修改分类名称和图标'
              : modalParentL1 === null
                ? '输入新的一级分类名称并选择图标'
                : `为「${modalParentL1}」添加二级分类`}
          </Text>
          <Input
            placeholder="分类名称"
            value={modalName}
            onChange={e => setModalName(e.target.value)}
            onPressEnter={handleConfirm}
            maxLength={20}
            autoFocus
            style={{ marginBottom: 16 }}
          />

          {/* 当前选中的 emoji */}
          <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>选择图标</Text>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6,
            border: '2px solid #1677ff', background: '#e6f4ff',
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 28 }}>{modalEmoji}</span>
            <span style={{ fontSize: 14, color: '#1677ff' }}>当前选中</span>
          </div>

          {/* Emoji 搜索 */}
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索 emoji..."
            value={emojiSearch}
            onChange={e => setEmojiSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 8 }}
          />

          {/* Emoji 分组选择器 */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filteredGroups.length === 0 ? (
              <Empty description="没有匹配的 emoji" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              filteredGroups.map(group => (
                <div key={group.label} style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    {group.label}
                  </Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {group.emojis.map(emoji => (
                      <span
                        key={emoji}
                        onClick={() => setModalEmoji(emoji)}
                        style={{
                          fontSize: 22,
                          padding: '3px 6px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: modalEmoji === emoji ? '2px solid #1677ff' : '2px solid transparent',
                          background: modalEmoji === emoji ? '#e6f4ff' : 'transparent',
                          transition: 'all 0.15s',
                        }}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 确定后用的 emoji 提示 */}
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              分类名称：{modalEmoji} {modalName || '(未填写)'}
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}
