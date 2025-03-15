import React from "react"
import { useAuth } from "@/context/AuthContext"
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Intellectual() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.intellectual

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Learning Library',
      description: 'Access courses and educational content',
      icon: 'book-reader'
    },
    {
      id: '2',
      title: 'Study Tools',
      description: 'Note-taking and study techniques',
      icon: 'pencil-alt'
    },
    {
      id: '3',
      title: 'Brain Training',
      description: 'Cognitive exercises and puzzles',
      icon: 'brain'
    },
    {
      id: '4',
      title: 'Reading List',
      description: 'Curated books and articles',
      icon: 'book'
    }
  ]

  return (
    <CategoryPage
      categoryId="intellectual"
      title="Intellectual"
      icon="graduation-cap"
      color="#7B68EE"
      description="Expand your knowledge and cognitive abilities through learning, reading, and mental exercises. Develop critical thinking and problem-solving skills."
      categoryData={categoryData}
      resources={resources}
    />
  )
}
