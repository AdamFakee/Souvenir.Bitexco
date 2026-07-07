import { Input, ModalBase, Shimmer } from '@/shared/components/ui'
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
    <ModalBase visible={visible} onClose={() => setVisible(false)} className="max-w-[600px]">
      <View>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-outline-variant px-10 py-7">
          <View className="flex-1 flex-row items-center gap-4">
            {step === 'search' && (
              <Pressable onPress={() => setStep('type')} className="p-2">
                <ArrowLeft size={24} color={COLORS.surface.onVariant} />
              </Pressable>
            )}
            <Text className="flex-1 text-3xl font-black text-surface-on" numberOfLines={1}>
              {step === 'type'
                ? 'Thêm phiên mới'
                : selectedAgentType === 'agent'
                  ? 'Chọn đại lý'
                  : 'Chọn cộng tác viên'}
            </Text>
          </View>
          <Pressable onPress={() => setVisible(false)} className="p-2">
            <X size={28} color={COLORS.surface.onVariant} />
          </Pressable>
        </View>

        {/* Body: step 1 auto height, step 2 fixed 560 */}
        {step === 'type' ? (
          <View className="items-center px-10 py-12">
            <View className="w-full gap-5">
              {(
                Object.entries(AGENT_TYPE_CONFIG) as [
                  keyof typeof AGENT_TYPE_CONFIG,
                  (typeof AGENT_TYPE_CONFIG)[keyof typeof AGENT_TYPE_CONFIG],
                ][]
              ).map(([key, config]) => (
                <Pressable
                  key={key}
                  onPress={() => handleSelectType(config.agentType)}
                  className="flex-row items-center gap-6 rounded-2xl border border-outline-variant bg-surface-50 p-8 active:bg-surface-100"
                >
                  <View
                    className="h-16 w-16 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        key === 'retail'
                          ? COLORS.neutral[100]
                          : key === 'collaborator'
                            ? COLORS.primary.on
                            : '#fef3c7',
                    }}
                  >
                    <config.icon
                      size={32}
                      color={
                        key === 'retail'
                          ? COLORS.neutral[500]
                          : key === 'collaborator'
                            ? COLORS.primary.default
                            : '#b45309'
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-black text-surface-on">{config.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="px-10 py-6" style={{ height: 560 }}>
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
              className="mb-6"
            />

            {isLoading ? (
              <View className="gap-4">
                {[...Array(5)].map((_, i) => (
                  <View
                    key={i}
                    className="flex-row items-center gap-4 rounded-xl bg-surface-100 p-6"
                  >
                    <Shimmer className="h-12 w-12 rounded-full" />
                    <View className="flex-1 gap-2">
                      <Shimmer className="h-5 w-44 rounded" />
                      <Shimmer className="h-4 w-56 rounded" />
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
                      className="flex-row items-center gap-4 rounded-xl border-b border-outline-variant px-4 py-6 active:bg-surface-100"
                      style={isInactive ? { opacity: 0.6 } : undefined}
                    >
                      <View
                        className="h-14 w-14 items-center justify-center rounded-full"
                        style={{
                          backgroundColor:
                            item.agentType === 'agent' ? '#fef3c7' : COLORS.primary.on,
                        }}
                      >
                        <User
                          size={28}
                          color={item.agentType === 'agent' ? '#b45309' : COLORS.primary.default}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-xl font-black ${
                            isInactive ? 'text-neutral-400 line-through' : 'text-surface-on'
                          }`}
                        >
                          {item.name}
                        </Text>
                        <Text className="mt-1 text-base text-muted">
                          {item.code} · {item.phone}
                        </Text>
                      </View>
                      {isInactive && (
                        <View className="rounded-full bg-error/10 px-3 py-1">
                          <Text className="text-xs font-bold text-error">Ngừng hoạt động</Text>
                        </View>
                      )}
                    </Pressable>
                  )
                }}
                ListEmptyComponent={
                  <View className="items-center py-20">
                    <Text className="text-lg text-muted">
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
