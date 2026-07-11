/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, instruction, code, fullCode, prompt } = await req.json();

    const schema = {
      type: 'object',
      properties: {
        content: { type: 'string' },
        updatedCode: { type: 'string' }
      },
      required: ['content', 'updatedCode']
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}\n\nReturn the explanation in content. If code changes are requested, return the full updated code in updatedCode. If no code changes are needed, return the original code.\n\nFull file for reference:\n${fullCode || code}`,
      response_json_schema: schema,
    });

    return Response.json({
      action,
      content: result.content,
      updatedCode: result.updatedCode || code,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});