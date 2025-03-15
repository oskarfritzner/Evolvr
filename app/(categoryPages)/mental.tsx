import React from "react"
import { useAuth } from "@/context/AuthContext"
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Mental() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.mental

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Stress Management',
      description: 'Tools and techniques for reducing stress',
      icon: 'peace'
    },
    {
      id: '2',
      title: 'Emotional Wellness',
      description: 'Track and improve emotional health',
      icon: 'smile-beam'
    },
    {
      id: '3',
      title: 'Mental Exercises',
      description: 'Activities for mental well-being',
      icon: 'brain'
    },
    {
      id: '4',
      title: 'Therapy Resources',
      description: 'Professional mental health support',
      icon: 'comments'
    }
  ]

  return (
    <CategoryPage
      categoryId="mental"
      title="Mental"
      icon="brain"
      color="#9B59B6"
      description="Foster mental well-being through emotional awareness, stress management, and psychological growth."
      categoryData={categoryData}
      resources={resources}
    />
  )
}
