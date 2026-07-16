import { useState, useEffect } from 'react'
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
  Segmented,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { addExpense } from '../database'
import { getAllCategoryL1List, getAllCategoryL2List, getCategoryEmoji } from '../data/categories'

interface AddExpenseProps {
  onSuccess?: () => void
}

export default function AddExpense({ onSuccess }: AddExpenseProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [recordType, setRecordType] = useState<'expense' | 'income'>('expense')
  const [categoryL1, setCategoryL1] = useState<string | null>(null)
  const [categoryL1List, setCategoryL1List] = useState<{ name: string; emoji: string }[]>([])
  const [categoryL2List, setCategoryL2List] = useState<string[]>([])
  const [noL2, setNoL2] = useState(false) // 该一级分类没有二级子分类

  // 加载分类列表（含用户自定义分类 + emoji），记录类型变化时重新加载
  useEffect(() => {
    getAllCategoryL1List(recordType).then(async (names) => {
      const list = await Promise.all(names.map(async (name) => ({
        name,
        emoji: await getCategoryEmoji(name, recordType),
      })))
      setCategoryL1List(list)
    })
    // 切换类型时清空已选分类
    setCategoryL1(null)
    setCategoryL2List([])
    setNoL2(false)
    form.setFieldValue('category_l1', undefined)
    form.setFieldValue('category_l2', undefined)
  }, [recordType])

  // 当一级分类改变时，加载对应的二级分类
  const handleCategoryL1Change = async (value: string) => {
    setCategoryL1(value)
    const l2List = await getAllCategoryL2List(value, recordType)
    setCategoryL2List(l2List)
    if (l2List.length === 0) {
      // 无二级分类：自动填入一级分类名
      setNoL2(true)
      form.setFieldValue('category_l2', value)
    } else {
      setNoL2(false)
      form.setFieldValue('category_l2', undefined)
    }
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
        type: recordType,
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
        title={`📝 记一笔 — ${recordType === 'expense' ? '支出' : '收入'}`}
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
          {/* 收入/支出切换 */}
          <Form.Item label="类型">
            <Segmented
              value={recordType}
              onChange={(val) => setRecordType(val as 'expense' | 'income')}
              options={[
                { label: '💰 支出', value: 'expense' },
                { label: '💵 收入', value: 'income' },
              ]}
              block
              size="large"
            />
          </Form.Item>

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
              placeholder={recordType === 'expense' ? '花了多少钱？' : '收入多少钱？'}
              precision={2}
              prefix="¥"
              autoFocus
            />
          </Form.Item>

          {/* 一级分类 */}
          <Form.Item
            name="category_l1"
            label={recordType === 'expense' ? '支出类别' : '收入类别'}
            rules={[{ required: true, message: recordType === 'expense' ? '请选择支出类别' : '请选择收入类别' }]}
          >
            <Select
              placeholder={recordType === 'expense' ? '选择支出分类' : '选择收入分类'}
              options={categoryL1List.map((c) => ({ label: `${c.emoji} ${c.name}`, value: c.name }))}
              onChange={handleCategoryL1Change}
            />
          </Form.Item>

          {/* 二级分类：有子分类才显示选择框，否则自动用一级分类名 */}
          {!noL2 && categoryL1 && (
            <Form.Item
              name="category_l2"
              label="具体分类"
              rules={[{ required: true, message: '请选择具体分类' }]}
            >
              <Select
                placeholder="选择具体分类"
                options={categoryL2List.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>
          )}
          {/* 无二级分类时用隐藏字段提交 */}
          {noL2 && (
            <Form.Item name="category_l2" hidden>
              <input />
            </Form.Item>
          )}

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
