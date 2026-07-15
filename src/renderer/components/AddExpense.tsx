import { useState } from 'react'
import {
  Card,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  message,
  Space,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { addExpense } from '../database'
import { getCategoryL1List, getCategoryL2List } from '../data/categories'

interface AddExpenseProps {
  onSuccess?: () => void
}

export default function AddExpense({ onSuccess }: AddExpenseProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categoryL1, setCategoryL1] = useState<string | null>(null)

  const categoryL1List = getCategoryL1List()
  const categoryL2List = categoryL1 ? getCategoryL2List(categoryL1) : []

  // 当一级分类改变时，清空二级分类
  const handleCategoryL1Change = (value: string) => {
    setCategoryL1(value)
    form.setFieldValue('category_l2', undefined)
  }

  const handleSubmit = async (values: {
    amount: number
    category_l1: string
    category_l2: string
    date: dayjs.Dayjs
    note?: string
  }) => {
    setLoading(true)
    try {
      await addExpense({
        amount: values.amount,
        category_l1: values.category_l1,
        category_l2: values.category_l2,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || '',
      })
      message.success('记账成功！')
      form.resetFields()
      setCategoryL1(null)
      if (onSuccess) onSuccess()
    } catch (err) {
      message.error('保存失败：' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-expense-page">
      <Card
        title="📝 记一笔"
        className="add-expense-card"
        extra={
          <Button type="link" onClick={() => onSuccess?.()}>
            查看明细 →
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            date: dayjs(),
          }}
          size="large"
        >
          {/* 金额 */}
          <Form.Item
            name="amount"
            label="金额（元）"
            rules={[
              { required: true, message: '请输入金额' },
              {
                type: 'number',
                min: 0.01,
                max: 99999999.99,
                message: '金额需在 0.01 ~ 99999999.99 之间',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="花了多少钱？"
              precision={2}
              prefix="¥"
              autoFocus
            />
          </Form.Item>

          {/* 一级分类 */}
          <Form.Item
            name="category_l1"
            label="支出类别"
            rules={[{ required: true, message: '请选择支出类别' }]}
          >
            <Select
              placeholder="选择一级分类"
              options={categoryL1List.map((c) => ({ label: c, value: c }))}
              onChange={handleCategoryL1Change}
            />
          </Form.Item>

          {/* 二级分类 */}
          <Form.Item
            name="category_l2"
            label="具体分类"
            rules={[{ required: true, message: '请选择具体分类' }]}
          >
            <Select
              placeholder={categoryL1 ? '选择具体分类' : '请先选择支出类别'}
              options={categoryL2List.map((c) => ({ label: c, value: c }))}
              disabled={!categoryL1}
            />
          </Form.Item>

          {/* 日期 */}
          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              allowClear={false}
            />
          </Form.Item>

          {/* 备注 */}
          <Form.Item name="note" label="备注（可选）">
            <Input.TextArea
              placeholder="写点备注，比如在哪买的、和谁一起..."
              maxLength={200}
              showCount
              rows={2}
            />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={loading}
                size="large"
                style={{ width: '100%' }}
              >
                保存记录
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
