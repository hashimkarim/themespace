"use client";
/** Grid, channel rail, profile and server buttons adapted from leoronne/discord-ui-clone (MIT).
 * See ./README.md and ./licenses/discord-ui-clone.txt.
 */
import { useState } from "react";
import {
  ChevronDown,
  Hash,
  Headphones,
  MessageCircle,
  Mic,
  MicOff,
  Search,
  Send,
  Smile,
  Users,
  Volume2,
} from "lucide-react";
import {
  DefaultOptions,
  Embed,
  EmbedField,
  EmbedFields,
  Mention,
  Message,
  Messages,
  OptionsContext,
} from "@bf-go/discord-message-kit";
import type { Appearance } from "@/lib/theme";

const channels = ["general", "design-feedback", "showcase", "resources"];
const options = {
  ...DefaultOptions,
  disableFont: true,
  locale: "en-US",
  timeZone: "UTC",
};
const members = [
  ["A", "Alex", "Designing a new theme"],
  ["M", "Morgan", "Listening to music"],
  ["J", "Jamie", "Online"],
];

export function DiscordPreview({ mode }: { mode: Appearance }) {
  const [channel, setChannel] = useState("general");
  const [server, setServer] = useState("Design friends");
  const [showMembers, setShowMembers] = useState(true);
  const [compact, setCompact] = useState(false);
  const [mic, setMic] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState<Record<string, string[]>>({});
  const [reaction, setReaction] = useState(false);
  const [voice, setVoice] = useState(false);
  const messages = (sent[channel] || []).filter((item) =>
    item.toLowerCase().includes(search.toLowerCase()),
  );
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setSent((items) => ({
      ...items,
      [channel]: [...(items[channel] || []), message.trim()].slice(-30),
    }));
    setMessage("");
  }
  return (
    <div
      className={`discord-clone ${showMembers ? "with-members" : ""}`}
      data-renderer="discord-ui-clone"
      aria-label="Discord theme preview"
    >
      <nav className="discord-server-list" aria-label="Sample servers">
        <button
          className="discord-server-button"
          aria-label="Friends server"
          aria-pressed={server === "Friends"}
          onClick={() => setServer("Friends")}
        >
          <MessageCircle />
        </button>
        <hr />
        {[
          ["D", "Design friends"],
          ["C", "Cozy corner"],
          ["P", "Projects"],
        ].map(([letter, name]) => (
          <button
            key={letter}
            className={`discord-server-button ${server === name ? "active" : ""}`}
            aria-label={`${name} server`}
            aria-pressed={server === name}
            onClick={() => setServer(name)}
          >
            {letter}
          </button>
        ))}
      </nav>
      <div className="discord-server-name">
        <b>{server}</b>
        <ChevronDown size={16} />
      </div>
      <header className="discord-channel-info">
        <Hash size={22} />
        <b>{channel}</b>
        <span className="discord-topic">A place to make yourself at home</span>
        <button
          aria-label="Toggle member list"
          aria-pressed={showMembers}
          onClick={() => setShowMembers(!showMembers)}
        >
          <Users size={20} />
        </button>
        <label>
          <Search size={14} />
          <input
            aria-label="Search local messages"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </header>
      <aside className="discord-channel-list">
        <div className="discord-channel-category">
          <ChevronDown size={12} /> TEXT CHANNELS
        </div>
        {channels.map((name) => (
          <button
            key={name}
            className={`discord-channel-button ${channel === name ? "active" : ""}`}
            aria-pressed={channel === name}
            onClick={() => {
              setChannel(name);
              setSearch("");
            }}
          >
            <Hash size={20} />
            {name}
          </button>
        ))}
        <div className="discord-channel-category">
          <ChevronDown size={12} /> VOICE CHANNELS
        </div>
        <button
          className="discord-channel-button"
          aria-pressed={voice}
          onClick={() => setVoice(!voice)}
        >
          <Volume2 size={20} />
          The lounge
        </button>
        {voice && (
          <p className="discord-voice-status">
            Voice preview · you joined locally
          </p>
        )}
        <div className="discord-display-option">
          <button aria-pressed={compact} onClick={() => setCompact(!compact)}>
            Message display: {compact ? "Compact" : "Cozy"}
          </button>
        </div>
      </aside>
      <div className="discord-user-info">
        <span className="discord-avatar">
          Y<i />
        </span>
        <span>
          <b>You</b>
          <small>Online</small>
        </span>
        <button
          aria-label={
            mic ? "Mute microphone preview" : "Unmute microphone preview"
          }
          aria-pressed={!mic}
          onClick={() => setMic(!mic)}
        >
          {mic ? <Mic size={17} /> : <MicOff size={17} />}
        </button>
        <button
          aria-label="Deafen preview"
          aria-pressed={deafened}
          onClick={() => setDeafened(!deafened)}
        >
          <Headphones size={17} />
        </button>
      </div>
      <section className="discord-channel-data">
        <div
          className="discord-messages"
          role="log"
          aria-label={`${channel} local messages`}
        >
          <div className="discord-welcome">
            <span>
              <Hash size={34} />
            </span>
            <h2>Welcome to #{channel}!</h2>
            <p>This is the beginning of the #{channel} channel.</p>
          </div>
          <OptionsContext.Provider value={options}>
            <Messages lightTheme={mode === "light"} compactMode={compact}>
              {!search && [
                <Message
                  key="alex"
                  author="Alex"
                  avatar="blue"
                  timestamp="2026-08-01T10:24:00Z"
                  timestampFormat="t"
                  roleColor="var(--brand-500)"
                >
                  Morning everyone! The new palette is ready in{" "}
                  <Mention type="channel">showcase</Mention>.
                </Message>,
                <Message
                  key="morgan"
                  author="Morgan"
                  avatar="green"
                  timestamp="2026-08-01T10:26:00Z"
                  timestampFormat="t"
                  markdown
                >
                  {channel === "resources"
                    ? "Some things to try: **bold text**, *italics*, `inline code`, and ||a little surprise||."
                    : "The surfaces feel great together. Try selecting text and hovering over a channel."}
                  <Embed
                    slot="embeds"
                    color="var(--brand-500)"
                    title="A theme for your everyday spaces"
                  >
                    <p>One palette, shared across your favorite tools.</p>
                    <EmbedFields>
                      <EmbedField fieldTitle="Appearance" inline>
                        {mode}
                      </EmbedField>
                      <EmbedField fieldTitle="Status" inline>
                        Ready to preview
                      </EmbedField>
                    </EmbedFields>
                  </Embed>
                </Message>,
                <Message
                  key="jamie"
                  author="Jamie"
                  avatar="gray"
                  timestamp="2026-08-01T10:28:00Z"
                  timestampFormat="t"
                >
                  <Mention>You</Mention> That accent looks good.
                  <div className="discord-reactions">
                    <button
                      aria-label="React with sparkle"
                      aria-pressed={reaction}
                      onClick={() => setReaction(!reaction)}
                    >
                      ✨ {reaction ? 5 : 4}
                    </button>
                  </div>
                </Message>,
              ]}
              {messages.map((text, index) => (
                <Message
                  key={index}
                  author="You"
                  avatar="orange"
                  timestamp="2026-08-01T10:30:00Z"
                  timestampFormat="t"
                >
                  {text}
                </Message>
              ))}
            </Messages>
          </OptionsContext.Provider>
          {search && !messages.length && (
            <p className="discord-no-results">No matching local messages.</p>
          )}
        </div>
        <form className="discord-input-wrapper" onSubmit={submit}>
          <div>
            <button
              type="button"
              aria-label="Insert a smile"
              onClick={() => setMessage((text) => `${text} 🙂`)}
            >
              <Smile size={22} />
            </button>
            <input
              aria-label={`Message #${channel}`}
              placeholder={`Message #${channel}`}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button aria-label="Send local preview message" type="submit">
              <Send size={20} />
            </button>
          </div>
          <small>Messages stay in this preview.</small>
        </form>
      </section>
      {showMembers && (
        <aside className="discord-user-list">
          <h3>ONLINE — 3</h3>
          {members.map(([letter, name, status]) => (
            <div key={letter}>
              <span className="discord-avatar">
                {letter}
                <i />
              </span>
              <span>
                <b>{name}</b>
                <small>{status}</small>
              </span>
            </div>
          ))}
          <h3>OFFLINE — 2</h3>
          {["Taylor", "Sam"].map((name) => (
            <div key={name} className="offline">
              <span className="discord-avatar">{name[0]}</span>
              <b>{name}</b>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}
