# Preview frontend adaptations

These are local, interactive theme fixtures. They do not authenticate, play audio,
connect to Discord, or make Spotify API requests. Sample people and songs are fictional.

## Spotify

- Upstream: https://github.com/francoborrelli/spotify-react-web-client
- Revision: `c48ed78d30697e8ab5c1aa327ed84859f966e761`
- License: [MIT, Franco Martín Borrelli](licenses/spotify-react-web-client.txt)
- Adapted sources: `src/components/Chip/index.tsx`, `src/components/Layout/index.tsx`,
  `src/components/SongsTable/header.tsx`, `src/styles/PlayingBar.scss`,
  `src/styles/PlaylistPage.scss`.
- Retained the navbar/library/content/optional queue/player layout, Encore chip
  component contract, table columns, player button and album-cover styling.
- Replaced Ant Design, Redux, API/SDK hooks, remote album art and viewport layout
  with scoped CSS, local state, sample artwork and container queries. Themeable
  colors consume `--spice-*` variables parsed from the generated `color.ini`.
  Native fixed UI geometry is independent of design-system font/radius controls;
  only radius variables actually emitted to `user.css` apply.

## Discord

- Upstream: https://github.com/leoronne/discord-ui-clone
- Revision: `b98f8800951af93ac08cfcbfd798390fb7dc1430`
- License: [MIT, Leonardo Ronne](licenses/discord-ui-clone.txt)
- Adapted sources: `src/Layout/{index.tsx,styles.ts}`, and the `ChannelData`,
  `ChannelInfo`, `ChannelList`, `ServerButton`, `UserInfo`, `UserList` components.
- Retained the named grid areas, server rail, channel rail, profile strip,
  message/composer column and optional member rail; translated styled-components
  to scoped CSS and container queries. Removed random content, remote avatars and
  unused controls. Added keyboard-accessible local interactions.
- Rich messages use [Discord Message Kit](https://github.com/BF-GO/discord-message-kit)
  1.0.0 (MIT) with its supplied avatars, mentions, Markdown and embed components.
  Its color variables are mapped to the generated Discord CSS variables.

The clones are independent community implementations, not official frontend SDKs.
Discord's layout and private CSS contracts, and Spotify's client UI, can change.
The provenance details in each preview describe coverage and limitations.
