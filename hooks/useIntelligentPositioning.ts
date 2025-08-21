// hooks/useIntelligentPositioning.ts
// TEXTAMI PROFESSIONAL UX - Intelligent Positioning Hook
// Phase 2: React hook for managing element positioning

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  intelligentPositioning,
  type PositionableElement,
  type ViewportBounds,
  type PositioningResult
} from '@/lib/positioning/IntelligentPositioning'

export interface UseIntelligentPositioningOptions {
  enabled?: boolean
  debounceMs?: number
  animationDuration?: number
  respectScrollPosition?: boolean
  onPositionChange?: (results: PositioningResult[]) => void
}

export interface UseIntelligentPositioningReturn {
  elements: PositionableElement[]
  registerElement: (element: PositionableElement) => void
  unregisterElement: (elementId: string) => void
  updateElement: (elementId: string, updates: Partial<PositionableElement>) => void
  repositionAll: () => void
  getElementPosition: (elementId: string) => { x: number; y: number } | null
  positioningResults: PositioningResult[]
  isRepositioning: boolean
}

export const useIntelligentPositioning = (
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseIntelligentPositioningOptions = {}
): UseIntelligentPositioningReturn => {
  
  const {
    enabled = true,
    debounceMs = 100,
    animationDuration = 300,
    respectScrollPosition = true,
    onPositionChange
  } = options

  const [elements, setElements] = useState<PositionableElement[]>([])
  const [positioningResults, setPositioningResults] = useState<PositioningResult[]>([])
  const [isRepositioning, setIsRepositioning] = useState(false)
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastViewportRef = useRef<ViewportBounds | null>(null)

  /**
   * Get current viewport bounds
   */
  const getViewportBounds = useCallback((): ViewportBounds => {
    if (!containerRef.current) {
      return { width: 0, height: 0, scrollTop: 0, scrollLeft: 0 }
    }

    const rect = containerRef.current.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      scrollTop: containerRef.current.scrollTop,
      scrollLeft: containerRef.current.scrollLeft
    }
  }, [containerRef])

  /**
   * Register a new element for positioning
   */
  const registerElement = useCallback((element: PositionableElement) => {
    setElements(prev => {
      // Remove existing element with same id
      const filtered = prev.filter(el => el.id !== element.id)
      
      // Apply type-specific optimizations
      const optimizedElement = {
        ...element,
        ...intelligentPositioning.optimizeForElementType(element, {})
      }
      
      return [...filtered, optimizedElement]
    })
  }, [])

  /**
   * Unregister an element
   */
  const unregisterElement = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId))
  }, [])

  /**
   * Update an existing element
   */
  const updateElement = useCallback((elementId: string, updates: Partial<PositionableElement>) => {
    setElements(prev => 
      prev.map(el => 
        el.id === elementId 
          ? { ...el, ...updates }
          : el
      )
    )
  }, [])

  /**
   * Get current position of an element
   */
  const getElementPosition = useCallback((elementId: string) => {
    const result = positioningResults.find(r => r.element.id === elementId)
    return result ? result.newPosition : null
  }, [positioningResults])

  /**
   * Trigger repositioning of all elements
   */
  const repositionAll = useCallback(() => {
    if (!enabled || elements.length === 0) return

    setIsRepositioning(true)

    const viewport = getViewportBounds()
    
    try {
      const results = intelligentPositioning.calculateOptimalPositions({
        elements,
        viewport,
        preferredSide: 'right',
        allowOverflow: false,
        respectScrollPosition,
        animationDuration
      })

      setPositioningResults(results)
      onPositionChange?.(results)

      // Apply CSS transitions
      const transitions = intelligentPositioning.generateTransitionCSS(results, animationDuration)
      
      // Apply transitions to DOM elements
      Object.entries(transitions).forEach(([elementId, cssText]) => {
        const element = document.querySelector(`[data-positioning-id="${elementId}"]`) as HTMLElement
        if (element) {
          element.style.cssText += cssText
        }
      })

    } catch (error) {
      console.error('Error during repositioning:', error)
    } finally {
      // Clear repositioning state after animation completes
      setTimeout(() => setIsRepositioning(false), animationDuration + 50)
    }
  }, [enabled, elements, getViewportBounds, respectScrollPosition, animationDuration, onPositionChange])

  /**
   * Debounced repositioning
   */
  const debouncedReposition = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      repositionAll()
    }, debounceMs)
  }, [repositionAll, debounceMs])

  /**
   * Check if viewport has changed significantly
   */
  const hasViewportChanged = useCallback((newViewport: ViewportBounds) => {
    const prev = lastViewportRef.current
    if (!prev) return true

    const threshold = 10 // pixels
    return Math.abs(prev.width - newViewport.width) > threshold ||
           Math.abs(prev.height - newViewport.height) > threshold ||
           Math.abs(prev.scrollTop - newViewport.scrollTop) > threshold ||
           Math.abs(prev.scrollLeft - newViewport.scrollLeft) > threshold
  }, [])

  /**
   * Handle viewport changes (resize, scroll)
   */
  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const handleViewportChange = () => {
      const viewport = getViewportBounds()
      
      if (hasViewportChanged(viewport)) {
        lastViewportRef.current = viewport
        debouncedReposition()
      }
    }

    const container = containerRef.current
    const resizeObserver = new ResizeObserver(handleViewportChange)
    
    // Observe container size changes
    resizeObserver.observe(container)
    
    // Listen to scroll events
    container.addEventListener('scroll', handleViewportChange, { passive: true })
    
    // Listen to window resize (affects container indirectly)
    window.addEventListener('resize', handleViewportChange, { passive: true })

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('scroll', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [enabled, containerRef, getViewportBounds, hasViewportChanged, debouncedReposition])

  /**
   * Reposition when elements change
   */
  useEffect(() => {
    if (!enabled) return
    debouncedReposition()
  }, [enabled, elements, debouncedReposition])

  /**
   * Initial positioning
   */
  useEffect(() => {
    if (enabled && elements.length > 0) {
      const timer = setTimeout(() => {
        repositionAll()
      }, 100) // Small delay to ensure DOM is ready

      return () => clearTimeout(timer)
    }
  }, [enabled, repositionAll]) // Only run on mount/unmount

  return {
    elements,
    registerElement,
    unregisterElement,
    updateElement,
    repositionAll,
    getElementPosition,
    positioningResults,
    isRepositioning
  }
}