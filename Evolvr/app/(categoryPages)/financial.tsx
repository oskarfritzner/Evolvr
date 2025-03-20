import React from "react"
import { useAuth } from "@/context/AuthContext"
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Financial() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.financial

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Budget Planner',
      description: 'Track income, expenses and savings',
      icon: 'chart-pie'
    },
    {
      id: '2',
      title: 'Investment Guide',
      description: 'Learn about investment strategies',
      icon: 'chart-line'
    },
    {
      id: '3',
      title: 'Financial Education',
      description: 'Personal finance learning resources',
      icon: 'graduation-cap'
    },
    {
      id: '4',
      title: 'Savings Goals',
      description: 'Set and track financial targets',
      icon: 'piggy-bank'
    }
  ]

  return (
    <CategoryPage
      categoryId="financial"
      title="Financial"
      icon="coins"
      color="#45B7D1"
      description="Build financial literacy and security through budgeting, saving, and smart money management."
      categoryData={categoryData}
      resources={resources}
    />
  )
}
