// components/visual-mapping/utils/positionCalculator.ts
// TEXTAMI POSITION UTILITIES - Visual Mapping System
// Adapted from dnitz05/PromptPositionUtils.ts for Excel ↔ Word mappings

import React from 'react'

// TEXTAMI Visual Mapping interfaces
interface VisualMapping {
  id: string
  paragraphId: string
  position: number
  isActive: boolean
}

/**
 * Calculate positions for visual mappings based on paragraph positions in Word document
 * Prevents overlapping and maintains visual hierarchy
 */
export const calculateMappingPositions = (
  mappings: VisualMapping[],
  documentRef: React.RefObject<HTMLDivElement>,
  contentWrapperRef: React.RefObject<HTMLDivElement>
): VisualMapping[] => {
  if (!documentRef.current || !contentWrapperRef.current) return mappings

  const updatedMappings = [...mappings]
  const paragraphElements: Record<string, DOMRect> = {}
  const wrapperRect = contentWrapperRef.current.getBoundingClientRect()

  // Get positions of all paragraphs with data-paragraph-id attributes
  documentRef.current.querySelectorAll('p[data-paragraph-id]').forEach(p => {
    const id = (p as HTMLElement).dataset.paragraphId
    if (id) {
      const rect = p.getBoundingClientRect()
      // Store position relative to wrapper for scroll synchronization
      paragraphElements[id] = rect
    }
  })

  // Update mapping positions based on paragraph positions
  updatedMappings.forEach(mapping => {
    const rect = paragraphElements[mapping.paragraphId]
    if (rect) {
      // Calculate vertical center position relative to wrapper
      mapping.position = rect.top + (rect.height / 2) - wrapperRect.top
    }
  })

  // Sort mappings by document position (top to bottom)
  updatedMappings.sort((a, b) => a.position - b.position)

  // Prevent visual overlap in sidebar
  const MIN_MAPPING_SPACING = 120 // Pixels between mapping cards
  
  for (let i = 1; i < updatedMappings.length; i++) {
    const prevMapping = updatedMappings[i - 1]
    const currentMapping = updatedMappings[i]
    
    const gap = currentMapping.position - prevMapping.position
    
    if (gap < MIN_MAPPING_SPACING) {
      const adjustment = MIN_MAPPING_SPACING - gap
      currentMapping.position += adjustment
      
      // Propagate adjustment to subsequent mappings
      for (let j = i + 1; j < updatedMappings.length; j++) {
        updatedMappings[j].position += adjustment
      }
    }
  }

  return updatedMappings
}

/**
 * Find paragraph element by ID in Word document
 */
export const findParagraphElement = (
  paragraphId: string,
  documentRef: React.RefObject<HTMLDivElement>
): HTMLElement | null => {
  if (!documentRef.current) return null
  
  return documentRef.current.querySelector(
    `p[data-paragraph-id="${paragraphId}"]`
  ) as HTMLElement
}

/**
 * Scroll to specific paragraph with smooth animation
 * Used when clicking on mapping to highlight source text
 */
export const scrollToParagraph = (
  paragraphId: string,
  documentRef: React.RefObject<HTMLDivElement>,
  contentWrapperRef: React.RefObject<HTMLDivElement>
): void => {
  const paragraph = findParagraphElement(paragraphId, documentRef)
  if (!paragraph || !contentWrapperRef.current) return

  const wrapperRect = contentWrapperRef.current.getBoundingClientRect()
  const paragraphRect = paragraph.getBoundingClientRect()

  // Calculate scroll position to center paragraph in viewport
  const scrollTop = 
    paragraphRect.top + 
    contentWrapperRef.current.scrollTop - 
    wrapperRect.top - 
    (wrapperRect.height / 2) + 
    (paragraphRect.height / 2)

  // Smooth scroll animation
  contentWrapperRef.current.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  })

  // Visual highlight effect for 2 seconds
  paragraph.classList.add('highlight-paragraph')
  setTimeout(() => {
    paragraph.classList.remove('highlight-paragraph')
  }, 2000)
}

/**
 * Generate unique ID for visual mappings
 */
export const generateMappingId = (): string => {
  return `mapping-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate unique paragraph ID for Word content
 */
export const generateParagraphId = (): string => {
  return `p-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Calculate visual connection line between Excel column and Word selection
 * Returns SVG path coordinates for drawing mapping lines
 */
export const calculateConnectionLine = (
  excelColumnRect: DOMRect,
  wordSelectionRect: DOMRect,
  containerRect: DOMRect
): { startX: number; startY: number; endX: number; endY: number } => {
  // Calculate relative positions within container
  const startX = excelColumnRect.right - containerRect.left
  const startY = excelColumnRect.top + (excelColumnRect.height / 2) - containerRect.top
  
  const endX = wordSelectionRect.left - containerRect.left
  const endY = wordSelectionRect.top + (wordSelectionRect.height / 2) - containerRect.top
  
  return { startX, startY, endX, endY }
}

/**
 * Check if two DOM rectangles overlap (for collision detection)
 */
export const checkElementOverlap = (rect1: DOMRect, rect2: DOMRect): boolean => {
  return !(
    rect1.right < rect2.left || 
    rect1.left > rect2.right || 
    rect1.bottom < rect2.top || 
    rect1.top > rect2.bottom
  )
}

/**
 * Get optimal position for mapping tooltip/popup to avoid viewport edges
 */
export const getOptimalTooltipPosition = (
  triggerElement: HTMLElement,
  tooltip: HTMLElement,
  viewport: { width: number; height: number }
): { top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' } => {
  const triggerRect = triggerElement.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  
  // Try positions in order of preference
  const positions = [
    {
      placement: 'top' as const,
      top: triggerRect.top - tooltipRect.height - 8,
      left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
    },
    {
      placement: 'bottom' as const, 
      top: triggerRect.bottom + 8,
      left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
    },
    {
      placement: 'right' as const,
      top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
      left: triggerRect.right + 8
    },
    {
      placement: 'left' as const,
      top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2), 
      left: triggerRect.left - tooltipRect.width - 8
    }
  ]
  
  // Find first position that fits in viewport
  for (const pos of positions) {
    if (
      pos.top >= 0 && 
      pos.left >= 0 && 
      pos.top + tooltipRect.height <= viewport.height &&
      pos.left + tooltipRect.width <= viewport.width
    ) {
      return pos
    }
  }
  
  // Fallback to bottom position with viewport constraints
  return {
    placement: 'bottom',
    top: Math.min(triggerRect.bottom + 8, viewport.height - tooltipRect.height),
    left: Math.max(0, Math.min(
      triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
      viewport.width - tooltipRect.width
    ))
  }
}

/**
 * Animate visual mapping creation with CSS transitions
 */
export const animateMappingCreation = (
  mappingElement: HTMLElement,
  duration: number = 300
): Promise<void> => {
  return new Promise((resolve) => {
    // Start with hidden state
    mappingElement.style.opacity = '0'
    mappingElement.style.transform = 'scale(0.8) translateY(-10px)'
    mappingElement.style.transition = `all ${duration}ms ease-out`
    
    // Force reflow
    mappingElement.offsetHeight
    
    // Animate to visible state
    mappingElement.style.opacity = '1'
    mappingElement.style.transform = 'scale(1) translateY(0)'
    
    setTimeout(() => {
      // Clean up transition styles
      mappingElement.style.transition = ''
      resolve()
    }, duration)
  })
}

/**
 * Get visual mapping statistics for ROI dashboard
 */
export const calculateMappingStats = (mappings: any[]): {
  totalMappings: number
  moduleUsage: Record<string, number>
  totalROI: number
  averageROI: number
} => {
  const moduleValues = {
    text: 0,    // Base module
    html: 250,  // HTML Module  
    image: 250, // Image Module
    style: 500  // Style Module
  }
  
  const moduleUsage = mappings.reduce((acc, mapping) => {
    const module = mapping.docxtemplaterModule
    acc[module] = (acc[module] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const totalROI = mappings.reduce((sum, mapping) => {
    return sum + (moduleValues[mapping.docxtemplaterModule as keyof typeof moduleValues] || 0)
  }, 0)
  
  return {
    totalMappings: mappings.length,
    moduleUsage,
    totalROI,
    averageROI: mappings.length > 0 ? totalROI / mappings.length : 0
  }
}

// Legacy compatibility exports for dnitz05 components
export const calculatePromptPositions = calculateMappingPositions
export const createPromptForParagraph = (
  paragraphId: string,
  paragraphText: string,
  documentRef: React.RefObject<HTMLDivElement>,
  contentWrapperRef: React.RefObject<HTMLDivElement>
): any => {
  // Return mock prompt structure for backward compatibility
  return {
    id: generateMappingId(),
    paragraphId,
    content: '',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    position: 0,
    isExpanded: true,
    originalParagraphText: paragraphText.trim()
  }
}