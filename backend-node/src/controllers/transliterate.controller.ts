import {get, param} from '@loopback/rest';
import * as https from 'https';

function googleTranslit(word: string): Promise<string> {
  return new Promise(resolve => {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=ta-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=dodo`;
    https.get(url, res => {
      let raw = '';
      res.on('data', (c: Buffer) => (raw += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(raw);
          // Response shape: ["SUCCESS", [["word", ["தமிழ்"], ...], ...]]
          if (j[0] === 'SUCCESS' && j[1]?.[0]?.[1]?.[0]) {
            resolve(j[1][0][1][0] as string);
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        }
      });
    }).on('error', () => resolve(''));
  });
}

export class TransliterateController {
  @get('/api/transliterate', {
    responses: {'200': {description: 'English to Tamil transliteration'}},
  })
  async transliterate(
    @param.query.string('text') text: string,
  ): Promise<{result: string}> {
    if (!text?.trim()) return {result: ''};
    const words = text.trim().split(/\s+/);
    const parts = await Promise.all(words.map(w => googleTranslit(w)));
    return {result: parts.join(' ')};
  }
}
