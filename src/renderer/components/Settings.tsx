import { useState } from 'react'
import { Card, Switch, Button, Space, message, Divider, Typography, Descriptions, Tag } from 'antd'
import { ExportOutlined, BulbOutlined, FolderOpenOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { exportCSV } from '../database'

const { Title, Text, Paragraph } = Typography

interface SettingsProps {
  isDark: boolean
  onToggleTheme: () => void
}

export default function Settings({ isDark, onToggleTheme }: SettingsProps) {
  const [exporting, setExporting] = useState(false)

  // 导出 CSV
  const handleExport = async () => {
    const now = dayjs()
    setExporting(true)
    try {
      const csv = await exportCSV(now.year(), now.month() + 1)
      // 触发浏览器下载
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `支出记录_${now.year()}年${now.month() + 1}月.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success('下载已开始')
    } catch (err) {
      message.error('导出失败：' + String(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '24px auto' }}>
      <Card title="⚙️ 设置">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 主题切换 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <BulbOutlined style={{ fontSize: 18 }} />
              <div>
                <Text strong>深色模式</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  切换深色/浅色主题
                </Text>
              </div>
            </Space>
            <Switch checked={isDark} onChange={onToggleTheme} />
          </div>

          <Divider />

          {/* 导出数据 */}
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <ExportOutlined style={{ fontSize: 18 }} />
                <div>
                  <Text strong>导出当月数据</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    导出为 CSV 格式，可用 Excel 打开
                  </Text>
                </div>
              </Space>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
                loading={exporting}
                style={{ marginTop: 8 }}
              >
                导出 {dayjs().format('YYYY 年 M 月')} 记录
              </Button>
            </Space>
          </div>

          <Divider />

          {/* 应用信息 */}
          <div>
            <Space>
              <FolderOpenOutlined style={{ fontSize: 18 }} />
              <div>
                <Text strong>关于</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  应用信息
                </Text>
              </div>
            </Space>
            <Descriptions column={1} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label="应用名称">记账</Descriptions.Item>
              <Descriptions.Item label="版本">1.0.0</Descriptions.Item>
              <Descriptions.Item label="技术栈">
                <Tag>Tauri</Tag>
                <Tag>React</Tag>
                <Tag>SQLite</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据存储">
                数据安全保存在您的电脑本地
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* 使用提示 */}
          <Card size="small" type="inner" title="💡 使用提示">
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
              • 在「记一笔」页面快速记录花销
              <br />
              • 在「支出明细」页面查看和编辑历史记录
              <br />
              • 在「月度统计」页面查看消费趋势图表
              <br />
              • 数据文件保存在用户数据目录，备份时请保留
              <br />
              • 如需修改支出分类，可编辑 src/data/categories.ts 文件
            </Paragraph>
          </Card>
        </Space>
      </Card>
    </div>
  )
}
