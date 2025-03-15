import React from "react"
import { useAuth } from "@/context/AuthContext"
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Spiritual() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.spiritual

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Meditation Guide',
      description: 'Guided meditations and mindfulness practices',
      icon: 'om'
    },
    {
      id: '2',
      title: 'Reflection Journal',
      description: 'Tools for spiritual reflection and growth',
      icon: 'journal-whills'
    },
    {
      id: '3',
      title: 'Wisdom Library',
      description: 'Spiritual texts and teachings',
      icon: 'book-open'
    },
    {
      id: '4',
      title: 'Community',
      description: 'Connect with like-minded individuals',
      icon: 'hands-helping'
    }
  ]

  return (
    <CategoryPage
      categoryId="spiritual"
      title="Spiritual"
      icon="pray"
      color="#FFD93D"
      description="Deepen your spiritual connection and inner peace through meditation, reflection, and mindful practices."
      categoryData={categoryData}
      resources={resources}
    />
  )
}
