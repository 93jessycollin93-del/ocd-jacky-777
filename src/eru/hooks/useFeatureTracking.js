import { useEffect, useRef } from 'react';
import { base44 } from '@/eru/api/base44Client';

export function useFeatureTracking(featureName) {
  const startTimeRef = useRef(Date.now());
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    return () => {
      // Track feature when component unmounts
      if (!hasTrackedRef.current && featureName) {
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
        trackFeatureInteraction(featureName, 'view', timeSpent);
        hasTrackedRef.current = true;
      }
    };
  }, [featureName]);
}

export async function trackFeatureInteraction(featureName, type = 'view', timeSpent = 0) {
  try {
    const user = await base44.auth.me();
    if (!user) return;

    // Find existing record
    const existing = await base44.entities.FeatureAnalytics.filter({
      feature_name: featureName,
      interaction_type: type,
      created_by: user.email
    });

    if (existing.length > 0) {
      // Update existing
      const record = existing[0];
      await base44.entities.FeatureAnalytics.update(record.id, {
        interaction_count: (record.interaction_count || 0) + 1,
        time_spent_seconds: (record.time_spent_seconds || 0) + timeSpent,
        last_interacted: new Date().toISOString()
      });
    } else {
      // Create new
      await base44.entities.FeatureAnalytics.create({
        feature_name: featureName,
        interaction_type: type,
        interaction_count: 1,
        time_spent_seconds: timeSpent,
        last_interacted: new Date().toISOString(),
        user_email: user.email
      });
    }
  } catch (error) {
    console.error('Tracking error:', error);
  }
}