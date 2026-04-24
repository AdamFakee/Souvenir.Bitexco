import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import { Barcode, ChevronLeft, History, ShieldCheck, Trash2, Zap, Type } from 'lucide-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, FlatList, Text, TouchableOpacity, View, ScrollView } from 'react-native'
import { HardwareBarcodeScanner, HardwareBarcodeScannerRef } from '@/shared/components/common'
import { Input } from '@/shared/components/ui'

interface ScanItem {
  id: string
  code: string
  timestamp: Date
}

export default function BarcodeTestScreen() {
  const [scans, setScans] = useState<ScanItem[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [latestCode, setLatestCode] = useState('')

  // Test inputs state
  const [testInput1, setTestInput1] = useState('')
  const [testInput2, setTestInput2] = useState('')
  const [testInput3, setTestInput3] = useState('')

  const scannerRef = useRef<HardwareBarcodeScannerRef>(null)

  const router = useRouter()
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [])

  const handleScan = useCallback((codes: string[]) => {
    const newEntries: ScanItem[] = codes.map((code) => ({
      id: Math.random().toString(36).substring(7),
      code,
      timestamp: new Date(),
    }))

    setScans((prev) => [...newEntries, ...prev])
    setLatestCode(codes[codes.length - 1])

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [])

  const clearHistory = () => {
    setScans([])
    setLatestCode('')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const refocus = () => {
    scannerRef.current?.focus()
  }

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <LinearGradient colors={['#0f172a', '#1e293b']} className="flex-1 pt-[60px]">
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between px-5">
          <TouchableOpacity onPress={() => router.back()} className="rounded-xl bg-white/10 p-2">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="font-bold text-xl text-white">Barcode Scanner Test</Text>
          <TouchableOpacity onPress={clearHistory} className="p-2">
            <Trash2 color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={refocus}
            className="mx-5 items-center rounded-[24px] border border-white/10 bg-white/5 p-6"
          >
            <View className="mb-5 flex-row items-center rounded-full bg-black/20 px-3 py-1.5">
              <View
                className={`mr-2 h-2 w-2 rounded-full ${isFocused ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`}
              />
              <Text className="font-semibold text-xs text-slate-300">
                {isFocused ? 'Scanner Ready' : 'Scanner Inactive (Tap to refocus)'}
              </Text>
            </View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }} className="mb-5">
              <Barcode color="#60a5fa" size={48} strokeWidth={1.5} />
            </Animated.View>

            <Text className="text-center text-sm leading-5 text-slate-400">
              Point your Newland scanner at a barcode and press the trigger.
            </Text>
          </TouchableOpacity>

          {/* MANUAL TEST INPUTS SECTION */}
          <View className="mt-8 px-5">
            <View className="mb-4 flex-row items-center">
              <Type size={18} color="#94a3b8" />
              <Text className="ml-2 font-semibold text-sm uppercase tracking-widest text-slate-400">
                Focus Test Fields
              </Text>
            </View>

            <View className="gap-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <Input
                placeholder="Test Input 1 (Focus here)"
                value={testInput1}
                onChangeText={setTestInput1}
                className="border-slate-700 bg-slate-800"
              />
              <Input
                placeholder="Test Input 2"
                value={testInput2}
                onChangeText={setTestInput2}
                className="border-slate-700 bg-slate-800"
              />
              <Input
                placeholder="Test Input 3 (Finish here)"
                value={testInput3}
                onChangeText={setTestInput3}
                className="border-slate-700 bg-slate-800"
              />
              <Text className="text-[10px] italic text-slate-500">
                Khi bạn gõ xong và đóng bàn phím, Scanner sẽ tự lấy lại focus nhờ Listener.
              </Text>
            </View>
          </View>

          {/* Recent Scan */}
          <View className="mt-8 px-5">
            <View className="mb-3 flex-row items-center">
              <Zap size={18} color="#fbbf24" />
              <Text className="ml-2 font-semibold text-sm uppercase tracking-widest text-slate-400">
                Latest Result
              </Text>
            </View>
            <View className="items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
              <Text className="font-bold text-2xl tracking-widest text-white">
                {latestCode || 'Waiting for scan...'}
              </Text>
            </View>
          </View>

          {/* History List */}
          <View className="mt-8 px-5">
            <View className="mb-3 flex-row items-center">
              <History size={18} color="#94a3b8" />
              <Text className="ml-2 font-semibold text-sm uppercase tracking-widest text-slate-400">
                Scan History ({scans.length})
              </Text>
            </View>

            {scans.map((item) => (
              <View
                key={item.id}
                className="mb-3 flex-row items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4"
              >
                <View>
                  <Text className="font-medium text-base text-slate-50">{item.code}</Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    {item.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <ShieldCheck size={20} color="#22c55e" />
              </View>
            ))}

            {scans.length === 0 && (
              <View className="items-center py-10">
                <Text className="text-base text-slate-600">No scans yet</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* REUSABLE SCANNER COMPONENT */}
        <HardwareBarcodeScanner ref={scannerRef} onScan={handleScan} onFocusChange={setIsFocused} />
      </LinearGradient>
    </View>
  )
}
