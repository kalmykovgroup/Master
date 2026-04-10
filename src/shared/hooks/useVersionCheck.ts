import {useEffect, useState} from 'react';
import {Platform} from 'react-native';
import {supabase} from '../../config/supabase';
import {APP_VERSION} from '../../config/constants';
import {compareVersions} from '../utils/compareVersions';

type UpdateType = 'force' | 'optional' | null;

interface VersionCheckResult {
  updateType: UpdateType;
  storeUrl: string | null;
  latestVersion: string | null;
}

export function useVersionCheck(): VersionCheckResult {
  const [result, setResult] = useState<VersionCheckResult>({
    updateType: null,
    storeUrl: null,
    latestVersion: null,
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const check = async () => {
      const {data} = await supabase
        .from('app_versions')
        .select('version, min_version, store_url')
        .eq('platform', Platform.OS)
        .single();

      if (!data) return;

      if (compareVersions(APP_VERSION, data.min_version) < 0) {
        setResult({
          updateType: 'force',
          storeUrl: data.store_url,
          latestVersion: data.version,
        });
      } else if (compareVersions(APP_VERSION, data.version) < 0) {
        setResult({
          updateType: 'optional',
          storeUrl: data.store_url,
          latestVersion: data.version,
        });
      }
    };

    check();
  }, []);

  return result;
}
