import { Input, ModalBase, Shimmer, IconButton } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { FlashList } from '@shopify/flash-list'
import { ArrowLeft, Search, User, Users, X } from 'lucide-react-native'
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useDebounce } from 'use-debounce'
import { useAffiliates } from '../hooks/use-affiliates'
import { Affiliate, AgentType } from '../types/cart.types'

type AddTabStep = 'type' | 'search'

interface AddTabSheetProps {
  onSelect: (affiliate: Affiliate | null) => void
}

export interface AddTabSheetRef {
  open: () => void
  close: () => void
}

const AGENT_TYPE_CONFIG: Record<
  'retail' | 'collaborator' | 'agent',
  { label: string; icon: React.ElementType; agentType: AgentType }
> = {
  retail: { label: 'Khách lẻ', icon: User, agentType: 'retail' },
  collaborator: {
    label: 'Cộng tác viên',
    icon: Users,
    agentType: 'collaborator',
  },
  agent: {
    label: 'Đại lý',
    icon: Users,
    agentType: 'agent',
  },
}

export const AddTabSheet = forwardRef<AddTabSheetRef, AddTabSheetProps>(function AddTabSheet(
  { onSelect },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<AddTabStep>('type')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch] = useDebounce(searchText.trim(), 300)
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null)

  const { data: affiliates, isLoading } = useAffiliates({
    q: debouncedSearch || undefined,
    agentType: selectedAgentType ?? undefined,
  })

  useImperativeHandle(ref, () => ({
    open: () => {
      setStep('type')
      setSearchText('')
      setSelectedAgentType(null)
      setVisible(true)
    },
    close: () => setVisible(false),
  }))

  const handleSelectType = useCallback(
    (agentType: AgentType) => {
      if (agentType === 'retail') {
        onSelect(null)
        setVisible(false)
        return
      }
      setSelectedAgentType(agentType)
      setStep('search')
    },
    [onSelect],
  )

  const handleSelectAffiliate = useCallback(
    (affiliate: Affiliate) => {
      if (!affiliate.isActive) return
      onSelect(affiliate)
      setVisible(false)
    },
    [onSelect],
  )

  return (
    <ModalBase visible={visible} onClose={() => setVisible(false)} className="max-w-[500px]">
      <View>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-outline-variant px-6 py-4">
          <View className="flex-1 flex-row items-center gap-4">
            {step === 'search' && (
              <IconButton
                icon={ArrowLeft}
                onPress={() => setStep('type')}
                size={24}
                color={COLORS.surface.onVariant}
                className="bg-surface-100"
              />
            )}
            <Text className="flex-1 text-xl font-black text-surface-on" numberOfLines={1}>
              {step === 'type'
                ? 'Thêm phiên mới'
                : selectedAgentType === 'agent'
                  ? 'Chọn đại lý'
                  : 'Chọn cộng tác viên'}
            </Text>
          </View>
          <IconButton
            icon={X}
            onPress={() => setVisible(false)}
            size={24}
            color={COLORS.surface.onVariant}
            className="bg-surface-100"
          />
        </View>

        {/* Body: step 1 auto height, step 2 fixed height */}
        {step === 'type' ? (
          <View className="items-center px-6 py-8">
            <View className="w-full gap-4">
              {(
                Object.entries(AGENT_TYPE_CONFIG) as [
                  keyof typeof AGENT_TYPE_CONFIG,
                  (typeof AGENT_TYPE_CONFIG)[keyof typeof AGENT_TYPE_CONFIG],
                ][]
              ).map(([key, config]) => (
                <Pressable
                  key={key}
                  onPress={() => handleSelectType(config.agentType)}
                  className="flex-row items-center gap-4 rounded-xl border border-outline-variant bg-white p-4"
                  style={({ pressed }) => [
                    pressed && { backgroundColor: COLORS.surface[100], opacity: 0.7 },
                  ]}
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor:
                        key === 'retail'
                          ? COLORS.neutral[100]
                          : key === 'collaborator'
                            ? `${COLORS.primary.default}1A`
                            : '#fffbeb',
                    }}
                  >
                    <config.icon
                      size={24}
                      color={
                        key === 'retail'
                          ? COLORS.neutral[500]
                          : key === 'collaborator'
                            ? COLORS.primary.default
                            : '#d97706'
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-surface-on">{config.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="px-6 py-6" style={{ height: 480 }}>
            <Input
              placeholder={
                selectedAgentType === 'agent'
                  ? 'Tìm đại lý theo tên, mã, SĐT...'
                  : 'Tìm CTV theo tên, mã, SĐT...'
              }
              value={searchText}
              onChangeText={setSearchText}
              leftIcon={Search}
              autoFocus
              className="mb-4"
            />

            {isLoading ? (
              <View className="gap-3">
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    className="flex-row items-center gap-4 rounded-xl bg-surface-100 p-4"
                  >
                    <Shimmer className="h-10 w-10 rounded-full" />
                    <View className="flex-1 gap-2">
                      <Shimmer className="h-4 w-44 rounded" />
                      <Shimmer className="h-3 w-56 rounded" />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <FlashList
                data={affiliates ?? []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isInactive = !item.isActive
                  return (
                    <Pressable
                      onPress={() => handleSelectAffiliate(item)}
                      className="flex-row items-center gap-4 border-b border-surface-100 bg-white px-4 py-4"
                      style={({ pressed }) => [
                        isInactive ? { opacity: 0.6 } : {},
                        pressed && { backgroundColor: COLORS.surface[100] },
                      ]}
                    >
                      <View
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          backgroundColor:
                            item.agentType === 'agent' ? '#fffbeb' : `${COLORS.primary.default}1A`,
                        }}
                      >
                        <User
                          size={20}
                          color={item.agentType === 'agent' ? '#d97706' : COLORS.primary.default}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-base font-bold ${
                            isInactive ? 'text-neutral-400 line-through' : 'text-surface-on'
                          }`}
                        >
                          {item.name}
                        </Text>
                        <Text className="mt-0.5 text-sm text-muted">
                          {item.code} · {item.phone}
                        </Text>
                      </View>
                      {isInactive && (
                        <View className="rounded-md bg-error/10 px-2 py-1">
                          <Text className="text-[10px] font-bold text-error">Ngừng HĐ</Text>
                        </View>
                      )}
                    </Pressable>
                  )
                }}
                ListEmptyComponent={
                  <View className="items-center py-20">
                    <Text className="text-base text-muted">
                      {searchText.trim()
                        ? 'Không tìm thấy kết quả phù hợp'
                        : 'Nhập tên, mã hoặc SĐT để tìm kiếm'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </View>
    </ModalBase>
  )
})
