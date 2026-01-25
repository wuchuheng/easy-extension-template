import tseslint from 'typescript-eslint'
import eslintJS from '@eslint/js'

console.log('typeof tseslint.config:', typeof tseslint.config)
console.log('tseslint.configs.recommended is array:', Array.isArray(tseslint.configs.recommended))
console.log('eslintJS.configs.recommended is array:', Array.isArray(eslintJS.configs.recommended))
