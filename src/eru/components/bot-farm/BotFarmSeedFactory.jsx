import { FARM_STRUCTURE } from './BotFarmEngine';

const TASK_SPECIALTIES = ['data_gathering', 'analysis', 'summarization', 'monitoring', 'verification', 'communications', 'sorting', 'research', 'reporting', 'command_support'];
const QUEUES = ['operations', 'research', 'security', 'support', 'reporting'];

function makeTaskBot(index, commanderCode) {
  const specialty = TASK_SPECIALTIES[index % TASK_SPECIALTIES.length];
  const squadIndex = index < 10 ? 1 : 2;
  return {
    bot_id: `TF-${String(index + 1).padStart(3, '0')}`,
    name: `Task Bot ${index + 1}`,
    role: 'task unit',
    role_type: 'task',
    farm_group: squadIndex === 1 ? 'alpha-grid' : 'beta-grid',
    specialty,
    level: 2 + (index % 4),
    efficiency: 68 + ((index * 3) % 24),
    integrity: 74 + ((index * 5) % 18),
    confidence: 70 + ((index * 4) % 22),
    fatigue: 12 + ((index * 7) % 34),
    load: 8 + ((index * 9) % 46),
    uptime: 90 + (index % 8),
    maintenance_status: 'healthy',
    output_quality: 69 + ((index * 4) % 20),
    risk_level: index % 7 === 0 ? 'medium' : 'low',
    communication_status: index % 6 === 0 ? 'delayed' : 'clear',
    status: index % 5 === 0 ? 'assigned' : 'idle',
    bandwidth: 64 + ((index * 5) % 21),
    coordination_efficiency: 66 + ((index * 2) % 20),
    max_concurrent_tasks: index % 4 === 0 ? 2 : 1,
    system_health: 78 + ((index * 3) % 16),
    commander_code: commanderCode,
  };
}

export function createFarmSeed() {
  const leader = {
    bot_id: 'LEAD-001',
    name: 'Farm Leader',
    role: 'leader bot',
    role_type: 'leader',
    farm_group: 'leadership',
    specialty: 'command_support',
    level: 8,
    efficiency: 95,
    integrity: 97,
    confidence: 94,
    fatigue: 18,
    load: 42,
    uptime: 99,
    maintenance_status: 'healthy',
    output_quality: 96,
    risk_level: 'low',
    communication_status: 'clear',
    status: 'active',
    bandwidth: 93,
    coordination_efficiency: 96,
    max_concurrent_tasks: 3,
    system_health: 97,
  };

  const commanders = [
    {
      bot_id: 'CMD-001',
      name: 'Commander North',
      role: 'commander bot',
      role_type: 'commander',
      farm_group: 'alpha-grid',
      specialty: 'analysis',
      level: 6,
      efficiency: 88,
      integrity: 90,
      confidence: 87,
      fatigue: 22,
      load: 48,
      uptime: 98,
      maintenance_status: 'healthy',
      output_quality: 89,
      risk_level: 'low',
      communication_status: 'clear',
      status: 'active',
      bandwidth: 86,
      coordination_efficiency: 91,
      max_concurrent_tasks: 2,
      system_health: 91,
      commander_code: 'CMD-001',
    },
    {
      bot_id: 'CMD-002',
      name: 'Commander South',
      role: 'commander bot',
      role_type: 'commander',
      farm_group: 'beta-grid',
      specialty: 'research',
      level: 6,
      efficiency: 86,
      integrity: 89,
      confidence: 85,
      fatigue: 24,
      load: 51,
      uptime: 97,
      maintenance_status: 'healthy',
      output_quality: 87,
      risk_level: 'low',
      communication_status: 'clear',
      status: 'active',
      bandwidth: 84,
      coordination_efficiency: 89,
      max_concurrent_tasks: 2,
      system_health: 90,
      commander_code: 'CMD-002',
    }
  ];

  const securityBots = [
    {
      bot_id: 'SEC-001',
      name: 'Security Sentinel',
      role: 'security bot',
      role_type: 'security',
      farm_group: 'security-grid',
      specialty: 'security',
      level: 7,
      efficiency: 90,
      integrity: 96,
      confidence: 92,
      fatigue: 18,
      load: 35,
      uptime: 99,
      maintenance_status: 'healthy',
      output_quality: 91,
      risk_level: 'low',
      communication_status: 'clear',
      status: 'active',
      bandwidth: 88,
      coordination_efficiency: 90,
      max_concurrent_tasks: 2,
      system_health: 94,
    },
    {
      bot_id: 'SEC-002',
      name: 'Security Auditor',
      role: 'security bot',
      role_type: 'security',
      farm_group: 'security-grid',
      specialty: 'verification',
      level: 7,
      efficiency: 89,
      integrity: 95,
      confidence: 91,
      fatigue: 20,
      load: 39,
      uptime: 98,
      maintenance_status: 'healthy',
      output_quality: 90,
      risk_level: 'low',
      communication_status: 'clear',
      status: 'active',
      bandwidth: 87,
      coordination_efficiency: 88,
      max_concurrent_tasks: 2,
      system_health: 93,
    }
  ];

  const taskBots = Array.from({ length: FARM_STRUCTURE.taskBotCount }, (_, index) => makeTaskBot(index, index < 10 ? 'CMD-001' : 'CMD-002'));

  const squads = [
    {
      name: 'Alpha Squad',
      farm_group: 'alpha-grid',
      specialization_focus: ['analysis', 'monitoring', 'verification', 'reporting'],
      coordination_quality: 84,
      security_overhead: 11,
      status: 'active',
      throughput_score: 79,
    },
    {
      name: 'Beta Squad',
      farm_group: 'beta-grid',
      specialization_focus: ['research', 'data_gathering', 'summarization', 'communications'],
      coordination_quality: 81,
      security_overhead: 10,
      status: 'active',
      throughput_score: 77,
    }
  ];

  const missions = [
    {
      title: 'Integrity surveillance cycle',
      objective: 'Monitor operational drift, assign corrective work, and maintain verified output quality.',
      status: 'active',
      priority: 'high',
      progress: 58,
      mission_value: 180,
      coordination_complexity: 64,
      security_pressure: 48,
    },
    {
      title: 'Backlog throughput expansion',
      objective: 'Increase processing capacity across task queues while preventing overload collapse.',
      status: 'planned',
      priority: 'medium',
      progress: 21,
      mission_value: 135,
      coordination_complexity: 57,
      security_pressure: 24,
    }
  ];

  const tasks = Array.from({ length: 16 }, (_, index) => ({
    title: `Queue Task ${index + 1}`,
    description: `Operational work package ${index + 1} for realistic capacity and mission handling.`,
    work_type: TASK_SPECIALTIES[index % TASK_SPECIALTIES.length],
    priority: index % 6 === 0 ? 'critical' : index % 4 === 0 ? 'high' : 'medium',
    status: index < 6 ? 'pending' : index < 11 ? 'assigned' : 'active',
    urgency: 48 + ((index * 6) % 45),
    risk: 14 + ((index * 7) % 52),
    expected_output_value: 45 + ((index * 9) % 46),
    bot_fit_score: 60 + ((index * 5) % 28),
    queue_bucket: QUEUES[index % QUEUES.length],
    estimated_load: 14 + ((index * 4) % 26),
    progress: index < 11 ? index * 4 : 24 + (index * 5),
  }));

  const upgrades = [
    { name: 'Command Routing Matrix', upgrade_type: 'coordination', level: 1, effect_value: 8, applied_to: 'farm' },
    { name: 'Thermal Recovery Mesh', upgrade_type: 'fatigue_reduction', level: 1, effect_value: 6, applied_to: 'farm' },
    { name: 'Parallel Queue Bus', upgrade_type: 'capacity', level: 2, effect_value: 10, applied_to: 'farm' },
    { name: 'Verification Shield', upgrade_type: 'verification_quality', level: 1, effect_value: 7, applied_to: 'farm' }
  ];

  const history = [
    { actor_type: 'farm', event_type: 'farm_initialized', summary: 'Bot Farm launched with leader, commanders, task bots, and security layer.', impact_score: 16 },
    { actor_type: 'system', event_type: 'queue_pressure_detected', summary: 'Research and reporting lanes approaching overload threshold.', impact_score: -5 },
    { actor_type: 'security', event_type: 'integrity_watch_enabled', summary: 'Security bots now tracking contradiction risk and squad reliability.', impact_score: 9 }
  ];

  return { leader, commanders, securityBots, taskBots, squads, missions, tasks, upgrades, history };
}