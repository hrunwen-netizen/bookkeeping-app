import { useState } from 'react'
import { ConfigProvider, theme as antTheme } from 'antd'
import Layout from './components/Layout'
import AddExpense from './components/AddExpense'
import ExpenseList from './components/ExpenseList'
import MonthlyReport from './components/MonthlyReport'
import Settings from './components/Settings'

export type PageKey = 'add' | 'list' | 'report' | 'settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('add')
  const [isDark, setIsDark] = useState(false)

  const renderPage = () => {
    switch (currentPage) {
      case 'add':
        return <AddExpense onSuccess={() => setCurrentPage('list')} />
      case 'list':
        return <ExpenseList />
      case 'report':
        return <MonthlyReport />
      case 'settings':
        return <Settings isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      default:
        return <AddExpense onSuccess={() => setCurrentPage('list')} />
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </ConfigProvider>
  )
}
