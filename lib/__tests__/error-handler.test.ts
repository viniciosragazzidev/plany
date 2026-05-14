import { describe, it, expect } from 'vitest'
import { AppError, handleError } from '../error-handler'

describe('error-handler', () => {
  it('should handle AppError correctly', () => {
    const error = new AppError('Custom error', 400, 'CUSTOM_CODE')
    const result = handleError(error)
    expect(result).toEqual({
      success: false,
      error: 'Custom error',
      code: 'CUSTOM_CODE',
      statusCode: 400,
    })
  })

  it('should handle generic Error correctly', () => {
    const error = new Error('Generic error')
    const result = handleError(error)
    expect(result).toEqual({
      success: false,
      error: 'Generic error',
      statusCode: 500,
    })
  })

  it('should handle unknown error correctly', () => {
    const result = handleError('Something went wrong')
    expect(result).toEqual({
      success: false,
      error: 'An unknown error occurred',
      statusCode: 500,
    })
  })
})
