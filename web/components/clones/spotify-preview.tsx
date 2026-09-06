"use client";
/** Presentation adapted from francoborrelli/spotify-react-web-client (MIT).
 * Sources and changes: ./README.md; license: ./licenses/spotify-react-web-client.txt.
 */
import { memo, useEffect, useState } from "react";
import {
  Clock3,
  Heart,
  Home,
  Library,
  ListMusic,
  Maximize2,
  Music2,
  Pause,
  Play,
  Repeat2,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import type { Theme } from "@/lib/theme";

// Adapted from the upstream Chip component: preserve its Encore chip contract,
// replace Redux actions with local state, and expose the current pressed state.
const Chip = memo(function Chip({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`chip ${active ? "active" : ""}`}
      data-encore-id="chip"
      aria-pressed={active}
      onClick={onClick}
    >
      {text}
    </button>
  );
});
const tracks = [
  {
    name: "Late afternoon",
    artist: "Sunday Club",
    album: "Small Hours",
    duration: 218,
    art: "sun",
  },
  {
    name: "Somewhere familiar",
    artist: "Soft Focus",
    album: "Daydreams",
    duration: 184,
    art: "wave",
  },
  {
    name: "Windows open",
    artist: "Paper Planes",
    album: "A Little Slower",
    duration: 242,
    art: "leaf",
  },
  {
    name: "Blue hour",
    artist: "Still Life",
    album: "After the Rain",
    duration: 196,
    art: "night",
  },
  {
    name: "Home again",
    artist: "Sunday Club",
    album: "Small Hours",
    duration: 207,
    art: "sun",
  },
  {
    name: "Good things take time",
    artist: "Soft Focus",
    album: "Daydreams",
    duration: 231,
    art: "wave",
  },
];
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
function Cover({ art, large = false }: { art: string; large?: boolean }) {
  return (
    <span
      className={`spotify-cover ${art} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <Music2 size={large ? 40 : 18} />
    </span>
  );
}

export function SpotifyPreview({ theme }: { theme: Theme }) {
  const [view, setView] = useState("playlist");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(42);
  const [volume, setVolume] = useState(65);
  const [liked, setLiked] = useState<number[]>([1]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [queue, setQueue] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const song = tracks[track];
  const selectTrack = (index: number) => {
    setTrack(index);
    setPosition(0);
    setPlaying(true);
  };
  const next = () => selectTrack((track + (shuffle ? 2 : 1)) % tracks.length);
  const toggleLike = () =>
    setLiked((items) =>
      items.includes(track)
        ? items.filter((i) => i !== track)
        : [...items, track],
    );
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(
      () =>
        setPosition((current) => (current < song.duration ? current + 1 : 0)),
      1000,
    );
    return () => clearInterval(interval);
  }, [playing, song.duration]);
  useEffect(() => {
    if (playing && position === song.duration && !repeat) {
      // Stop at the end of a sample. This preview never connects to an audio service.
      const timeout = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(timeout);
    }
  }, [position, playing, song.duration, repeat]);
  const visible = tracks
    .map((item, index) => ({ ...item, index }))
    .filter(
      (item) =>
        `${item.name} ${item.artist} ${item.album}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (view !== "liked" || liked.includes(item.index)) &&
        (filter !== "Albums" || item.index < 4),
    );

  return (
    <div
      className={`spotify-clone ${collapsed ? "library-collapsed" : ""} ${queue ? "queue-open" : ""}`}
      data-renderer="spotify-react-web-client"
      aria-label="Spotify theme preview"
    >
      <nav className="spotify-navbar" aria-label="Spotify preview navigation">
        <Music2 size={26} aria-label="Music" />
        <button
          className="spotify-home"
          aria-label="Spotify home"
          aria-pressed={view === "home"}
          onClick={() => {
            setView("home");
            setSearch("");
          }}
        >
          <Home size={22} />
        </button>
        <label className="spotify-search">
          <Search size={21} />
          <input
            aria-label="Search sample music"
            placeholder="What do you want to play?"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setView("search");
            }}
          />
        </label>
        <span className="spotify-demo">Preview</span>
        <span className="spotify-user">Y</span>
      </nav>
      <aside className="spotify-library">
        <div className="spotify-library-title">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse music library"
            aria-expanded={!collapsed}
          >
            <Library size={22} />
            <b>Your Library</b>
          </button>
        </div>
        <div className="spotify-filters">
          {["All", "Playlists", "Albums"].map((label) => (
            <Chip
              key={label}
              text={label}
              active={filter === label}
              onClick={() => setFilter(label)}
            />
          ))}
        </div>
        <button
          className={`spotify-library-item ${view === "liked" ? "active" : ""}`}
          aria-label="Liked Songs"
          onClick={() => {
            setView("liked");
            setSearch("");
          }}
        >
          <span className="spotify-cover liked">
            <Heart size={20} />
          </span>
          <span>
            <b>Liked Songs</b>
            <small>Playlist · {liked.length} songs</small>
          </span>
        </button>
        {[theme.name, "Quiet mornings", "After hours"].map((title, index) => (
          <button
            key={index}
            className={`spotify-library-item ${view === "playlist" && index === 0 ? "active" : ""}`}
            aria-label={`Open ${title} playlist`}
            onClick={() => {
              setView("playlist");
              setSearch("");
            }}
          >
            <Cover art={tracks[index].art} />
            <span>
              <b>{title}</b>
              <small>Playlist · You</small>
            </span>
          </button>
        ))}
      </aside>
      <section className="spotify-center">
        {view === "home" ? (
          <div className="spotify-home-content">
            <div className="spotify-filters">
              <Chip text="All" active onClick={() => setView("home")} />
              <Chip
                text="Music"
                active={false}
                onClick={() => setView("playlist")}
              />
            </div>
            <h2>Made for you</h2>
            <div className="spotify-albums">
              {tracks.slice(0, 4).map((item, index) => (
                <button
                  key={item.name}
                  onClick={() => {
                    selectTrack(index);
                    setView("playlist");
                  }}
                >
                  <Cover art={item.art} large />
                  <b>{item.album}</b>
                  <small>{item.artist}</small>
                </button>
              ))}
            </div>
            <h2>Recently played</h2>
          </div>
        ) : (
          <header className="spotify-playlist-header">
            <Cover art={view === "liked" ? "liked" : "sun"} large />
            <div>
              <small>
                {view === "search" ? "Search results" : "Public Playlist"}
              </small>
              <h2>
                {view === "liked"
                  ? "Liked Songs"
                  : view === "search"
                    ? search || "Find your next favorite"
                    : theme.name}
              </h2>
              <p>A little soundtrack for making things.</p>
              <b>You</b>
              <span> · {visible.length} songs</span>
            </div>
          </header>
        )}
        <div className="spotify-playlist-list">
          <div className="spotify-list-actions">
            <button
              className="circle-play"
              aria-label={
                playing ? "Pause sample playback" : "Play sample playlist"
              }
              onClick={() => setPlaying(!playing)}
            >
              {playing ? (
                <Pause fill="currentColor" />
              ) : (
                <Play fill="currentColor" />
              )}
            </button>
            <button
              aria-label="Save current song"
              aria-pressed={liked.includes(track)}
              onClick={toggleLike}
            >
              <Heart
                size={25}
                fill={liked.includes(track) ? "currentColor" : "none"}
              />
            </button>
            <span>
              List <ListMusic size={16} />
            </span>
          </div>
          <table className="spotify-song-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th className="album-column">Album</th>
                <th className="date-column">Date added</th>
                <th>
                  <Clock3 size={15} aria-label="Duration" />
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr
                  key={item.name}
                  className={track === item.index ? "active" : ""}
                >
                  <td>
                    {track === item.index && playing ? "♫" : item.index + 1}
                  </td>
                  <td>
                    <button
                      onClick={() => selectTrack(item.index)}
                      aria-label={`Play ${item.name}`}
                    >
                      <Cover art={item.art} />
                      <span>
                        <b>{item.name}</b>
                        <small>{item.artist}</small>
                      </span>
                    </button>
                  </td>
                  <td className="album-column">{item.album}</td>
                  <td className="date-column">2 days ago</td>
                  <td>{time(item.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="spotify-empty">No sample tracks found.</p>
          )}
        </div>
      </section>
      {queue && (
        <aside className="spotify-queue">
          <div>
            <b>Queue</b>
            <button aria-label="Close queue" onClick={() => setQueue(false)}>
              <X size={18} />
            </button>
          </div>
          <small>Now playing</small>
          <Cover art={song.art} large />
          <h3>{song.name}</h3>
          <p>{song.artist}</p>
          <b>Next up</b>
          {tracks.slice(0, 3).map((item, index) => (
            <button key={item.name} onClick={() => selectTrack(index)}>
              <Cover art={item.art} />
              <span>
                {item.name}
                <small>{item.artist}</small>
              </span>
            </button>
          ))}
        </aside>
      )}
      <footer className="spotify-playing-bar">
        <div className="spotify-song-details">
          <Cover art={song.art} />
          <span>
            <b>{song.name}</b>
            <small>{song.artist}</small>
          </span>
          <button
            aria-label="Like current song"
            aria-pressed={liked.includes(track)}
            onClick={toggleLike}
          >
            <Heart
              size={17}
              fill={liked.includes(track) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="spotify-play-controls">
          <div>
            <button
              aria-label="Shuffle sample songs"
              aria-pressed={shuffle}
              onClick={() => setShuffle(!shuffle)}
            >
              <Shuffle size={16} />
            </button>
            <button
              aria-label="Previous sample song"
              onClick={() =>
                selectTrack((track + tracks.length - 1) % tracks.length)
              }
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              className="player-pause-button"
              aria-label={playing ? "Pause sample" : "Play sample"}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <button aria-label="Next sample song" onClick={next}>
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              aria-label="Repeat sample song"
              aria-pressed={repeat}
              onClick={() => setRepeat(!repeat)}
            >
              <Repeat2 size={17} />
            </button>
          </div>
          <label className="spotify-progress">
            <span>{time(position)}</span>
            <input
              type="range"
              aria-label="Sample playback position"
              min={0}
              max={song.duration}
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
            />
            <span>{time(song.duration)}</span>
          </label>
        </div>
        <div className="spotify-extra-controls">
          <button
            aria-label="Show music queue"
            aria-pressed={queue}
            onClick={() => setQueue(!queue)}
          >
            <ListMusic size={18} />
          </button>
          <Volume2 size={17} />
          <input
            aria-label="Sample volume"
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
          <Maximize2 size={15} aria-hidden="true" />
        </div>
      </footer>
      <span className="spotify-silent" role="status">
        Sample music · silent playback
      </span>
    </div>
  );
}
