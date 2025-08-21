// hooks/useScrollSync.ts
// TEXTAMI PROFESSIONAL UX - Scroll synchronization hook
// Perfect scroll sync between document and sidebar (DNITZ05 style)

import { useEffect, RefObject } from 'react'

export interface ScrollSyncOptions {
  enabled?: boolean
  throttleMs?: number
  syncDirection?: 'bidirectional' | 'document-to-sidebar' | 'sidebar-to-document'
  smoothSync?: boolean
}

/**
 * Synchronizes scroll between document and sidebar
 * Based on DNITZ05 PromptSidebar.tsx scroll synchronization
 */
export const useScrollSync = (
  documentRef: RefObject<HTMLDivElement | null>,
  sidebarRef: RefObject<HTMLDivElement | null>,
  options: ScrollSyncOptions = {}
) => {
  const {
    enabled = true,
    throttleMs = 16, // ~60fps for smooth sync
    syncDirection = 'bidirectional',
    smoothSync = true
  } = options

  useEffect(() => {
    if (!enabled || !documentRef.current || !sidebarRef.current) {
      return
    }

    const documentElement = documentRef.current
    const sidebarElement = sidebarRef.current
    
    let documentScrollTimeout: NodeJS.Timeout | null = null
    let sidebarScrollTimeout: NodeJS.Timeout | null = null
    let isDocumentScrolling = false
    let isSidebarScrolling = false

    /**
     * Throttled scroll handler for performance
     */
    const createThrottledHandler = (
      sourceElement: HTMLDivElement,
      targetElement: HTMLDivElement,
      setScrollingFlag: (value: boolean) => void,
      checkScrollingFlag: () => boolean
    ) => {
      return () => {
        if (checkScrollingFlag()) return // Prevent circular scrolling

        setScrollingFlag(true)

        if (documentScrollTimeout) clearTimeout(documentScrollTimeout)
        if (sidebarScrollTimeout) clearTimeout(sidebarScrollTimeout)

        const timeout = setTimeout(() => {
          if (!sourceElement || !targetElement) return

          const sourceScrollTop = sourceElement.scrollTop

          if (smoothSync) {
            // Smooth synchronized scrolling
            targetElement.scrollTo({
              top: sourceScrollTop,
              behavior: 'auto' // Instant for sync, smooth handled by CSS
            })
          } else {
            // Instant synchronization
            targetElement.scrollTop = sourceScrollTop
          }

          // Reset scrolling flag
          setTimeout(() => setScrollingFlag(false), 50)
        }, throttleMs)

        if (sourceElement === documentElement) {
          documentScrollTimeout = timeout
        } else {
          sidebarScrollTimeout = timeout
        }
      }
    }

    // Create scroll handlers
    const handleDocumentScroll = createThrottledHandler(
      documentElement,
      sidebarElement,
      (value) => isDocumentScrolling = value,
      () => isSidebarScrolling
    )

    const handleSidebarScroll = createThrottledHandler(
      sidebarElement,
      documentElement,
      (value) => isSidebarScrolling = value,
      () => isDocumentScrolling
    )

    // Attach event listeners based on sync direction
    if (syncDirection === 'document-to-sidebar' || syncDirection === 'bidirectional') {
      documentElement.addEventListener('scroll', handleDocumentScroll, { passive: true })
    }

    if (syncDirection === 'sidebar-to-document' || syncDirection === 'bidirectional') {
      sidebarElement.addEventListener('scroll', handleSidebarScroll, { passive: true })
    }

    // Cleanup
    return () => {
      if (documentScrollTimeout) clearTimeout(documentScrollTimeout)
      if (sidebarScrollTimeout) clearTimeout(sidebarScrollTimeout)
      
      documentElement.removeEventListener('scroll', handleDocumentScroll)
      sidebarElement.removeEventListener('scroll', handleSidebarScroll)
    }
  }, [documentRef, sidebarRef, enabled, throttleMs, syncDirection, smoothSync])

  /**
   * Programmatically sync scroll to specific position
   */
  const syncToPosition = (scrollTop: number, target?: 'document' | 'sidebar' | 'both') => {
    const targetElements = []
    
    if (target === 'document' || target === 'both' || !target) {
      documentRef.current && targetElements.push(documentRef.current)
    }
    
    if (target === 'sidebar' || target === 'both' || !target) {
      sidebarRef.current && targetElements.push(sidebarRef.current)
    }

    targetElements.forEach(element => {
      if (smoothSync) {
        element.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
      } else {
        element.scrollTop = scrollTop
      }
    })
  }

  /**
   * Scroll to specific element in document and sync sidebar
   */
  const scrollToElement = (
    elementId: string,
    offset: number = 0,
    behavior: 'auto' | 'smooth' = 'smooth'
  ) => {
    if (!documentRef.current) return

    const targetElement = documentRef.current.querySelector(`[data-paragraph-id="${elementId}"]`)
    if (!targetElement) return

    const documentRect = documentRef.current.getBoundingClientRect()
    const targetRect = targetElement.getBoundingClientRect()
    
    const scrollPosition = targetRect.top - documentRect.top + documentRef.current.scrollTop - offset

    if (smoothSync) {
      syncToPosition(scrollPosition, 'both')
      
      // Add temporary highlight (DNITZ05 style)
      targetElement.classList.add('highlight-paragraph')
      setTimeout(() => {
        targetElement.classList.remove('highlight-paragraph')
      }, 2000)
    } else {
      syncToPosition(scrollPosition, 'both')
    }
  }

  return {
    syncToPosition,
    scrollToElement
  }
}