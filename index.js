const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js')
const express = require('express')
const cors = require('cors')
const { getExecutor, upsertExecutor, getAllExecutors } = require('./db')

const BOT_TOKEN = process.env.BOT_TOKEN
const UPDATES_CHANNEL_ID = '1494018215599144991'
const PORT = process.env.PORT || 3000
const POLL_INTERVAL_MS = 3 * 60 * 1000

const WEAO_USER_AGENT = 'WEAO-3PService'

const TRACKED = [
  'Volt',
  'Madium',
  'Synapse Z',
  'Seliware',
  'Potassium',
  'Velocity',
  'Xeno',
  'Solara',
  'SirHurt',
  'Wave',
]

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', () => {
  console.log(`Bot ready: ${client.user.tag}`)
  pollAll() 
  setInterval(pollAll, POLL_INTERVAL_MS)
})

async function fetch_executor(name) {
  try {
    const encoded = encodeURIComponent(name)
    const res = await fetch(`https://weao.xyz/api/status/exploits/${encoded}`, {
      headers: { 'User-Agent': WEAO_USER_AGENT },
    })
    if (res.status === 429) { console.warn(`[weao] rate limited for ${name}`); return null }
    if (!res.ok) { console.warn(`[weao] ${name} returned ${res.status}`); return null }
    return await res.json()
  } catch (err) {
    console.error(`[weao] fetch error for ${name}:`, err.message)
    return null
  }
}

function buildEmbed(data, changeType) {
  const isDown = !data.updateStatus
  const isDetected = data.detected && data.updateStatus
  const isUp = !data.detected && data.updateStatus

  let color, title, description
  if (isDown) {
    color = 0xe63946
    title = 'An exploit is no longer working!'
    description = `**${data.title}** is no longer updated for the current Roblox version!`
  } else if (isDetected) {
    color = 0xfbbf24
    title = 'An exploit has been flagged!'
    description = `**${data.title}** is working but may be detected on banwaves!`
  } else {
    color = 0x4ade80
    title = 'An exploit update has been detected!'
    description = `**${data.title}** has been updated for **${data.platform}**!`
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setThumbnail('https://xploits.xyz/X.png')
    .setDescription(description)
    .addFields(
      { name: 'New Version:', value: `\`${data.version ?? 'Unknown'}\``, inline: false },
      { name: 'Date:', value: data.updatedDate ?? 'Unknown', inline: false },
    )
    .setTimestamp()
  
  return embed
}

async function pollAll() {
  console.log(`[poll] Checking ${TRACKED.length} executors...`)
  const channel = await client.channels.fetch(UPDATES_CHANNEL_ID).catch(() => null)

  for (const name of TRACKED) {
    const data = await fetch_executor(name)
    if (!data || !data.title) continue

    const prev = getExecutor(data.title.toLowerCase())

    const current = {
      name: data.title.toLowerCase(),
      version: data.version ?? null,
      detected: data.detected ? 1 : 0,
      update_status: data.updateStatus ? 1 : 0,
      updated_date: data.updatedDate ?? null,
      platform: data.platform ?? null,
      last_checked: Date.now(),
    }

    upsertExecutor(current)

    if (prev &&
        prev.version === current.version &&
        prev.detected === current.detected &&
        prev.update_status === current.update_status
    ) continue

    let changeType
    if (!prev) {
      changeType = 'Now being tracked.'
    } else if (prev.detected !== current.detected && current.detected === 0) {
      changeType = `${data.title} is no longer detected!`
    } else if (prev.detected !== current.detected && current.detected === 1) {
      changeType = `${data.title} has been detected!`
    } else if (prev.version !== current.version) {
      changeType = `Updated from \`${prev.version}\` → \`${current.version}\``
    } else if (prev.update_status !== current.update_status) {
      changeType = current.update_status ? `${data.title} is now updated!` : `${data.title} is no longer updated for the current Roblox version.`
    } else {
      changeType = 'Status changed.'
    }

    console.log(`[tracker] ${data.title}: ${changeType}`)

    if (channel) {
      await channel.send({ embeds: [buildEmbed(data, changeType)] }).catch(console.error)
    }

    await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`[poll] Done.`)
}

client.login(BOT_TOKEN)

const app = express()
app.use(cors())

app.get('/status/:name', (req, res) => {
  const row = getExecutor(req.params.name.toLowerCase())
  if (!row) return res.status(404).json({ error: 'Executor not found' })
  res.json({
    name: row.name,
    version: row.version,
    detected: row.detected === 1,
    updateStatus: row.update_status === 1,
    updatedDate: row.updated_date,
    platform: row.platform,
    last_checked: row.last_checked,
  })
})

app.get('/force/:name', async (req, res) => {
  const row = getExecutor(req.params.name.toLowerCase())
  if (!row) return res.status(404).json({ error: 'Not found' })

  const channel = await client.channels.fetch(UPDATES_CHANNEL_ID).catch(() => null)
  if (!channel) return res.status(500).json({ error: 'Channel not found' })

  const fakeData = {
    title: row.name,
    version: row.version,
    detected: row.detected === 1,
    updateStatus: row.update_status === 1,
    updatedDate: row.updated_date,
    platform: row.platform,
  }

  await channel.send({ embeds: [buildEmbed(fakeData, 'Force test post.')] })
  res.json({ ok: true })
})

app.get('/status', (req, res) => {
  const rows = getAllExecutors()
  res.json(rows.map(row => ({
    name: row.name,
    version: row.version,
    detected: row.detected === 1,
    updateStatus: row.update_status === 1,
    updatedDate: row.updated_date,
    platform: row.platform,
    last_checked: row.last_checked,
  })))
})

app.listen(PORT, () => console.log(`API listening on port ${PORT}`))
