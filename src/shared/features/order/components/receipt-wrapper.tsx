import { subscribePrintCopyNumber } from '@/shared/services/printer-service'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

interface ReceiptWrapperProps {
  title: string
  copyNumber?: number
  children: React.ReactNode
}

export const S = {
  fs28: { fontSize: 28, fontWeight: '500' as const, lineHeight: 32 },
  fs28n: { fontSize: 28, fontWeight: '500' as const, lineHeight: 32 }, // nâng lên 500 để tránh bị mờ/mất nét khi in nhiệt
  fs28b: { fontSize: 28, fontWeight: '700' as const, lineHeight: 32 }, // cỡ chữ 28 đậm
  fs30b: { fontSize: 30, fontWeight: '600' as const, lineHeight: 34 }, // giảm xuống 600 để tránh bị nhòe/quá đậm
  fs32b: { fontSize: 32, fontWeight: '700' as const, lineHeight: 36 }, // cỡ chữ 32 đậm sắc nét
  fs36b: { fontSize: 36, fontWeight: '700' as const, lineHeight: 40 }, // cỡ chữ tiêu đề vừa phải
  fs42b: { fontSize: 42, fontWeight: '700' as const, lineHeight: 46 }, // giảm xuống 700 để chữ tiêu đề sắc nét hơn
  fs24i: { fontSize: 24, fontWeight: '500' as const, lineHeight: 28 }, // nâng lên 500 và bỏ style nghiêng
  fs24: { fontSize: 24, fontWeight: '500' as const, lineHeight: 28 }, // giảm xuống 500 để chữ nhỏ sắc nét
}

export const DashedLine = () => (
  <View
    style={{
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      borderStyle: 'dashed',
      marginVertical: 4,
    }}
  />
)

export const ReceiptWrapper = ({ title, copyNumber = 1, children }: ReceiptWrapperProps) => {
  const [copyNo, setCopyNo] = useState(copyNumber)

  useEffect(() => {
    return subscribePrintCopyNumber((num) => {
      setCopyNo(num)
    })
  }, [])

  return (
    <View style={{ backgroundColor: '#fff', paddingHorizontal: 0, paddingVertical: 5, width: 576 }}>
      {/* Header */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ ...S.fs32b, textAlign: 'center' }}>Skystore Bitexco Financial Tower</Text>
        <Text style={{ ...S.fs28n, textAlign: 'center' }}>36 Ho Tung Mau ST, District 1 HCMC</Text>
        <Text style={{ ...S.fs28n, textAlign: 'center' }}>TEL: (84-8) 39 156 156</Text>
        <Text style={{ ...S.fs32b, marginTop: 4 }}>{title}</Text>
        <Text style={S.fs28}>Copy: {copyNo}</Text>
      </View>

      {/* Children Content */}
      {children}

      <DashedLine />

      {/* Footer */}
      <View style={{ alignItems: 'center' }}>
        <Text style={S.fs24i}>Please verify your receipt before leaving.</Text>
        <Text style={S.fs24i}>No returns or exchanges.</Text>
        <Text style={S.fs24i}>Thank you for shopping with us!</Text>
      </View>
    </View>
  )
}
