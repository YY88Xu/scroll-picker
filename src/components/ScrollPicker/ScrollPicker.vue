<template>
  <div
    id="scroll-picker-container"
    class="scroll-picker-container noselect"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
    @touchmove="onTouchMove"
    @mousedown="mouseDownStart"
  >
    <div
      id="scroll-picker-move"
      class="scroll-picker-move"
      :style="{transform: `translateX(${translateX}px) translateY(0px) translateZ(1px)`, transitionDuration: `${transitionDuration}ms`}"
    >
      <div
        v-for="(item, index) in columns"
        :key="index"
        class="scroll-picker-move__item"
        :style="{width: itemWidth+'px'}"
        @click="moveTo(index)"
      >
        <span
          :class="[index===modelVal ? 'scroll-picker-move__item--active':
            index===modelVal+1 || index===modelVal-1 ? 'scroll-picker-move__item--gray' :
            index===modelVal+2 || index===modelVal-2 ? 'scroll-picker-move__item--light' :
            'scroll-picker-move__item--default']"
        >{{ item }}</span>
        <span style="font-size: 10px;">%</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import {
    defineComponent, ref, onMounted, onUnmounted, watch,
  } from 'vue'
  import wheelEmulator from './MouseWheel'

  export default defineComponent({
    name: 'ScrollPicker',
    props: {
      modelValue: {
        type: Number,
        default: 0
      },
      columns: {
        type: Array,
        default: () => [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      },
      itemWidth: {
        type: Number,
        default: 70
      },
      dampingFactor: {
        type: Number,
        default: 0.1
      }
    },
    setup(props, context) {
      const modelVal = ref(props.modelValue)

      watch(modelVal, (newVal)=>{
        context.emit('update:modelValue', newVal)
      })

      // eslint-disable-next-line
      const itemWidth = props.itemWidth

      const translateX = ref(0)
      const transitionDuration = ref(300)

      const transXBf = ref(0)
      

      const wrapWidth = ref(0)

      // 鼠标按着的时候初始值
      const mouseStartX = ref(0)

      const maxMoveX = ref(0)
      const minMoveX = ref(0)
      // 是否触发 click 事件
      const isClick = ref(true)

      const onMove = (x: number) => {
        const dis = x - mouseStartX.value
        mouseStartX.value = x
        const newPos = translateX.value + dis
        if(newPos > maxMoveX.value){
          translateX.value = translateX.value + dis * props.dampingFactor
        }else if(newPos < minMoveX.value){
          translateX.value = translateX.value + dis * props.dampingFactor
        }else{
          translateX.value = translateX.value + dis
        }
      }

      const onEnd = () => {
        if (translateX.value === maxMoveX.value) {
          modelVal.value = 0
        } else if (translateX.value === minMoveX.value) {
          modelVal.value = props.columns.length - 1
        } else {
          const dis = translateX.value - transXBf.value
          const count = Math.ceil(Math.abs(dis) / itemWidth)
          if (dis > 0) {
            modelVal.value = Math.max(0, modelVal.value - count)
          } else {
            modelVal.value = Math.min(props.columns.length - 1, modelVal.value + count)
          }
          translateX.value = -(modelVal.value * itemWidth + itemWidth/2 - wrapWidth.value / 2)
        }
      }

      const onWheelEnd = () => {
        if (translateX.value === maxMoveX.value) {
          modelVal.value = 0
        } else if (translateX.value === minMoveX.value) {
          modelVal.value = props.columns.length - 1
        } else {
          const dis = translateX.value - transXBf.value
          const count = Math.max(Math.round(Math.abs(dis) / itemWidth), 1)
          if (dis > 0) {
            modelVal.value = Math.max(0, modelVal.value - count)
          } else {
            modelVal.value = Math.min(props.columns.length - 1, modelVal.value + count)
          }
          translateX.value = -(modelVal.value * itemWidth + itemWidth/2 - wrapWidth.value / 2)
        }
      }

      // PC 端
      const mouseMove = (e: MouseEvent) => {
        onMove(e.clientX)
      }

      const mouseUpEnd = (e: MouseEvent) => {
        transitionDuration.value = 300
        const dis = Math.abs(transXBf.value - translateX.value)
        if (dis > 3) {
          isClick.value = false
        } else {
          isClick.value = true
        }

        document.removeEventListener('mousemove', mouseMove, false)
        document.removeEventListener('mouseup', mouseUpEnd, false)
        onEnd()
      }

      const mouseDownStart = (e: MouseEvent) => {
        transitionDuration.value = 0
        mouseStartX.value = e.clientX
        transXBf.value = translateX.value
        document.addEventListener('mousemove', mouseMove, false)
        document.addEventListener('mouseup', mouseUpEnd, false)
      }

      // PC 端点击具体标签
      const moveTo = (index: number) => {
        if (!isClick.value) {
          return
        }
        translateX.value = -(index * itemWidth + itemWidth/2 - wrapWidth.value / 2)
        modelVal.value = index
      }

      // 手机端 touch
      const onTouchStart = (event: TouchEvent) => {
        const touch = event.touches[0]
        mouseStartX.value = touch.clientX
        transXBf.value = translateX.value
      }

      const onTouchMove = (event: TouchEvent) => {
        event.preventDefault()
        const touch = event.touches[0]
        onMove(touch.clientX)
      }

      const onTouchEnd = () => {
        onEnd()
      }

      // 滚轮事件
      const handleStart = () => {
        transitionDuration.value = 300
        transXBf.value = translateX.value
      }

      // 超出边界加阻力
      const performDampingAlgorithm = (max: number, min: number, delta: number, currentPos: number, dampingFactor: number)=>{
        const newPos = delta + currentPos
        if(newPos > max){
          let dis = (newPos-max)*dampingFactor
          if(dis > itemWidth){
            transitionDuration.value = 0
            modelVal.value = 0
            return max
          }else{
            return max + dis
          }
        }else if(newPos < min){
          let dis = (newPos-min)*dampingFactor
          if(dis < -props.itemWidth){
            transitionDuration.value = 0
            modelVal.value = props.columns.length -1
            return min
          }else{
            return min + dis
          }
        }else{
          return newPos
        }
      }

      const handleMove = (deltaCache: {x: number; y: number}) => {
        if (Math.abs(deltaCache.x) > Math.abs(deltaCache.y)) {  //transXBf.value + deltaCache.x
          translateX.value =  performDampingAlgorithm(maxMoveX.value, minMoveX.value, deltaCache.x, transXBf.value, props.dampingFactor)
        } else {
          translateX.value = performDampingAlgorithm(maxMoveX.value, minMoveX.value, deltaCache.y, transXBf.value, props.dampingFactor)
        }
      }

      const handleEnd = (deltaCache: {x: number; y: number}) => {
        onWheelEnd()
      }

      const initPicker = ()=>{
        wrapWidth.value = document.getElementById('scroll-picker-container')?.offsetWidth || 0
        translateX.value = -(modelVal.value * itemWidth + itemWidth/2 - wrapWidth.value / 2)
        minMoveX.value = -(props.columns.length * itemWidth - itemWidth/2 - wrapWidth.value / 2)
        maxMoveX.value = wrapWidth.value / 2 - itemWidth/2
      }

      let clearWindowEvent:any = null
      onMounted(() => {
        initPicker()
        const moveContainer = document.getElementById('scroll-picker-container')
        if (moveContainer) {
          clearWindowEvent = wheelEmulator(moveContainer, {
            maxDis: itemWidth*props.columns.length,
            deltaXStep: itemWidth/2,
            deltaYStep: itemWidth,
            handleMove,
            handleEnd,
            handleStart,
          })
        }
        window.addEventListener('resize', initPicker, false)
      })

      onUnmounted(() => {
        clearWindowEvent()
        window.removeEventListener('resize', initPicker, false)
      })

      return {
        translateX,
        moveTo,
        wrapWidth,
        mouseStartX,
        mouseDownStart,
        mouseUpEnd,
        mouseMove,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        maxMoveX,
        minMoveX,
        transXBf,
        isClick,
        transitionDuration,
        modelVal,
        performDampingAlgorithm,
        initPicker,
      }
    },
  })
</script>
<style lang="stylus" scoped>
.noselect
  -webkit-touch-callout: none
  -webkit-user-select: none
  -khtml-user-select: none
  -moz-user-select: none
  -ms-user-select: none
  user-select: none

.scroll-picker-container
  overflow-x hidden
  position relative
  width 100%
  height 40px
  overflow hidden
  background #fff
  .scroll-picker-move
    transition-timing-function cubic-bezier(0.165, 0.84, 0.44, 1)
    transition-property transform
    box-sizing border-box
    position absolute
    display flex
    align-items center
    height 100%
    top 0
    bottom 0
    z-index 2
    &__item
      text-align center
      &--active
        font-size 20px
        font-weight 500
        color #262626
      &--gray
        color #565656
        font-size 14px
      &--light
        color #969696
        font-size 14px
      &--default
        color #BCBCBC
        font-size 14px
</style>
