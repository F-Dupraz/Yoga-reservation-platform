'use client'
import { Suspense } from 'react'
import ClassesPageContent from './ClassesPageContent'

export default function ClassesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-12 w-12"></div>
      </div>
    }>
      <ClassesPageContent />
    </Suspense>
  )
}
