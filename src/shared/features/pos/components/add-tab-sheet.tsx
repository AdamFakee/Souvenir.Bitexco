import { IconButton, ModalBase, SearchInput, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { FlashList } from '@shopify/flash-list'
import { ArrowLeft, Building2, Hash, Phone, Search, Store, Users, X } from 'lucide-react-native'
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

const AGENT_TYPE_CONFIG = [
  {
    key: 'retail' as const,
    label: 'Khách lẻ',
    icon: Store,
    agentType: 'retail' as AgentType,
    iconBg: COLORS.surface[200],
    iconColor: COLORS.primary.default,
  },
  {
    key: 'collaborator' as const,
    label: 'Cộng tác viên',
    icon: Users,
    agentType: 'collaborator' as AgentType,
    iconBg: `${COLORS.primary.default}18`,
    iconColor: COLORS.primary.default,
  },
  {
    key: 'agent' as const,
    label: 'Đại lý',
    icon: Building2,
    agentType: 'agent' as AgentType,
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
  },
]

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
      setSearchText('')
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

  const title =
    step === 'type'
      ? 'Thêm phiên bán'
      : selectedAgentType === 'agent'
        ? 'Chọn đại lý'
        : 'Chọn cộng tác viên'
  return (
    <ModalBase
      visible={visible}
      onClose={() => setVisible(false)}
      className="mx-6 h-[680px] w-[900px] rounded-3xl bg-white"
    >
      {/* Header — luôn hiện */}
      <View className="flex-row items-center justify-between border-b border-outline-variant px-6 py-5">
        <View className="min-w-0 flex-1 flex-row items-center gap-3 pr-3">
          {step === 'search' && (
            <IconButton
              icon={ArrowLeft}
              onPress={() => {
                setStep('type')
                setSearchText('')
                setSelectedAgentType(null)
              }}
              size={26}
              color={COLORS.surface.onVariant}
              className="h-13 w-13 rounded-xl bg-surface-100"
              accessibilityLabel="Quay lại"
            />
          )}
          <View className="min-w-0 flex-1">
            <Text className="text-4xl font-extrabold text-surface-on" numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        <IconButton
          icon={X}
          onPress={() => setVisible(false)}
          size={26}
          color={COLORS.surface.onVariant}
          className="h-13 w-13 rounded-xl bg-surface-100"
          accessibilityLabel="Đóng"
        />
      </View>

      {step === 'type' ? (
        <View className="flex-1 gap-5 px-6 py-6">
          {AGENT_TYPE_CONFIG.map((config) => {
            const Icon = config.icon
            return (
              <Pressable
                key={config.key}
                accessibilityRole="button"
                accessibilityLabel={config.label}
                onPress={() => handleSelectType(config.agentType)}
                className="flex-1 flex-row items-center gap-6 rounded-3xl border border-outline-variant bg-surface-50 px-8 py-5"
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.85 : 1,
                    backgroundColor: pressed ? COLORS.primary.fixed : COLORS.surface[50],
                    borderColor: pressed
                      ? COLORS.primary.default
                      : COLORS.outline?.variant || '#E5E7EB',
                  },
                ]}
              >
                <View
                  className="h-20 w-20 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: config.iconBg }}
                >
                  <Icon size={40} color={config.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-3xl font-extrabold text-surface-on">{config.label}</Text>
                  <Text className="mt-1.5 text-lg font-semibold text-surface-on-variant">
                    {config.key === 'retail'
                      ? 'Tạo nhanh phiên bán cho khách mua trực tiếp tại cửa hàng'
                      : config.key === 'collaborator'
                        ? 'Gắn phiên bán cho cộng tác viên để ghi nhận doanh số và chiết khấu'
                        : 'Gắn phiên bán cho đại lý với chính sách giá và công nợ riêng'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      ) : (
        <View className="flex-1 px-6 py-5">
          <SearchInput
            placeholder={
              selectedAgentType === 'agent'
                ? 'Tìm đại lý theo tên, mã, SĐT...'
                : 'Tìm CTV theo tên, mã, SĐT...'
            }
            value={searchText}
            onChangeText={setSearchText}
            size="md"
            autoFocus
            containerClassName="mb-5"
          />

          {isLoading ? (
            <View className="gap-3">
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  className="min-h-[108px] flex-row items-center gap-6 rounded-2xl bg-surface-100 px-6 py-5"
                >
                  <Shimmer className="h-[72px] w-[72px] rounded-2xl" />
                  <View className="flex-1 gap-2.5">
                    <Shimmer className="h-6 w-64 rounded" />
                    <Shimmer className="h-5 w-48 rounded" />
                    <Shimmer className="h-5 w-40 rounded" />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlashList
              data={affiliates ?? []}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isInactive = !item.isActive
                const isAgent = item.agentType === 'agent'
                const phone = item.phone?.trim()

                const accentColor = isAgent ? '#B45309' : COLORS.primary.default
                const avatarBg = isAgent ? '#FEF3C7' : `${COLORS.primary.default}18`

                const AvatarIcon = isAgent ? Building2 : Users

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isInactive }}
                    accessibilityLabel={phone ? `${item.name}, ${phone}` : item.name}
                    disabled={isInactive}
                    onPress={() => handleSelectAffiliate(item)}
                    className="mb-3 overflow-hidden rounded-2xl border border-outline-variant bg-white"
                    style={({ pressed }) => ({
                      opacity: isInactive ? 0.5 : 1,
                      backgroundColor: pressed ? COLORS.primary.fixed : '#fff',
                      borderColor: pressed ? accentColor + '60' : undefined,
                    })}
                  >
                    <View className="flex-row items-center gap-5 px-6 py-5">
                      {/* Avatar icon */}
                      <View
                        className="h-[72px] w-[72px] items-center justify-center rounded-2xl"
                        style={{ backgroundColor: avatarBg }}
                      >
                        <AvatarIcon size={34} color={accentColor} strokeWidth={2} />
                      </View>

                      {/* Info */}
                      <View className="min-w-0 flex-1">
                        {/* Tên */}
                        <Text
                          className={`mb-2 text-2xl font-extrabold ${
                            isInactive ? 'text-surface-on-variant line-through' : 'text-surface-on'
                          }`}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        {/* Pills: Mã + SĐT */}
                        <View className="flex-row flex-wrap items-center gap-2.5">
                          <View className="flex-row items-center gap-1.5 rounded-lg bg-surface-100 py-1.5 pr-3">
                            <Hash size={14} color={COLORS.surface.onVariant} strokeWidth={2.5} />
                            <Text className="text-sm font-bold text-surface-on-variant">
                              {item.code}
                            </Text>
                          </View>
                          {!!phone && (
                            <View
                              className="flex-row items-center gap-1.5 rounded-lg px-3 py-1.5"
                              style={{ backgroundColor: accentColor + '15' }}
                            >
                              <Phone size={14} color={accentColor} strokeWidth={2.5} />
                              <Text style={{ color: accentColor, fontSize: 14, fontWeight: '700' }}>
                                {phone}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Trailing: status hoặc chevron */}
                      {isInactive && (
                        <View className="rounded-full bg-error/10 px-4 py-2">
                          <Text className="text-sm font-extrabold uppercase text-error">
                            Dừng hoạt động
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                )
              }}
              ListEmptyComponent={
                <View className="items-center px-6 py-16">
                  <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-surface-100">
                    <Search size={36} color={COLORS.muted} />
                  </View>
                  <Text className="text-center text-2xl font-bold text-surface-on">
                    {searchText.trim() ? 'Không tìm thấy' : 'Bắt đầu tìm kiếm'}
                  </Text>
                  <Text className="mt-2.5 text-center text-lg leading-6 text-surface-on-variant">
                    {searchText.trim()
                      ? `Không có kết quả cho "${searchText.trim()}"`
                      : 'Nhập tên, mã hoặc SĐT để chọn người gắn phiên'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </ModalBase>
  )
})
