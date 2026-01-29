/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import type { ReactNode } from 'react'
import { Component } from 'react'

export interface ErrorBoundaryProps {
  /** Fallback UI to render when an error occurs */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode)
  /** Content to render normally */
  children: ReactNode
  /** Optional error handler callback */
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary class component.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<div>Something went wrong</div>}
 *   onError={(error) => console.error(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    // Log to console in development
    if (import.meta.env?.DEV) {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props

      if (typeof fallback === 'function') {
        return fallback(this.state.error ?? new Error('Unknown error'), this.handleRetry)
      }

      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[200px] items-center justify-center bg-red-50 p-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-red-800">Something went wrong</h2>
            <p className="mb-4 text-sm text-red-600">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Default export for convenient importing
 */
export default ErrorBoundary
