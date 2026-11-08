# PIP · Grandma's Kitchen

PIP is a shared, fluffy companion that hops between two phones, with a shelf of little games
for a grandparent and a grandchild to play from their own homes.

**Cook together** is the game that is built: Grandma teaches a dish on her phone, Steven cooks it on his,
and PIP carries every step between them. The other games on the shelf (garden, drawing, stories, singing,
chess, photos, walks, letters) are placeholders that show where PIP goes next.

A **video call** keeps them face to face the whole time: the other person's face floats in a small window
you can drag to either side, shrinks to a pill above any card that opens, and hanging up ends it on both phones.
(In this prototype the faces are animated drawings; no camera or microphone is streamed.)

Made for the **WashUX Design-A-Thon 2026**.

Live demo: https://udooct.github.io/pip-demo/

## Try it

- **Two phones:** open the link on one phone. On PIP's game shelf, tap **Cook together → Start**. Each phone then opens its own link or QR code: one is Grandma, one is Steven.
- **One screen:** add `?view=both` to the link to see both phones side by side.

The story:
0. PIP offers a video call. Steven sees "Grandma is calling…" and joins.
1. Grandma picks a dish, and PIP carries the invitation to Steven.
2. Grandma decides what goes in first and adds her secret touch.
3. Steven adds each ingredient, adds his own twist, and stirs.
4. Grandma calls "serve", and PIP tastes the dish.
5. Each of them takes a selfie, and PIP turns both selfies, itself and the dish into one keepsake photo.

## Run it on your computer

Nothing to install, and there is no build step. Start any static file server in this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. The camera only works on `http://localhost` or `https://`.

## Put it online

This is a plain static site, so you can upload the folder as it is:

- **GitHub Pages:** push the folder to a repository. Then open Settings → Pages → Deploy from a branch, and pick the root folder.
- **Netlify Drop:** drag the folder onto https://app.netlify.com/drop.
- **Figma Make:** import the folder as a project. It is static HTML, CSS and JavaScript, with no setup scripts.

## What's where

| File | What it does |
|---|---|
| `index.html` | The page shell. It loads every file below, in order. |
| `css/styles.css` | All the styling: colors, layout and animations. |
| `js/config.js` | Build flag: this copy syncs the two phones over MQTT. |
| `js/art.js` | PIP's fluffy body and faces, plus the ingredients, dishes and icons. |
| `js/scenes.js` | Grandma's and Steven's kitchens and living rooms (SVG). |
| `js/data.js` | Dishes, ingredients and every line of on-screen text. **Edit wording here.** |
| `js/sync.js` | The shared cooking state. Each phone writes only its own document. |
| `js/mqtt-hub.js` | Real-time sync between the phones, and encryption for the selfies. |
| `js/cook.js` | The cooking stage (canvas): flames, wok, food that falls and sizzles, stirring, plating. |
| `js/photo.js` | The selfie camera and the group photo. |
| `js/app.js` | One phone's screens and interactions, for Grandma or Steven. |
| `js/boot-web.js` | The start page, kitchen codes, QR links and the both-phones view. |
| `vendor/mqtt.min.js` | MQTT.js, the client library for the message servers. |
| `vendor/qrcode.js` | QR code generator. |

Load order matters, because each file uses things defined in the files before it.
If you add a file, add its `<script>` tag to `index.html` in the right place.

## Link options

| Link | Opens |
|---|---|
| no parameters | the start page |
| `?room=CODE` | role picker and share links for that kitchen |
| `?room=CODE&role=grandma` or `&role=steven` | this phone plays that role |
| `?view=both` or `#both` | both phones on one screen |

## How the sync works

**Connection.** Each phone connects to two free public MQTT brokers over secure WebSockets: `broker.emqx.io` and `broker.hivemq.com`. An MQTT broker is a real-time message server. Every update goes through both brokers, so the demo keeps working if one network path is blocked.

**Shared state.** Each phone writes only its own role document. Both phones work out the same cooking step from the two documents. The documents are kept ("retained") on the brokers, so a phone that reloads catches up right away.

**Privacy.** The kitchen code is turned into two things with PBKDF2: an AES-GCM key, and the channel name used on the servers.
- Selfies are encrypted with that key on the phone, before they leave it.
- Because the channel name is derived too, the kitchen code itself never appears on the servers.
- So anyone watching the public servers sees neither the kitchen code nor anyone's face.
- Photos are removed from the servers once the session moves on.

## Notes

- The layout is designed for a phone held upright. On a computer it shows a phone-sized layout.
- If the camera isn't available, you can pick a photo instead, or skip and PIP draws you.
- All illustrations are original and drawn in code.
