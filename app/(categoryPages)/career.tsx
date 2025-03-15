import React from "react"
import { useAuth } from "@/context/AuthContext"
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Career() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.career

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Skill Development',
      description: 'Professional courses and certifications',
      icon: 'laptop-code'
    },
    {
      id: '2',
      title: 'Networking Tools',
      description: 'Connect with professionals and mentors',
      icon: 'users'
    },
    {
      id: '3',
      title: 'Job Resources',
      description: 'Career planning and job search tips',
      icon: 'briefcase'
    },
    {
      id: '4',
      title: 'Productivity',
      description: 'Time management and workflow optimization',
      icon: 'clock'
    }
  ]

  return (
    <CategoryPage
      categoryId="career"
      title="Career"
      icon="briefcase"
      color="#96CEB4"
      description="Advance your professional growth through skill development, networking, and career planning. Set and achieve meaningful career goals."
      categoryData={categoryData}
      resources={resources}
    />
  )
}