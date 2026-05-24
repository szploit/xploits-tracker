const { Client, GatewayIntentBits } = require('discord.js')
const express = require('express')
const cors = require('cors')
const { parseMessage } = require('./parser')
const { upsertExecutor, getExecutor, getAllExecutors } = require('./db')

const BOT_TOKEN = process.env.BOT_TOKEN
const UPDATES_CHANNEL_ID = '1494018215599144991'
const PORT = process.env.PORT || 3000

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once('ready', () => {
  console.log(`Bot ready: ${client.user.tag}`)
})

client.on('messageCreate', (message) => {
  console.log(`[msg] channel: ${message.channelId} | author bot: ${message.author.bot} | content: ${message.content.slice(0, 50)}`)
  
  if (message.channelId !== UPDATES_CHANNEL_ID) return
  if (message.author.bot === false) return

  const parsed = parseMessage(message.content)
  console.log(`[parsed]`, parsed)
  
  if (!parsed) return
  upsertExecutor(parsed)
})

client.login(BOT_TOKEN)

const app = express()
app.use(cors())

app.get('/status/:name', (req, res) => {
  const row = getExecutor(req.params.name.toLowerCase())
  if (!row) return res.status(404).json({ error: 'Executor not found' })
  res.json({
    name: row.name,
    version: row.version,
    status: row.status,     
    changelog: row.changelog,
    last_updated: row.last_updated,
  })
})

app.get('/status', (req, res) => {
  res.json(getAllExecutors())
})

app.listen(PORT, () => console.log(`API listening on port ${PORT}`))
