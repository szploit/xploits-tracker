const TRACKED = ['seliware']

function parseMessage(content) {
  const lower = content.toLowerCase()

  if (content.includes('An exploit update has been detected!')) {
    const nameMatch = content.match(/^(.+?) has been updated for/m)
    const versionMatch = content.match(/`([^`]+)`/)
    const changelogMatch = content.match(/```([\s\S]+?)```/)

    if (!nameMatch) return null

    const name = nameMatch[1].trim()
    if (!TRACKED.includes(name.toLowerCase())) return null

    return {
      name,
      version: versionMatch?.[1] ?? null,
      status: 'up',
      changelog: changelogMatch?.[1]?.trim() ?? null,
      last_updated: Date.now(),
    }
  }

  if (lower.includes('has been detected') && lower.includes('no longer working') ||
      lower.includes('is now detected') ||
      lower.includes('is down')) {
    const nameMatch = content.match(/^(.+?) (?:has been detected|is now detected|is down)/mi)
    if (!nameMatch) return null

    const name = nameMatch[1].trim()
    if (!TRACKED.includes(name.toLowerCase())) return null

    const versionMatch = content.match(/`([^`]+)`/)
    const changelogMatch = content.match(/```([\s\S]+?)```/)

    return {
      name,
      version: versionMatch?.[1] ?? null,
      status: 'down',
      changelog: changelogMatch?.[1]?.trim() ?? null,
      last_updated: Date.now(),
    }
  }

  return null
}

module.exports = { parseMessage }
