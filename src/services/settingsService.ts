import { supabase, isSupabaseConfigured } from './supabase';
import { mockDb } from './mockDb';

export interface SignatureProfile {
  id: string;
  session_id: string;
  name: string;
  designation: string;
  signature_image: string;
  official_seal: string;
  institution_logo: string;
  is_active: boolean;
}

export interface WatermarkSettings {
  text: string;
  opacity: number;
  rotation: number;
  color: string;
  position: 'diagonal' | 'center' | 'top' | 'bottom';
  enabled: boolean;
}

const DEFAULT_SIGNATURE_PROFILES: SignatureProfile[] = [
  {
    id: 'sig-default',
    session_id: 'default',
    name: 'Sourav Mukherjee',
    designation: 'Controller of Exam',
    signature_image: '',
    official_seal: '',
    institution_logo: '',
    is_active: true
  }
];

const DEFAULT_WATERMARK: WatermarkSettings = {
  text: 'Official',
  opacity: 0.1,
  rotation: -30,
  color: '#FF0000',
  position: 'diagonal',
  enabled: true
};

export const fetchSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('id', key)
        .maybeSingle();

      if (!error && data && data.value !== undefined && data.value !== null) {
        mockDb.setSetting(key, data.value);
        return data.value as T;
      }
    } catch (err) {
      console.warn(`[settingsService] Failed to load ${key} from Supabase:`, err);
    }
  }
  return mockDb.getSetting(key, defaultValue);
};

export const saveSetting = async <T>(key: string, value: T): Promise<void> => {
  mockDb.setSetting(key, value);
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: key, value, updated_at: new Date().toISOString() });

      if (error) {
        console.error(`[settingsService] Error saving ${key} to Supabase:`, error.message);
      }
    } catch (err: any) {
      console.error(`[settingsService] Supabase setting write failed:`, err.message);
    }
  }
};

export const getActiveSignatureProfile = async (): Promise<SignatureProfile> => {
  const profiles = await fetchSetting<SignatureProfile[]>('signature_profiles', DEFAULT_SIGNATURE_PROFILES);
  return profiles.find(p => p.is_active) || profiles[0] || DEFAULT_SIGNATURE_PROFILES[0];
};

export const getWatermarkSettings = async (): Promise<WatermarkSettings> => {
  return await fetchSetting<WatermarkSettings>('watermark', DEFAULT_WATERMARK);
};
