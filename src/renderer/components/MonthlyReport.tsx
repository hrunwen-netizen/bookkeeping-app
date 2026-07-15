import { useState, useEffect, useCallback } from 'react'
import { Card, Space, Button, Spin, Empty, message, Statistic } from 'antd'
import { LeftOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { getMonthlyStats } from '../database'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

// 饼图颜色
const COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1',
  '#13c2c2', '#eb2f96', '#faad14', '#2f54eb', '#a0d911',
]

export default function MonthlyReport() {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs())
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(false)

  const year = currentMonth.year()
  const month = currentMonth.month() + 1

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMonthlyStats(year, month)
      setStats(data)
    } catch (err) {
      message.error('加载统计失败：' + String(err))
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // 饼图数据
  const pieData = stats?.by_category.map((item) => ({
    name: item.category_l1,
    value: item.total,
  })) || []

  // 柱状图数据
  const barData = stats?.by_day.map((item) => ({
    date: item.date.slice(5), // 只显示 MM-DD
    total: item.total,
  })) || []

  const hasData = stats && stats.total > 0

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
            {/* 总金额 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Statistic
                title={`${currentMonth.format('M 月')} 总支出`}
                value={stats.total}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#1677ff', fontSize: 32, fontWeight: 700 }}
              />
              <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
                共 {stats.by_category.reduce((s, c) => s + c.count, 0)} 笔记录
              </div>
            </div>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 饼图：分类占比 */}
              <Card title="分类支出占比" size="small">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={110}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `¥${value.toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* 柱状图：每日趋势 */}
              <Card title="每日支出趋势" size="small">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value: number) => [`¥${value.toFixed(2)}`, '支出金额']}
                      labelFormatter={(label) => `${currentMonth.format('YYYY-')}${label}`}
                    />
                    <Bar dataKey="total" fill="#1677ff" radius={[4, 4, 0, 0]} name="支出金额" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 分类明细表 */}
              <Card title="分类明细" size="small">
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
                    {stats.by_category.map((item) => (
                      <tr key={item.category_l1} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px 12px' }}>{item.category_l1}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.count}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500 }}>
                          ¥{item.total.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {stats.total > 0 ? ((item.total / stats.total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </Space>
          </>
        )}
      </Card>
    </div>
  )
}
