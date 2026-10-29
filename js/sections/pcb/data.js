// The stack, as parts on a board. One record per skill; the copy is the owner's (Rust, Embassy, Cortex-M7, Slurm and
// multi-task learning added at his request on 2026-10-29, written from his résumé facts).
// `lines` is how the name is etched on the package (split where a long name would shrink the type).
// `cell` is [column, row] on the 6 x 4 board grid; the MCU owns the four middle cells.

export const GROUPS = {
  languages: { label: 'Languages', pkg: 'QFP' },
  ml: { label: 'ML & research', pkg: 'QFN and BGA' },
  robotics: { label: 'Robotics & controls', pkg: 'Module' },
  tools: { label: 'Embedded & tools', pkg: 'SOIC' },
};

const S = (id, name, group, pkg, cell, blurb, lines, linesP) => ({ id, name, group, pkg, cell, blurb, lines: lines || [name], linesP });

export const SKILLS = [
  S('python', 'Python', 'languages', 'qfp', [0, 0], 'Training loops, eval scripts, and the LDPC study.'),
  S('cpp', 'C++', 'languages', 'qfp', [1, 0], 'A C++17 flash translation layer with 38 GoogleTest tests, and what I taught at the VEX camp I co-founded.'),
  S('java', 'Java', 'languages', 'qfp', [0, 1], "Every FTC autonomous I've written, plus Pedro Pathing."),
  S('swift', 'Swift', 'languages', 'qfp', [1, 1], 'Sixth Sense, start to finish.'),
  S('javascript', 'JavaScript', 'languages', 'qfp', [0, 2], 'Three production sites at Inc to Inc, and this one.'),
  S('rust', 'Rust', 'languages', 'qfp', [1, 2], 'Bare-metal telemetry firmware for Gator Motorsports, and the server it streams to.'),

  S('pytorch', 'PyTorch', 'ml', 'bga', [4, 0], 'ACT and SmolVLA on one consumer GPU; 32 perception models on B200s.'),
  S('lerobot', 'LeRobot', 'ml', 'qfn', [5, 0], 'The framework behind TactileVLA-Edge. I sent it a patch.'),
  S('mtl', 'Multi-task learning', 'ml', 'qfn', [4, 1], 'ResNet-18 perception models with four output heads, for the TEA Lab.', ['Multi-task', 'learning']),
  S('sb3', 'stable-baselines3', 'ml', 'bga', [5, 1], 'The DQN that learns which LDPC bits to flip.', ['stable-', 'baselines3']),
  S('slurm', 'Slurm / HPC', 'ml', 'qfn', [4, 2], 'Job arrays that finished a 73 GPU-hour grid in about 21 hours.', ['Slurm', 'HPC']),
  S('coreml', 'Core ML', 'ml', 'bga', [5, 2], '12.7 MB of YOLOv8n at 15 fps on an iPhone 14 Pro.', ['Core', 'ML']),

  S('imitation', 'Imitation learning', 'robotics', 'module', [2, 0], '160 demonstrations in, a pick-and-place policy out.', ['Imitation', 'learning']),
  S('teleop', 'Teleoperation', 'robotics', 'module', [3, 0], 'A leader-follower SO-101 rig, built for under $300.', ['Tele-', 'operation']),
  S('pid', 'PID control', 'robotics', 'module', [2, 3], "Heading correction for Pedro Pathing's path follower.", ['PID', 'control']),
  S('bezier', 'Bézier path planning', 'robotics', 'module', [3, 3], 'Multi-order curves in a library 2,500+ FTC teams use.', ['Bézier path', 'planning'], ['Bézier', 'path', 'planning']),

  S('git', 'Git', 'tools', 'soic', [0, 3], 'Owned the team codebase for Middleton Robotics.'),
  S('embassy', 'Embassy', 'tools', 'soic', [1, 3], 'Interrupt-driven async drivers and the embassy-net UDP stack.'),
  S('cortexm', 'ARM Cortex-M7', 'tools', 'soic', [4, 3], 'A 1 GHz Cortex-M7 beside a 400 MHz Cortex-M4, programmed with no OS.', ['Cortex-M7']),
];

// Reference designators: the MCU is U1, then the chips in list order.
SKILLS.forEach((s, i) => { s.ref = `U${i + 2}`; s.index = i; });

export const PKG_LABEL = { qfp: 'QFP', qfn: 'QFN', bga: 'BGA', module: 'Module', soic: 'SOIC' };
