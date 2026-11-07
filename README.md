# PIP · Grandma's Kitchen

A two-phone demo for the WashUX Design-A-Thon 2026. PIP is a shared fluffy companion: Grandma teaches a family dish on one phone, Steven cooks it on the other, and PIP hops between the two screens carrying each person's part.

- **Cooking, live on both phones.** Steven cracks, chops, pours, tosses and stirs in his wok (drag the ingredient from PIP, circle the wok, or tap it to toss) while Grandma watches through a little window on her phone. PIP plates the dish, tastes it and reacts.
- **Turn-taking you can see.** A "Your turn" / "Grandma's turn" chip, a "Grandma is watching" badge, and PIP looking at your finger.
- **Touch PIP.** Tap to say hi, tap three times to spin, press and hold to pet (hearts).
- **Cooking photo.** After the meal each phone takes its own selfie (front camera, a picked photo, or skip for a drawn portrait). Both phones then make the same keepsake photo: the two selfies, PIP and the dish. Save or share it; it also shows up in "Our Little Moments".

No sign-up. The two phones sync in real time through free public MQTT message servers (each phone uses two servers at once for reliability). Selfies are encrypted with a key made from the kitchen code before they leave the phone, the kitchen code itself never appears on the servers, and selfies are removed from the servers when the session ends. Everything else is just dish choices and taps.

## Use it
- Open the page and tap **Start a new kitchen**, then open one link on each phone (or scan the QR code).
- Or open `?view=both` to see both phones side by side on one screen (works offline).
- The camera needs the page to be opened over https (GitHub Pages is) and permission on each phone. Without a camera, pick a photo or skip.

Built with the team's own PIP sketch as the starting point; code written with help from Claude (AI). Libraries: MQTT.js, qrcode-generator (MIT). Fonts: Fredoka, Nunito (SIL OFL).
