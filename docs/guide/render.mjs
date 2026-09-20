import puppeteer from 'puppeteer-core'
import path from 'node:path'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('file://' + path.resolve('guide.html'), { waitUntil: 'networkidle0' })
await page.emulateMediaType('print')
await page.pdf({ path: 'guide.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
await browser.close()
console.log('pdf ok')
