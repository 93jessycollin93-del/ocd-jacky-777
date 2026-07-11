import { base44 } from '@/eru/api/base44Client';
import { invokeSelectedModel } from './modelRouting';

export async function scoreSimilarity(expectedOutput, actualOutput, inputFileNames = []) {
  return await base44.integrations.Core.InvokeLLM({
    prompt: `You are grading a bot response.\nExpected output:\n${expectedOutput}\n\nActual output:\n${actualOutput}\n\nSupporting visual or document inputs used by the bot: ${inputFileNames.length > 0 ? inputFileNames.join(', ') : 'None'}\n\nScore the semantic similarity from 0 to 1, where 1 means the actual output fully satisfies the expected output in meaning and logic based on the provided text and any referenced visual/document inputs. Return a short reason.`,
    response_json_schema: {
      type: 'object',
      properties: {
        similarity_score: { type: 'number' },
        reason: { type: 'string' }
      },
      required: ['similarity_score', 'reason']
    }
  });
}

export function buildRegressionPrompt(bot, instructions, input, globalPolicy, inputFileNames = []) {
  const policyBlock = globalPolicy?.is_active
    ? `\nGlobal instructions: ${globalPolicy.shared_instructions || 'None'}\nSafety guardrails: ${globalPolicy.safety_guardrails || 'None'}`
    : '';
  const dataSourceSummary = (bot.data_sources || []).length > 0
    ? bot.data_sources.map((source) => `${source.service || 'source'} (${source.mode || 'direct'}${source.resource_label ? ` · ${source.resource_label}` : ''})`).join(', ')
    : 'None';

  return `You are ${bot.name}. ${instructions || ''}\nPersonality: ${bot.personality || 'helpful'}\nResponse style: ${bot.response_style || 'detailed'}${policyBlock}\n\nConnected external/internal data sources: ${dataSourceSummary}\nUse them when relevant to the request and explain when your answer depends on those connected sources.\n\nUser: ${input}\nAttached files: ${inputFileNames.length > 0 ? inputFileNames.join(', ') : 'None'}\n\n${bot.name}:`;
}

export async function runRegressionSuite({ bot, instructions, globalPolicy }) {
  const cases = await base44.entities.BotTestCase.filter({ bot_id: bot.id }, '-created_date', 100);
  const activeCases = cases.filter((item) => item.is_active !== false);
  const runGroup = `regression_${Date.now()}`;
  const results = [];

  for (const testCase of activeCases) {
    const prompt = buildRegressionPrompt(bot, instructions, testCase.input, globalPolicy, testCase.input_file_names || []);
    const actualOutput = await invokeSelectedModel({ provider: bot.model_provider, model: bot.model_name, prompt, file_urls: testCase.input_file_urls || [] }).catch(() => 'Model unavailable');
    const scored = await scoreSimilarity(testCase.expected_output, actualOutput, testCase.input_file_names || []);
    const similarity = Number(scored.similarity_score || 0);
    const passed = similarity >= Number(testCase.min_similarity_score || 0.75);

    const run = {
      bot_id: bot.id,
      bot_name: bot.name,
      test_case_id: testCase.id,
      test_title: testCase.title,
      input: testCase.input,
      expected_output: testCase.expected_output,
      actual_output: actualOutput,
      similarity_score: similarity,
      passed,
      pass_rate_snapshot: passed ? 100 : 0,
      regression_flag: false,
      regression_reason: scored.reason,
      run_group: runGroup,
      input_file_urls: testCase.input_file_urls || [],
      input_file_names: testCase.input_file_names || [],
    };

    await base44.entities.BotTestRun.create(run);
    results.push(run);
  }

  return results;
}