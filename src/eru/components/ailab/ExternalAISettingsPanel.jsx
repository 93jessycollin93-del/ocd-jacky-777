import ModelProviderPanel from './ModelProviderPanel';

export default function ExternalAISettingsPanel({ value, onChange }) {
  return (
    <ModelProviderPanel
      value={{
        model_provider: value.provider || 'base44',
        model_name: value.model || '',
        api_label: value.api_label || '',
      }}
      onChange={(next) => onChange({
        provider: next.model_provider,
        model: next.model_name,
        api_label: next.api_label || '',
      })}
    />
  );
}