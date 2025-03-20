import React from "react"
import { useAuth } from "@/context/AuthContext"
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Relationships() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.relationships

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Communication Skills',
      description: 'Improve your interpersonal communication',
      icon: 'comments'
    },
    {
      id: '2',
      title: 'Social Calendar',
      description: 'Plan and track social activities',
      icon: 'calendar-alt'
    },
    {
      id: '3',
      title: 'Relationship Tips',
      description: 'Advice for healthy relationships',
      icon: 'heart'
    },
    {
      id: '4',
      title: 'Family Connect',
      description: 'Tools for family bonding',
      icon: 'home'
    }
  ]

  return (
    <CategoryPage
      categoryId="relationships"
      title="Relationships"
      icon="users"
      color="#FF9999"
      description="Nurture meaningful connections with family, friends, and loved ones. Develop stronger bonds and improve communication skills."
      categoryData={categoryData}
      resources={resources}
    />
  )
}
