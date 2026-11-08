"use strict";
/* ============================================================
   Content: dishes, ingredients, reactions, copy (English)
   ============================================================ */
const DISHES = {
  tomato_egg: { core: ['egg', 'tomato'], secrets: ['sugar', 'salt', 'none'], en: 'Tomato & Egg Stir-fry', short: { en: 'Tomato & Egg' }, desc: 'Sweet, tangy, a family classic', flower: '#E9654F' },
  fried_rice: { core: ['rice', 'egg'], secrets: ['soy', 'scallion', 'none'], en: 'Egg Fried Rice', short: { en: 'Egg Fried Rice' }, desc: 'Golden rice with fluffy egg', flower: '#FFD45C' },
  bok_choy: { core: ['garlic', 'bokchoy'], secrets: ['salt', 'sugar', 'none'], en: 'Garlic Bok Choy', short: { en: 'Garlic Bok Choy' }, desc: 'Garlicky greens, ready in minutes', flower: '#9DD48A' }
};
// PIP's game shelf. Cooking is the one that is built; the others are placeholders.
const GAMES = [
  { k: 'garden', icon: 'garden', name: 'Garden' }, { k: 'draw', icon: 'draw', name: 'Draw' },
  { k: 'stories', icon: 'story', name: 'Stories' }, { k: 'sing', icon: 'sing', name: 'Sing' },
  { k: 'chess', icon: 'chess', name: 'Chess' }, { k: 'photos', icon: 'photos', name: 'Photos' },
  { k: 'walk', icon: 'walk', name: 'Walk' }, { k: 'letters', icon: 'envelope', name: 'Letters' },
];
const DISH_ORDER = ['tomato_egg', 'fried_rice', 'bok_choy'];

const ING = {
  egg: { en: 'egg', hint: 'Crack it right in!' },
  tomato: { en: 'tomato', hint: 'Chop, chop, then in it goes!' },
  rice: { en: 'rice', hint: 'Pour it in and break it up.' },
  garlic: { en: 'garlic', hint: 'Mince it fine. Smell that!' },
  bokchoy: { en: 'bok choy', hint: 'In go the greens!' },
  sugar: { en: 'a pinch of sugar', tile: { en: 'Pinch of sugar' } },
  salt: { en: 'a pinch of salt', tile: { en: 'Pinch of salt' } },
  soy: { en: 'a splash of soy sauce', tile: { en: 'Splash of soy' } },
  scallion: { en: 'chopped scallions', tile: { en: 'Scallions' } },
  none: { en: 'no secret today', tile: { en: 'No secret' } },
  chili: { en: 'chili' },
  honey: { en: 'honey' },
  cheese: { en: 'cheese' },
  chocolate: { en: 'chocolate' }
};
const TWISTS = ['chili', 'honey', 'cheese', 'chocolate'];

function outcomeOf(dish, twist) {
  if (!twist || twist === 'none') return 'yum';
  if (twist === 'chocolate') return 'blehh';
  if (twist === 'chili') return 'spicy';
  if (twist === 'cheese') return dish === 'bok_choy' ? 'odd' : 'yum';
  return 'odd';
}
const REACT = {
  yum: { face: 'joy', en: 'Mmm! So good!' },
  spicy: { face: 'love', en: 'Spicy… and SO good!' },
  odd: { face: 'curious', en: 'Hmm… that’s… interesting!' },
  blehh: { face: 'blehh', en: 'BLEHH! What is that?! Can we cook again?' }
};
const SECRET_NOTE = {
  sugar: { en: 'That pinch of sugar is Grandma’s magic.' },
  salt: { en: 'Just the right salt. Grandma knows.' },
  soy: { en: 'That splash of soy sauce! Perfect.' },
  scallion: { en: 'Scallions on top make it so fresh.' },
  none: { en: 'Grandma’s way is the best way.' }
};
const REPLIES = {
  eat_more: { en: 'Eat up, sweetie!' },
  great: { en: 'You did great!' },
  slow: { en: 'Enjoy every bite!' }
};
const REPLY_ORDER = ['eat_more', 'great', 'slow'];

const STR = {
  en: {
    name_steven: 'Steven', name_grandma: 'Grandma', avatar_steven: 'S', avatar_grandma: 'G',
    tagline: 'Little moments, together',
    whose: 'Whose phone is this?', whoseSub: 'Each phone plays one person. PIP keeps both kitchens in sync.',
    pickSteven: 'Steven', pickStevenSub: 'Standard mode', pickGrandma: 'Grandma', pickGrandmaSub: 'Easy mode, bigger text',
    pickBoth: 'Show both phones on one screen',
    st_live: 'Live', st_local: 'Same screen', st_connecting: 'Connecting', st_tabs: 'This device', st_view: 'View only',
    st_reconnecting: 'Reconnecting', st_offline: 'No sync',
    offline_help: 'Can’t reach the sync server on this network. Try mobile data, or use both phones on one screen.',
    kitchen_code: 'Kitchen code', send_link: 'Send {name}’s link', copied: 'Link copied ✓',
    here: 'here', away: 'away',
    menu: 'Menu', soundOn: 'Sound on', soundOff: 'Sound off', listen: 'Listen',
    // Grandma home
    g_home_bubble: 'What shall we play with Steven today?',
    g_home_title: 'What shall we play?', g_home_sub: 'Pick a game. PIP brings it to Steven.', moments_short: 'Moments', wave_short: 'Wave',
    e_home_title_v2: 'Play with Grandma', e_home_sub_v2: 'Grandma picks the game. Hungry? Ask her to cook!',
    game_cook: 'Cook together', game_cook_g: 'Teach Steven a family dish', game_cook_e: 'Grandma teaches, you cook',
    play: 'Play', ask_g: 'Ask', more_games: 'More games · coming soon',
    soon_toast: '{game} is coming soon. PIP is still learning it!', asked: 'PIP told Grandma you’d love to cook ✨',
    t_ask_cook: 'Steven wants to cook with you! 🍳', landing_games: 'Pick a game to play together',
    landing_games_sub: 'Two phones, one PIP. Grandma and Steven play from their own homes.',
    yes_teach: 'Yes, teach him!', later: 'Maybe later', later_bubble: 'Okay! Tap me whenever you want to teach.',
    choose_dish: 'Which dish will you teach?', back: 'Back',
    waiting_t: 'PIP went to get Steven', waiting: 'Today’s lesson: {dish}', cancel: 'Cancel',
    declined_t: 'Steven will come a bit later', declined: 'PIP will tell you as soon as he’s ready.',
    // Grandma cooking
    pick1_bubble: 'Steven is here! What goes in first?', pick1_t: 'What goes in first?', your_way: 'Your way is the right way.',
    sent_t: 'PIP is delivering it', e_adding: 'Steven is adding the {ing}…',
    pick2_bubble: 'In it went! Next is the {ing}. Add your secret?', pick2_t: 'Add your secret touch?', pick2_sub: 'Next is the {ing}.',
    e_cooking_t: 'Steven is cooking', f_added: 'Added the {ing}', f_secret: 'Sprinkled your secret',
    f_twist_wait: 'Thinking about his own twist…', f_twist: 'Added: {t}!', f_notwist: 'No twist, your way',
    f_stir: 'Stirring…', f_stirred: 'Stirred! Waiting for you', serve_btn: 'It’s ready, serve!', serve_wait: 'A bit more stirring…',
    photo: 'PIP sent you a photo', e_thanked: 'Steven says: Thank you, Grandma!', reply_t: 'Reply to Steven:', replied: 'Reply sent',
    port_e: 'Steven’s wok', port_g: 'Grandma is choosing',
    // Steven home
    e_home_bubble: 'Hi Steven! I kept your room cozy.',
    e_home_title: 'PIP’s cozy room',
    e_home_sub: 'When Grandma wants to cook with you, PIP brings her invitation.',
    moments: 'Our Little Moments', wave_to_g: 'Wave to Grandma', wave_to_e: 'Wave to Steven', waved: 'Wave sent',
    // invitation
    inv_title: 'Grandma wants to teach you a dish!', inv_lesson: 'Today’s lesson', inv_quote: 'Steven, come! Let me teach you my {dish}.',
    join: 'Join Grandma’s kitchen', notNow: 'Not now',
    open_title: 'Grandma’s kitchen is open', open_sub: 'Join whenever you’re ready. No rush.', joinNow: 'Join now',
    // Steven cooking
    lesson: 'Grandma’s {dish}', taught: 'Taught by Grandma · cooked by you', steps: 'Steps',
    pip_with_g: 'PIP is with Grandma', pip_with_e: 'PIP is with Steven',
    wait_first_t: 'Grandma is choosing', wait_first: 'What goes in first? That’s Grandma’s call.',
    g_says_first: 'Grandma says: {ing} first!',
    add_t: 'Add the {ing}', add_sub: 'Drag it from PIP into the wok, or tap the button.', add_btn: 'Add the {ing}',
    wait_secret_t: 'Grandma is thinking', wait_secret: 'Does it need her secret touch? 🤫',
    next_is: 'Next: {ing}!', secret_is: 'Grandma’s secret: {s} 🤫', no_secret: 'No secret today. Just Grandma’s way.',
    sprinkle_t: 'Add Grandma’s secret', sprinkle_sub: '{s}, exactly how she does it.', sprinkle_btn: 'Add it in',
    twist_t: 'Your turn: add a twist?', twist_sub: 'Optional. PIP will taste whatever you make.', no_twist: 'Keep it Grandma’s way',
    twist_bubble: 'Your turn! Anything to add?',
    stir_t: 'Stir it up!', stir_sub: 'Circle your finger around the wok, or hold the button.', stir_btn: 'Hold to stir',
    stir_bubble: 'Stir, stir, stir!', stirred_bubble: 'Smells so good!',
    stir_done_t: 'Smells amazing!', stir_done: 'Grandma decides when it’s ready. Waiting for her call.',
    served: 'Grandma says it’s ready!', tasting: 'PIP is tasting…',
    // card
    card_title: 'Grandma’s {dish}', card_meta: 'Taught by Grandma · cooked by Steven · {date}', attempt: 'Try {n}',
    c_g: 'Grandma', c_e: 'Steven', c_way: '{a} first, then {b}', c_secret: 'Secret: {s}', c_nosecret: 'No secret today',
    c_cooked: 'Added everything and stirred', c_twist: 'Twist: {t}', c_notwist: 'No twist, Grandma’s way',
    pip_says: 'PIP says', thank: 'Thank Grandma', thanked: 'Thank-you sent', from_g: 'Grandma says', g_wait_reply: 'Grandma can send a reply.',
    e_thanks: 'Thank you, Grandma!', cook_again: 'Cook again together', back_home: 'Back home', creative: 'A very creative attempt',
    // moments
    m_title: 'Our Little Moments', m_sub: 'All the little things we’ve done together.', m_empty: 'Cook together once and your first keepsake card will appear here.',
    // settings
    settings: 'Settings', mode: 'Mode', standard: 'Standard', easy: 'Easy', sound: 'Sound', on: 'On', off: 'Off',
    switch_role: 'Switch phone', reset: 'Start over', reset_sub: 'Clears the kitchen and the moments on both phones.', end_session: 'End this cooking session',
    about: 'About this demo', close: 'Close', both_view: 'Both phones on one screen', sync_status: 'Sync',
    // toasts / announcements
    t_g_chose: 'Grandma chose {ing}', t_e_added: 'Steven added the {ing}', t_wave_g: 'Grandma waved at you 👋', t_wave_e: 'Steven waved 👋',
    t_e_twist: 'Steven added {t}!', t_e_joined: 'Steven joined the kitchen', t_g_reply: 'Grandma replied: {r}',
    dup_role: 'Another phone is also playing {name}.', readonly: 'View only. Sign in as the owner to play, or use both phones on one screen.',
    connecting_hold: 'Connecting to the other phone…',
    // selfie + group photo
    snap_t: 'Selfie time!', snap_sub: 'Smile with PIP! Your selfie goes next to {name}’s in one photo.',
    snap_btn: 'Take my selfie', snap_file: 'Use a photo instead', snap_skip: 'Skip', snap_asking: 'Allow the camera to take your selfie.',
    snap_nocam: 'The camera isn’t available here. Pick a photo, or skip and PIP will draw you.',
    snap_retake: 'Retake', snap_use: 'Use this photo', snap_cheese: 'Cheese!',
    snap_wait_t: 'Waiting for {name}…', snap_wait_cam: '{name} is getting ready for a selfie…', snap_wait_check: '{name} is checking the photo…',
    snap_wait_plain: '{name} hasn’t taken a selfie yet.', snap_now: 'Make the photo now', snap_you: 'You',
    snap_reveal_t: 'Your cooking photo!', snap_reveal_sub: 'Grandma, Steven, PIP and the {dish}.',
    snap_save: 'Save photo', snap_share: 'Share', snap_continue: 'Continue', snap_developing: 'Developing…', snap_saved: 'Saved to your downloads',
    photo_alt: 'Group photo: Grandma and Steven with PIP and the dish',
    // PIP and turns
    your_turn: 'Your turn', turn_of: '{name}’s turn', g_watching: 'Grandma’s watching', tap_toss: 'Tip: tap the wok to toss!', photo_title: 'Cooking with Grandma', snap_nosave: 'Saving isn’t available here. Long-press the photo to save it.',
    tap_home: ['Hehe, that tickles!', 'Boop!', 'I missed you!', 'Hi hi!'],
    tap_cook: ['Smells so good!', 'I’m helping!', 'Yum yum!', 'Sizzle sizzle!'],
    tap_wait: ['Almost your turn!', 'Hmm, what will it be?', 'Hehe, waiting with you!'],
    tap_spin: 'Wheee!', tap_pet: 'Mmm… so cozy…'
  }
};

const STEPS = [
  { who: 'grandma', en: 'First in' },
  { who: 'steven', en: 'Into wok' },
  { who: 'grandma', en: 'Secret' },
  { who: 'steven', en: 'Cook' },
  { who: 'grandma', en: 'Serve' }
];

function tr(lang, key, vars) {
  let s = STR.en[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
function ingName(k) { return ING[k] ? ING[k].en : k; }
function dishName(k) { return DISHES[k] ? DISHES[k].en : k; }
