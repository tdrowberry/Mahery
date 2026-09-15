import type { AnimalDef, DialogueLine } from './types';

// Story scenes. The bonded animal's own lines come from its voice table in animals.ts,
// so a scene is a function of the animal. Narrator and Mahery lines live here.
// Hold back "the chief did it" until Act 2. Chapter 1 only hints.

type Scene = (animal: AnimalDef) => DialogueLine[];

const voice = (animal: AnimalDef, key: keyof AnimalDef['voice']): DialogueLine[] =>
  (animal.voice[key] ?? []).map((text) => ({ speaker: animal.name, text }));

/** Played before the bond is chosen. No animal is known yet, so it takes none. */
export const PROLOGUE_WAKE: DialogueLine[] = [
  { speaker: 'Narrator', text: 'Mahery wakes on cold ground with no fire, no pack, and a weight in his chest that was not there the night before.' },
  { speaker: 'Narrator', text: 'Three nights since the clan turned its back. Two since he stopped expecting anyone to follow.' },
  { speaker: 'Mahery', text: 'Something is different. My hands. My breathing. Something came to me in the dark.' },
  { speaker: 'Narrator', text: 'There is a presence at the edge of the clearing, patient, watching him the way you watch something you have already decided about.' },
  { speaker: 'Narrator', text: 'The bond chose him in the night. Now he has to see what it chose.' },
];

export const SCENES: Record<string, Scene> = {
  'prologue.bond': (animal) => [
    { speaker: 'Narrator', text: `${animal.physicalTraits} When Mahery looks down at himself, the change is already there.` },
    ...voice(animal, 'prologue').slice(0, 1),
    { speaker: 'Mahery', text: 'Who said that.' },
    { speaker: 'Narrator', text: `The ${animal.name.toLowerCase()} is three paces away, and it is not going anywhere.` },
    ...voice(animal, 'prologue').slice(1, 2),
    { speaker: 'Mahery', text: 'My father used to say the bond only came to people the world still needed. He said it like a joke.' },
    ...voice(animal, 'prologue').slice(2),
    { speaker: 'Narrator', text: 'Mahery stands. There is a road east. Somewhere down it there has to be a pack that does not remember his name.' },
    { speaker: 'Narrator', text: 'Before you set out, open the Abilities screen. Spend your Ability Points, then drag skills from the Ability Pool onto the Combat Action Bar. A skill must be unlocked and equipped before it can be used in a fight.' },
  ],
  'ch1.beforeStage1': (animal) => [
    { speaker: 'Narrator', text: 'The road east narrows into a dry gulch. Shed skins hang from the thorn bushes like flags.' },
    ...voice(animal, 'beforeStage1'),
    { speaker: 'Narrator', text: 'Two figures rise from the rocks. Their eyes are wrong. Slit pupils. Snake-bonded.' },
    { speaker: 'Broken Pack Skulker', text: 'Exile. We can smell it on you. Same as us.' },
    { speaker: 'Mahery', text: 'Then you know I have nothing worth taking.' },
    { speaker: 'Broken Pack Skulker', text: 'You have a bond. That is worth plenty.' },
  ],
  'ch1.afterStage1': (animal) => [
    { speaker: 'Narrator', text: 'The skulkers scatter into the rocks, hissing. One of them leaves a trail of blood pointing deeper into the gulch.' },
    ...voice(animal, 'afterStage1'),
    { speaker: 'Mahery', text: 'They said they were exiles too. They chose this.' },
    { speaker: animal.name, text: 'They did. Keep that. It will matter later.' },
  ],
  'ch1.beforeBoss': (animal) => [
    { speaker: 'Narrator', text: 'The gulch ends at a hollow of sun-warmed stone. Something long and patient is coiled at the center of it.' },
    { speaker: 'Sessik the Coiled', text: `A ${animal.name.toLowerCase()}. Out here. The bond has a sense of humor.` },
    { speaker: 'Sessik the Coiled', text: 'I was cast out too, boy. I stopped asking to belong. Now the road belongs to me.' },
    ...voice(animal, 'beforeBoss'),
    { speaker: 'Mahery', text: 'My father was killed for showing mercy. I am not here to take the road. I am here to walk it.' },
    { speaker: 'Sessik the Coiled', text: 'Then walk. If you can.' },
  ],
  'ch1.afterBoss': (animal) => [
    { speaker: 'Narrator', text: 'Sessik lies still on the warm stone, breathing shallow. The snake-bonded who watched from the rocks are gone.' },
    { speaker: 'Sessik the Coiled', text: 'Finish it. That is what the road does.' },
    { speaker: 'Mahery', text: 'No. You will live with losing. Try belonging again. It is harder than this was.' },
    ...voice(animal, 'afterBoss'),
    { speaker: 'Narrator', text: 'Mahery walks east. Behind him, the gulch is quiet for the first time in years.' },
    { speaker: 'Narrator', text: 'The ground rises. The trees close in overhead, and the light coming through them turns grey and strung with silk.' },
  ],
  'ch2.beforeStage1': (animal) => [
    { speaker: 'Narrator', text: 'The road east climbs into a forest gone quiet in the wrong way. Every branch overhead is strung with old webbing, grey and heavy with dust.' },
    ...voice(animal, 'beforeStage1'),
    { speaker: 'Narrator', text: 'Something moves between the strands, unhurried, certain of the ground.' },
    { speaker: 'Broken Pack Weaver', text: 'The snakes let you through. That was their mistake to make, not ours.' },
    { speaker: 'Mahery', text: 'I am not looking for a fight. I am looking for a road.' },
    { speaker: 'Broken Pack Weaver', text: 'Out here, they are the same thing.' },
  ],
  'ch2.afterStage1': (animal) => [
    { speaker: 'Narrator', text: 'The webbing sags where the weavers fell, and for a moment the forest is just a forest again.' },
    ...voice(animal, 'afterStage1'),
    { speaker: 'Mahery', text: 'They said "we." Not "I." There is more of them ahead.' },
    { speaker: animal.name, text: 'There always is. Keep walking anyway.' },
  ],
  'ch2.beforeBoss': (animal) => [
    { speaker: 'Narrator', text: 'The trail opens into a hollow ringed with silk pillars, thick as tree trunks, climbing into a canopy that blocks out the sky. Something waits at the center, patient as stone.' },
    { speaker: 'Vethra the Weaver', text: `A ${animal.name.toLowerCase()}, walking my road like he owns the ground under it.` },
    { speaker: 'Vethra the Weaver', text: 'I was exiled too, once. I stopped waiting to be let back in. I started weaving instead.' },
    ...voice(animal, 'beforeBoss'),
    { speaker: 'Mahery', text: 'I did not come here to take your road. I came here to walk past it.' },
    { speaker: 'Vethra the Weaver', text: 'Nothing walks past me. Sit still long enough and you will understand why.' },
  ],
  'ch2.afterBoss': (animal) => [
    { speaker: 'Narrator', text: 'Vethra sags against a silk pillar, the fight gone out of her all at once. The hollow is silent except for the slow creak of webbing settling.' },
    { speaker: 'Vethra the Weaver', text: 'Go on, then. Finish it. It is what I would have done.' },
    { speaker: 'Mahery', text: 'I know. That is exactly why I am not going to.' },
    ...voice(animal, 'afterBoss'),
    { speaker: 'Narrator', text: 'Mahery leaves the hollow behind. The road ahead is still long, but for the first time since the exile, it feels like his to walk.' },
    { speaker: 'Narrator', text: 'The trees thin out. Ahead, the ground turns soft and brown, and the road gives up on staying dry.' },
  ],

  // ---------- Chapter 3: Crocodile ----------
  'ch3.beforeStage1': (animal) => [
    { speaker: 'Narrator', text: 'The road drowns here. What is left of it disappears into brown water threaded with reeds, and the far bank might as well be another country.' },
    ...voice(animal, 'beforeStage1'),
    { speaker: 'Narrator', text: 'The water is too still. Then it is not. Two shapes rise out of it, unhurried, sure of the ground even where there is none.' },
    { speaker: 'Broken Pack Snapper', text: 'Everyone tries to cross fast. Fast is how you drown.' },
    { speaker: 'Mahery', text: 'Then I will cross slow.' },
    { speaker: 'Broken Pack Snapper', text: 'You will cross however we decide.' },
  ],
  'ch3.afterStage1': (animal) => [
    { speaker: 'Narrator', text: 'The water goes still again, the way it was before, as if nothing happened in it at all.' },
    ...voice(animal, 'afterStage1'),
    { speaker: 'Mahery', text: 'They do not chase. They just wait for you to come to them.' },
    { speaker: animal.name, text: 'Most things out here have learned patience. You should too, before this road teaches it to you the hard way.' },
  ],
  'ch3.beforeBoss': (animal) => [
    { speaker: 'Narrator', text: 'The ford widens into a black hollow of standing water, ringed with drowned trees. Something enormous is submerged at the center of it, only its eyes above the surface.' },
    { speaker: 'Drevik the Drowned', text: `A ${animal.name.toLowerCase()}. The river has seen a great many things cross it. It has not kept many of them.` },
    { speaker: 'Drevik the Drowned', text: 'Exiled, same as you. I stopped fighting the current a long time ago. I became it instead.' },
    ...voice(animal, 'beforeBoss'),
    { speaker: 'Mahery', text: 'I am not here to fight a river. I am here to reach the other side of it.' },
    { speaker: 'Drevik the Drowned', text: 'Then you had better learn to hold your breath.' },
  ],
  'ch3.afterBoss': (animal) => [
    { speaker: 'Narrator', text: 'Drevik goes still in the shallows, breathing slow and ragged, too tired to sink and too proud to crawl out.' },
    { speaker: 'Drevik the Drowned', text: 'Drown me, then. It is faster than what the river does to things it keeps.' },
    { speaker: 'Mahery', text: 'No. Crawl out if you want to. Or do not. Either way, that is yours to decide now, not mine.' },
    ...voice(animal, 'afterBoss'),
    { speaker: 'Narrator', text: 'The far bank rises out of the reeds at last, solid ground under his feet for the first time in what feels like days.' },
    { speaker: 'Narrator', text: 'Past it, the land turns to bone-dry orchard, dead trees standing in rows, and something is circling patiently overhead.' },
  ],

  // ---------- Chapter 4: Vulture ----------
  'ch4.beforeStage1': (animal) => [
    { speaker: 'Narrator', text: 'The orchard is dead and has been for years, every tree a grey fork against the sky. A man sits at the edge of it, alone, no bond in his eyes at all.' },
    { speaker: 'Rill', text: "You're bonded. Good. Company that can actually fight is hard to find out here. Name's Rill. Mind if I walk with you a while?" },
    { speaker: 'Mahery', text: 'The road is not mine to give away. Walk it if you want to.' },
    ...voice(animal, 'beforeStage1'),
    { speaker: 'Narrator', text: 'Rill smiles like it costs him nothing. Above the dead trees, dark shapes circle, unhurried, in no rush at all.' },
  ],
  'ch4.afterStage1': (animal) => [
    { speaker: 'Rill', text: "Nice work. Wouldn't have wanted to try that alone." },
    { speaker: 'Mahery', text: 'You would not have had to. You are not bonded. They are not hunting you.' },
    { speaker: 'Rill', text: "...Right. Lucky me." },
    ...voice(animal, 'afterStage1'),
    { speaker: animal.name, text: 'He looked away when he said that. Remember it.' },
  ],
  'ch4.beforeBoss': (animal) => [
    { speaker: 'Narrator', text: 'The orchard opens into a ridge littered with old bones, white and picked clean. Rill stops walking, well short of it.' },
    { speaker: 'Rill', text: "This is as far as I go. Sorry, bonded one. A live nobody isn't worth much. A dead one with your description isn't worth much either. But knowing where you'd be, when you'd be tired - that's worth marks." },
    { speaker: 'Mahery', text: 'You sold me for coin. To them.' },
    { speaker: 'Rill', text: "I sold you for coin to survive. Ask your father how well principle worked out for him." },
    { speaker: 'Narrator', text: 'Rill is gone before Mahery can answer. Above the ridge, wings fold and drop out of the sky, unhurried, certain he will still be standing there when they land.' },
    { speaker: 'Skarrow the Unburied', text: `Worn thin already, and the road only just started asking things of you. Good. I like them tired.` },
    ...voice(animal, 'beforeBoss'),
    { speaker: 'Mahery', text: 'My father was killed for showing mercy to someone who did not deserve it either. I am still here. Come and see if that was a mistake.' },
  ],
  'ch4.afterBoss': (animal) => [
    { speaker: 'Narrator', text: 'Skarrow collapses among the bones that were meant for someone else, wings splayed, done.' },
    { speaker: 'Skarrow the Unburied', text: "Go on. Pick me clean. It's only fair, after what I tried for you." },
    { speaker: 'Mahery', text: 'No. I am not going to become the thing that put me on the ground to get back up off it.' },
    ...voice(animal, 'afterBoss'),
    { speaker: 'Narrator', text: 'He does not think about Rill again that day. He thinks about him every day after.' },
    { speaker: 'Narrator', text: 'The dead orchard gives way to a black canopy, trees so tall and close together the sky nearly disappears. The forest here is loud with wings.' },
  ],

  // ---------- Chapter 5: Raven ----------
  'ch5.beforeStage1': (animal) => [
    { speaker: 'Narrator', text: 'Under the black canopy, sound arrives before sight does - a rush of wings, then nothing, then a voice from a direction that was empty a second ago.' },
    { speaker: 'Broken Pack Talon', text: "You're the one they've all been talking about. The bonded one who lets his kills walk away." },
    { speaker: 'Mahery', text: 'Word travels fast for a broken pack.' },
    { speaker: 'Broken Pack Talon', text: "Word is the only thing out here that moves faster than we do. Let's see if you're worth the talk." },
    ...voice(animal, 'beforeStage1'),
  ],
  'ch5.afterStage1': (animal) => [
    { speaker: 'Narrator', text: 'The wings scatter into the dark canopy, and for a moment the forest is quiet enough to hear his own breathing.' },
    ...voice(animal, 'afterStage1'),
    { speaker: 'Mahery', text: 'They talk about mercy like it is a weakness they are excited to find.' },
    { speaker: animal.name, text: 'Let them think that. It has worked out badly for everyone who has tried you on it so far.' },
  ],
  'ch5.beforeBoss': (animal) => [
    { speaker: 'Narrator', text: 'The canopy opens onto a high, wind-scoured perch of bare rock, the one place in the whole forest with a clear view of the sky. Something is already waiting there, utterly still.' },
    { speaker: 'Corvath the Unbound', text: `So you are the one word keeps arriving about. A ${animal.name.toLowerCase()}-bonded exile who spares things.` },
    { speaker: 'Corvath the Unbound', text: "Sessik answered to me. Vethra answered to me. Skarrow answered to me. Every road you have walked, you have been walking through my pack, boy - and you let every piece of it live to tell you so." },
    { speaker: 'Mahery', text: 'Then you already know how this ends for you, too.' },
    ...voice(animal, 'beforeBoss'),
    { speaker: 'Corvath the Unbound', text: "I built something out of every exile this road ever spat out. Let's see what you build out of nothing at all." },
  ],
  'ch5.afterBoss': (animal) => [
    { speaker: 'Narrator', text: 'Corvath goes down hard on the bare rock, and this time there is no offer to finish it - just the long silence of a leader who did not plan for losing.' },
    { speaker: 'Corvath the Unbound', text: "Kill me and the pack scatters into a hundred angry pieces with nothing holding them back anymore. Spare me and it scatters anyway, because none of them will follow something that lost." },
    { speaker: 'Mahery', text: 'Then it scatters. I am not staying to watch which way.' },
    ...voice(animal, 'afterBoss'),
    { speaker: 'Narrator', text: 'Word of the Broken Pack breaking apart outruns him down the road. By the time he reaches the next village, they already know his name, and for the first time since the exile, it is not spoken like a warning.' },
    { speaker: 'Narrator', text: 'A pack takes him in. Weeks pass, then months. He has a fire that is his to sit at, a name people say without flinching, a place. For the first time since the night the bond found him, he stops moving.' },
    { speaker: 'Narrator', text: 'It does not last, because it was never going to. Some nights he still hears his father say the chief\'s name, and some mornings he wakes already decided.' },
  ],

  // ---------- Final Chapter: the Old Chief ----------
  'final.beforeStage1': (animal) => [
    { speaker: 'Narrator', text: 'He leaves with a pack behind him this time, not an exile running from one. That is what makes today different from every other day he has walked toward something hard.' },
    { speaker: 'Mahery', text: 'I have nothing left to lose walking back in there. Not anymore. That is exactly why I am going.' },
    ...voice(animal, 'beforeStage1'),
    { speaker: 'Narrator', text: 'The old camp looks smaller than memory made it. Two warriors block the path in, faces he almost recognizes, spears already level.' },
    { speaker: 'Clan Warrior', text: 'You should not have come back, exile.' },
    { speaker: 'Mahery', text: 'I am not asking permission this time.' },
  ],
  'final.afterStage1': (animal) => [
    { speaker: 'Narrator', text: 'The warriors go down without much fight in them, more duty than conviction behind the spears.' },
    ...voice(animal, 'afterStage1'),
    { speaker: 'Mahery', text: 'They did not want that fight. I could see it.' },
    { speaker: animal.name, text: 'The code does not ask what anyone wants. That was always the problem with it.' },
  ],
  'final.beforeBoss': (animal) => [
    { speaker: 'Narrator', text: 'The chief\'s fire is exactly where it always was, and the man sitting at it has grown old around the same hard center Mahery remembers.' },
    { speaker: 'Yorrun the Old Chief', text: "So the bond finally came for someone. I wondered, when I heard what was left of the Broken Pack, whether it would be you." },
    { speaker: 'Mahery', text: 'You killed my father for showing mercy to a man who had already surrendered.' },
    { speaker: 'Yorrun the Old Chief', text: "I enforced the code. Your father broke it in front of the whole clan and dared me not to notice. I could not let that stand, and I would not, again, today." },
    ...voice(animal, 'beforeBoss'),
    { speaker: 'Mahery', text: 'He did not dare you. He just could not kill a man who was already beaten. I understand that now. I did not, then.' },
    { speaker: 'Yorrun the Old Chief', text: 'Then let us see which of you I raised the clan to become.' },
  ],
  'final.afterBoss': (animal) => [
    { speaker: 'Narrator', text: 'Yorrun kneels in the dirt beside his own fire, old and beaten and, for the first time in Mahery\'s memory, entirely out of certainty.' },
    { speaker: 'Yorrun the Old Chief', text: 'Go on. Finish the code yourself, if you believe in it more than I did. Or break it, and prove your father right in front of everyone I ever led.' },
    ...voice(animal, 'afterBoss'),
    { speaker: 'Narrator', text: 'The whole clan is watching now, silent, waiting to see which one Mahery decides to be.' },
  ],
  'ending.kill': () => [
    { speaker: 'Narrator', text: 'Mahery ends it there, at the fire, in front of everyone who ever called this man chief.' },
    { speaker: 'Mahery', text: 'The code says a broken oath is paid in blood. You taught me that yourself.' },
    { speaker: 'Narrator', text: 'No one argues. By right of conquest and blood, both clans are his before the fire burns down. It is not a happy kind of quiet that follows. It is the only kind he was offered.' },
    { speaker: 'Narrator', text: 'Somewhere past the firelight, a boy about the age Mahery was watches a stranger take his father\'s place, and does not look away, and does not forget it either.' },
  ],
  'ending.banish': () => [
    { speaker: 'Narrator', text: 'Mahery lowers his hand before the killing blow lands.' },
    { speaker: 'Mahery', text: 'Leave. Do not come back. That is the mercy my father died for, and I am not going to prove him wrong to make this easier on myself.' },
    { speaker: 'Narrator', text: 'Yorrun walks out of his own camp with nothing, the same way Mahery once did. No one stops him. No one follows him, either.' },
    { speaker: 'Narrator', text: 'The clan is his now, both of them, joined at a fire that finally belongs to someone who chose mercy with his eyes open. Somewhere out past the firelight, an old man walks a road he used to just rule over, and finds out for the first time what it costs.' },
  ],
};

export function getScene(id: string, animal: AnimalDef): DialogueLine[] {
  const scene = SCENES[id];
  if (!scene) throw new Error(`Unknown scene "${id}"`);
  return scene(animal);
}
