import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Button, Space, message } from 'antd'
import { PlayCircleOutlined, PauseOutlined } from '@ant-design/icons'

// 游戏配置
const BOARD_SIZE = 20
const CELL_SIZE = 24
const INITIAL_SPEED = 150

// 方向
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
const DIRECTION_MAP: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

// 生成随机食物位置
function randomFood(snake: { x: number; y: number }[]): { x: number; y: number } {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`))
  let pos: { x: number; y: number }
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    }
  } while (occupied.has(`${pos.x},${pos.y}`))
  return pos
}

export default function SnakeGame() {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ])
  const [food, setFood] = useState(() => randomFood([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]))
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [isRunning, setIsRunning] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('snake_high_score') || '0', 10) || 0
    } catch {
      return 0
    }
  })
  const [speed, setSpeed] = useState(INITIAL_SPEED)

  const directionRef = useRef(direction)
  const snakeRef = useRef(snake)
  const foodRef = useRef(food)
  const scoreRef = useRef(score)
  const speedRef = useRef(speed)
  const isRunningRef = useRef(isRunning)
  const isGameOverRef = useRef(isGameOver)

  // 同步 ref
  useEffect(() => { directionRef.current = direction }, [direction])
  useEffect(() => { snakeRef.current = snake }, [snake])
  useEffect(() => { foodRef.current = food }, [food])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])
  useEffect(() => { isGameOverRef.current = isGameOver }, [isGameOver])

  // 游戏结束时更新最高分
  useEffect(() => {
    if (isGameOver && score > highScore) {
      setHighScore(score)
      localStorage.setItem('snake_high_score', String(score))
      message.success(`🎉 新纪录！最高分：${score}`)
    }
  }, [isGameOver])

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current) return

    const dir = directionRef.current
    const head = snakeRef.current[0]
    const newHead = {
      x: head.x + DIRECTION_MAP[dir].x,
      y: head.y + DIRECTION_MAP[dir].y,
    }

    // 穿墙（从另一边出来）
    if (newHead.x < 0) newHead.x = BOARD_SIZE - 1
    if (newHead.x >= BOARD_SIZE) newHead.x = 0
    if (newHead.y < 0) newHead.y = BOARD_SIZE - 1
    if (newHead.y >= BOARD_SIZE) newHead.y = 0

    // 撞自己
    if (snakeRef.current.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      setIsGameOver(true)
      setIsRunning(false)
      message.error('💀 咬到自己了！游戏结束')
      return
    }

    const newSnake = [newHead, ...snakeRef.current]

    // 吃到食物
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      const newScore = scoreRef.current + 10
      setScore(newScore)
      // 每 50 分加速
      if (newScore % 50 === 0 && speedRef.current > 50) {
        const newSpeed = speedRef.current - 15
        setSpeed(newSpeed)
        message.success('⚡ 加速了！')
      }
      setFood(randomFood(newSnake))
    } else {
      newSnake.pop() // 移除尾部
    }

    setSnake(newSnake)
  }, [])

  // 启动/停止循环
  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(gameLoop, speed)
    return () => clearInterval(timer)
  }, [isRunning, speed, gameLoop])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const opposites: Record<string, string> = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT',
      }
      let newDir: Direction | null = null
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newDir = 'UP'
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          newDir = 'DOWN'
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newDir = 'LEFT'
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          newDir = 'RIGHT'
          break
      }
      if (newDir && opposites[newDir] !== directionRef.current) {
        setDirection(newDir)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 开始/重新开始
  const startGame = () => {
    const initial = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]
    setSnake(initial)
    const f = randomFood(initial)
    setFood(f)
    foodRef.current = f
    setDirection('RIGHT')
    directionRef.current = 'RIGHT'
    setScore(0)
    setSpeed(INITIAL_SPEED)
    setIsGameOver(false)
    setIsRunning(true)
    message.success('🎮 游戏开始！方向键或 WASD 控制，穿墙会从另一边出来')
  }

  const togglePause = () => {
    if (isGameOver) {
      startGame()
      return
    }
    setIsRunning(!isRunning)
    if (!isRunning) {
      message.info('▶️ 继续')
    } else {
      message.info('⏸️ 暂停')
    }
  }

  return (
    <div className="snake-game-page" style={{ maxWidth: 600, margin: '24px auto', textAlign: 'center' }}>
      <Card
        title="🐍 贪吃蛇"
        extra={
          <Space size="large">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888' }}>🏆 最高分</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fa8c16' }}>{highScore}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888' }}>🍎 当前分数</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#52c41a' }}>{score}</div>
            </div>
          </Space>
        }
      >
        {/* 控制按钮 */}
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={isRunning ? <PauseOutlined /> : <PlayCircleOutlined />}
            onClick={togglePause}
            size="large"
          >
            {isGameOver ? '重新开始' : isRunning ? '暂停' : '开始'}
          </Button>
        </Space>

        {/* 提示 */}
        <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
          方向键 ↑↓←→ 或 WASD 控制移动 · 空格键暂停
        </div>

        {/* 游戏画布 */}
        <div
          style={{
            display: 'inline-block',
            border: '2px solid #333',
            background: '#1a1a2e',
            position: 'relative',
            lineHeight: 0,
          }}
        >
          {/* 网格背景 */}
          <svg
            width={BOARD_SIZE * CELL_SIZE}
            height={BOARD_SIZE * CELL_SIZE}
            viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
            style={{ display: 'block' }}
          >
            {Array.from({ length: BOARD_SIZE }, (_, y) =>
              Array.from({ length: BOARD_SIZE }, (_, x) => (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width={1}
                  height={1}
                  fill={(x + y) % 2 === 0 ? '#16213e' : '#1a1a3e'}
                />
              ))
            )}

            {/* 蛇身 */}
            {snake.map((seg, i) => (
              <rect
                key={`s-${i}`}
                x={seg.x}
                y={seg.y}
                width={1}
                height={1}
                rx={0.15}
                fill={i === 0 ? '#52c41a' : '#a0d911'}
                stroke={i === 0 ? '#237804' : '#5b8c00'}
                strokeWidth={0.04}
              />
            ))}

            {/* 蛇头眼睛 */}
            {snake.length > 0 && (
              <>
                <circle
                  cx={snake[0].x + 0.3}
                  cy={snake[0].y + 0.3}
                  r={0.12}
                  fill="white"
                />
                <circle
                  cx={snake[0].x + 0.7}
                  cy={snake[0].y + 0.3}
                  r={0.12}
                  fill="white"
                />
              </>
            )}

            {/* 食物 */}
            <circle
              cx={food.x + 0.5}
              cy={food.y + 0.5}
              r={0.4}
              fill="#ff4d4f"
            />
            <circle
              cx={food.x + 0.5}
              cy={food.y + 0.35}
              r={0.1}
              fill="#ffccc7"
            />
          </svg>

          {/* 游戏结束遮罩 */}
          {isGameOver && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                💀 游戏结束
              </div>
              <div style={{ color: '#aaa', fontSize: 16, marginBottom: 4 }}>
                得分：{score}
              </div>
              {score >= highScore && score > 0 && (
                <div style={{ color: '#fa8c16', fontSize: 18, fontWeight: 700 }}>
                  🎉 新纪录！
                </div>
              )}
            </div>
          )}
        </div>

        {/* 移动端方向键 */}
        <div style={{ marginTop: 16, display: 'none' }} className="mobile-controls">
          <div>
            <Button size="large" onClick={() => {
              const opposites: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
              if (opposites['UP'] !== directionRef.current) setDirection('UP')
            }}>↑</Button>
          </div>
          <Space>
            <Button size="large" onClick={() => {
              const opposites: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
              if (opposites['LEFT'] !== directionRef.current) setDirection('LEFT')
            }}>←</Button>
            <Button size="large" onClick={() => {
              const opposites: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
              if (opposites['DOWN'] !== directionRef.current) setDirection('DOWN')
            }}>↓</Button>
            <Button size="large" onClick={() => {
              const opposites: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
              if (opposites['RIGHT'] !== directionRef.current) setDirection('RIGHT')
            }}>→</Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}
