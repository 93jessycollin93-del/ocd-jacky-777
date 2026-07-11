export const STARTER_SQUAD_TEMPLATES = [
  {
    id: 'market_analysis',
    name: 'Market Analysis',
    description: 'Track markets, validate signals, and produce a clear trading or strategy brief.',
    recommended_roles: {
      master: 'trader',
      members: ['assistant', 'security', 'social'],
      commanders: ['trader', 'assistant'],
      security: ['security'],
    },
    shared_context: 'This squad focuses on market intelligence, signal validation, risk review, and final opportunity ranking.',
    task_groups: [
      { id: 'group_1', name: 'Signal Discovery', purpose: 'Find strong market setups', task_instruction: 'Scan price behavior, trends, catalysts, and momentum drivers.', role_targets: ['trader', 'assistant'] },
      { id: 'group_2', name: 'Risk Review', purpose: 'Challenge weak assumptions', task_instruction: 'Stress-test volatility, downside risk, and invalidation points.', role_targets: ['security', 'assistant'] },
      { id: 'group_3', name: 'Narrative Watch', purpose: 'Capture sentiment and positioning', task_instruction: 'Summarize macro, news, and community sentiment around the opportunity.', role_targets: ['social', 'trader'] },
      { id: 'group_4', name: 'Decision Brief', purpose: 'Deliver the final recommendation', task_instruction: 'Combine research into a concise action brief with confidence and next steps.', role_targets: ['assistant', 'trader'] },
    ],
    pipeline_steps: [
      { id: 'step_1', title: 'Analyze market conditions', instruction: 'Break down the market context, dominant trends, and key opportunities.' },
      { id: 'step_2', title: 'Review risk factors', instruction: 'Identify major risks, invalidation levels, and confidence reducers.' },
      { id: 'step_3', title: 'Synthesize final view', instruction: 'Produce a final market thesis with clear action guidance.' },
    ],
  },
  {
    id: 'content_strategy',
    name: 'Content Strategy',
    description: 'Plan messaging, campaigns, audience angles, and distribution steps for growth content.',
    recommended_roles: {
      master: 'social',
      members: ['assistant', 'trader', 'custom'],
      commanders: ['social', 'assistant'],
      security: [],
    },
    shared_context: 'This squad creates content plans that align audience insight, campaign themes, and production-ready messaging.',
    task_groups: [
      { id: 'group_1', name: 'Audience Research', purpose: 'Understand who the message is for', task_instruction: 'Define audience segments, pain points, and motivations.', role_targets: ['assistant', 'social'] },
      { id: 'group_2', name: 'Narrative Angles', purpose: 'Develop message pillars', task_instruction: 'Create differentiated hooks, claims, and storytelling angles.', role_targets: ['social', 'custom'] },
      { id: 'group_3', name: 'Offer Positioning', purpose: 'Tie content to business outcomes', task_instruction: 'Connect the content strategy to product value, demand capture, or conversion goals.', role_targets: ['trader', 'assistant'] },
      { id: 'group_4', name: 'Distribution Plan', purpose: 'Operationalize the strategy', task_instruction: 'Turn the plan into channels, cadence, and execution steps.', role_targets: ['assistant', 'social'] },
    ],
    pipeline_steps: [
      { id: 'step_1', title: 'Define target audience', instruction: 'Summarize audience priorities and what they care about most.' },
      { id: 'step_2', title: 'Create content pillars', instruction: 'Propose repeatable themes, hooks, and campaign directions.' },
      { id: 'step_3', title: 'Build channel plan', instruction: 'Recommend where to publish, how often, and how to measure success.' },
    ],
  },
  {
    id: 'security_audit',
    name: 'Security Audit',
    description: 'Review vulnerabilities, workflows, controls, and mitigation priorities across the system.',
    recommended_roles: {
      master: 'security',
      members: ['assistant', 'custom'],
      commanders: ['security', 'assistant'],
      security: ['security'],
    },
    shared_context: 'This squad is optimized for structured system review, risk detection, and prioritized remediation planning.',
    task_groups: [
      { id: 'group_1', name: 'Surface Review', purpose: 'Inspect exposed systems', task_instruction: 'Review public entry points, settings, and weak surface areas.', role_targets: ['security', 'assistant'] },
      { id: 'group_2', name: 'Workflow Abuse Cases', purpose: 'Find misuse paths', task_instruction: 'Map likely abuse paths, broken assumptions, and privilege gaps.', role_targets: ['security', 'custom'] },
      { id: 'group_3', name: 'Impact Analysis', purpose: 'Rank severity', task_instruction: 'Explain impact, exploitability, and business risk for each issue.', role_targets: ['assistant', 'security'] },
      { id: 'group_4', name: 'Remediation Plan', purpose: 'Turn findings into action', task_instruction: 'Provide the remediation sequence, owner suggestions, and validation steps.', role_targets: ['assistant', 'security'] },
    ],
    pipeline_steps: [
      { id: 'step_1', title: 'Inspect system surface', instruction: 'List likely weak points and exposed areas.' },
      { id: 'step_2', title: 'Prioritize vulnerabilities', instruction: 'Rank issues by severity, exploitability, and urgency.' },
      { id: 'step_3', title: 'Recommend fixes', instruction: 'Return a practical remediation plan with next steps.' },
    ],
  },
];