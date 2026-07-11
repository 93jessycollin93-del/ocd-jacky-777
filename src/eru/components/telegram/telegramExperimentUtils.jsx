export function getVariantMetrics(runs = [], variant) {
  const filtered = runs.filter((run) => run.variant === variant);
  const samples = filtered.length;
  const engaged = filtered.filter((run) => run.engaged).length;
  const converted = filtered.filter((run) => run.converted).length;

  return {
    samples,
    engaged,
    converted,
    engagementRate: samples ? Number(((engaged / samples) * 100).toFixed(1)) : 0,
    conversionRate: samples ? Number(((converted / samples) * 100).toFixed(1)) : 0,
  };
}

export function getWinningVariant(experiment, runs = []) {
  const a = getVariantMetrics(runs, 'a');
  const b = getVariantMetrics(runs, 'b');
  const metric = experiment?.optimization_metric === 'conversion_rate' ? 'conversionRate' : 'engagementRate';
  const minSize = Number(experiment?.minimum_sample_size || 20);

  if (a.samples < minSize || b.samples < minSize) {
    return { winner: 'none', a, b, metric };
  }

  if (a[metric] === b[metric]) {
    return { winner: 'none', a, b, metric };
  }

  return {
    winner: a[metric] > b[metric] ? 'a' : 'b',
    a,
    b,
    metric,
  };
}