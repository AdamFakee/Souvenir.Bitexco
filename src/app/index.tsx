import {
  AppHeader,
  Button,
  Container,
  Input,
  LoadingIndicator,
  OptionCard,
  Placeholder,
} from '@/shared/components/ui'
import { Bell, Home, Search, Star } from 'lucide-react-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

export default function Index() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-6">
      <Text className="text-heading mb-3 font-bold text-primary">{title}</Text>
      {children}
    </View>
  )

  return (
    <View className="flex-1 bg-background-white">
      {/* AppHeader - Gradient */}
      <AppHeader
        title="UI Components Demo"
        variant="gradient"
        rightIcon={Bell}
        showLeftButton={false}
      />

      <ScrollView className="flex-1 px-md py-md" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ---------- BUTTONS ---------- */}
        <Section title="Button">
          <View className="gap-3">
            <Button label="Primary Button" variant="primary" />
            <Button label="Outline Button" variant="outline" />
            <Button label="Secondary Button" variant="secondary" />
            <Button label="With Left Icon" variant="primary" leftIcon={Home} />
            <Button label="With Right Icon" variant="outline" rightIcon={Search} />
            <Button label="Loading State" variant="primary" loading={true} />
            <Button label="Disabled" variant="primary" disabled />
          </View>
        </Section>

        {/* ---------- APP HEADER VARIANTS ---------- */}
        <Section title="AppHeader">
          <View className="gap-3 overflow-hidden rounded-lg">
            <Text className="text-desc mb-1 text-text-secondary">Gradient Variant</Text>
            <View className="overflow-hidden rounded-lg">
              <AppHeader title="Gradient Header" variant="gradient" rightIcon={Bell} />
            </View>
            <Text className="text-desc mb-1 mt-2 text-text-secondary">White Variant</Text>
            <View className="overflow-hidden rounded-lg border border-background-secondary">
              <AppHeader title="White Header" variant="white" rightIcon={Star} showBorderBottom />
            </View>
          </View>
        </Section>

        {/* ---------- CONTAINER ---------- */}
        <Section title="Container">
          <View className="gap-3">
            <Container>
              <Text className="text-desc text-text-primary-black">Default Container</Text>
            </Container>
            <Container shadow>
              <Text className="text-desc text-text-primary-black">Container with Shadow</Text>
            </Container>
            <Container centered className="h-16">
              <Text className="text-desc text-text-primary-black">Centered Container</Text>
            </Container>
          </View>
        </Section>

        {/* ---------- INPUTS ---------- */}
        <Section title="Input">
          <View className="gap-3">
            <Input placeholder="Normal input..." value={inputValue} onChangeText={setInputValue} />
            <Input placeholder="Error state input..." error />
            <Input placeholder="Disabled input..." editable={false} />
          </View>
        </Section>

        {/* ---------- OPTION CARD ---------- */}
        <Section title="OptionCard">
          {['Option A', 'Option B', 'Option C'].map((opt) => (
            <OptionCard
              key={opt}
              text={opt}
              isSelected={selectedOption === opt}
              onPress={() => setSelectedOption(opt)}
              leftIcon={<Star size={20} color={selectedOption === opt ? '#9B0000' : '#707070'} />}
            />
          ))}
        </Section>

        {/* ---------- LOADING ---------- */}
        <Section title="LoadingIndicator">
          <View className="flex-row items-center gap-6">
            <LoadingIndicator size="small" />
            <LoadingIndicator size="large" />
            <LoadingIndicator size="large" color="#9B0000" />
          </View>
        </Section>

        {/* ---------- PLACEHOLDER ---------- */}
        <Section title="Placeholder">
          <View className="h-32 w-full overflow-hidden rounded-lg">
            <Placeholder text="Placeholder content" />
          </View>
        </Section>
      </ScrollView>
    </View>
  )
}
