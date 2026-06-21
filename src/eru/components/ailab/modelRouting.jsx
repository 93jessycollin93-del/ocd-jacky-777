import { base44 } from '@/eru/api/base44Client';

export async function renderPromptTemplate({ templateId, variables = {}, context = '' }) {
  if (!templateId) return '';
  const response = await base44.functions.invoke('renderPromptTemplate', {
    templateId,
    variables,
    context,
  });
  return response.data?.rendered_prompt || '';
}

export async function invokeSelectedModel({ provider = 'base44', model = '', prompt, botId = '', dataRequest = null, file_urls = [] }) {
  const response = await base44.functions.invoke('invokeExternalModel', {
    provider,
    model,
    prompt,
    botId,
    dataRequest,
    file_urls,
  });

  if (response.data?.error) {
    throw new Error(response.data.error);
  }

  return response.data?.output || '';
}