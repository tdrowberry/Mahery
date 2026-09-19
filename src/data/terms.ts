/** Bump this (and TERMS_UPDATED) whenever the terms change materially - everyone who accepted an
 * older version is asked to accept again before they can keep playing (see state/termsStore.ts). */
export const TERMS_VERSION = '2026-09-19';
export const TERMS_UPDATED = 'September 19, 2026';

/** Shown on the title screen, the acceptance screen, and Settings. */
export const AI_BLURB = 'Created with the aid of AI';

export interface TermsSection {
  title: string;
  body: string[];
}

export const TERMS_INTRO =
  'These Terms and Conditions ("Terms") are an agreement between you and the developer of Mahery (the "Game"), '
  + 'referred to as "we" or "us". By tapping "Accept & Continue" or by playing the Game, you agree to these Terms. '
  + 'If you do not agree, please do not use the Game.';

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: 'The Game and Your License',
    body: [
      'Mahery is a single-player role-playing game. We grant you a personal, limited, non-exclusive, non-transferable, '
      + 'revocable license to install and play the Game on your own devices for your own non-commercial entertainment. '
      + 'The Game is licensed to you, not sold.',
    ],
  },
  {
    title: 'Acceptable Use',
    body: [
      'You agree not to: (a) copy, modify, translate, or create derivative works of the Game; (b) reverse engineer, '
      + 'decompile, or extract the Game\'s code, artwork, animation, or audio for use elsewhere, except where the law '
      + 'expressly allows it; (c) sell, rent, lease, sublicense, or redistribute the Game; (d) remove or alter any '
      + 'copyright or ownership notices; or (e) use the Game in violation of any law.',
    ],
  },
  {
    title: 'Ownership',
    body: [
      'The Game, including its story, characters, names, artwork, animation, music, software, and design, is owned by '
      + 'us or our licensors and is protected by copyright and other intellectual property laws. These Terms give you no '
      + 'ownership rights in the Game other than the license above.',
      'Your download and use of the Game through Google Play is also subject to the Google Play Terms of Service. '
      + 'Google and Google Play are trademarks of Google LLC, which is not affiliated with the Game.',
    ],
  },
  {
    title: 'AI-Assisted Content',
    body: [
      'The Game was created with the aid of artificial intelligence (AI) tools, including in producing parts of its '
      + 'artwork, animation, and software code. AI-assisted content can occasionally contain imperfections or '
      + 'inconsistencies, which we may correct in updates.',
      'The Game does not use AI while you play, and it does not send your gameplay or input to any AI service.',
    ],
  },
  {
    title: 'Your Progress, Data, and Privacy',
    body: [
      'Mahery is played offline and does not require an account. Your save files and settings, and a record that you '
      + 'accepted these Terms, are stored only on your device. We do not collect, sell, or share your personal '
      + 'information, and the Game contains no advertising.',
      'When you are online, the Game may load its text fonts from Google Fonts. That request is handled by Google and '
      + 'is subject to Google\'s privacy policy.',
      'Because your progress is stored only on your device, uninstalling the Game or clearing its data will '
      + 'permanently delete your saves, and we cannot recover them. If we add optional online features such as cloud '
      + 'saves, we will update these Terms and provide any required privacy notice before they take effect.',
    ],
  },
  {
    title: 'Age and Content',
    body: [
      'The Game is intended for players aged 13 and older. If you are under the age of majority where you live, you '
      + 'may play only with the permission of a parent or guardian, who agrees to these Terms on your behalf.',
      'The Game contains stylized fantasy combat and mild violence.',
    ],
  },
  {
    title: 'Disclaimer of Warranties',
    body: [
      'THE GAME IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, '
      + 'INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT '
      + 'GUARANTEE THAT THE GAME WILL BE ERROR-FREE, UNINTERRUPTED, OR FREE OF DATA LOSS.',
    ],
  },
  {
    title: 'Limitation of Liability',
    body: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, '
      + 'CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, SAVED PROGRESS, OR PROFITS, ARISING OUT OF OR '
      + 'RELATED TO YOUR USE OF THE GAME. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE GAME WILL NOT EXCEED THE '
      + 'AMOUNT YOU PAID FOR IT, IF ANY.',
      'Nothing in these Terms limits any rights or liability that cannot be limited under the law that applies to you, '
      + 'including consumer protection laws.',
    ],
  },
  {
    title: 'Termination',
    body: [
      'These Terms apply until ended. You may end them at any time by uninstalling the Game. Your license ends '
      + 'automatically if you breach these Terms, and you must then stop using the Game and delete all copies.',
    ],
  },
  {
    title: 'Changes to These Terms',
    body: [
      'We may update these Terms from time to time. When we make a material change, we will update the "Last updated" '
      + 'date and ask you to accept the new Terms before you continue playing. If you do not accept, you should stop '
      + 'using the Game.',
    ],
  },
  {
    title: 'General',
    body: [
      'If any part of these Terms is found to be unenforceable, the rest will remain in effect. These Terms are the '
      + 'entire agreement between you and us about the Game and replace any earlier understanding. Our failure to '
      + 'enforce a provision is not a waiver of it.',
    ],
  },
  {
    title: 'Contact',
    body: ['Questions about these Terms? Contact the developer through the Mahery listing on Google Play.'],
  },
];
