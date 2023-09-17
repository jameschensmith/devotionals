import crypto from 'node:crypto'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { Feed } from 'feed'

const today = new Date()
// Add one to month for 1-based indexing
const [month, dayOfMonth] = [today.getMonth() + 1, today.getDate()]

const rootPath = path.resolve(__dirname, '..')
const devotionalsDir = `${rootPath}/devotionals`
const feeds = (await readdir(devotionalsDir)).map((devotionalFileName) => {
  const devotionalPathName = path.join(devotionalsDir, devotionalFileName)
  const { Metadata, Data } = require(devotionalPathName)
  const entry = Data.find((it) => it.month == month && it.day == dayOfMonth)

  const feed = new Feed({
    id: Metadata.SourceUrl,
    title: Metadata.Title,
    link: Metadata.SourceUrl,
    description: `${Metadata.Title}, by ${Metadata.Authors.join(', ')}`,
    copyright: Metadata.SourceAttribution,
    author: {
      name: Metadata.Authors[0],
    },
  })

  feed.addItem({
    id: crypto
      .createHash('md5')
      .update([Metadata.Title, month, dayOfMonth].join(''))
      .digest('hex'),
    title: today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    description: entry.verse,
    content: entry.body,
    date: new Date(),
  })

  return {
    name: path.basename(devotionalFileName, '.json'),
    data: feed.atom1(),
  }
})

const outputDir = path.join(rootPath, 'public')
await mkdir(outputDir, { recursive: true })

await Promise.all(
  feeds.map(async (f) => {
    const feedDir = path.join(outputDir, f.name)
    await mkdir(feedDir, { recursive: true })
    await Bun.write(path.join(feedDir, `feed.xml`), f.data)
  })
)
