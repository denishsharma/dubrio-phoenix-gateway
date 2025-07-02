export default class StringMixerService {
  private static readonly alphaNumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  private static generateMulberry32(seed: number) {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return () => ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  private static hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0
    }
    return hash
  }

  private static shiftAlphaNumeric(char: string, offset: number): string {
    const i = this.alphaNumeric.indexOf(char)
    if (i === -1) {
      return char
    }
    return this.alphaNumeric[(i + offset) % this.alphaNumeric.length]
  }

  private static unshiftAlphaNumeric(char: string, offset: number): string {
    const i = this.alphaNumeric.indexOf(char)
    if (i === -1) {
      return char
    }
    return this.alphaNumeric[(i - offset + this.alphaNumeric.length) % this.alphaNumeric.length]
  }

  private static generateRandomKey(length: number = 10): string {
    let key = ''
    for (let i = 0; i < length; i++) {
      key += this.alphaNumeric[Math.floor(Math.random() * this.alphaNumeric.length)]
    }
    return key
  }

  private static encodeLengths(lengths: number[]): string {
    return lengths.map(l => l.toString(36).padStart(2, '0')).join('')
  }

  private static decodeLengths(encoded: string): number[] {
    const lengths: number[] = []
    for (let i = 0; i < encoded.length; i += 2) {
      lengths.push(Number.parseInt(encoded.slice(i, i + 2), 36))
    }
    return lengths
  }

  /**
   * Encodes multiple strings into a mixed string with a key.
   * The key can be used to decode the mixed string back to the original strings.
   * @param values - The strings to encode.
   */
  static encode(...values: string[]): { value: string; key: string } {
    const lengths = values.map(v => v.length)
    const seedKey = this.generateRandomKey(10)
    const metaLength = values.length.toString(36).padStart(2, '0')
    const lengthsEncoded = this.encodeLengths(lengths)
    const key = (metaLength + lengthsEncoded + seedKey).slice(0, 16)
    const seed = this.hashString(key)
    const random = this.generateMulberry32(seed)
    const pointers = Array.from({ length: values.length }, () => 0)
    const totalLength = lengths.reduce((a, b) => a + b, 0)
    const mixed: string[] = []
    const sourceMap: number[] = []
    while (mixed.length < totalLength) {
      const available = values.map((str, i) => pointers[i] < str.length)
      const options = available.map((ok, i) => (ok ? i : -1)).filter(i => i !== -1)
      const pick = options[Math.floor(random() * options.length)]
      mixed.push(values[pick][pointers[pick]++])
      sourceMap.push(pick)
    }
    const result = mixed.map(c => this.shiftAlphaNumeric(c, Math.floor(random() * this.alphaNumeric.length))).join('')
    return { value: result, key }
  }

  /**
   * Decodes a mixed string back to the original strings using the provided key.
   * @param value - The mixed string to decode.
   * @param key - The key used to encode the mixed string.
   */
  static decode(value: string, key: string): string[] {
    const metaLength = Number.parseInt(key.slice(0, 2), 36)
    const lengthCode = key.slice(2, 2 + metaLength * 2)
    const lengths = this.decodeLengths(lengthCode)
    const seed = this.hashString(key)
    const random = this.generateMulberry32(seed)
    const totalLength = value.length
    const pointers = Array.from({ length: metaLength }, () => 0)
    const output: string[][] = Array.from({ length: metaLength }, () => [])
    const sourceMap: number[] = []
    let filled = 0
    while (filled < totalLength) {
      const available = lengths.map((len, i) => pointers[i] < len)
      const options = available.map((ok, i) => (ok ? i : -1)).filter(i => i !== -1)
      const pick = options[Math.floor(random() * options.length)]
      sourceMap.push(pick)
      pointers[pick]++
      filled++
    }
    const unshifted = value.split('').map(c => this.unshiftAlphaNumeric(c, Math.floor(random() * this.alphaNumeric.length)))
    for (let i = 0; i < unshifted.length; i++) {
      const idx = sourceMap[i]
      output[idx].push(unshifted[i])
    }
    return output.map(chars => chars.join(''))
  }
}
