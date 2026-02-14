export interface Slide {
  id: string
  imageUrl: string
  script: string
  subtitle: string
  audioData: AudioBuffer | null
  isGeneratingAudio: boolean
}

export enum AspectRatio {
  Video16_9 = '16:9',
  Square1_1 = '1:1',
  Portrait9_16 = '9:16',
}

export interface SubtitleStyle {
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor: string
  backgroundOpacity: number
  verticalPosition: number
}

export interface ProjectSettings {
  title: string
  aspectRatio: AspectRatio
  bgmVolume: number
}

export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface GenerationState {
  isExporting: boolean
  progress: number
  statusMessage: string
}

export type ScriptLevel = 'expert' | 'university' | 'elementary' | 'senior'

