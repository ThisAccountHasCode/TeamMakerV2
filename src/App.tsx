import {
  type DragEvent,
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
  useState,
  useEffect,
} from 'react'
import './App.css'

type Player = {
  id: string
  name: string
  color: string
  teamId: string | null
}

type Team = {
  id: string
  name: string
  accent: string
}

const palette = [
  '#ff7b7b',
  '#ffd36b',
  '#9ae66e',
  '#6fd1ff',
  '#caa0ff',
  '#ffa6c9',
  '#8de4ff',
  '#ffe066',
]

const initialTeams: Team[] = [
  { id: 'alpha', name: 'Team Alpha', accent: '#ffb347' },
  { id: 'bravo', name: 'Team Bravo', accent: '#6dd5ed' },
]

const seededPlayers = (
  [
    'Astra',
    'Blitz',
    'Cipher',
    'Draco',
    'Echo',
    'Flux',
    'Gemini',
    'Halo',
    'Ion',
    'Jinx',
    'Kairo',
    'Luna',
    'Metro'
  ] as const
).map((name, index) => ({
  id: makeId(),
  name,
  color: palette[index % palette.length],
  teamId: null,
}))

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 9)
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const val = parts.pop()?.split(';').shift()
    return val ? decodeURIComponent(val) : null
  }
  return null
}

function App() {
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = getCookie('players')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return seededPlayers
  })
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = getCookie('teams')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore
      }
    }
    return initialTeams
  })
  const [playerName, setPlayerName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.cookie.includes('theme=dark')
    }
    return false
  })

  // Initialize theme on mount
  useMemo(() => {
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        document.cookie = 'theme=dark; path=/; max-age=31536000' // 1 year
      } else {
        document.documentElement.classList.remove('dark')
        document.cookie = 'theme=light; path=/; max-age=31536000' // 1 year
      }
      return next
    })
  }

  useEffect(() => {
    document.cookie = `players=${encodeURIComponent(JSON.stringify(players))}; path=/; max-age=31536000`
  }, [players])

  useEffect(() => {
    document.cookie = `teams=${encodeURIComponent(JSON.stringify(teams))}; path=/; max-age=31536000`
  }, [teams])

  const handleReset = () => {
    if (confirm('Are you sure you want to reset everything? This will clear all your changes.')) {
      setPlayers(seededPlayers)
      setTeams(initialTeams)
    }
  }

  const roster = useMemo(() => {
    const teamPlayers: Record<string, Player[]> = { bench: [] }
    teams.forEach((team) => {
      teamPlayers[team.id] = []
    })

    players.forEach((player) => {
      const bucket = player.teamId ?? 'bench'
      if (!teamPlayers[bucket]) {
        teamPlayers[bucket] = []
      }
      teamPlayers[bucket].push(player)
    })

    Object.values(teamPlayers).forEach((list) =>
      list.sort((a, b) => a.name.localeCompare(b.name)),
    )

    return teamPlayers
  }, [players, teams])

  const handleCreatePlayer = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = playerName.trim()
    if (!trimmed) return
    setPlayers((prev) => [
      ...prev,
      {
        id: makeId(),
        name: trimmed,
        color: palette[prev.length % palette.length],
        teamId: null,
      },
    ])
    setPlayerName('')
  }

  const handleCreateTeam = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = teamName.trim()
    if (!trimmed) return
    setTeams((prev) => [
      ...prev,
      {
        id: makeId(),
        name: trimmed,
        accent: palette[prev.length % palette.length],
      },
    ])
    setTeamName('')
  }

  const handleDrop = (playerId: string, teamId: string | null) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, teamId } : player,
      ),
    )
    setHoveredZone(null)
  }

  const handleRemovePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId))
  }

  const handleUpdatePlayerName = (playerId: string, newName: string) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, name: newName } : player,
      ),
    )
  }

  const handleRemoveTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId))
    setPlayers((prev) =>
      prev.map((player) =>
        player.teamId === teamId ? { ...player, teamId: null } : player,
      ),
    )
  }

  const handleUpdateTeamName = (teamId: string, newName: string) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, name: newName } : team,
      ),
    )
  }

  const startDrag = (event: DragEvent<HTMLDivElement>, playerId: string) => {
    event.dataTransfer.setData('playerId', playerId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const makeZoneHandlers = (zoneKey: string, teamId: string | null) => ({
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDragEnter: () => setHoveredZone(zoneKey),
    onDragLeave: () => setHoveredZone((current) => (current === zoneKey ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault()
      const playerId = event.dataTransfer.getData('playerId')
      if (playerId) {
        handleDrop(playerId, teamId)
      }
    },
  })

  const benchKey = 'bench'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="title">Simple Team Maker</p>
          <p className="subtitle">
            Add nametags, drag them into teams, and keep your lobby organized.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="forms-grid">
            <form className="inline-form" onSubmit={handleCreatePlayer}>
              <label htmlFor="player-name">Add player</label>
              <div className="field-row">
                <input
                  id="player-name"
                  placeholder="e.g. Solaris"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                />
                <button type="submit">Add</button>
              </div>
            </form>
            <form className="inline-form" onSubmit={handleCreateTeam}>
              <label htmlFor="team-name">Add team</label>
              <div className="field-row">
                <input
                  id="team-name"
                  placeholder="e.g. Vanguard"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                />
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="theme-toggle" onClick={handleReset} title="Reset to default">
              ↺ Reset
            </button>
            <button className="theme-toggle" onClick={toggleDarkMode} style={{ minWidth: '90px' }}>
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      </header>

      <section className="board">
        <TeamColumn
          title="Free Players"
          subtitle="Drag into any team"
          accent="#c5c6ce"
          players={roster[benchKey] ?? []}
          hovered={hoveredZone === benchKey}
          {...makeZoneHandlers(benchKey, null)}
        >
          {(roster[benchKey] ?? []).length === 0 && (
            <p className="empty-hint">No players waiting</p>
          )}
        </TeamColumn>
        {teams.map((team) => (
          <TeamColumn
            key={team.id}
            title={team.name}
            subtitle={`${(roster[team.id] ?? []).length} player(s)`}
            accent={team.accent}
            players={roster[team.id] ?? []}
            hovered={hoveredZone === team.id}
            onRemove={() => handleRemoveTeam(team.id)}
            onRename={(newName) => handleUpdateTeamName(team.id, newName)}
            {...makeZoneHandlers(team.id, team.id)}
          />
        ))}
      </section>

      <footer className="app-footer">
        <p>
          Pro tip: hold and drag a nametag to swap teams. Drop back on Free
          Agents to clear assignments.
        </p>
      </footer>

      <div className="sr-only" aria-live="polite">
        {players.length} players across {teams.length} team(s)
      </div>
    </div>
  )

  function TeamColumn({
    title,
    subtitle,
    accent,
    players,
    hovered,
    children,
    onRemove,
    onRename,
    ...rest
  }: {
    title: string
    subtitle: string
    accent: string
    players: Player[]
    hovered: boolean
    children?: ReactNode
    onRemove?: () => void
    onRename?: (name: string) => void
  } & HTMLAttributes<HTMLDivElement>) {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(title)

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault()
      if (editName.trim() && onRename) {
        onRename(editName.trim())
      }
      setIsEditing(false)
    }

    return (
      <div className={`team-column ${hovered ? 'is-hovered' : ''}`} {...rest}>
        <div className="team-header">
          <div className="badge" style={{ background: accent }} />
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <form onSubmit={handleSubmit}>
                <input
                  className="edit-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSubmit}
                  autoFocus
                />
              </form>
            ) : (
              <p className="team-title" onClick={() => {
                if (onRename) {
                  setEditName(title)
                  setIsEditing(true)
                }
              }} style={{ cursor: onRename ? 'pointer' : 'default' }}>
                {title}
              </p>
            )}
            <p className="team-subtitle">{subtitle}</p>
          </div>
          {onRemove && (
            <button className="icon-button" onClick={onRemove} title="Remove Team">
              ×
            </button>
          )}
        </div>
        <div className="player-stack">
          {players.map((player) => (
            <Nametag
              key={player.id}
              player={player}
              onRemove={() => handleRemovePlayer(player.id)}
              onRename={(newName) => handleUpdatePlayerName(player.id, newName)}
              onDragStart={(event) => startDrag(event, player.id)}
            />
          ))}
          {children}
        </div>
      </div>
    )
  }

  function Nametag({
    player,
    onRemove,
    onRename,
    ...props
  }: {
    player: Player
    onRemove: () => void
    onRename: (name: string) => void
  } & HTMLAttributes<HTMLDivElement>) {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(player.name)

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault()
      if (editName.trim()) {
        onRename(editName.trim())
      }
      setIsEditing(false)
    }

    return (
      <div
        className="nametag"
        style={{ borderColor: player.color }}
        draggable
        {...props}
      >
        <span className="pill" style={{ background: player.color }} />
        {isEditing ? (
          <form onSubmit={handleSubmit} style={{ flex: 1 }}>
            <input
              className="edit-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSubmit}
              autoFocus
              onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking input
            />
          </form>
        ) : (
          <span 
            className="name" 
            onClick={() => {
              setEditName(player.name)
              setIsEditing(true)
            }}
            style={{ cursor: 'pointer' }}
          >
            {player.name}
          </span>
        )}
        <button className="ghost" onClick={onRemove} type="button">
          ×
        </button>
      </div>
    )
  }
}

export default App
