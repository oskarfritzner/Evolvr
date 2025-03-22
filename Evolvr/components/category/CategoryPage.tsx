import React, { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity } from "react-native"
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context'
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useTheme } from "@/context/ThemeContext"
import ProgressBar from "@/components/ProgressBar"
import { levelService } from "@/backend/services/levelService"
import { categoryPageStyles } from "@/styles/categoryPageStyles"
import CategoryProgressChart from './CategoryProgressChart'
import Toast from "react-native-toast-message"

interface CategoryPageProps {
  categoryId: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  categoryData: any;
  resources: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
  }>;
}

export function CategoryPage({
  categoryId,
  title,
  icon,
  color,
  description,
  categoryData,
  resources,
}: CategoryPageProps) {
  const { colors } = useTheme()
  const router = useRouter()
  const [showResources, setShowResources] = useState(false)

  const handleResourcePress = () => {
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Resources will be available in a future update!',
      position: 'top',
      visibilityTime: 3000,
    });
  }

  return (
    <SafeAreaViewRN 
      edges={['top']} 
      style={[
        { flex: 1, backgroundColor: color }
      ]}
    >
      <ScrollView 
        style={[categoryPageStyles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          categoryPageStyles.scrollContent,
          { flexGrow: 1 }  // Allow content to grow
        ]}
        showsVerticalScrollIndicator={true}  // Show scrollbar on mobile
        bounces={true}  // Enable bounce effect
      >
        <View style={[categoryPageStyles.heroSection, { backgroundColor: color }]}>
          <TouchableOpacity 
            style={categoryPageStyles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={categoryPageStyles.heroContent}>
            <View style={categoryPageStyles.iconWrapper}>
              <FontAwesome5 name={icon} size={24} color="#fff" />
            </View>
            <Text style={categoryPageStyles.heroTitle}>{title}</Text>
            <Text style={categoryPageStyles.heroSubtitle}>Level {categoryData.level}</Text>
          </View>
        </View>

        <View style={categoryPageStyles.webContainer}>
          <View style={[categoryPageStyles.card, { backgroundColor: colors.surface }]}>
            <View style={categoryPageStyles.progressHeader}>
              <Text style={[categoryPageStyles.levelText, { color: colors.textPrimary }]}>
                Level {categoryData.level}
              </Text>
              <Text style={[categoryPageStyles.xpText, { color: colors.textSecondary }]}>
                {categoryData.xp - ((categoryData.level - 1) * levelService.getXPNeededForNextLevel(1))} / {levelService.getXPNeededForNextLevel(1)} XP
              </Text>
            </View>
            <ProgressBar
              progress={levelService.getCategoryLevelProgress(categoryData.xp, categoryData.level)}
              color={color}
              style={categoryPageStyles.progressBar}
            />
          </View>

          <View style={categoryPageStyles.content}>
            <View style={[categoryPageStyles.card, { backgroundColor: colors.surface }]}>
              <Text style={[categoryPageStyles.cardTitle, { color: colors.textPrimary }]}>
                About {title}
              </Text>
              <Text style={[categoryPageStyles.cardText, { color: colors.textSecondary }]}>
                {description}
              </Text>
            </View>

            <View style={categoryPageStyles.section}>
              <TouchableOpacity 
                style={[categoryPageStyles.sectionHeader, { backgroundColor: colors.surface }]}
                onPress={() => setShowResources(!showResources)}
              >
                <View style={categoryPageStyles.sectionTitleGroup}>
                  <FontAwesome5 name="book" size={16} color={colors.textPrimary} />
                  <Text style={[categoryPageStyles.sectionTitle, { color: colors.textPrimary }]}>
                    Resources
                  </Text>
                </View>
                <FontAwesome5 
                  name={showResources ? "arrow-up" : "arrow-down"}
                  size={16}
                  color={colors.textPrimary}
                  regular
                />
              </TouchableOpacity>

              {showResources && (
                <View style={categoryPageStyles.resourcesGrid}>
                  {resources.map(item => (
                    <TouchableOpacity 
                      key={item.id}
                      style={[categoryPageStyles.resourceCard, { backgroundColor: colors.surface }]}
                      onPress={handleResourcePress}
                    >
                      <View style={[categoryPageStyles.resourceIcon, { backgroundColor: `${color}15` }]}>
                        <FontAwesome5 name={item.icon} size={20} color={color} />
                      </View>
                      <Text style={[categoryPageStyles.resourceTitle, { color: colors.textPrimary }]}>
                        {item.title}
                      </Text>
                      <Text style={[categoryPageStyles.resourceDescription, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <CategoryProgressChart 
              categoryId={categoryId}
              color={color}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaViewRN>
  );
} 