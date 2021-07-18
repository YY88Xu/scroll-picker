type IPreventDefaultExceptionKey = 'tagName' | 'className'
export interface IWheelEmulatorOptions {
  maxDis: number
  speed: number
  deltaXStep: number
  deltaYStep: number
  invert: boolean
  discreteTime: number
  throttleTime: number
  preventDefault: boolean
  preventDefaultException: Partial<Record<IPreventDefaultExceptionKey, RegExp>>
  stopPropagation: boolean
  handleMove: (deltaCache: {x: number; y: number})=> void
  handleEnd: (deltaCache: {x: number; y: number})=> void
  handleStart: (deltaCache: {x: number; y: number})=> void
}

export interface ICompatibleWheelEvent extends WheelEvent {
  pageX: number
  pageY: number
  readonly wheelDeltaX: number
  readonly wheelDeltaY: number
  readonly wheelDelta: number
}

export interface IWheelDelta {
  x: number
  y: number
}

export interface ITouchEvent extends Event {
  altKey: any
  ctrlKey: any
  metaKey: any
  shiftKey: any
  touches: any
  targetTouches: any
  changedTouches: any
}

const preventDefaultExceptionAssert = (element: any, exceptions: IWheelEmulatorOptions['preventDefaultException']) => (
  (Object.keys(exceptions) as IPreventDefaultExceptionKey[]).some(key => (
    exceptions[key]?.test(element[key])
  ))
)

export default (element: Element, {
  maxDis = 0,
  handleEnd = (deltaCache: {x: number; y: number}) => {
    // do nothing.
  },
  handleMove = (deltaCache: {x: number; y: number}) => {
    // do nothing.
  },
  handleStart = (deltaCache: {x: number; y: number}) => {
    // do nothing.
  },
  speed = 20,
  invert = false,
  discreteTime = 200,
  throttleTime = 0,
  preventDefault = true,
  preventDefaultException = {
    tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|AUDIO)$/,
  },
  stopPropagation = false,
  deltaXStep = Infinity,
  deltaYStep = Infinity,
}: Partial<IWheelEmulatorOptions> = {}) => {
  let wheelStart = false
  let wheelMoveTimer = 0
  let wheelEndTimer = 0
  let deltaCache = {
    x: 0,
    y: 0,
  }
  let wheelCount = 0
  let lastWheelTimestamp = 0

  const beforeHandler = (event: ICompatibleWheelEvent) => {
    if (preventDefault && !preventDefaultExceptionAssert(event.target, preventDefaultException)) {
      event.preventDefault()
    }

    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  const getWheelDelta = (event: ICompatibleWheelEvent) => {
    const direction = invert ? -1 : 1

    let wheelDeltaX = 0
    let wheelDeltaY = 0

    switch (true) {
      case 'deltaX' in event:
        if (event.deltaMode === 1) {
          wheelDeltaX = -event.deltaX * speed
          wheelDeltaY = -event.deltaY * speed
        } else {
          wheelDeltaX = -event.deltaX
          wheelDeltaY = -event.deltaY
        }
        break
      case 'wheelDeltaX' in event:
        wheelDeltaX = (event.wheelDeltaX / 120) * speed
        wheelDeltaY = (event.wheelDeltaY / 120) * speed
        break
      case 'wheelDelta' in event:
        wheelDeltaX = (event.wheelDelta / 120) * speed
        wheelDeltaY = wheelDeltaX
        break
      case 'detail' in event:
        wheelDeltaX = (-event.detail / 3) * speed
        wheelDeltaY = wheelDeltaX
        break
      default:
        break
    }

    wheelDeltaX *= direction
    wheelDeltaY *= direction

    return {
      x: wheelDeltaX,
      y: wheelDeltaY,
    }
  }

  const wheelStartHandler = (event: ICompatibleWheelEvent) => {
    deltaCache = {
      x: 0,
      y: 0,
    }
    wheelCount = 0
    lastWheelTimestamp = 0
    handleStart(deltaCache)
  }

  const wheelMoveHandler = (event: ICompatibleWheelEvent, delta: IWheelDelta) => {
    // 处理 windows 企业微信内置浏览器 会同时出发多次的问题
    if ((event.timeStamp - lastWheelTimestamp) < 2) {
      return
    }

    wheelCount += 1
    lastWheelTimestamp = event.timeStamp
    // 防止滚动过大
    deltaCache.x += Math.min(Math.abs(delta.x), deltaXStep) * (delta.x < 0 ? -1 : 1)
    deltaCache.y += Math.min(Math.abs(delta.y), deltaYStep) * (delta.y < 0 ? -1 : 1)

    if (throttleTime && wheelMoveTimer) {
      return
    }

    handleMove(deltaCache)

    if (throttleTime) {
      wheelMoveTimer = window.setTimeout(() => {
        wheelMoveTimer = 0
      }, throttleTime)
    }
  }

  const wheelEndDetector = (event: ICompatibleWheelEvent) => {
    if (wheelEndTimer) {
      window.clearTimeout(wheelEndTimer)
      wheelEndTimer = 0
    }

    wheelEndTimer = window.setTimeout(() => {
      wheelStart = false
      window.clearTimeout(wheelMoveTimer)
      wheelMoveTimer = 0

      if (wheelCount < 2 && (Math.abs(deltaCache.x) < deltaXStep || Math.abs(deltaCache.y) < deltaYStep)) {
        //防止鼠标滚动距离太小
        deltaCache.x = Math.max(Math.abs(deltaCache.x), deltaXStep) * (deltaCache.x < 0 ? -1 : 1)
        deltaCache.y = Math.max(Math.abs(deltaCache.y), deltaYStep) * (deltaCache.y < 0 ? -1 : 1)
        handleMove(deltaCache)
      }
      handleEnd(deltaCache)
    }, discreteTime)
  }

  const wheelHandler = (e: Event) => {
    const event = e as ICompatibleWheelEvent
    if((Math.abs(deltaCache.x)>maxDis || Math.abs(deltaCache.y)>maxDis) && maxDis !==0){
      // start
      if (!wheelStart) {
        wheelStartHandler(event)
        wheelStart = true
      }
      return
    }

    beforeHandler(event)

    const delta = getWheelDelta(event)

    // start
    if (!wheelStart) {
      wheelStartHandler(event)
      wheelStart = true
    }

    // move
    wheelMoveHandler(event, delta)

    // end
    wheelEndDetector(event)
  }

  element.addEventListener('wheel', wheelHandler, false)
  element.addEventListener('mousewheel', wheelHandler, false)
  element.addEventListener('DOMMouseScroll', wheelHandler, false)

  return () => {
    element.removeEventListener('wheel', wheelHandler, false)
    element.removeEventListener('mousewheel', wheelHandler, false)
    element.removeEventListener('DOMMouseScroll', wheelHandler, false)
  }
}
