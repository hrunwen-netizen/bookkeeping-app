import { Layout as AntLayout, Menu } from 'antd'
import {
  PlusCircleOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  TagsOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { PageKey } from '../App'

const { Sider, Content } = AntLayout

interface LayoutProps {
  children: React.ReactNode
  currentPage: PageKey
  onNavigate: (page: PageKey) => void
}

const menuItems = [
  { key: 'add', icon: <PlusCircleOutlined />, label: '记一笔' },
  { key: 'list', icon: <UnorderedListOutlined />, label: '账单明细' },
  { key: 'report', icon: <PieChartOutlined />, label: '月度统计' },
  { key: 'categories', icon: <TagsOutlined />, label: '分类管理' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
]

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <AntLayout className="app-layout">
      <Sider
        className="app-sider"
        breakpoint="lg"
        collapsedWidth="0"
        style={{ background: '#001529' }}
      >
        <div className="app-logo">💰 记账</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          onClick={({ key }) => onNavigate(key as PageKey)}
        />
      </Sider>
      <AntLayout>
        <Content className="app-content">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
