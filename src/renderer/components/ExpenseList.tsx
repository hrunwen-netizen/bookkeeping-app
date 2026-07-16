import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Tag, Button, Space, Popconfirm, message, Empty, Segmented } from 'antd'
import { DeleteOutlined, ReloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { getExpenses, deleteExpense } from '../database'
import { getCategoryEmoji } from '../data/categories'

export default function ExpenseList() {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs())
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({})

  const year = currentMonth.year()
  const month = currentMonth.month() + 1

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getExpenses(year, month, recordType)
      setExpenses(data)
      // 预加载所有出现的一级分类的 emoji
      const l1Set = [...new Set(data.map(e => e.category_l1))]
      const map: Record<string, string> = {}
      await Promise.all(l1Set.map(async (l1) => {
        map[l1] = await getCategoryEmoji(l1, recordType)
      }))
      setEmojiMap(map)
    } catch (err) {
      message.error('加载失败：' + String(err))
    } finally {
      setLoading(false)
    }
  }, [year, month, recordType])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id)
      message.success('已删除')
      loadExpenses()
    } catch (err) {
      message.error('删除失败：' + String(err))
    }
  }

  // 计算当月总额
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date: string) => <span>{date}</span>,
    },
    {
      title: '分类',
      key: 'category',
      width: 180,
      render: (_: unknown, record: Expense) => (
        <span>
          <Tag color="blue">{emojiMap[record.category_l1] || '📌'} {record.category_l1}</Tag>
          <span style={{ color: '#888', fontSize: 12 }}>{record.category_l2}</span>
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => (
        <span style={{ fontWeight: 500, color: recordType === 'expense' ? '#ff4d4f' : '#52c41a' }}>
          {recordType === 'expense' ? '-' : '+'}¥{amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (note: string) => (
        <span style={{ color: note ? '#333' : '#ccc' }}>{note || '—'}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Expense) => (
        <Popconfirm
          title="确定删除这条记录？"
          description="删除后不可恢复"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="expense-list-page">
      <Card
        title={
          <Space>
            <span>📋 {recordType === 'expense' ? '支出明细' : '收入明细'}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<LeftOutlined />}
              size="small"
              onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
            />
            <span style={{ fontWeight: 600, minWidth: 100, textAlign: 'center', display: 'inline-block' }}>
              {currentMonth.format('YYYY 年 M 月')}
            </span>
            <Button
              icon={<RightOutlined />}
              size="small"
              onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}
              disabled={currentMonth.isSame(dayjs(), 'month')}
            />
            <Button icon={<ReloadOutlined />} onClick={loadExpenses} size="small">
              刷新
            </Button>
          </Space>
        }
      >
        {/* 类型切换 */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Segmented
            value={recordType}
            onChange={(val) => setRecordType(val as 'expense' | 'income')}
            options={[
              { label: '💰 支出', value: 'expense' },
              { label: '💵 收入', value: 'income' },
            ]}
          />
        </div>

        {/* 月度统计摘要 */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ color: '#888', fontSize: 14 }}>
            {currentMonth.format('M 月')} {recordType === 'expense' ? '总支出' : '总收入'}
          </div>
          <div className="amount-total" style={{ color: recordType === 'expense' ? '#ff4d4f' : '#52c41a' }}>
            ¥{totalAmount.toFixed(2)}
          </div>
          <div style={{ color: '#888', fontSize: 12 }}>共 {expenses.length} 笔记录</div>
        </div>

        {/* 支出列表 */}
        <Table
          dataSource={expenses}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: <Empty description="这个月还没有记录，去记一笔吧！" />,
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="middle"
        />
      </Card>
    </div>
  )
}
