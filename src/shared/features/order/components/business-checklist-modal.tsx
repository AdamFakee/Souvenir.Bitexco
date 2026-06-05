import { Button, Checkbox } from '@/shared/components/ui'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export interface BusinessChecklistModalRef {
  open: (options: {
    title: string
    subtitle: string
    items: string[]
    onDontShowAgain?: () => void
    onConfirm: () => void
  }) => void
  close: () => void
}

export const BusinessChecklistModal = forwardRef<BusinessChecklistModalRef>((_, ref) => {
  const [visible, setVisible] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [checkedStates, setCheckedStates] = useState<boolean[]>([])
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [onDontShowAgainCallback, setOnDontShowAgainCallback] = useState<(() => void) | undefined>(
    undefined,
  )
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null)

  useImperativeHandle(ref, () => ({
    open: (options) => {
      setTitle(options.title)
      setSubtitle(options.subtitle)
      setItems(options.items)
      setCheckedStates(new Array(options.items.length).fill(false))
      setDontShowAgain(false)
      setOnDontShowAgainCallback(() => options.onDontShowAgain)
      setOnConfirmCallback(() => options.onConfirm)
      setVisible(true)
    },
    close: () => {
      setVisible(false)
    },
  }))

  if (!visible) return null

  const allChecked = checkedStates.every((checked) => checked)

  const handleToggle = (index: number) => {
    setCheckedStates((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const handleConfirm = () => {
    if (dontShowAgain && onDontShowAgainCallback) {
      onDontShowAgainCallback()
    }
    setVisible(false)
    onConfirmCallback?.()
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View className="gap-5 py-2">
          {items.map((item, index) => (
            <View key={index} className="flex-row items-center gap-4">
              <Checkbox checked={checkedStates[index]} onChange={() => handleToggle(index)} />
              <Text className="flex-1 text-xl font-bold text-surface-on">{item}</Text>
            </View>
          ))}

          {onDontShowAgainCallback && (
            <View className="mt-2 flex-row items-center gap-4 border-t border-outline-variant pt-4">
              <Checkbox checked={dontShowAgain} onChange={(val) => setDontShowAgain(val)} />
              <Text className="flex-1 text-lg font-bold text-muted">
                Không hiển thị lại checklist xác nhận này lần sau
              </Text>
            </View>
          )}
        </View>

        <View className="mt-2 flex-row gap-4">
          <Button
            label="Hủy bỏ"
            variant="outline"
            onPress={() => setVisible(false)}
            className="h-14 flex-1"
            textClassName="font-bold text-lg"
          />
          <Button
            label="Xác nhận"
            variant="primary"
            onPress={handleConfirm}
            className="h-14 flex-1"
            textClassName="font-bold text-lg"
          />
        </View>
      </View>
    </View>
  )
})

BusinessChecklistModal.displayName = 'BusinessChecklistModal'

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    width: 550,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e1e2',
    padding: 32,
    gap: 24,
    shadowColor: '#a8a8a8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#282929',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
  },
})
