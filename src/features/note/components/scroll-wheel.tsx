import React, { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

interface ScrollWheelProps {
  items: string[]
  selectedValue: number
  onChange: (value: number) => void
  itemHeight?: number
}

export const ScrollWheel = React.memo(
  ({ items, selectedValue, onChange, itemHeight = 54 }: ScrollWheelProps) => {
    const scrollViewRef = React.useRef<ScrollView>(null)
    const isMounted = React.useRef(false)

    // Repeat the items list 3 times: [Set 1, Set 2 (middle), Set 3] to enable seamless infinite scrolling
    const repeatedItems = [...items, ...items, ...items]
    const data = ['', ...repeatedItems, '']

    const [localVal, setLocalVal] = useState(selectedValue)

    // Position at the middle set initially
    const initialItemIndex = items.indexOf(selectedValue.toString().padStart(2, '0'))
    const initialMiddleIndex = items.length + (initialItemIndex !== -1 ? initialItemIndex : 0)
    const initialOffset = initialMiddleIndex * itemHeight

    // Track the raw active scroll index for perfect highlight alignment
    const [activeScrollIndex, setActiveScrollIndex] = useState(initialMiddleIndex)

    useEffect(() => {
      if (!isMounted.current) {
        isMounted.current = true
        const index = items.indexOf(selectedValue.toString().padStart(2, '0'))
        if (index !== -1 && scrollViewRef.current) {
          const targetIndex = items.length + index
          setActiveScrollIndex(targetIndex)
          const timer = setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: targetIndex * itemHeight,
              animated: false,
            })
          }, 100)
          return () => clearTimeout(timer)
        }
        return
      }

      if (selectedValue !== localVal) {
        setLocalVal(selectedValue)
        const index = items.indexOf(selectedValue.toString().padStart(2, '0'))
        if (index !== -1 && scrollViewRef.current) {
          const targetIndex = items.length + index
          setActiveScrollIndex(targetIndex)
          scrollViewRef.current?.scrollTo({
            y: targetIndex * itemHeight,
            animated: false,
          })
        }
      }
    }, [selectedValue, itemHeight, items])

    const handleScroll = (event: any) => {
      const y = event.nativeEvent.contentOffset.y
      const index = Math.round(y / itemHeight)
      const actualIndex = ((index % items.length) + items.length) % items.length
      if (actualIndex >= 0 && actualIndex < items.length) {
        const val = parseInt(items[actualIndex], 10)
        if (val !== localVal) {
          setLocalVal(val)
        }
        if (index !== activeScrollIndex) {
          setActiveScrollIndex(index)
        }
      }
    }

    const handleScrollEnd = (event: any) => {
      const y = event.nativeEvent.contentOffset.y
      const index = Math.round(y / itemHeight)
      const actualIndex = ((index % items.length) + items.length) % items.length
      if (actualIndex >= 0 && actualIndex < items.length) {
        const val = parseInt(items[actualIndex], 10)

        // Update parent value
        onChange(val)

        // Silent reset back to the middle set (Set 2) to maintain infinite range
        if (scrollViewRef.current) {
          const targetIndex = items.length + actualIndex
          setActiveScrollIndex(targetIndex)
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: targetIndex * itemHeight,
              animated: false,
            })
          }, 10)
        }
      }
    }

    return (
      <View style={{ height: itemHeight * 3, width: 90, overflow: 'hidden' }}>
        {/* Target Indicator Highlight Box */}
        <View
          className="absolute left-0 right-0 rounded-2xl border-y border-primary/20 bg-primary/5"
          style={{
            top: itemHeight,
            height: itemHeight,
          }}
        />
        <ScrollView
          ref={scrollViewRef}
          contentOffset={{ x: 0, y: initialOffset }}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
        >
          {data.map((item, index) => {
            const isSpacer = item === ''
            const isActive = index === activeScrollIndex + 1

            return (
              <View
                key={index}
                style={{
                  height: itemHeight,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {!isSpacer && (
                  <Text
                    className={
                      isActive
                        ? 'text-3xl font-black text-primary'
                        : 'text-xl font-medium text-muted'
                    }
                    style={{ opacity: isActive ? 1 : 0.3 }}
                  >
                    {item}
                  </Text>
                )}
              </View>
            )
          })}
        </ScrollView>
      </View>
    )
  },
)

ScrollWheel.displayName = 'ScrollWheel'
