# PIP · Grandma's Kitchen

A two-phone demo for the WashUX Design-A-Thon 2026. PIP is a shared fluffy companion: Grandma teaches a family dish on one phone, Emma cooks it on the other, and PIP hops between the two screens carrying each person's part.

Every cooking step is animated on both phones: Emma cracks, chops, pours and stirs in her wok while Grandma watches it live through a little window on her phone, then PIP plates the dish, tastes it and reacts.

No sign-up. The two phones sync in real time through free public MQTT message servers (each phone uses two servers at once for reliability). Messages only carry dish choices and taps, no personal data.

## Use it
- Open the page and tap **Start a new kitchen**, then open one link on each phone (or scan the QR code).
- Or open `?view=both` to see both phones side by side on one screen (works offline).

Built with the team's own PIP sketch as the starting point; code written with help from Claude (AI). Libraries: MQTT.js, qrcode-generator (MIT). Fonts: Fredoka, Nunito (SIL OFL).
