'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';

const STORAGE_KEY = 'srp_tutorial_seen';

export function useTutorialFirstVisit() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('tutorial_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (!data?.tutorial_completed) {
          setShouldShow(true);
        }
      } else {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setShouldShow(true);
        }
      }
    }
    check();
  }, []);

  const markSeen = async () => {
    setShouldShow(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('profiles')
        .upsert({ id: user.id, tutorial_completed: true }, { onConflict: 'id' });
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  };

  return { shouldShow, markSeen };
}
