// lib/positioning/IntelligentPositioning.ts
// TEXTAMI PROFESSIONAL UX - Intelligent Anti-Overlapping Positioning
// Phase 2: Smart positioning system to avoid visual conflicts

export interface PositionableElement {
  id: string
  x: number
  y: number
  width: number
  height: number
  priority: number // Higher priority elements get better positions
  type: 'mapping-card' | 'tooltip' | 'highlight' | 'sidebar-item' | 'prompt-dialog'
  isSticky?: boolean // Cannot be moved by positioning engine
  minDistance?: number // Minimum distance from other elements
}

export interface ViewportBounds {
  width: number
  height: number
  scrollTop: number
  scrollLeft: number
}

export interface PositioningOptions {
  viewport: ViewportBounds
  elements: PositionableElement[]
  preferredSide?: 'top' | 'bottom' | 'left' | 'right'
  allowOverflow?: boolean
  respectScrollPosition?: boolean
  animationDuration?: number
}

export interface PositioningResult {
  element: PositionableElement
  originalPosition: { x: number, y: number }
  newPosition: { x: number, y: number }
  adjustmentReason: string
  conflictResolved: boolean
}

export class IntelligentPositioning {
  private readonly DEFAULT_MIN_DISTANCE = 8
  private readonly PRIORITY_DISTANCE_MULTIPLIER = 1.5

  /**
   * Calculates optimal positions for multiple elements to avoid overlaps
   * Based on DNITZ05 positioning algorithms with improvements
   */
  calculateOptimalPositions(options: PositioningOptions): PositioningResult[] {
    const { elements, viewport, preferredSide = 'right' } = options
    const results: PositioningResult[] = []
    
    // Sort by priority (highest first)
    const sortedElements = [...elements].sort((a, b) => b.priority - a.priority)
    const positionedElements: PositionableElement[] = []

    for (const element of sortedElements) {
      const originalPosition = { x: element.x, y: element.y }
      
      if (element.isSticky) {
        // Sticky elements don't move, but we track them for collision detection
        positionedElements.push(element)
        results.push({
          element,
          originalPosition,
          newPosition: originalPosition,
          adjustmentReason: 'Element marked as sticky',
          conflictResolved: false
        })
        continue
      }

      // Find optimal position avoiding conflicts
      const optimalPosition = this.findOptimalPosition(
        element,
        positionedElements,
        viewport,
        preferredSide
      )

      const adjustedElement = { ...element, ...optimalPosition.position }
      positionedElements.push(adjustedElement)

      results.push({
        element,
        originalPosition,
        newPosition: optimalPosition.position,
        adjustmentReason: optimalPosition.reason,
        conflictResolved: optimalPosition.conflictResolved
      })
    }

    return results
  }

  /**
   * Finds the optimal position for a single element
   */
  private findOptimalPosition(
    element: PositionableElement,
    existingElements: PositionableElement[],
    viewport: ViewportBounds,
    preferredSide: 'top' | 'bottom' | 'left' | 'right'
  ): {
    position: { x: number, y: number }
    reason: string
    conflictResolved: boolean
  } {
    const originalPosition = { x: element.x, y: element.y }
    
    // Check if current position has conflicts
    const conflicts = this.detectConflicts(element, existingElements)
    
    if (conflicts.length === 0) {
      return {
        position: originalPosition,
        reason: 'No conflicts detected',
        conflictResolved: false
      }
    }

    // Try different positioning strategies
    const strategies = this.getPositioningStrategies(element, viewport, preferredSide)
    
    for (const strategy of strategies) {
      const testPosition = strategy.calculate(originalPosition)
      const testElement = { ...element, ...testPosition }
      
      if (this.isPositionValid(testElement, existingElements, viewport)) {
        return {
          position: testPosition,
          reason: strategy.reason,
          conflictResolved: true
        }
      }
    }

    // If no strategy works, use force positioning
    const forcePosition = this.forcePositioning(element, existingElements, viewport)
    
    return {
      position: forcePosition,
      reason: 'Force positioning applied - no optimal position found',
      conflictResolved: true
    }
  }

  /**
   * Detects conflicts between elements
   */
  private detectConflicts(
    element: PositionableElement,
    existingElements: PositionableElement[]
  ): PositionableElement[] {
    const conflicts: PositionableElement[] = []
    const minDistance = element.minDistance || this.DEFAULT_MIN_DISTANCE
    
    for (const existing of existingElements) {
      if (this.elementsOverlap(element, existing, minDistance)) {
        conflicts.push(existing)
      }
    }
    
    return conflicts
  }

  /**
   * Checks if two elements overlap considering minimum distance
   */
  private elementsOverlap(
    element1: PositionableElement,
    element2: PositionableElement,
    minDistance: number
  ): boolean {
    const e1 = {
      left: element1.x - minDistance,
      right: element1.x + element1.width + minDistance,
      top: element1.y - minDistance,
      bottom: element1.y + element1.height + minDistance
    }
    
    const e2 = {
      left: element2.x,
      right: element2.x + element2.width,
      top: element2.y,
      bottom: element2.y + element2.height
    }
    
    return !(e1.right <= e2.left || 
             e1.left >= e2.right || 
             e1.bottom <= e2.top || 
             e1.top >= e2.bottom)
  }

  /**
   * Gets positioning strategies in order of preference
   */
  private getPositioningStrategies(
    element: PositionableElement,
    viewport: ViewportBounds,
    preferredSide: string
  ) {
    const strategies = [
      {
        name: 'offset-preferred',
        reason: `Moved to preferred ${preferredSide} side`,
        calculate: (pos: { x: number, y: number }) => {
          switch (preferredSide) {
            case 'right':
              return { x: pos.x + element.width + this.DEFAULT_MIN_DISTANCE, y: pos.y }
            case 'left':
              return { x: pos.x - element.width - this.DEFAULT_MIN_DISTANCE, y: pos.y }
            case 'bottom':
              return { x: pos.x, y: pos.y + element.height + this.DEFAULT_MIN_DISTANCE }
            case 'top':
              return { x: pos.x, y: pos.y - element.height - this.DEFAULT_MIN_DISTANCE }
            default:
              return pos
          }
        }
      },
      {
        name: 'smart-vertical',
        reason: 'Repositioned to avoid vertical overlap',
        calculate: (pos: { x: number, y: number }) => {
          // Find a free vertical space
          const step = element.height + this.DEFAULT_MIN_DISTANCE
          for (let offset = step; offset < viewport.height; offset += step) {
            const testY = pos.y + offset
            if (testY + element.height <= viewport.height) {
              return { x: pos.x, y: testY }
            }
          }
          return { x: pos.x, y: Math.max(0, viewport.height - element.height) }
        }
      },
      {
        name: 'smart-horizontal',
        reason: 'Repositioned to avoid horizontal overlap',
        calculate: (pos: { x: number, y: number }) => {
          // Find a free horizontal space
          const step = element.width + this.DEFAULT_MIN_DISTANCE
          for (let offset = step; offset < viewport.width; offset += step) {
            const testX = pos.x + offset
            if (testX + element.width <= viewport.width) {
              return { x: testX, y: pos.y }
            }
          }
          return { x: Math.max(0, viewport.width - element.width), y: pos.y }
        }
      },
      {
        name: 'diagonal-shift',
        reason: 'Diagonal repositioning for optimal space usage',
        calculate: (pos: { x: number, y: number }) => {
          const offsetX = element.width * 0.7
          const offsetY = element.height * 0.7
          return {
            x: Math.min(pos.x + offsetX, viewport.width - element.width),
            y: Math.min(pos.y + offsetY, viewport.height - element.height)
          }
        }
      }
    ]
    
    return strategies
  }

  /**
   * Checks if a position is valid within viewport and without conflicts
   */
  private isPositionValid(
    element: PositionableElement,
    existingElements: PositionableElement[],
    viewport: ViewportBounds
  ): boolean {
    // Check viewport bounds
    if (element.x < 0 || element.y < 0) return false
    if (element.x + element.width > viewport.width) return false
    if (element.y + element.height > viewport.height) return false
    
    // Check conflicts with existing elements
    return this.detectConflicts(element, existingElements).length === 0
  }

  /**
   * Force positioning when no optimal position is found
   * Uses a spiral search pattern to find any available space
   */
  private forcePositioning(
    element: PositionableElement,
    existingElements: PositionableElement[],
    viewport: ViewportBounds
  ): { x: number, y: number } {
    const centerX = viewport.width / 2
    const centerY = viewport.height / 2
    const spiralStep = Math.min(element.width, element.height)
    
    // Spiral search from center outwards
    for (let radius = spiralStep; radius < Math.max(viewport.width, viewport.height); radius += spiralStep) {
      const positions = this.generateSpiralPositions(centerX, centerY, radius, 8) // 8 points per circle
      
      for (const pos of positions) {
        const testElement = { ...element, x: pos.x, y: pos.y }
        
        if (this.isPositionValid(testElement, existingElements, viewport)) {
          return pos
        }
      }
    }
    
    // Last resort: find any free corner
    const corners = [
      { x: 10, y: 10 },
      { x: viewport.width - element.width - 10, y: 10 },
      { x: 10, y: viewport.height - element.height - 10 },
      { x: viewport.width - element.width - 10, y: viewport.height - element.height - 10 }
    ]
    
    for (const corner of corners) {
      const testElement = { ...element, x: corner.x, y: corner.y }
      if (this.detectConflicts(testElement, existingElements).length < 2) { // Allow minor conflicts
        return corner
      }
    }
    
    // Ultimate fallback
    return { x: 10, y: 10 }
  }

  /**
   * Generates positions in a spiral pattern around a center point
   */
  private generateSpiralPositions(
    centerX: number,
    centerY: number,
    radius: number,
    numPoints: number
  ): { x: number, y: number }[] {
    const positions: { x: number, y: number }[] = []
    const angleStep = (2 * Math.PI) / numPoints
    
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      
      positions.push({ x: Math.round(x), y: Math.round(y) })
    }
    
    return positions
  }

  /**
   * Optimizes positions for a specific element type
   */
  public optimizeForElementType(
    element: PositionableElement,
    context: {
      parentElement?: Element
      siblingElements?: PositionableElement[]
      userInteraction?: 'hover' | 'click' | 'focus'
    }
  ): Partial<PositionableElement> {
    const optimizations: Partial<PositionableElement> = {}
    
    switch (element.type) {
      case 'mapping-card':
        // Mapping cards prefer to be near their source elements
        optimizations.priority = 8
        optimizations.minDistance = 12
        break
        
      case 'tooltip':
        // Tooltips are temporary and high priority
        optimizations.priority = 10
        optimizations.minDistance = 6
        break
        
      case 'highlight':
        // Highlights should never move
        optimizations.isSticky = true
        optimizations.priority = 5
        break
        
      case 'sidebar-item':
        // Sidebar items have lower priority but need consistency
        optimizations.priority = 6
        optimizations.minDistance = 4
        break
        
      case 'prompt-dialog':
        // Prompt dialogs need maximum visibility
        optimizations.priority = 9
        optimizations.minDistance = 20
        break
    }
    
    return optimizations
  }

  /**
   * Creates smooth transition animations for position changes
   */
  public generateTransitionCSS(
    results: PositioningResult[],
    duration: number = 300
  ): Record<string, string> {
    const transitions: Record<string, string> = {}
    
    results.forEach((result) => {
      if (result.conflictResolved) {
        const { newPosition } = result
        transitions[result.element.id] = `
          transform: translate(${newPosition.x}px, ${newPosition.y}px);
          transition: transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1);
        `
      }
    })
    
    return transitions
  }
}

// Export singleton instance
export const intelligentPositioning = new IntelligentPositioning()