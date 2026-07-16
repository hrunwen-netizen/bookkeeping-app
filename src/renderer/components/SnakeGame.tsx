import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, Button, Space, message } from 'antd'
import { PlayCircleOutlined, PauseOutlined } from '@ant-design/icons'

// 游戏配置
const BOARD_SIZE = 20
const CELL_SIZE = 24
const INITIAL_SPEED = 150
const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE

// 初始蛇位置
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
]

// 方向
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
const DIRECTION_MAP: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}
const OPPOSITES: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}
const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
}

// 限速消息
message.config({ maxCount: 3, duration: 2 })

// 从 score 推导速度
function calcSpeed(score: number): number {
  return Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 15)
}

// 生成随机食物位置（带最大迭代保护）
function randomFood(snake: { x: number; y: number }[]): { x: number; y: number } | null {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`))
  // 蛇占满全屏 → 胜利
  if (occupied.size >= TOTAL_CELLS) return null
  let pos: { x: number; y: number }
  let iterations = 0
  const maxIter = TOTAL_CELLS * 2
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    }
    iterations++
  } while (occupied.has(`${pos.x},${pos.y}`) && iterations < maxIter)
  // 极端情况下找不到（几乎不可能），回退线性扫描
  if (occupied.has(`${pos.x},${pos.y}`)) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (!occupied.has(`${x},${y}`)) return { x, y }
      }
    }
  }
  return pos
}

// 静态棋盘网格
function GridPattern() {
  return Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => (
      <rect
        key={`${x}-${y}`}
        x={x} y={y} width={1} height={1}
        fill={(x + y) % 2 === 0 ? '#16213e' : '#1a1a3e'}
      />
    ))
  )
}

export default function SnakeGame() {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>(INITIAL_SNAKE)
  const [food, setFood] = useState<{ x: number; y: number } | null>(
    () => randomFood(INITIAL_SNAKE)
  )
  const [isRunning, setIsRunning] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try { return Number(localStorage.getItem('snake_high_score')) || 0 }
    catch { return 0 }
  })

  // firef 存储所有游戏循环需要的可变值
  const snakeRef = useRef(snake)
  const foodRef = useRef(food)
  const scoreRef = useRef(score)
  const isRunningRef = useRef(isRunning)
  const isGameOverRef = useRef(isGameOver)
  const directionRef = useRef<Direction>('RIGHT')
  const dirQueueRef = useRef<Direction[]>([])   // 方向队列，每 tick 消费一个

  // 统一同步 ref
  useEffect(() => {
    snakeRef.current = snake
    foodRef.current = food
    scoreRef.current = score
    isRunningRef.current = isRunning
    isGameOverRef.current = isGameOver
  })

  // 最高分保存（含 try-catch）
  useEffect(() => {
    if (!isGameOver) return
    if (score > highScore) {
      setHighScore(score)
      try {
        localStorage.setItem('snake_high_score', String(score))
      } catch { /* 存储不可用时静默忽略 */ }
      message.success(`🎉 新纪录！最高分：${score}`)
    }
    // 蛇占满全屏 → 胜利
    if (snake.length >= TOTAL_CELLS) {
      message.success('🏆 你赢了！蛇填满了整个棋盘！')
    }
  }, [isGameOver, score, highScore, snake.length])

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current) return

    // 从方向队列消费一个（最多一个）
    if (dirQueueRef.current.length > 0) {
      const nextDir = dirQueueRef.current.shift()!
      // 跳过队列中与当前方向相反的无效方向
      while (dirQueueRef.current.length > 0 && dirQueueRef.current[0] === nextDir) {
        dirQueueRef.current.shift()
      }
      directionRef.current = nextDir
    }

    const head = snakeRef.current[0]
    const dir = directionRef.current
    const newHead = {
      x: head.x + DIRECTION_MAP[dir].x,
      y: head.y + DIRECTION_MAP[dir].y,
    }

    // 穿墙
    if (newHead.x < 0) newHead.x = BOARD_SIZE - 1
    else if (newHead.x >= BOARD_SIZE) newHead.x = 0
    if (newHead.y < 0) newHead.y = BOARD_SIZE - 1
    else if (newHead.y >= BOARD_SIZE) newHead.y = 0

    // 先构建新蛇
    const newSnake = [newHead, ...snakeRef.current]

    // 吃到食物
    if (foodRef.current && newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      const newScore = scoreRef.current + 10
      setScore(newScore)
      const newFood = randomFood(newSnake)
      if (newFood === null) {
        // 蛇占满棋盘，胜利
        setFood(null)
        setSnake(newSnake)
        setIsGameOver(true)
        setIsRunning(false)
        isGameOverRef.current = true
        isRunningRef.current = false
        return
      }
      setFood(newFood)
      // 加速提示
      if (newScore % 50 === 0) {
        message.success(`⚡ 加速了！速度 ${calcSpeed(newScore)}ms`)
      }
    } else {
      // 没吃到食物 → 移除尾部
      newSnake.pop()
    }

    // 撞自己（检查在尾部移除之后，蛇可以跟随自己的尾巴）
    if (newSnake.some((s, i) => i > 0 && s.x === newHead.x && s.y === newHead.y)) {
      setIsGameOver(true)
      setIsRunning(false)
      isGameOverRef.current = true
      isRunningRef.current = false
      message.error('💀 咬到自己了！游戏结束')
      return
    }

    setSnake(newSnake)
  }, [])

  // 启动/停止循环
  useEffect(() => {
    if (!isRunning) return
    const speed = calcSpeed(score)
    const timer = setInterval(gameLoop, speed)
    return () => clearInterval(timer)
  }, [isRunning, score, gameLoop])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 空格键暂停/继续
      if (e.key === ' ') {
        e.preventDefault()
        if (isGameOverRef.current) {
          startGame()
        } else {
          setIsRunning(!isRunningRef.current)
        }
        return
      }

      const newDir = KEY_TO_DIRECTION[e.key]
      if (!newDir) return
      e.preventDefault()

      // 反方向检查：基于当前生效方向 + 队列中最后一个
      const effectiveDir = dirQueueRef.current.length > 0
        ? dirQueueRef.current[dirQueueRef.current.length - 1]
        : directionRef.current

      if (OPPOSITES[newDir] === effectiveDir) return
      // 避免连续重复入队
      if (dirQueueRef.current.length > 0 && dirQueueRef.current[dirQueueRef.current.length - 1] === newDir) return
      if (dirQueueRef.current.length === 0 && effectiveDir === newDir) return

      dirQueueRef.current.push(newDir)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 开始/重新开始
  const startGame = () => {
    const initial = [...INITIAL_SNAKE.map(s => ({ ...s }))]
    const f = randomFood(initial)
    setSnake(initial)
    setFood(f)
    setScore(0)
    setIsGameOver(false)
    setIsRunning(true)
    // 同步更新 ref
    snakeRef.current = initial
    foodRef.current = f
    scoreRef.current = 0
    directionRef.current = 'RIGHT'
    dirQueueRef.current = []
    isGameOverRef.current = false
    isRunningRef.current = true
    message.success('🎮 游戏开始！方向键或 WASD 控制，空格暂停，穿墙会从另一边出来')
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

  // 缓存静态网格
  const grid = useMemo(() => <GridPattern />, [])

  // 蛇头眼睛偏移（根据方向）
  const headDir = directionRef.current
  const eyeOffsets: [number, number, number, number] =
    headDir === 'RIGHT' ? [0.7, 0.3, 0.7, 0.7] :
    headDir === 'LEFT' ? [0.3, 0.3, 0.3, 0.7] :
    headDir === 'UP' ? [0.3, 0.3, 0.7, 0.3] :
    [0.3, 0.7, 0.7, 0.7]  // DOWN

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
            {isGameOver ? '重新开始' : isRunning ? '暂停 (空格)' : '开始 (空格)'}
          </Button>
        </Space>

        {/* 提示 */}
        <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
          方向键 ↑↓←→ 或 WASD 控制 · 空格键暂停/继续
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
          <svg
            width={BOARD_SIZE * CELL_SIZE}
            height={BOARD_SIZE * CELL_SIZE}
            viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
            style={{ display: 'block' }}
          >
            {grid}

            {/* 蛇身 */}
            {snake.map((seg, i) => (
              <rect
                key={`s-${i}`}
                x={seg.x} y={seg.y} width={1} height={1}
                rx={0.15}
                fill={i === 0 ? '#52c41a' : '#a0d911'}
                stroke={i === 0 ? '#237804' : '#5b8c00'}
                strokeWidth={0.04}
              />
            ))}

            {/* 蛇头眼睛（随方向旋转） */}
            {snake.length > 0 && (
              <>
                <circle cx={snake[0].x + eyeOffsets[0]} cy={snake[0].y + eyeOffsets[1]} r={0.12} fill="white" />
                <circle cx={snake[0].x + eyeOffsets[2]} cy={snake[0].y + eyeOffsets[3]} r={0.12} fill="white" />
              </>
            )}

            {/* 食物 */}
            {food && (
              <>
                <circle cx={food.x + 0.5} cy={food.y + 0.5} r={0.4} fill="#ff4d4f" />
                <circle cx={food.x + 0.5} cy={food.y + 0.35} r={0.1} fill="#ffccc7" />
              </>
            )}
          </svg>

          {/* 游戏结束遮罩 */}
          {isGameOver && (
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                {snake.length >= TOTAL_CELLS ? '🏆 恭喜通关！' : '💀 游戏结束'}
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
      </Card>
    </div>
  )
}
