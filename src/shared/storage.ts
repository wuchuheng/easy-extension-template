// OPFS utilities for WASM/AI model storage
// Functional programming approach with pure functions and composition

// ============================================================================
// Types
// ============================================================================

export type FilePath = string

export interface OPFSFile {
  name: string
  data: ArrayBuffer
  lastModified: number
}

export interface OPFSDirectory {
  name: string
  entries: OPFSEntry[]
}

export type OPFSEntry = OPFSFile | OPFSDirectory

export interface FileSystemError {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'UNKNOWN'
  message: string
}

// ============================================================================
// Result Type (Either-like pattern for error handling)
// ============================================================================

export type Result<T, E = FileSystemError> =
  | { success: true; data: T }
  | { success: false; error: E }

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the root OPFS directory handle
 */
const getRootDir = async (): Promise<FileSystemDirectoryHandle> => {
  return navigator.storage.getDirectory()
}

/**
 * Split a file path into directory parts and filename
 * @example splitPath('wasm/models/ai.wasm') => ['wasm', 'models'], 'ai.wasm'
 */
const splitPath = (path: FilePath): [string[], string] => {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return [[], '']
  const fileName = parts[parts.length - 1]
  const dirParts = parts.slice(0, -1)
  return [dirParts, fileName]
}

/**
 * Navigate to a directory by path parts, creating directories if needed
 */
const navigateToDirectory = async (
  root: FileSystemDirectoryHandle,
  dirParts: string[],
  create: boolean = false
): Promise<Result<FileSystemDirectoryHandle>> => {
  try {
    let dir = root
    for (const part of dirParts) {
      dir = await dir.getDirectoryHandle(part, { create })
    }
    return { success: true, data: dir }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Directory not found: ${dirParts.join('/')}`
      }
    }
  }
}

/**
 * Get a file handle at the given path
 */
const getFileHandle = async (
  root: FileSystemDirectoryHandle,
  path: FilePath,
  create: boolean = false
): Promise<Result<FileSystemFileHandle>> => {
  const [dirParts, fileName] = splitPath(path)

  const dirResult = await navigateToDirectory(root, dirParts, create)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    const file = await dirResult.data.getFileHandle(fileName, { create })
    return { success: true, data: file }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `File not found: ${path}`
      }
    }
  }
}

/**
 * Write data to a file at the given path
 */
export const writeFile = async (
  path: FilePath,
  data: ArrayBuffer
): Promise<Result<void>> => {
  const root = await getRootDir()
  const fileResult = await getFileHandle(root, path, true)

  if (!fileResult.success) {
    return { success: false, error: fileResult.error }
  }

  try {
    const writable = await fileResult.data.createWritable()
    await writable.write(data)
    await writable.close()
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to write file: ${path}`
      }
    }
  }
}

/**
 * Read data from a file at the given path
 */
export const readFile = async (
  path: FilePath
): Promise<Result<ArrayBuffer>> => {
  const root = await getRootDir()
  const fileResult = await getFileHandle(root, path, false)

  if (!fileResult.success) {
    return { success: false, error: fileResult.error }
  }

  try {
    const fileData = await fileResult.data.getFile()
    return { success: true, data: await fileData.arrayBuffer() }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to read file: ${path}`
      }
    }
  }
}

/**
 * Delete a file at the given path
 */
export const deleteFile = async (
  path: FilePath
): Promise<Result<void>> => {
  const root = await getRootDir()
  const [dirParts, fileName] = splitPath(path)

  const dirResult = await navigateToDirectory(root, dirParts, false)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    await dirResult.data.removeEntry(fileName)
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Failed to delete file: ${path}`
      }
    }
  }
}

/**
 * Check if a file exists at the given path
 */
export const fileExists = async (path: FilePath): Promise<boolean> => {
  const result = await readFile(path)
  return result.success
}

/**
 * List all entries in a directory
 */
export const listDirectory = async (
  dirPath: FilePath = ''
): Promise<Result<string[]>> => {
  const root = await getRootDir()
  const [dirParts] = splitPath(dirPath)

  const dirResult = await navigateToDirectory(root, dirParts, false)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    const entries: string[] = []
    for await (const entry of dirResult.data.values()) {
      entries.push(entry.name)
    }
    return { success: true, data: entries }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to list directory: ${dirPath}`
      }
    }
  }
}

/**
 * Get file metadata
 */
export const getFileMetadata = async (
  path: FilePath
): Promise<Result<{ size: number; type: string; lastModified: number }>> => {
  const root = await getRootDir()
  const fileResult = await getFileHandle(root, path, false)

  if (!fileResult.success) {
    return { success: false, error: fileResult.error }
  }

  try {
    const file = await fileResult.data.getFile()
    return {
      success: true,
      data: {
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to get file metadata: ${path}`
      }
    }
  }
}

// ============================================================================
// Utility Functions (functional composition)
// ============================================================================

/**
 * Pipe functions together (left-to-right composition)
 * @example pipe(data, fn1, fn2, fn3)
 */
export const pipe = <T>(value: T, ...fns: Array<(arg: T) => T>): T => {
  return fns.reduce((acc, fn) => fn(acc), value)
}

/**
 * Compose functions (right-to-left composition)
 * @example compose(fn3, fn2, fn1)(data)
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => {
  return (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value)
}

/**
 * Async pipe for async functions
 */
export const pipeAsync = async <T>(
  value: T,
  ...fns: Array<(arg: T) => Promise<T> | T>
): Promise<T> => {
  let result = value
  for (const fn of fns) {
    result = await fn(result)
  }
  return result
}

// ============================================================================
// Higher-Order Functions
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export const withRetry = <T extends (...args: any[]) => Promise<Result<any>>>(
  fn: T,
  maxRetries: number = 3,
  baseDelay: number = 100
): T => {
  return (async (...args: Parameters<T>) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await fn(...args)
      if (result.success) return result

      // Don't retry on certain errors
      if (result.error.code === 'NOT_FOUND' || result.error.code === 'PERMISSION_DENIED') {
        return result
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)))
      }
    }
    return fn(...args)
  }) as T
}

/**
 * Wrap a function with error logging
 */
export const withLogging = <T extends (...args: any[]) => Promise<Result<any>>>(
  fn: T,
  label: string
): T => {
  return (async (...args: Parameters<T>) => {
    console.log(`[OPFS] ${label} called with:`, args)
    const result = await fn(...args)
    if (!result.success) {
      console.error(`[OPFS] ${label} failed:`, result.error)
    } else {
      console.log(`[OPFS] ${label} succeeded`)
    }
    return result
  }) as T
}

// ============================================================================
// Convenience Functions using composition
// ============================================================================

/**
 * Write file with retry and logging
 */
export const writeFileSafe = withRetry(
  withLogging(writeFile, 'writeFileSafe')
)

/**
 * Read file with retry and logging
 */
export const readFileSafe = withRetry(
  withLogging(readFile, 'readFileSafe')
)

/**
 * Initialize a WASM module from OPFS
 * @returns WebAssembly.Instance or null
 */
export const loadWASM = async (
  path: FilePath,
  imports: WebAssembly.Imports = {}
): Promise<Result<WebAssembly.Instance>> => {
  const readResult = await readFile(path)
  if (!readResult.success) {
    return { success: false, error: readResult.error }
  }

  try {
    const module = await WebAssembly.instantiate(readResult.data, imports)
    return { success: true, data: module.instance }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to load WASM module: ${path}`
      }
    }
  }
}

// ============================================================================
// Constants
// ============================================================================

export const OPFSPaths = {
  WASM_DIR: 'wasm',
  MODELS_DIR: 'wasm/models',
  CACHE_DIR: 'cache',
  CONFIG_DIR: 'config'
} as const

export type OPFSPath = typeof OPFSPaths[keyof typeof OPFSPaths]
