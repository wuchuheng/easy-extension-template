import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ICON_SIZES = [16, 32, 48, 128]
const SOURCE = path.resolve(__dirname, '../src/assets/logo.png')
const OUTPUT_DIR = path.resolve(__dirname, '../public/logo')

async function generateIcons() {
  // Ensure public/logo exists
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true })
  
  // Verify source exists
  if (!fs.existsSync(SOURCE)) {
      console.error(`❌ Source image not found at: ${SOURCE}`)
      process.exit(1)
  }

  await Promise.all(
    ICON_SIZES.map(size =>
      sharp(SOURCE)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .png()
        .toFile(path.join(OUTPUT_DIR, `icon${size}.png`))
    )
  )
  console.log('✅ Icons generated successfully in public/logo')
}

generateIcons().catch(console.error)
