import { useState, useEffect, useCallback } from 'react'
import { Card, Space, Button, Spin, Empty, message, Statistic, Row, Col } from 'antd'
import { LeftOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { getMonthlyStats } from '../database'
import { getCategoryEmoji } from '../data/categories'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

// 支出饼图颜色
const EXPENSE_COLORS = [
  '#ff4d4f', '#ff7a45', '#ffa940', '#ffc53d', '#ffec3d',
  '#bae637', '#73d13d', '#36cfc9', '#597ef7', '#9254de',
]
// 收入饼图颜色
const INCOME_COLORS = [
  '#52c41a', '#13c2c2', '#1677ff', '#722ed1', '#eb2f96',
  '#fa8c16', '#faad14', '#2f54eb', '#a0d911', '#f759ab',
]

export default function MonthlyReport() {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs())
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [expenseEmojiMap, setExpenseEmojiMap] = useState<Record<string, string>>({})
  const [incomeEmojiMap, setIncomeEmojiMap] = useState<Record<string, string>>({})

  const year = currentMonth.year()
  const month = currentMonth.month() + 1

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMonthlyStats(year, month)
      setStats(data)
      // 预加载支出分类 emoji
      const expL1Set = [...new Set(data.expense_by_category.map(c => c.category_l1))]
      const expMap: Record<string, string> = {}
      await Promise.all(expL1Set.map(async (l1) => {
        expMap[l1] = await getCategoryEmoji(l1, 'expense')
      }))
      setExpenseEmojiMap(expMap)
      // 预加载收入分类 emoji
      const incL1Set = [...new Set(data.income_by_category.map(c => c.category_l1))]
      const incMap: Record<string, string> = {}
      await Promise.all(incL1Set.map(async (l1) => {
        incMap[l1] = await getCategoryEmoji(l1, 'income')
      }))
      setIncomeEmojiMap(incMap)
    } catch (err) {
      message.error('加载统计失败：' + String(err))
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // 支出饼图数据
  const expensePieData = stats?.expense_by_category.map((item) => ({
    name: item.category_l1,
    value: item.total,
  })) || []

  // 收入饼图数据
  const incomePieData = stats?.income_by_category.map((item) => ({
    name: item.category_l1,
    value: item.total,
  })) || []

  // 合并每日数据用于分组柱状图
  const allDates = new Set<string>()
  stats?.expense_by_day.forEach(d => allDates.add(d.date))
  stats?.income_by_day.forEach(d => allDates.add(d.date))
  const sortedDates = [...allDates].sort()

  const barData = sortedDates.map(date => {
    const expDay = stats?.expense_by_day.find(d => d.date === date)
    const incDay = stats?.income_by_day.find(d => d.date === date)
    return {
      date: date.slice(5), // MM-DD
      fullDate: date,
      expense: expDay?.total || 0,
      income: incDay?.total || 0,
    }
  })

  const hasData = stats && (stats.expense_total > 0 || stats.income_total > 0)
  const balance = stats ? stats.income_total - stats.expense_total : 0

  return (
    <div className="report-page">
      <Card
        title="📊 月度统计"
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
            <Button icon={<ReloadOutlined />} onClick={loadStats} size="small">
              刷新
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : !hasData ? (
          <Empty
            description="这个月还没有记录"
            style={{ padding: 60 }}
          />
        ) : (
          <>
            {/* 统计卡片：支出 / 收入 / 结余 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #ff4d4f' }}>
                  <Statistic
                    title="总支出"
                    value={stats.expense_total}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
                  />
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    {stats.expense_by_category.reduce((s, c) => s + c.count, 0)} 笔
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #52c41a' }}>
                  <Statistic
                    title="总收入"
                    value={stats.income_total}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
                  />
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    {stats.income_by_category.reduce((s, c) => s + c.count, 0)} 笔
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', borderTop: `3px solid ${balance >= 0 ? '#1677ff' : '#ff4d4f'}` }}>
                  <Statistic
                    title="结余"
                    value={balance}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: balance >= 0 ? '#1677ff' : '#ff4d4f', fontSize: 24, fontWeight: 700 }}
                  />
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                    {balance >= 0 ? '👍 收大于支' : '⚠️ 支大于收'}
                  </div>
                </Card>
              </Col>
            </Row>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 双饼图：支出 + 收入 */}
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Card title="分类支出占比" size="small">
                    {expensePieData.length === 0 ? (
                      <Empty description="本月无支出" style={{ padding: 40 }} />
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={expensePieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${expenseEmojiMap[name] || ''} ${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={95}
                            dataKey="value"
                          >
                            {expensePieData.map((_, index) => (
                              <Cell key={`exp-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="分类收入占比" size="small">
                    {incomePieData.length === 0 ? (
                      <Empty description="本月无收入" style={{ padding: 40 }} />
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={incomePieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${incomeEmojiMap[name] || ''} ${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={95}
                            dataKey="value"
                          >
                            {incomePieData.map((_, index) => (
                              <Cell key={`inc-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `¥${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* 分组柱状图：每日收支趋势 */}
              <Card title="每日收支趋势" size="small">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `¥${value.toFixed(2)}`,
                        name === 'expense' ? '支出' : '收入',
                      ]}
                      labelFormatter={(label) => `${currentMonth.format('YYYY-')}${label}`}
                    />
                    <Legend
                      formatter={(value: string) => value === 'expense' ? '支出' : '收入'}
                    />
                    <Bar dataKey="expense" fill="#ff4d4f" radius={[4, 4, 0, 0]} name="expense" />
                    <Bar dataKey="income" fill="#52c41a" radius={[4, 4, 0, 0]} name="income" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 支出分类明细表 */}
              <Card title="支出分类明细" size="small">
                {stats.expense_by_category.length === 0 ? (
                  <Empty description="本月无支出记录" />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e8e8e8' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>分类</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>笔数</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>金额</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.expense_by_category.map((item) => (
                        <tr key={item.category_l1} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px' }}>{expenseEmojiMap[item.category_l1] || '📌'} {item.category_l1}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.count}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#ff4d4f' }}>
                            ¥{item.total.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {stats.expense_total > 0 ? ((item.total / stats.expense_total) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* 收入分类明细表 */}
              <Card title="收入分类明细" size="small">
                {stats.income_by_category.length === 0 ? (
                  <Empty description="本月无收入记录" />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e8e8e8' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>分类</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>笔数</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>金额</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.income_by_category.map((item) => (
                        <tr key={item.category_l1} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px' }}>{incomeEmojiMap[item.category_l1] || '📌'} {item.category_l1}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.count}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#52c41a' }}>
                            ¥{item.total.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {stats.income_total > 0 ? ((item.total / stats.income_total) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </Space>
          </>
        )}
      </Card>
    </div>
  )
}
